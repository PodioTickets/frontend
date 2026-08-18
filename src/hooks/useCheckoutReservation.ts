import { useCallback } from "react";
import {
  OrderApiError,
  type OrderErrorResponse,
  type PixPollStatusResponse,
  type OrderResponse,
  type PatchBillingAddressRequest,
  type PatchCouponRequest,
  type PatchParticipantsRequest,
  type PatchProductsRequest,
  type PayOrderRequest,
  type ReserveOrderRequest,
} from "@/interfaces/order";
import { toOrderResponse } from "@/lib/orderResponseNormalizer";
import { surfaceHeader } from "@/lib/authSurface";

const API_BASE_URL =
  (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3333").replace(/\/$/, "");

const ORDERS_PATH = "/api/v1/orders";

/**
 * Gera UUID v4 sem dependências. Usado pro header Idempotency-Key
 * obrigatório no POST /pay (ver docs seção 7.2).
 */
export function generateIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback seguro sem Math.random
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

// Auth por cookie httpOnly: o token não é mais legível em JS. Cada fetch usa
// `credentials: "include"` (envia o cookie cross-origin) e o backend lê do
// cookie. Sem 401 antecipado no client — se não autenticado, o backend responde
// 401 e o handleResponse trata.
function authHeaders(extra?: Record<string, string>): HeadersInit {
  return {
    "Content-Type": "application/json",
    // Superfície da sessão (client/organizer/admin): o backend escolhe o cookie
    // httpOnly correto (`pt_at_<surface>`) por este header. Sem ele, o `fetch`
    // cru caía no default `client` e o organizador (cookie `pt_at_organizer`)
    // recebia 401 no fluxo de cortesia. No checkout público retorna "client"
    // (= default do backend), então nada muda lá.
    ...surfaceHeader(),
    ...extra,
  };
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.ok) {
    return (await res.json()) as T;
  }

  let body: OrderErrorResponse;
  try {
    body = (await res.json()) as OrderErrorResponse;
  } catch {
    body = {
      statusCode: res.status,
      code: "VALIDATION_ERROR",
      message: `HTTP ${res.status}`,
    };
  }
  throw new OrderApiError(body);
}

async function handleOrderResponse(res: Response): Promise<OrderResponse> {
  if (res.ok) {
    return toOrderResponse(await res.json());
  }

  let body: OrderErrorResponse;
  try {
    body = (await res.json()) as OrderErrorResponse;
  } catch {
    body = {
      statusCode: res.status,
      code: "VALIDATION_ERROR",
      message: `HTTP ${res.status}`,
    };
  }
  throw new OrderApiError(body);
}

export function useCheckoutReservation() {
  /** `POST /orders/reserve` — idempotente por (userId, eventId). */
  const reserveOrder = useCallback(
    async (payload: ReserveOrderRequest): Promise<OrderResponse> => {
      const res = await fetch(`${API_BASE_URL}${ORDERS_PATH}/reserve`, {
        method: "POST",
        credentials: "include", headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      return handleOrderResponse(res);
    },
    [],
  );

  /** `GET /orders/{id}` — rehidrata estado/timer e detecta expiração. */
  const getOrder = useCallback(
    async (orderId: string): Promise<OrderResponse> => {
      const res = await fetch(`${API_BASE_URL}${ORDERS_PATH}/${orderId}`, {
        method: "GET",
        credentials: "include", headers: authHeaders(),
      });
      return handleOrderResponse(res);
    },
    [],
  );

  /** `PATCH /orders/{id}/participants` — chamado uma vez ao avançar. */
  const patchParticipants = useCallback(
    async (
      orderId: string,
      payload: PatchParticipantsRequest,
    ): Promise<OrderResponse> => {
      const res = await fetch(
        `${API_BASE_URL}${ORDERS_PATH}/${orderId}/participants`,
        {
          method: "PATCH",
          credentials: "include", headers: authHeaders(),
          body: JSON.stringify(payload),
        },
      );
      return handleOrderResponse(res);
    },
    [],
  );

  /**
   * `DELETE /orders/{id}/participants/{slot}` — REDUZ a quantidade reservada em
   * 1 unidade (libera estoque + cancela o placeholder PENDING do slot). Diferente
   * do PATCH /participants, que só preenche/esvazia slots SEM mexer na quantidade.
   * `slot` = índice 0-based na ordem de `reservedTickets` (expandido) /
   * `pendingParticipants`. Retorna o pedido já recalculado (use direto, sem refetch).
   * Erros relevantes: `422 LAST_TICKET` (último ingresso → cancelar o pedido),
   * `422 INVALID_SLOT`, `409 ORDER_NOT_PENDING`.
   */
  const removeReservedSlot = useCallback(
    async (orderId: string, slot: number): Promise<OrderResponse> => {
      const res = await fetch(
        `${API_BASE_URL}${ORDERS_PATH}/${orderId}/participants/${slot}`,
        {
          method: "DELETE",
          credentials: "include", headers: authHeaders(),
        },
      );
      return handleOrderResponse(res);
    },
    [],
  );

  /** `PATCH /orders/{id}/products` — chamado uma vez ao avançar. */
  const patchProducts = useCallback(
    async (
      orderId: string,
      payload: PatchProductsRequest,
    ): Promise<OrderResponse> => {
      const res = await fetch(
        `${API_BASE_URL}${ORDERS_PATH}/${orderId}/products`,
        {
          method: "PATCH",
          credentials: "include", headers: authHeaders(),
          body: JSON.stringify(payload),
        },
      );
      return handleOrderResponse(res);
    },
    [],
  );

  /** `PATCH /orders/{id}/billing-address` — antes do POST /pay. */
  const patchBillingAddress = useCallback(
    async (
      orderId: string,
      payload: PatchBillingAddressRequest,
    ): Promise<OrderResponse> => {
      const res = await fetch(
        `${API_BASE_URL}${ORDERS_PATH}/${orderId}/billing-address`,
        {
          method: "PATCH",
          credentials: "include", headers: authHeaders(),
          body: JSON.stringify(payload),
        },
      );
      return handleOrderResponse(res);
    },
    [],
  );

  /**
   * `POST /orders/{id}/pay` — requer Idempotency-Key.
   * O caller deve gerar a key UMA VEZ por tentativa do usuário (via
   * generateIdempotencyKey) e reutilizar em retries pra evitar cobrança
   * duplicada (ver docs seção 7.2).
   */
  const payOrder = useCallback(
    async (
      orderId: string,
      payload: PayOrderRequest,
      idempotencyKey: string,
    ): Promise<OrderResponse> => {
      const res = await fetch(`${API_BASE_URL}${ORDERS_PATH}/${orderId}/pay`, {
        method: "POST",
        credentials: "include", headers: authHeaders({ "Idempotency-Key": idempotencyKey }),
        body: JSON.stringify(payload),
      });
      return handleOrderResponse(res);
    },
    [],
  );

  /**
   * `GET /payments/order/{id}/pix-status` — polling ATIVO do PIX.
   *
   * Diferente do antigo `/orders/:id/payment-status` (leitura PASSIVA do banco, que
   * só reflete o que já foi gravado), este endpoint RECONSULTA a Braspag em tempo real
   * e, se pago, CONFIRMA+FINALIZA o pedido no backend (mesma fonte de verdade do
   * webhook). É o fallback que garante a confirmação mesmo se o webhook falhar.
   * Retorna `{ status, paid }`.
   */
  const getPaymentStatus = useCallback(
    async (orderId: string): Promise<PixPollStatusResponse> => {
      const res = await fetch(
        `${API_BASE_URL}/api/v1/payments/order/${orderId}/pix-status`,
        {
          method: "GET",
          credentials: "include", headers: authHeaders(),
        },
      );
      return handleResponse<PixPollStatusResponse>(res);
    },
    [],
  );

  /**
   * `GET /payments/order/{id}/mp-debit-status` — polling ATIVO do débito via
   * Mercado Pago (após o challenge 3DS). Mesmo contrato do pix-status: o
   * backend reconsulta o MP em tempo real e, se aprovado, confirma+finaliza o
   * pedido (fallback do webhook MP). Retorna `{ status, paid }`.
   */
  const getMpDebitStatus = useCallback(
    async (orderId: string): Promise<PixPollStatusResponse> => {
      const res = await fetch(
        `${API_BASE_URL}/api/v1/payments/order/${orderId}/mp-debit-status`,
        {
          method: "GET",
          credentials: "include", headers: authHeaders(),
        },
      );
      return handleResponse<PixPollStatusResponse>(res);
    },
    [],
  );

  /** `PATCH /orders/{id}/coupon` — aplica/remove cupom ou voucher. Enviar `{}` para remover. */
  const patchCoupon = useCallback(
    async (orderId: string, payload: PatchCouponRequest): Promise<OrderResponse> => {
      const res = await fetch(`${API_BASE_URL}${ORDERS_PATH}/${orderId}/coupon`, {
        method: "PATCH",
        credentials: "include", headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      return handleOrderResponse(res);
    },
    [],
  );

  /** `DELETE /orders/{id}` — cancela pedido pendente iniciado pelo usuário. */
  const cancelOrder = useCallback(async (orderId: string): Promise<void> => {
    const res = await fetch(`${API_BASE_URL}${ORDERS_PATH}/${orderId}`, {
      method: "DELETE",
      credentials: "include", headers: authHeaders(),
    });
    // 404 = já cancelado/não encontrado — tratar como sucesso
    if (!res.ok && res.status !== 404) {
      await handleResponse<void>(res);
    }
  }, []);

  return {
    reserveOrder,
    getOrder,
    patchParticipants,
    removeReservedSlot,
    patchProducts,
    patchBillingAddress,
    patchCoupon,
    payOrder,
    getPaymentStatus,
    getMpDebitStatus,
    cancelOrder,
  };
}
