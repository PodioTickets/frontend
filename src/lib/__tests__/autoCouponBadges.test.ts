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

  it("agrupa cupons do mesmo tipo num selo só, com todas as condições", () => {
    const b = ticketAutoCouponBadges(
      t,
      [qc({ id: "q1", minQuantity: 2, maxQuantity: 3, value: 10 }), qc({ id: "q2", minQuantity: 4, value: 20 })],
      [ac({ id: "a1", maxAge: 10 }), ac({ id: "a2", minAge: 60, maxAge: null })],
    );
    expect(b.map((x) => x.kind)).toEqual(["QUANTITY", "AGE"]);
    expect(b[0].shortText).toBe("Cupom por quantidade");
    expect(b[0].tinyText).toBe("Quantidade");
    expect(b[0].fullTexts).toEqual([
      "Compre de 2 a 3 ingressos e ganhe 10% de desconto!",
      "Compre 4 ou mais ingressos e ganhe 20% de desconto!",
    ]);
    // Mesmo desconto (20% e 20%) → o selo mantém o valor.
    expect(b[1].shortText).toBe("Cupom por idade 20%");
    expect(b[1].fullTexts).toHaveLength(2);
  });

  it("um cupom por tipo não ganha fullTexts", () => {
    const b = ticketAutoCouponBadges(t, [qc()], [ac()]);
    expect(b.every((x) => x.fullTexts === undefined)).toBe(true);
  });

  it("respeita appliesTo e o limite de idade do ingresso", () => {
    expect(full([qc({ appliesTo: JSON.stringify(["outro"]) })], [])).toEqual([]);
    expect(full([], [ac({ maxAge: 10 })], { id: "t1", ageLimit: { min: 16 } })).toEqual([]);
    expect(full([], [ac({ minAge: 30, maxAge: 38 })], { id: "t1", ageLimit: { min: 16 } })).toHaveLength(1);
  });
});
