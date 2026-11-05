import { describe, it, expect } from "vitest";
import { autoCouponDisplay, type AgeDisplayCoupon, type AutoCouponTicket } from "../autoCouponBadges";
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
const t1: AutoCouponTicket = { id: "t1", price: 100 };
const t2: AutoCouponTicket = { id: "t2", price: 50 };
const tickets = [t1, t2];
const only = (id: string) => JSON.stringify([id]);

describe("autoCouponDisplay", () => {
  it("texto de como ativar: quantidade", () => {
    const howTo = (c: QuantityAutoCoupon) => autoCouponDisplay(tickets, [c], []).general?.howTo;
    expect(howTo(qc())).toBe("Ganhe 20% de desconto por ingresso ao comprar 3 ou mais!");
    expect(howTo(qc({ minQuantity: 2, maxQuantity: 4 }))).toBe("Ganhe 20% de desconto por ingresso ao comprar de 2 a 4!");
    expect(howTo(qc({ minQuantity: 3, maxQuantity: 3 }))).toBe("Ganhe 20% de desconto por ingresso ao comprar 3!");
  });

  it("texto de como ativar: idade", () => {
    const howTo = (c: AgeDisplayCoupon) => autoCouponDisplay(tickets, [], [c]).general?.howTo;
    expect(howTo(ac())).toBe("20% de desconto até 10 anos de idade.");
    expect(howTo(ac({ minAge: 5, maxAge: 10 }))).toBe("20% de desconto para idades de 5 a 10 anos.");
    expect(howTo(ac({ minAge: 60, maxAge: null }))).toBe("20% de desconto a partir dos 60 anos de idade.");
  });

  it("vários gerais: anuncia só o mais vantajoso, quantidade ou idade", () => {
    const d = autoCouponDisplay(tickets, [qc({ id: "q10", value: 10 })], [ac({ id: "a30", value: 30 })]);
    expect(d.general?.id).toBe("a30");
    expect(d.byTicket).toEqual({});
  });

  it("gerais de tipos diferentes comparam em reais sobre os ingressos", () => {
    // 10% de (100 + 50) = R$ 15; R$ 10 fixo por ingresso = R$ 20.
    const d = autoCouponDisplay(tickets, [qc({ id: "pct", value: 10 }), qc({ id: "fix", type: "FIXED", value: 1000 })], []);
    expect(d.general?.id).toBe("fix");
    expect(d.general?.discount).toMatch(/R\$\s10,00/);
  });

  it("empate entre gerais: fica o 1º recebido", () => {
    expect(autoCouponDisplay(tickets, [qc({ id: "antigo" }), qc({ id: "novo" })], []).general?.id).toBe("antigo");
  });

  it("específico melhor que o geral vira selo no ingresso", () => {
    const d = autoCouponDisplay(tickets, [qc(), qc({ id: "esp", value: 30, appliesTo: only("t1") })], []);
    expect(d.general?.id).toBe("q1");
    expect(Object.keys(d.byTicket)).toEqual(["t1"]);
    expect(d.byTicket.t1.id).toBe("esp");
  });

  it("específico igual ou pior que o geral é ignorado", () => {
    const pior = autoCouponDisplay(tickets, [qc(), qc({ id: "esp", value: 10, appliesTo: only("t1") })], []);
    const igual = autoCouponDisplay(tickets, [qc(), qc({ id: "esp", value: 20, appliesTo: only("t1") })], []);
    expect(pior.byTicket).toEqual({});
    expect(igual.byTicket).toEqual({});
  });

  it("específico compara em reais no preço daquele ingresso", () => {
    // Geral 20%: R$ 20 em t1 e R$ 10 em t2. Fixo de R$ 15 só ganha em t2.
    const fixo = qc({ id: "fix", type: "FIXED", value: 1500, appliesTo: only("t2") });
    expect(autoCouponDisplay(tickets, [qc(), fixo], []).byTicket.t2.id).toBe("fix");
    const emT1 = qc({ id: "fix", type: "FIXED", value: 1500, appliesTo: only("t1") });
    expect(autoCouponDisplay(tickets, [qc(), emT1], []).byTicket).toEqual({});
  });

  it("sem geral: cada ingresso mostra o seu melhor específico, sem somar", () => {
    const d = autoCouponDisplay(
      tickets,
      [
        qc({ id: "a", value: 10, appliesTo: only("t1") }),
        qc({ id: "b", value: 30, appliesTo: only("t1") }),
        qc({ id: "c", type: "FIXED", value: 2000, appliesTo: only("t2") }),
      ],
      [],
    );
    expect(d.general).toBeNull();
    expect(d.byTicket.t1.id).toBe("b");
    expect(d.byTicket.t1.discount).toBe("30%");
    expect(d.byTicket.t2.discount).toMatch(/R\$\s20,00/);
  });

  it("appliesTo com todos os ingressos conta como geral", () => {
    const d = autoCouponDisplay(tickets, [qc({ appliesTo: JSON.stringify(["t1", "t2"]) })], []);
    expect(d.general?.id).toBe("q1");
  });

  it("idade fora do limite do ingresso não cobre esse ingresso", () => {
    const adulto = { ...t2, ageLimit: { min: 18 } };
    const d = autoCouponDisplay([t1, adulto], [], [ac({ maxAge: 10 })]);
    expect(d.general).toBeNull();
    expect(Object.keys(d.byTicket)).toEqual(["t1"]);
  });

  it("ingresso gratuito, valor zero e lista vazia não anunciam nada", () => {
    expect(autoCouponDisplay([{ id: "t1", price: 0 }], [qc()], []).general).toBeNull();
    expect(autoCouponDisplay(tickets, [qc({ value: 0 })], []).general).toBeNull();
    expect(autoCouponDisplay([], [qc()], []).general).toBeNull();
    expect(autoCouponDisplay(tickets, null, undefined)).toEqual({ general: null, byTicket: {} });
  });
});
