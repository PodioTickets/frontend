import { describe, it, expect } from "vitest";
import { normalizeNationality } from "@/utils/nationality";
import { isPersonBr } from "@/utils/documentDisplay";
import { getCountryCodeFromName } from "@/utils/phone";
import {
  computeCouponDiscount,
  computeLinkCouponTicketDiscount,
  couponConditionsMet,
  couponCoversAnySelected,
  normalizeCouponAppliesTo,
} from "@/lib/orderCouponDiscount";
import type { OrderCoupon } from "@/interfaces/order";

/**
 * Testes da AUDITORIA do fluxo de checkout (2026-05-28).
 *
 * Cada bloco guarda a correção de um achado HIGH/MEDIUM confirmado. Asseveram o
 * comportamento PRETENDIDO; falharam antes do fix (prova empírica do bug) e hoje
 * passam como regressão. O id do achado está no comentário de cada caso.
 */

// ── i18n / detecção de BR ─────────────────────────────────────────────────

describe("nationality.normalizeNationality", () => {
  // regressão (deve passar hoje)
  it("normaliza gentílico BR e mantém países estrangeiros", () => {
    expect(normalizeNationality("Brasileira")).toBe("Brasil");
    expect(normalizeNationality("Brasileiro")).toBe("Brasil");
    expect(normalizeNationality("Argentina")).toBe("Argentina");
    expect(normalizeNationality("")).toBeUndefined();
  });

  // fix H4 (normalize-nationality-misses-brazil-br): mapeia variantes BR.
  it("mapeia Brazil/BR/brazil para 'Brasil'", () => {
    expect(normalizeNationality("Brazil")).toBe("Brasil");
    expect(normalizeNationality("BR")).toBe("Brasil");
    expect(normalizeNationality("brazil")).toBe("Brasil");
  });
});

describe("documentDisplay.isPersonBr", () => {
  // regressão (deve passar hoje)
  it("classifica BR canônico e estrangeiro corretamente", () => {
    expect(isPersonBr({ country: "Brasil" })).toBe(true);
    expect(isPersonBr({ country: "Brazil" })).toBe(true); // isBrazilianCountry cobre "brazil"
    expect(isPersonBr({ country: "Estados Unidos" })).toBe(false);
    expect(isPersonBr({ document: "12345678901" })).toBe(true); // shape CPF
    expect(isPersonBr({ document: "AB123456" })).toBe(false); // tem letras
  });

  // fix H5 (ispersonbr-gentilico-not-normalized): normaliza gentílico antes.
  it("trata gentílico 'Brasileira'/'Brasileiro' como BR", () => {
    expect(isPersonBr({ country: "Brasileira", document: "12345678901" })).toBe(true);
    expect(isPersonBr({ country: "Brasileiro", document: "12345678901" })).toBe(true);
  });
});

describe("phone.getCountryCodeFromName", () => {
  // regressão (deve passar hoje)
  it("resolve países PT-BR para ISO correto", () => {
    expect(getCountryCodeFromName("Brasil")).toBe("BR");
    expect(getCountryCodeFromName("Estados Unidos")).toBe("US");
    expect(getCountryCodeFromName("Congo")).toBe("CG"); // Congo-Brazzaville (+242)
  });

  // fix M2 (dr-congo-wrong-iso): alias explícito → CD (+243).
  it("República Democrática do Congo resolve para CD (+243)", () => {
    expect(getCountryCodeFromName("República Democrática do Congo")).toBe("CD");
  });
});

// ── pricing / cupom FIXED (unidade) ───────────────────────────────────────

describe("orderCouponDiscount.computeCouponDiscount — cupom FIXED (unidade)", () => {
  const fixed = (value: number): OrderCoupon =>
    ({ id: "x", code: "X", couponType: "DISCOUNT", type: "FIXED", value } as unknown as OrderCoupon);

  // fix H1 (fixed-coupon-unit-mismatch): value FIXED em CENTAVOS → reais.
  it("cupom FIXED de R$50 (value=5000 centavos) desconta R$50 de um carrinho de R$200", () => {
    expect(computeCouponDiscount(fixed(5000), 200, 0).totalDiscount).toBe(50);
  });

  it("cupom FIXED maior que o subtotal faz clamp na base (não fica negativo)", () => {
    // R$300 (value=30000) sobre carrinho de R$200 → desconta no máximo R$200.
    expect(computeCouponDiscount(fixed(30000), 200, 0).totalDiscount).toBe(200);
  });
});

// ── cupom de LINK: appliesTo + minCartValue + minQuantity ─────────────────
// Regras do preview (`GET /coupons/.../preview`) aplicadas no /ingressos.
// Ausência de min* = sem condição (interceptor remove null). appliesTo null = todos.

describe("orderCouponDiscount.couponConditionsMet", () => {
  it("sem condições (min* null) sempre atende", () => {
    expect(couponConditionsMet({}, 0, 0)).toBe(true);
  });

  it("minCartValue (centavos) compara com o subtotal em REAIS", () => {
    // mínimo R$50 (5000 centavos): R$40 não atende, R$50 atende.
    expect(couponConditionsMet({ minCartValue: 5000 }, 40, 1)).toBe(false);
    expect(couponConditionsMet({ minCartValue: 5000 }, 50, 1)).toBe(true);
  });

  it("minQuantity compara com a quantidade de ingressos", () => {
    expect(couponConditionsMet({ minQuantity: 2 }, 999, 1)).toBe(false);
    expect(couponConditionsMet({ minQuantity: 2 }, 999, 2)).toBe(true);
  });
});

describe("orderCouponDiscount.computeLinkCouponTicketDiscount", () => {
  const A = { id: "tk-A", price: 100, quantity: 1 };
  const B = { id: "tk-B", price: 50, quantity: 1 };

  it("appliesTo null → todos os ingressos elegíveis (10% de R$150 = R$15)", () => {
    const c = { type: "PERCENTAGE" as const, value: 10, appliesTo: null };
    expect(computeLinkCouponTicketDiscount(c, [A, B], 150, 2)).toBe(15);
  });

  it("appliesTo subconjunto desconta SÓ os cobertos (10% de tk-A = R$10)", () => {
    const c = { type: "PERCENTAGE" as const, value: 10, appliesTo: ["tk-A"] };
    expect(computeLinkCouponTicketDiscount(c, [A, B], 150, 2)).toBe(10);
  });

  it("minCartValue não atingido → 0 (silêncio)", () => {
    const c = { type: "PERCENTAGE" as const, value: 10, minCartValue: 20000 };
    expect(computeLinkCouponTicketDiscount(c, [A, B], 150, 2)).toBe(0);
  });

  it("minQuantity não atingido → 0 (silêncio)", () => {
    const c = { type: "PERCENTAGE" as const, value: 10, minQuantity: 3 };
    expect(computeLinkCouponTicketDiscount(c, [A, B], 150, 2)).toBe(0);
  });

  it("FIXED (centavos) clampado ao subtotal ELEGÍVEL de appliesTo", () => {
    // R$80 de desconto (8000) restrito a tk-B (R$50) → clamp em R$50.
    const c = { type: "FIXED" as const, value: 8000, appliesTo: ["tk-B"] };
    expect(computeLinkCouponTicketDiscount(c, [A, B], 150, 2)).toBe(50);
  });

  it("nenhum ingresso elegível selecionado → 0", () => {
    const c = { type: "PERCENTAGE" as const, value: 10, appliesTo: ["tk-Z"] };
    expect(computeLinkCouponTicketDiscount(c, [A, B], 150, 2)).toBe(0);
  });
});

describe("orderCouponDiscount.couponCoversAnySelected", () => {
  const A = { id: "tk-A", quantity: 1 };
  const B = { id: "tk-B", quantity: 1 };

  it("appliesTo null/vazio cobre todos (true)", () => {
    expect(couponCoversAnySelected(null, [A])).toBe(true);
    expect(couponCoversAnySelected([], [A])).toBe(true);
  });

  it("true quando ALGUM selecionado está no appliesTo", () => {
    expect(couponCoversAnySelected(["tk-A"], [A, B])).toBe(true);
  });

  it("false quando NENHUM selecionado está no appliesTo (esconde o cupom)", () => {
    expect(couponCoversAnySelected(["tk-Z"], [A, B])).toBe(false);
  });

  it("ignora itens com quantidade 0", () => {
    expect(couponCoversAnySelected(["tk-A"], [{ id: "tk-A", quantity: 0 }])).toBe(false);
  });
});

describe("orderCouponDiscount.normalizeCouponAppliesTo", () => {
  it("null/undefined/'all' → null (todos)", () => {
    expect(normalizeCouponAppliesTo(null)).toBeNull();
    expect(normalizeCouponAppliesTo(undefined)).toBeNull();
    expect(normalizeCouponAppliesTo("all")).toBeNull();
  });

  it("array de ids → o próprio array; vazio → null", () => {
    expect(normalizeCouponAppliesTo(["tk-A", "tk-B"])).toEqual(["tk-A", "tk-B"]);
    expect(normalizeCouponAppliesTo([])).toBeNull();
  });

  it("string JSON (OrderCoupon.appliesTo) → lista de ids", () => {
    expect(normalizeCouponAppliesTo('["tk-A","tk-B"]')).toEqual(["tk-A", "tk-B"]);
  });

  it("string não-JSON → null (sem restrição)", () => {
    expect(normalizeCouponAppliesTo("qualquer-coisa")).toBeNull();
  });
});
