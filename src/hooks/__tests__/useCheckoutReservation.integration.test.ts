import { describe, it, expect } from "vitest";
import { http, HttpResponse } from "msw";
import { renderHook } from "@testing-library/react";
import { mswServer, useMswServer } from "@/test/mswServer";
import { useCheckoutReservation } from "@/hooks/useCheckoutReservation";
import { OrderApiError } from "@/interfaces/order";

/**
 * Testes de CARACTERIZAÇÃO (golden master) do `useCheckoutReservation` — travam o
 * comportamento ATUAL da camada de rede do checkout (wiring de fetch, headers,
 * normalização da resposta e tratamento de erro) ANTES de refatorar os hooks de
 * pagamento. A normalização em si (`toOrderResponse`) tem cobertura própria; aqui
 * o foco é a integração HTTP via MSW.
 */

const API = "http://localhost:3333/api/v1";

function setup() {
  return renderHook(() => useCheckoutReservation()).result.current;
}

describe("useCheckoutReservation (integração MSW)", () => {
  useMswServer();

  it("reserveOrder: POST /orders/reserve, envia o payload e normaliza (id → orderId)", async () => {
    let receivedBody: unknown;
    mswServer.use(
      http.post(`${API}/orders/reserve`, async ({ request }) => {
        receivedBody = await request.json();
        return HttpResponse.json({ id: "ord-1", status: "PENDING", tickets: [] });
      }),
    );

    const { reserveOrder } = setup();
    const res = await reserveOrder({ eventId: "ev-1", tickets: [] } as never);

    expect(receivedBody).toEqual({ eventId: "ev-1", tickets: [] });
    expect(res.orderId).toBe("ord-1");
    expect(res.status).toBe("PENDING");
    expect(res.tickets).toEqual([]);
  });

  it("getOrder: GET /orders/:id e normaliza a resposta", async () => {
    mswServer.use(
      http.get(`${API}/orders/ord-2`, () =>
        HttpResponse.json({ id: "ord-2", status: "PENDING", tickets: [] }),
      ),
    );

    const { getOrder } = setup();
    const res = await getOrder("ord-2");
    expect(res.orderId).toBe("ord-2");
  });

  it("erro de negócio: resposta não-ok vira OrderApiError com code/message do corpo", async () => {
    mswServer.use(
      http.patch(`${API}/orders/ord-3/coupon`, () =>
        HttpResponse.json(
          { statusCode: 400, code: "COUPON_NOT_FOUND", message: "Cupom inválido" },
          { status: 400 },
        ),
      ),
    );

    const { patchCoupon } = setup();
    await expect(patchCoupon("ord-3", { couponCode: "X" } as never)).rejects.toMatchObject({
      code: "COUPON_NOT_FOUND",
      statusCode: 400,
    });
    await expect(
      patchCoupon("ord-3", { couponCode: "X" } as never),
    ).rejects.toBeInstanceOf(OrderApiError);
  });

  it("payOrder: envia o header obrigatório Idempotency-Key", async () => {
    let idempotencyKey: string | null = null;
    mswServer.use(
      http.post(`${API}/orders/ord-4/pay`, ({ request }) => {
        idempotencyKey = request.headers.get("Idempotency-Key");
        return HttpResponse.json({ id: "ord-4", status: "CONFIRMED", tickets: [] });
      }),
    );

    const { payOrder } = setup();
    const res = await payOrder("ord-4", { method: "pix" } as never, "idem-123");
    expect(idempotencyKey).toBe("idem-123");
    expect(res.status).toBe("CONFIRMED");
  });

  it("getPaymentStatus: GET pix-status retorna o corpo cru { status, paid } (sem normalizar)", async () => {
    mswServer.use(
      http.get(`${API}/payments/order/ord-5/pix-status`, () =>
        HttpResponse.json({ status: "PAID", paid: true }),
      ),
    );

    const { getPaymentStatus } = setup();
    const res = await getPaymentStatus("ord-5");
    expect(res).toEqual({ status: "PAID", paid: true });
  });

  it("cancelOrder: 404 é tratado como sucesso (não lança)", async () => {
    mswServer.use(
      http.delete(`${API}/orders/ord-6`, () =>
        HttpResponse.json({ message: "not found" }, { status: 404 }),
      ),
    );

    const { cancelOrder } = setup();
    await expect(cancelOrder("ord-6")).resolves.toBeUndefined();
  });

  it("cancelOrder: erro != 404 lança OrderApiError", async () => {
    mswServer.use(
      http.delete(`${API}/orders/ord-7`, () =>
        HttpResponse.json(
          { statusCode: 500, code: "VALIDATION_ERROR", message: "boom" },
          { status: 500 },
        ),
      ),
    );

    const { cancelOrder } = setup();
    await expect(cancelOrder("ord-7")).rejects.toBeInstanceOf(OrderApiError);
  });
});
