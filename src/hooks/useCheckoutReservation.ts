import { useCallback } from "react";
import {
  OrderApiError,
  type OrderErrorResponse,
  type OrderPaymentStatusResponse,
  type OrderResponse,
  type PatchBillingAddressRequest,
  type PatchCouponRequest,
  type PatchParticipantsRequest,
  type PatchProductsRequest,
  type PayOrderRequest,
  type ReserveOrderRequest,
} from "@/interfaces/order";

const API_BASE_URL =
  (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3333").replace(/\/$/, "");

const ORDERS_PATH = "/api/v1/orders";

/**
 * Gera UUID v4 sem dependências. Usado pro header Idempotency-Key
 * obrigatório no POST /pay (ver docs seção 7.2).
 */
export function generateIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Auth por cookie httpOnly: o token não é mais legível em JS. Cada fetch usa
// `credentials: "include"` (envia o cookie cross-origin) e o backend lê do
// cookie. Sem 401 antecipado no client — se não autenticado, o backend responde
// 401 e o handleResponse trata.
function authHeaders(extra?: Record<string, string>): HeadersInit {
  return {
    "Content-Type": "application/json",
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

/**
 * Normaliza a resposta do backend para o shape esperado pelo frontend.
 * O backend retorna `id` (não `orderId`) e usa `reservedTickets`/campos de
 * pricing separados em vez do objeto `pricing` aninhado.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toOrderResponse(data: any): OrderResponse {
  // Voucher e cupom são mutuamente exclusivos. Quando a order tem voucher (e não
  // cupom), o `discount` da raiz é o desconto do VOUCHER — sem isso ele cairia em
  // `couponDiscount` e a linha do voucher não apareceria no resumo (o backend
  // deste shape não manda `appliedDiscount` nem `pricing.voucherDiscount`).
  const rawDiscount = data.discount ?? 0;
  const isVoucherOrder = !!data.voucher && !data.coupon;
  return {
    orderId: data.orderId ?? data.id,
    status: data.status,
    eventId: data.eventId,
    reservedAt: data.reservedAt ?? "",
    expiresAt: data.expiresAt ?? "",
    serverTime: data.serverTime ?? new Date().toISOString(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tickets: (data.tickets ?? data.reservedTickets ?? []).map((t: any) => ({
      id: t.id,
      ticketId: t.ticketId,
      batchId: t.batchId,
      batchName: t.ticketName ?? t.batchName,
      quantity: t.quantity,
      unitPrice: t.unitPrice ?? 0,
      unitDiscount: t.unitDiscount ?? 0,
      totalDiscount: t.totalDiscount ?? 0,
      finalUnitPrice: t.finalUnitPrice ?? t.unitPrice ?? 0,
      finalTotalPrice: t.finalTotalPrice ?? 0,
      couponApplied: t.couponApplied ?? false,
    })),
    pricing: {
      subtotal: data.pricing?.subtotal ?? data.totalAmount ?? 0,
      // Subtotais por categoria (server-driven). `undefined` se o backend não os
      // expõe — o front usa o `subtotal` agregado nesse caso.
      ticketsSubtotal: data.pricing?.ticketsSubtotal,
      productsSubtotal: data.pricing?.productsSubtotal,
      serviceFee: data.pricing?.serviceFee ?? data.serviceFee ?? 0,
      couponDiscount:
        data.pricing?.couponDiscount ??
        (isVoucherOrder
          ? 0
          : data.appliedDiscount?.type === "coupon"
            ? data.appliedDiscount.discount
            : rawDiscount),
      voucherDiscount:
        data.pricing?.voucherDiscount ??
        (isVoucherOrder
          ? rawDiscount
          : data.appliedDiscount?.type === "voucher"
            ? data.appliedDiscount.discount
            : 0),
      // Sempre usa finalAmount da raiz — pricing.total pode ser o bruto sem desconto
      total: data.finalAmount ?? data.pricing?.total ?? data.totalAmount ?? 0,
      currency: "BRL" as const,
    },
    coupon: data.coupon ?? null,
    voucher: data.voucher ?? null,
    payment: data.payment,
    registrations: data.registrations,
    cancelledAt: data.cancelledAt,
    cancelledReason: data.cancelledReason,
    couponAutoRemoved: data.couponAutoRemoved ?? false,
    couponRejected: data.couponRejected ?? null,
  };
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

  /** `GET /orders/{id}/payment-status` — polling do PIX. */
  const getPaymentStatus = useCallback(
    async (orderId: string): Promise<OrderPaymentStatusResponse> => {
      const res = await fetch(
        `${API_BASE_URL}${ORDERS_PATH}/${orderId}/payment-status`,
        {
          method: "GET",
          credentials: "include", headers: authHeaders(),
        },
      );
      return handleResponse<OrderPaymentStatusResponse>(res);
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
    cancelOrder,
  };
}
