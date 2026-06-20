import { describe, it, expect } from "vitest";
import { toOrderResponse } from "../orderResponseNormalizer";

/**
 * Caracterização do normalizer da resposta de order do checkout. Trava o
 * roteamento cupom×voucher (mutuamente exclusivos) e os fallbacks de shape do
 * backend antes de refatorar PaymentStep / useCheckoutReservation.
 * Valores monetários em CENTAVOS (convenção do backend).
 */

describe("toOrderResponse — identidade/fallbacks", () => {
  it("orderId vem de orderId ou id (fallback)", () => {
    expect(toOrderResponse({ orderId: "o1" }).orderId).toBe("o1");
    expect(toOrderResponse({ id: "o2" }).orderId).toBe("o2");
  });
  it("campos de tempo têm fallback p/ string vazia; serverTime gera ISO se ausente", () => {
    const r = toOrderResponse({ id: "o" });
    expect(r.reservedAt).toBe("");
    expect(r.expiresAt).toBe("");
    expect(typeof r.serverTime).toBe("string");
    expect(r.serverTime.length).toBeGreaterThan(0);
  });
  it("preserva serverTime quando enviado", () => {
    expect(toOrderResponse({ id: "o", serverTime: "2026-06-18T00:00:00Z" }).serverTime).toBe(
      "2026-06-18T00:00:00Z",
    );
  });
  it("defaults de cupom rejeitado/auto-removido", () => {
    const r = toOrderResponse({ id: "o" });
    expect(r.couponAutoRemoved).toBe(false);
    expect(r.couponRejected).toBeNull();
    expect(r.coupon).toBeNull();
    expect(r.voucher).toBeNull();
  });
});

describe("toOrderResponse — tickets", () => {
  it("aceita tickets ou reservedTickets e mapeia batchName de ticketName", () => {
    const r = toOrderResponse({
      id: "o",
      reservedTickets: [
        { id: "t1", ticketId: "tk1", batchId: "b1", ticketName: "Lote 1", quantity: 2, unitPrice: 5000 },
      ],
    });
    expect(r.tickets).toHaveLength(1);
    expect(r.tickets[0]).toMatchObject({
      id: "t1",
      ticketId: "tk1",
      batchId: "b1",
      batchName: "Lote 1",
      quantity: 2,
      unitPrice: 5000,
    });
  });
  it("finalUnitPrice cai em unitPrice quando ausente; flags default", () => {
    const r = toOrderResponse({ id: "o", tickets: [{ id: "t", unitPrice: 3000 }] });
    expect(r.tickets[0].finalUnitPrice).toBe(3000);
    expect(r.tickets[0].unitDiscount).toBe(0);
    expect(r.tickets[0].totalDiscount).toBe(0);
    expect(r.tickets[0].finalTotalPrice).toBe(0);
    expect(r.tickets[0].couponApplied).toBe(false);
  });
  it("lista vazia quando nem tickets nem reservedTickets", () => {
    expect(toOrderResponse({ id: "o" }).tickets).toEqual([]);
  });
});

describe("toOrderResponse — pricing fallbacks", () => {
  it("subtotal cai em totalAmount; serviceFee na raiz; total prioriza finalAmount", () => {
    const r = toOrderResponse({
      id: "o",
      totalAmount: 10000,
      serviceFee: 700,
      finalAmount: 9000,
      pricing: { total: 99999 }, // ignorado: finalAmount tem prioridade
    });
    expect(r.pricing.subtotal).toBe(10000);
    expect(r.pricing.serviceFee).toBe(700);
    expect(r.pricing.total).toBe(9000);
    expect(r.pricing.currency).toBe("BRL");
  });
  it("pricing aninhado tem prioridade sobre os campos da raiz", () => {
    const r = toOrderResponse({
      id: "o",
      totalAmount: 10000,
      serviceFee: 700,
      pricing: { subtotal: 8000, serviceFee: 500, ticketsSubtotal: 6000, productsSubtotal: 2000 },
    });
    expect(r.pricing.subtotal).toBe(8000);
    expect(r.pricing.serviceFee).toBe(500);
    expect(r.pricing.ticketsSubtotal).toBe(6000);
    expect(r.pricing.productsSubtotal).toBe(2000);
  });
  it("ticketsSubtotal/productsSubtotal ficam undefined quando o backend não os expõe", () => {
    const r = toOrderResponse({ id: "o", totalAmount: 5000 });
    expect(r.pricing.ticketsSubtotal).toBeUndefined();
    expect(r.pricing.productsSubtotal).toBeUndefined();
  });
});

describe("toOrderResponse — roteamento cupom×voucher (exclusivos)", () => {
  it("order com VOUCHER (sem cupom): discount da raiz vai p/ voucherDiscount, couponDiscount = 0", () => {
    const r = toOrderResponse({
      id: "o",
      discount: 5000,
      voucher: { code: "VVV" },
    });
    expect(r.pricing.voucherDiscount).toBe(5000);
    expect(r.pricing.couponDiscount).toBe(0);
    expect(r.voucher).toEqual({ code: "VVV" });
  });
  it("order com CUPOM: discount da raiz vai p/ couponDiscount, voucherDiscount = 0", () => {
    const r = toOrderResponse({
      id: "o",
      discount: 1200,
      coupon: { id: "c", code: "PODIO", couponType: "DISCOUNT", type: "PERCENTAGE", value: 10 },
    });
    expect(r.pricing.couponDiscount).toBe(1200);
    expect(r.pricing.voucherDiscount).toBe(0);
  });
  it("sem cupom nem voucher: discount da raiz vira couponDiscount (não é voucher order)", () => {
    const r = toOrderResponse({ id: "o", discount: 800 });
    expect(r.pricing.couponDiscount).toBe(800);
    expect(r.pricing.voucherDiscount).toBe(0);
  });
  it("appliedDiscount.type 'voucher' COM objeto voucher: isVoucherOrder, voucher=discount raiz, coupon=0", () => {
    // Shape realista: order de voucher traz o objeto `voucher`.
    const r = toOrderResponse({
      id: "o",
      discount: 4000,
      voucher: { code: "V" },
      appliedDiscount: { type: "voucher", discount: 4000 },
    });
    expect(r.pricing.voucherDiscount).toBe(4000);
    expect(r.pricing.couponDiscount).toBe(0);
  });
  it("[quirk] appliedDiscount 'voucher' SEM objeto voucher: voucherDiscount certo, mas couponDiscount cai no discount raiz", () => {
    // isVoucherOrder exige o objeto `voucher`; sem ele, o ramo do couponDiscount
    // não vê appliedDiscount 'coupon' e cai no rawDiscount → os dois ficam setados.
    // Shape improvável (backend manda os dois juntos), travado pra flagrar regressão.
    const r = toOrderResponse({
      id: "o",
      discount: 999,
      appliedDiscount: { type: "voucher", discount: 4000 },
    });
    expect(r.pricing.voucherDiscount).toBe(4000);
    expect(r.pricing.couponDiscount).toBe(999);
  });
  it("appliedDiscount.type 'coupon' roteia p/ couponDiscount", () => {
    const r = toOrderResponse({
      id: "o",
      appliedDiscount: { type: "coupon", discount: 2500 },
    });
    expect(r.pricing.couponDiscount).toBe(2500);
    expect(r.pricing.voucherDiscount).toBe(0);
  });
  it("voucher+coupon juntos: NÃO é voucher order (coupon vence o ramo isVoucherOrder)", () => {
    // isVoucherOrder = !!voucher && !coupon → false quando há cupom
    const r = toOrderResponse({
      id: "o",
      discount: 3000,
      voucher: { code: "V" },
      coupon: { id: "c", code: "C", couponType: "DISCOUNT", type: "FIXED", value: 3000 },
    });
    expect(r.pricing.couponDiscount).toBe(3000);
    expect(r.pricing.voucherDiscount).toBe(0);
  });
  it("pricing.couponDiscount/voucherDiscount explícitos têm prioridade sobre o roteamento", () => {
    const r = toOrderResponse({
      id: "o",
      discount: 9999,
      voucher: { code: "V" },
      pricing: { couponDiscount: 100, voucherDiscount: 200 },
    });
    expect(r.pricing.couponDiscount).toBe(100);
    expect(r.pricing.voucherDiscount).toBe(200);
  });
  it("sem nenhum desconto: ambos 0", () => {
    const r = toOrderResponse({ id: "o" });
    expect(r.pricing.couponDiscount).toBe(0);
    expect(r.pricing.voucherDiscount).toBe(0);
  });
});
