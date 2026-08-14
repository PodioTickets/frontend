import { useCallback } from "react";
import {
  OrderApiError,
  type OrderErrorResponse,
  type ReserveOrderRequest,
} from "@/interfaces/order";
import type {
  BackendParticipant,
  ProductPatchItem,
} from "@/lib/checkoutParticipants";
import { surfaceHeader } from "@/lib/authSurface";

const API_BASE_URL =
  (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3333").replace(/\/$/, "");

/**
 * Payload da inscrição de CORTESIA (organizador). Espelha o `CreateCourtesyOrderDto`
 * do backend: mesma forma de `tickets`/`participants`/`products` do checkout — o
 * endpoint reaproveita reserve → patchParticipants → patchProducts internamente.
 */
export interface CourtesyOrderRequest {
  eventId: string;
  tickets: ReserveOrderRequest["tickets"];
  /** Um participante por UNIDADE de ingresso, na ordem expandida dos tickets. */
  participants: BackendParticipant[];
  products?: ProductPatchItem[];
}

export interface CourtesyOrderResponse {
  orderId: string;
  message: string;
}

/**
 * `POST /api/v1/orders/courtesy` — cria a inscrição de cortesia (R$0, sem
 * pagamento) num único request. Auth por cookie httpOnly (`credentials: include`).
 * Erros do backend (403 permissão, 409 esgotado, validação) sobem como
 * `OrderApiError` para a UI tratar com mensagem amigável.
 */
export function useCourtesyRegistration() {
  const createCourtesyOrder = useCallback(
    async (payload: CourtesyOrderRequest): Promise<CourtesyOrderResponse> => {
      const res = await fetch(`${API_BASE_URL}/api/v1/orders/courtesy`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...surfaceHeader() },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        return (await res.json()) as CourtesyOrderResponse;
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
    },
    [],
  );

  /**
   * `POST /api/v1/orders/{id}/courtesy-finalize` — finaliza como cortesia (R$0)
   * um pedido JÁ reservado pelo organizador (fluxo que reaproveita o checkout:
   * reserve → participants → products → esta chamada no lugar do pagamento).
   */
  const finalizeCourtesy = useCallback(
    async (orderId: string): Promise<CourtesyOrderResponse> => {
      const res = await fetch(`${API_BASE_URL}/api/v1/orders/${orderId}/courtesy-finalize`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...surfaceHeader() },
      });
      if (res.ok) {
        return (await res.json()) as CourtesyOrderResponse;
      }
      let body: OrderErrorResponse;
      try {
        body = (await res.json()) as OrderErrorResponse;
      } catch {
        body = { statusCode: res.status, code: "VALIDATION_ERROR", message: `HTTP ${res.status}` };
      }
      throw new OrderApiError(body);
    },
    [],
  );

  return { createCourtesyOrder, finalizeCourtesy };
}
