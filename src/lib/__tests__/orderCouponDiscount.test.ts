import { describe, it, expect } from "vitest";
import type { OrderCoupon } from "@/interfaces/order";
import {
  formatVoucherLineLabel,
  computeVoucherTicketsDiscount,
  formatCouponLineLabel,
  computeCouponDiscount,
  couponPreviewToOrderCoupon,
  couponConditionsMet,
  normalizeCouponAppliesTo,
  couponCoversAnySelected,
  computeLinkCouponTicketDiscount,
  computeTicketPricingWithCoupon,
  computeTicketPricingWithDiscount,
} from "../orderCouponDiscount";

/**
 * Testes de CARACTERIZAÇÃO — travam o comportamento ATUAL do cálculo de
 * desconto de cupom/voucher do checkout antes de refatorar os arquivos-monstro.
 * Não é spec do "ideal": assere o que o código faz hoje (golden master).
 *
 * Invariantes críticos cobertos (ver [[project_checkout_invariants_2026_05]]):
 *  - FIXED vem em CENTAVOS do backend; PERCENTAGE em pontos percentuais.
 *  - taxa de serviço incide sobre o subtotal JÁ DESCONTADO.
 *  - voucher cobre 1 unidade (a de maior valor) dentre os ingressos cobertos.
 */

const coupon = (over: Partial<OrderCoupon> = {}): OrderCoupon => ({
  id: "c1",
  code: "PODIO10",
  couponType: "DISCOUNT",
  type: "PERCENTAGE",
  value: 10,
  ...over,
});

describe("formatVoucherLineLabel", () => {
  it("usa o código quando presente", () => {
    expect(formatVoucherLineLabel("ABC123")).toBe("Voucher ABC123");
  });
  it("cai no genérico quando código ausente/vazio", () => {
    expect(formatVoucherLineLabel(null)).toBe("Voucher aplicado");
    expect(formatVoucherLineLabel(undefined)).toBe("Voucher aplicado");
    expect(formatVoucherLineLabel("")).toBe("Voucher aplicado");
  });
});

describe("computeVoucherTicketsDiscount", () => {
  const sel = [
    { id: "a", price: 50, quantity: 1 },
    { id: "b", price: 120, quantity: 2 },
    { id: "c", price: 999, quantity: 0 },
  ];
  it("retorna 0 quando appliesTo vazio/ausente", () => {
    expect(computeVoucherTicketsDiscount(null, sel)).toBe(0);
    expect(computeVoucherTicketsDiscount(undefined, sel)).toBe(0);
    expect(computeVoucherTicketsDiscount([], sel)).toBe(0);
  });
  it("libera a unidade de MAIOR valor entre os cobertos com quantidade > 0", () => {
    expect(computeVoucherTicketsDiscount(["a", "b"], sel)).toBe(120);
  });
  it("ignora ingresso coberto mas com quantidade 0", () => {
    expect(computeVoucherTicketsDiscount(["c"], sel)).toBe(0);
  });
  it("ignora ingressos não cobertos pelo appliesTo", () => {
    expect(computeVoucherTicketsDiscount(["a"], sel)).toBe(50);
  });
  it("faz clamp de preço negativo em 0", () => {
    expect(
      computeVoucherTicketsDiscount(["x"], [{ id: "x", price: -10, quantity: 1 }]),
    ).toBe(0);
  });
});

describe("formatCouponLineLabel", () => {
  it("cupom automático (QUANTITY/AGE) vira 'Cupom automático'", () => {
    expect(formatCouponLineLabel(coupon({ couponType: "QUANTITY", code: "X" }))).toBe(
      "Cupom automático (10% OFF)",
    );
    expect(
      formatCouponLineLabel(coupon({ couponType: "AGE", type: "FIXED", value: 5000 })),
    ).toBe("Cupom automático");
  });
  it("cupom manual com código mostra o código", () => {
    expect(formatCouponLineLabel(coupon({ code: "PODIO500", value: 12 }))).toBe(
      "Cupom PODIO500 (12% OFF)",
    );
  });
  it("cupom manual sem código vira 'Cupom aplicado'", () => {
    expect(formatCouponLineLabel(coupon({ code: null, type: "FIXED", value: 5000 }))).toBe(
      "Cupom aplicado",
    );
  });
  it("FIXED não anexa sufixo de porcentagem", () => {
    expect(formatCouponLineLabel(coupon({ type: "FIXED", value: 5000 }))).toBe(
      "Cupom PODIO10",
    );
  });
  it("PERCENTAGE com value 0 não anexa sufixo", () => {
    expect(formatCouponLineLabel(coupon({ value: 0 }))).toBe("Cupom PODIO10");
  });
});

describe("computeCouponDiscount", () => {
  it("retorna vazio (sem desconto) quando cupom ausente", () => {
    expect(computeCouponDiscount(null, 100, 50)).toEqual({
      ticketDiscount: 0,
      productDiscount: 0,
      totalDiscount: 0,
      appliesToProducts: false,
    });
  });
  it("value <= 0 zera o desconto mas reflete appliesToProducts do cupom", () => {
    expect(computeCouponDiscount(coupon({ value: 0, applyToProducts: true }), 100, 50)).toEqual({
      ticketDiscount: 0,
      productDiscount: 0,
      totalDiscount: 0,
      appliesToProducts: true,
    });
  });
  it("PERCENTAGE só sobre tickets quando applyToProducts é false", () => {
    const r = computeCouponDiscount(coupon({ value: 10 }), 200, 100);
    expect(r.ticketDiscount).toBe(20);
    expect(r.productDiscount).toBe(0);
    expect(r.totalDiscount).toBe(20);
    expect(r.appliesToProducts).toBe(false);
  });
  it("PERCENTAGE também sobre produtos quando applyToProducts é true", () => {
    const r = computeCouponDiscount(coupon({ value: 10, applyToProducts: true }), 200, 100);
    expect(r.ticketDiscount).toBe(20);
    expect(r.productDiscount).toBe(10);
    expect(r.totalDiscount).toBe(30);
  });
  it("FIXED: value em CENTAVOS, consome tickets primeiro, sem transbordar p/ produtos por padrão", () => {
    // 5000 centavos = R$50; tickets R$30 → desconta 30; sobra 20 NÃO vai p/ produtos.
    const r = computeCouponDiscount(coupon({ type: "FIXED", value: 5000 }), 30, 100);
    expect(r.ticketDiscount).toBe(30);
    expect(r.productDiscount).toBe(0);
    expect(r.totalDiscount).toBe(30);
  });
  it("FIXED: transborda p/ produtos quando applyToProducts é true", () => {
    const r = computeCouponDiscount(
      coupon({ type: "FIXED", value: 5000, applyToProducts: true }),
      30,
      100,
    );
    expect(r.ticketDiscount).toBe(30);
    expect(r.productDiscount).toBe(20); // sobra de R$20 cai nos produtos
    expect(r.totalDiscount).toBe(50);
  });
  it("FIXED: clampa no subtotal disponível (não desconta além da base)", () => {
    const r = computeCouponDiscount(
      coupon({ type: "FIXED", value: 100000, applyToProducts: true }),
      30,
      40,
    );
    expect(r.totalDiscount).toBe(70); // 30 tickets + 40 produtos, nunca mais
  });
  it("clampa subtotais negativos em 0", () => {
    const r = computeCouponDiscount(coupon({ value: 10 }), -50, -20);
    expect(r.totalDiscount).toBe(0);
  });
  it("arredonda em 2 casas", () => {
    const r = computeCouponDiscount(coupon({ value: 33 }), 10, 0);
    expect(r.ticketDiscount).toBe(3.3);
  });
});

describe("couponPreviewToOrderCoupon", () => {
  it("retorna null sem preview", () => {
    expect(couponPreviewToOrderCoupon(null)).toBeNull();
    expect(couponPreviewToOrderCoupon(undefined)).toBeNull();
  });
  it("mapeia campos e mantém value cru (convenção do backend)", () => {
    expect(
      couponPreviewToOrderCoupon({
        code: "X",
        value: 5000,
        type: "FIXED",
        couponType: "DISCOUNT",
        applyToProducts: true,
      }),
    ).toEqual({
      id: "preview",
      code: "X",
      couponType: "DISCOUNT",
      type: "FIXED",
      value: 5000,
      applyToProducts: true,
    });
  });
  it("usa fallbackCode quando o preview não traz code", () => {
    const r = couponPreviewToOrderCoupon({ value: 10, type: "PERCENTAGE" }, "LINKCODE");
    expect(r?.code).toBe("LINKCODE");
    expect(r?.couponType).toBe("DISCOUNT");
  });
  it("code é null quando nem preview nem fallback têm", () => {
    expect(couponPreviewToOrderCoupon({ value: 10, type: "PERCENTAGE" })?.code).toBeNull();
  });
});

describe("couponConditionsMet", () => {
  it("false quando cupom ausente", () => {
    expect(couponConditionsMet(null, 100, 5)).toBe(false);
  });
  it("true quando sem condições", () => {
    expect(couponConditionsMet({}, 0, 0)).toBe(true);
  });
  it("minCartValue em CENTAVOS comparado ao subtotal em REAIS", () => {
    // 10000 centavos = R$100; carrinho R$99 < R$100 → não atende
    expect(couponConditionsMet({ minCartValue: 10000 }, 99, 10)).toBe(false);
    expect(couponConditionsMet({ minCartValue: 10000 }, 100, 10)).toBe(true);
  });
  it("minQuantity compara contagem de ingressos", () => {
    expect(couponConditionsMet({ minQuantity: 3 }, 999, 2)).toBe(false);
    expect(couponConditionsMet({ minQuantity: 3 }, 999, 3)).toBe(true);
  });
});

describe("normalizeCouponAppliesTo", () => {
  it("null/undefined → null", () => {
    expect(normalizeCouponAppliesTo(null)).toBeNull();
    expect(normalizeCouponAppliesTo(undefined)).toBeNull();
  });
  it("'all' → null (sem restrição)", () => {
    expect(normalizeCouponAppliesTo("all")).toBeNull();
  });
  it("array com ids → ids; array vazio → null", () => {
    expect(normalizeCouponAppliesTo(["a", "b"])).toEqual(["a", "b"]);
    expect(normalizeCouponAppliesTo([])).toBeNull();
  });
  it("string JSON de array → ids", () => {
    expect(normalizeCouponAppliesTo('["x","y"]')).toEqual(["x", "y"]);
  });
  it("JSON de array vazio → null", () => {
    expect(normalizeCouponAppliesTo("[]")).toBeNull();
  });
  it("string não-JSON solta → null", () => {
    expect(normalizeCouponAppliesTo("modalidade-x")).toBeNull();
  });
});

describe("couponCoversAnySelected", () => {
  const sel = [
    { id: "a", quantity: 0 },
    { id: "b", quantity: 1 },
  ];
  it("null/vazio cobre todos", () => {
    expect(couponCoversAnySelected(null, sel)).toBe(true);
    expect(couponCoversAnySelected([], sel)).toBe(true);
  });
  it("cobre quando algum selecionado (qty>0) está na lista", () => {
    expect(couponCoversAnySelected(["b"], sel)).toBe(true);
  });
  it("não cobre quando o coberto tem quantidade 0", () => {
    expect(couponCoversAnySelected(["a"], sel)).toBe(false);
  });
  it("não cobre quando nada selecionado bate", () => {
    expect(couponCoversAnySelected(["z"], sel)).toBe(false);
  });
});

describe("computeLinkCouponTicketDiscount", () => {
  const sel = [
    { id: "a", price: 100, quantity: 2 }, // R$200
    { id: "b", price: 50, quantity: 1 }, // R$50
  ];
  it("0 quando cupom ausente ou value <= 0", () => {
    expect(computeLinkCouponTicketDiscount(null, sel, 250, 3)).toBe(0);
    expect(
      computeLinkCouponTicketDiscount({ type: "PERCENTAGE", value: 0 }, sel, 250, 3),
    ).toBe(0);
  });
  it("0 quando condições mínimas não atendidas (aplicar em silêncio)", () => {
    expect(
      computeLinkCouponTicketDiscount(
        { type: "PERCENTAGE", value: 10, minQuantity: 5 },
        sel,
        250,
        3,
      ),
    ).toBe(0);
  });
  it("PERCENTAGE sobre todos quando appliesTo nulo", () => {
    expect(
      computeLinkCouponTicketDiscount({ type: "PERCENTAGE", value: 10 }, sel, 250, 3),
    ).toBe(25); // 10% de 250
  });
  it("PERCENTAGE só sobre ingressos cobertos pelo appliesTo", () => {
    expect(
      computeLinkCouponTicketDiscount(
        { type: "PERCENTAGE", value: 10, appliesTo: ["a"] },
        sel,
        250,
        3,
      ),
    ).toBe(20); // 10% de 200 (só "a")
  });
  it("0 quando nenhum ingresso elegível selecionado", () => {
    expect(
      computeLinkCouponTicketDiscount(
        { type: "PERCENTAGE", value: 10, appliesTo: ["z"] },
        sel,
        250,
        3,
      ),
    ).toBe(0);
  });
  it("FIXED em CENTAVOS, clampado ao subtotal elegível", () => {
    expect(
      computeLinkCouponTicketDiscount({ type: "FIXED", value: 3000 }, sel, 250, 3),
    ).toBe(30); // R$30
    expect(
      computeLinkCouponTicketDiscount(
        { type: "FIXED", value: 999999, appliesTo: ["b"] },
        sel,
        250,
        3,
      ),
    ).toBe(50); // clampa nos R$50 do "b"
  });

  it("remaining capa o desconto às N unidades MAIS CARAS (espelha o backend)", () => {
    // sel = a(100×2), b(50×1) → unidades [100,100,50]. remaining=2 → cobre as 2 de R$100.
    expect(
      computeLinkCouponTicketDiscount(
        { type: "PERCENTAGE", value: 10, remaining: 2 },
        sel,
        250,
        3,
      ),
    ).toBe(20); // 10% de (100+100), NÃO de 250
  });

  it("remaining=1 → cobre só a unidade mais cara", () => {
    expect(
      computeLinkCouponTicketDiscount(
        { type: "PERCENTAGE", value: 50, remaining: 1 },
        sel,
        250,
        3,
      ),
    ).toBe(50); // 50% de 100 (a unidade mais cara)
  });

  it("remaining >= unidades elegíveis → sem efeito (cobre todas)", () => {
    expect(
      computeLinkCouponTicketDiscount(
        { type: "PERCENTAGE", value: 10, remaining: 99 },
        sel,
        250,
        3,
      ),
    ).toBe(25); // 10% de 250
  });

  it("remaining null/ausente → sem limite (compat)", () => {
    expect(
      computeLinkCouponTicketDiscount(
        { type: "PERCENTAGE", value: 10, remaining: null },
        sel,
        250,
        3,
      ),
    ).toBe(25);
  });

  it("remaining=0 (cupom esgotado) → desconto 0", () => {
    expect(
      computeLinkCouponTicketDiscount(
        { type: "PERCENTAGE", value: 10, remaining: 0 },
        sel,
        250,
        3,
      ),
    ).toBe(0);
  });

  it("remaining respeita appliesTo (capa só dentro do escopo)", () => {
    // só "a" elegível (unidades [100,100]); remaining=1 → 10% de 100.
    expect(
      computeLinkCouponTicketDiscount(
        { type: "PERCENTAGE", value: 10, appliesTo: ["a"], remaining: 1 },
        sel,
        250,
        3,
      ),
    ).toBe(10);
  });
});

describe("computeTicketPricingWithDiscount", () => {
  it("taxa incide sobre o subtotal JÁ DESCONTADO", () => {
    const r = computeTicketPricingWithDiscount(20, 100, 10);
    expect(r.couponDiscount).toBe(20);
    expect(r.subtotalAfterCoupon).toBe(80);
    expect(r.serviceFee).toBeCloseTo(8, 5); // 10% de 80, não de 100
    expect(r.total).toBeCloseTo(88, 5);
    expect(r.showCouponDiscount).toBe(true);
  });
  it("clampa desconto maior que o subtotal (total nunca negativo)", () => {
    const r = computeTicketPricingWithDiscount(150, 100, 10);
    expect(r.subtotalAfterCoupon).toBe(0);
    expect(r.serviceFee).toBe(0);
    expect(r.total).toBe(0);
  });
  it("desconto negativo é clampado em 0 e não exibe", () => {
    const r = computeTicketPricingWithDiscount(-5, 100, 10);
    expect(r.couponDiscount).toBe(0);
    expect(r.showCouponDiscount).toBe(false);
    expect(r.total).toBeCloseTo(110, 5);
  });
  it("feePercent ausente trata como 0", () => {
    const r = computeTicketPricingWithDiscount(0, 100, 0);
    expect(r.serviceFee).toBe(0);
    expect(r.total).toBe(100);
  });
});

describe("computeTicketPricingWithCoupon", () => {
  it("cupom manual: desconta e cobra taxa sobre o descontado", () => {
    const r = computeTicketPricingWithCoupon(coupon({ value: 10 }), 100, 10);
    expect(r.couponDiscount).toBe(10);
    expect(r.subtotalAfterCoupon).toBe(90);
    expect(r.serviceFee).toBeCloseTo(9, 5);
    expect(r.total).toBeCloseTo(99, 5);
    expect(r.showCouponDiscount).toBe(true);
  });
  it("cupom automático (QUANTITY/AGE) é ignorado aqui: taxa sobre subtotal cheio", () => {
    const r = computeTicketPricingWithCoupon(coupon({ couponType: "QUANTITY", value: 10 }), 100, 10);
    expect(r.couponDiscount).toBe(0);
    expect(r.subtotalAfterCoupon).toBe(100);
    expect(r.serviceFee).toBeCloseTo(10, 5);
    expect(r.total).toBeCloseTo(110, 5);
    expect(r.showCouponDiscount).toBe(false);
  });
  it("sem cupom: total = subtotal + taxa cheia", () => {
    const r = computeTicketPricingWithCoupon(null, 100, 10);
    expect(r.couponDiscount).toBe(0);
    expect(r.total).toBeCloseTo(110, 5);
  });
});
