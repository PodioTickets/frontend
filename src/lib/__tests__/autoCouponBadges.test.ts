import { describe, it, expect } from "vitest";
import { autoCouponDisplay, type AgeDisplayCoupon, type AutoCouponTicket, type ManualDisplayCoupon } from "../autoCouponBadges";
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
  allowStacking: false,
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

  describe("selo no card da categoria", () => {
    const a1: AutoCouponTicket = { id: "a1", price: 100, categoryId: "catA" };
    const a2: AutoCouponTicket = { id: "a2", price: 50, categoryId: "catA" };
    const b1: AutoCouponTicket = { id: "b1", price: 80, categoryId: "catB" };
    const solo: AutoCouponTicket = { id: "solo", price: 80 };
    const list = [a1, a2, b1, solo];
    const ids = (...t: string[]) => JSON.stringify(t);

    it("cobre a categoria inteira: 1 selo na categoria e nenhum nos ingressos dela", () => {
      const d = autoCouponDisplay(list, [qc({ appliesTo: ids("a1", "a2") })], []);
      expect(d.byCategory.catA?.id).toBe("q1");
      expect(d.byTicket).toEqual({});
    });

    it("cobre só parte da categoria: selo fica no ingresso", () => {
      const d = autoCouponDisplay(list, [qc({ appliesTo: only("a1") })], []);
      expect(d.byCategory).toEqual({});
      expect(d.byTicket.a1?.id).toBe("q1");
    });

    it("cupons diferentes na mesma categoria: cada ingresso mantém o seu", () => {
      const d = autoCouponDisplay(list, [qc({ id: "q1", appliesTo: only("a1") }), qc({ id: "q2", appliesTo: only("a2") })], []);
      expect(d.byCategory).toEqual({});
      expect(Object.keys(d.byTicket).sort()).toEqual(["a1", "a2"]);
    });

    it("ingresso sem categoria segue com selo próprio", () => {
      const d = autoCouponDisplay(list, [qc({ appliesTo: only("solo") })], []);
      expect(d.byCategory).toEqual({});
      expect(d.byTicket.solo?.id).toBe("q1");
    });

    it("cupom que cobre todos os ingressos segue no anúncio, não na categoria", () => {
      const d = autoCouponDisplay(list, [qc()], []);
      expect(d.general?.id).toBe("q1");
      expect(d.byCategory).toEqual({});
    });
  });

  describe("cupom manual aplicado", () => {
    const manual = (over: Partial<ManualDisplayCoupon> = {}): ManualDisplayCoupon => ({
      id: "m1", code: "PODIO15", type: "PERCENTAGE", value: 15, appliesTo: null, ...over,
    });
    const display = (m: ManualDisplayCoupon, q: QuantityAutoCoupon[] = []) =>
      autoCouponDisplay(tickets, q, [], undefined, m);

    it("geral: anúncio próprio, sem tirar o do automático (eles somam)", () => {
      const d = display(manual(), [qc()]);
      expect(d.manualGeneral?.discount).toBe("15%");
      expect(d.manualGeneral?.howTo).toBe("Cupom PODIO15 aplicado ao seu pedido.");
      expect(d.general?.id).toBe("q1");
      expect(d.byTicket).toEqual({});
    });

    it("específico: vira selo só nos ingressos dele", () => {
      const d = display(manual({ appliesTo: ["t1"] }));
      expect(d.manualGeneral).toBeNull();
      expect(Object.keys(d.byTicket)).toEqual(["t1"]);
    });

    it("específico divide o selo com o automático: fica o maior", () => {
      const auto = qc({ id: "esp", value: 30, appliesTo: only("t1") });
      expect(display(manual({ appliesTo: ["t1"] }), [auto]).byTicket.t1.id).toBe("esp");
      expect(display(manual({ appliesTo: ["t1"], value: 40 }), [auto]).byTicket.t1.id).toBe("m1");
    });

    it("específico aparece mesmo menor que o automático geral (eles somam)", () => {
      expect(display(manual({ appliesTo: ["t1"], value: 5 }), [qc()]).byTicket.t1.id).toBe("m1");
    });

    it("condição do cupom no texto de como ativar", () => {
      expect(display(manual({ minQuantity: 2 })).manualGeneral?.howTo).toBe("Cupom PODIO15: vale ao comprar 2 ou mais ingressos.");
      expect(display(manual({ minCartValue: 10000 })).manualGeneral?.howTo).toMatch(/^Cupom PODIO15: vale em compras a partir de R\$\s100,00\.$/);
    });
  });

  it("ingresso gratuito, valor zero e lista vazia não anunciam nada", () => {
    expect(autoCouponDisplay([{ id: "t1", price: 0 }], [qc()], []).general).toBeNull();
    expect(autoCouponDisplay(tickets, [qc({ value: 0 })], []).general).toBeNull();
    expect(autoCouponDisplay([], [qc()], []).general).toBeNull();
    expect(autoCouponDisplay(tickets, null, undefined)).toEqual({ general: null, manualGeneral: null, byTicket: {}, byCategory: {} });
  });
});
