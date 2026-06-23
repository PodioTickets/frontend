import { describe, it, expect } from "vitest";
import type { AgeAppliedCoupon } from "../ageCoupon";
import {
  formatAgeCouponLineLabel,
  computeAgeCouponTicketDiscount,
  isAgeWithinTicketLimit,
} from "../ageCoupon";

/**
 * Caracterização do cupom AUTOMÁTICO de idade (exibição pré-reserva).
 * Trava o comportamento atual antes de refatorar o checkout.
 */

const ageCoupon = (over: Partial<AgeAppliedCoupon> = {}): AgeAppliedCoupon => ({
  id: "age1",
  couponType: "AGE",
  type: "PERCENTAGE",
  value: 10,
  ...over,
});

describe("formatAgeCouponLineLabel", () => {
  it("PERCENTAGE com value > 0 mostra a porcentagem", () => {
    expect(formatAgeCouponLineLabel(ageCoupon({ value: 15 }))).toBe(
      "Cupom automático (15% OFF)",
    );
  });
  it("FIXED (ou value 0) vira 'Cupom automático' sem sufixo", () => {
    expect(formatAgeCouponLineLabel(ageCoupon({ type: "FIXED", value: 5000 }))).toBe(
      "Cupom automático",
    );
    expect(formatAgeCouponLineLabel(ageCoupon({ value: 0 }))).toBe("Cupom automático");
  });
});

describe("computeAgeCouponTicketDiscount", () => {
  const sel = [
    { id: "a", price: 100, quantity: 2 }, // R$200
    { id: "b", price: 50, quantity: 1 }, // R$50
  ];
  it("0 quando ausente ou value <= 0", () => {
    expect(computeAgeCouponTicketDiscount(null, sel, 250)).toBe(0);
    expect(computeAgeCouponTicketDiscount(ageCoupon({ value: 0 }), sel, 250)).toBe(0);
  });
  it("0 quando carrinho abaixo do minCartValue (centavos)", () => {
    // 30000 centavos = R$300; carrinho R$250 < R$300 → 0
    expect(
      computeAgeCouponTicketDiscount(ageCoupon({ minCartValue: 30000 }), sel, 250),
    ).toBe(0);
  });
  it("aplica quando carrinho atinge o minCartValue", () => {
    expect(
      computeAgeCouponTicketDiscount(ageCoupon({ value: 10, minCartValue: 25000 }), sel, 250),
    ).toBe(25);
  });
  it("PERCENTAGE sobre todos quando appliesTo 'all'/ausente", () => {
    expect(computeAgeCouponTicketDiscount(ageCoupon({ value: 10 }), sel, 250)).toBe(25);
    expect(
      computeAgeCouponTicketDiscount(ageCoupon({ value: 10, appliesTo: "all" }), sel, 250),
    ).toBe(25);
  });
  it("PERCENTAGE só sobre ticketIds cobertos (appliesTo JSON)", () => {
    expect(
      computeAgeCouponTicketDiscount(
        ageCoupon({ value: 10, appliesTo: '["a"]' }),
        sel,
        250,
      ),
    ).toBe(20); // 10% de 200
  });
  it("0 quando nenhum ingresso elegível", () => {
    expect(
      computeAgeCouponTicketDiscount(ageCoupon({ value: 10, appliesTo: '["z"]' }), sel, 250),
    ).toBe(0);
  });
  it("FIXED em centavos, clampado ao subtotal elegível", () => {
    expect(
      computeAgeCouponTicketDiscount(ageCoupon({ type: "FIXED", value: 3000 }), sel, 250),
    ).toBe(30);
    expect(
      computeAgeCouponTicketDiscount(
        ageCoupon({ type: "FIXED", value: 999999, appliesTo: '["b"]' }),
        sel,
        250,
      ),
    ).toBe(50);
  });
  it("appliesTo não-JSON é tratado como sem restrição (todos)", () => {
    expect(
      computeAgeCouponTicketDiscount(ageCoupon({ value: 10, appliesTo: "qualquer" }), sel, 250),
    ).toBe(25);
  });
});

describe("isAgeWithinTicketLimit", () => {
  it("sem limite → sempre dentro", () => {
    expect(isAgeWithinTicketLimit(30, null)).toBe(true);
    expect(isAgeWithinTicketLimit(30, undefined)).toBe(true);
  });
  it("respeita min e max (inclusivos)", () => {
    expect(isAgeWithinTicketLimit(17, { min: 18 })).toBe(false);
    expect(isAgeWithinTicketLimit(18, { min: 18 })).toBe(true);
    expect(isAgeWithinTicketLimit(60, { max: 59 })).toBe(false);
    expect(isAgeWithinTicketLimit(59, { max: 59 })).toBe(true);
    expect(isAgeWithinTicketLimit(40, { min: 18, max: 59 })).toBe(true);
  });
});
