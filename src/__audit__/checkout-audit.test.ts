import { describe, it, expect } from "vitest";
import { normalizeNationality } from "@/utils/nationality";
import { isPersonBr } from "@/utils/documentDisplay";
import { getCountryCodeFromName } from "@/utils/phone";
import { computeCouponDiscount } from "@/lib/orderCouponDiscount";
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
