import { describe, it, expect } from "vitest";
import { ticketAutoCouponBadges, type AgeDisplayCoupon } from "../autoCouponBadges";
import type { QuantityAutoCoupon } from "../quantityCoupon";

const qc = (over: Partial<QuantityAutoCoupon> = {}): QuantityAutoCoupon => ({
  id: "q1",
  type: "PERCENTAGE",
  value: 20,
  appliesTo: "all",
  minCartValue: null,
  minQuantity: 3,
  maxQuantity: null,
  createdAt: null,
  ...over,
});
const ac = (over: Partial<AgeDisplayCoupon> = {}): AgeDisplayCoupon => ({
  id: "a1",
  type: "PERCENTAGE",
  value: 20,
  appliesTo: "all",
  minAge: null,
  maxAge: 10,
  ...over,
});
const t: { id: string; ageLimit?: { min?: number; max?: number } } = { id: "t1" };
const full = (q: QuantityAutoCoupon[], a: AgeDisplayCoupon[], ticket = t) =>
  ticketAutoCouponBadges(ticket, q, a).map((b) => b.fullText);

describe("ticketAutoCouponBadges", () => {
  it("textos de quantidade (com e sem máximo)", () => {
    expect(full([qc()], [])).toEqual(["Compre 3 ou mais ingressos e ganhe 20% de desconto!"]);
    expect(full([qc({ maxQuantity: 5 })], [])).toEqual(["Compre de 3 a 5 ingressos e ganhe 20% de desconto!"]);
  });

  it("textos de idade (até, faixa, a partir de)", () => {
    expect(full([], [ac()])).toEqual(["20% de desconto até 10 anos de idade."]);
    expect(full([], [ac({ minAge: 10, maxAge: 15 })])).toEqual(["20% de desconto para idades de 10 a 15 anos."]);
    expect(full([], [ac({ minAge: 10, maxAge: null })])).toEqual(["20% de desconto a partir dos 10 anos de idade."]);
  });

  it("resumido: quantidade antes de idade; FIXED em reais", () => {
    const b = ticketAutoCouponBadges(t, [qc({ type: "FIXED", value: 1000 })], [ac()]);
    expect(b.map((x) => x.kind)).toEqual(["QUANTITY", "AGE"]);
    expect(b[0].shortText).toMatch(/^Cupom por quantidade R\$\s10,00$/);
    expect(b[1].shortText).toBe("Cupom por idade 20%");
  });

  it("respeita appliesTo e o limite de idade do ingresso", () => {
    expect(full([qc({ appliesTo: JSON.stringify(["outro"]) })], [])).toEqual([]);
    expect(full([], [ac({ maxAge: 10 })], { id: "t1", ageLimit: { min: 16 } })).toEqual([]);
    expect(full([], [ac({ minAge: 30, maxAge: 38 })], { id: "t1", ageLimit: { min: 16 } })).toHaveLength(1);
  });
});
