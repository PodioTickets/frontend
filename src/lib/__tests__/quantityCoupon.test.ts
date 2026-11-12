import { describe, it, expect } from "vitest";
import {
  autoDiscountOnTickets,
  combineQuantityCoupons,
  pickBestAutoCoupon,
  quantityCouponForTicket,
  selectQuantityCoupons,
  quantityCouponCandidates,
  quantityCouponCardPreview,
  stackableQuantityCoupons,
  type QuantityAutoCoupon,
} from "../quantityCoupon";

const qc = (over: Partial<QuantityAutoCoupon> = {}): QuantityAutoCoupon => ({
  id: "q1",
  type: "PERCENTAGE",
  value: 10,
  appliesTo: "all",
  minCartValue: null,
  minQuantity: 3,
  maxQuantity: 5,
  createdAt: "2026-01-01T00:00:00.000Z",
  allowStacking: false,
  ...over,
});
const sel = (qty: number, id = "tk-A", price = 100) => [{ id, price, quantity: qty }];
const first = (coupons: QuantityAutoCoupon[], s: ReturnType<typeof sel>, subtotal: number) =>
  quantityCouponCandidates(coupons, s, subtotal)[0] ?? null;

describe("quantityCouponCandidates", () => {
  it("dentro da faixa (bordas inclusivas) → aplica sobre o subtotal coberto", () => {
    expect(first([qc()], sel(3), 300)).toMatchObject({ coupon: qc(), discount: 30, coveredTicketIds: [expect.any(String)] });
    expect(first([qc()], sel(5), 500)?.discount).toBe(50);
  });

  it("abaixo do mínimo ou acima do máximo → não aplica (faixa, não teto)", () => {
    expect(first([qc()], sel(2), 200)).toBeNull();
    expect(first([qc()], sel(8), 800)).toBeNull();
  });

  it("só mínimo ou só máximo", () => {
    expect(first([qc({ maxQuantity: null })], sel(50), 5000)?.discount).toBe(500);
    expect(first([qc({ minQuantity: null })], sel(1), 100)?.discount).toBe(10);
  });

  it("conta só os ingressos do appliesTo (outros não entram na faixa nem no desconto)", () => {
    const c = qc({ appliesTo: '["tk-A"]', minQuantity: 2, maxQuantity: null });
    const mixed = [{ id: "tk-A", price: 100, quantity: 1 }, { id: "tk-B", price: 100, quantity: 5 }];
    expect(quantityCouponCandidates([c], mixed, 600)).toEqual([]); // só 1 do tk-A
    const ok = [{ id: "tk-A", price: 100, quantity: 2 }, { id: "tk-B", price: 100, quantity: 5 }];
    expect(quantityCouponCandidates([c], ok, 700)[0]?.discount).toBe(20); // 10% de 200, não de 700
  });

  it("FIXED = valor por ingresso coberto, capado no subtotal", () => {
    expect(first([qc({ type: "FIXED", value: 1500 })], sel(3), 300)?.discount).toBe(45);
    expect(first([qc({ type: "FIXED", value: 50000 })], sel(3), 300)?.discount).toBe(300);
  });

  it("minCartValue (centavos) não atingido → não aplica", () => {
    expect(first([qc({ minCartValue: 50000 })], sel(3), 300)).toBeNull();
  });

  it("devolve TODOS os que casam, na ordem recebida", () => {
    const a = qc({ id: "a", minQuantity: 10, maxQuantity: null });
    const b = qc({ id: "b", value: 20 });
    const c = qc({ id: "c", value: 30 });
    expect(quantityCouponCandidates([a, b, c], sel(3), 300).map((x) => x.coupon.id)).toEqual(["b", "c"]);
  });

  it("sem cupons / sem seleção → vazio", () => {
    expect(quantityCouponCandidates(undefined, sel(3), 300)).toEqual([]);
    expect(quantityCouponCandidates([qc()], [], 0)).toEqual([]);
  });
});

describe("selectQuantityCoupons (só competem cupons do mesmo ingresso)", () => {
  const cand = (id: string, discount: number, coveredTicketIds: string[], appliesTo: string | null = null) => ({
    coupon: { id, type: "PERCENTAGE" as const, value: 10, appliesTo, minCartValue: null, minQuantity: null, maxQuantity: null, createdAt: "2026-01-01", allowStacking: false },
    discount,
    coveredTicketIds,
  });
  const ids = (list: Array<{ coupon: { id: string } }>) => list.map((c) => c.coupon.id);

  it("ingressos diferentes: valem juntos, maior desconto primeiro", () => {
    expect(ids(selectQuantityCoupons([cand("a", 20, ["t1"]), cand("b", 60, ["t2"])]))).toEqual(["b", "a"]);
  });

  it("mesmo ingresso: vale só o que mais desconta", () => {
    expect(ids(selectQuantityCoupons([cand("a", 20, ["t1"]), cand("b", 60, ["t1"])]))).toEqual(["b"]);
  });

  it("cobertura parcial: o maior tira os concorrentes dos ingressos dele", () => {
    const list = [cand("x", 100, ["a", "b"]), cand("y", 60, ["a"]), cand("z", 60, ["b"])];
    expect(ids(selectQuantityCoupons(list))).toEqual(["x"]);
  });

  it("combineQuantityCoupons soma os descontos; sem cupom é null", () => {
    expect(combineQuantityCoupons(selectQuantityCoupons([cand("a", 20, ["t1"]), cand("b", 60, ["t2"])]))?.discount).toBe(80);
    expect(combineQuantityCoupons([])).toBeNull();
  });

  it("quantityCouponForTicket: cada card usa o cupom do próprio ingresso", () => {
    const list = [cand("a", 20, ["t1"], '["t1"]'), cand("b", 60, ["t2"], '["t2"]')];
    expect(quantityCouponForTicket(list, "t2")?.id).toBe("b");
    expect(quantityCouponForTicket(list, "t3")).toBeNull();
  });
});

describe("pickBestAutoCoupon (mesma regra do backend)", () => {
  const c = (id: string, discount: number, createdAt: string) => ({ id, discount, createdAt });

  it("o que MAIS desconta vence, mesmo criado depois", () => {
    expect(pickBestAutoCoupon([c("age", 20, "2026-01-01"), c("qty", 30, "2026-02-01")])?.id).toBe("qty");
  });

  it("empate → o já aplicado no pedido", () => {
    expect(pickBestAutoCoupon([c("age", 20, "2026-01-01"), c("qty", 20, "2026-02-01")], "qty")?.id).toBe("qty");
  });

  it("empate sem aplicado → o 1º criado, independente da ordem da lista", () => {
    expect(pickBestAutoCoupon([c("qty", 20, "2026-02-01"), c("age", 20, "2026-01-01")])?.id).toBe("age");
  });

  it("desconto 0 não conta; lista vazia → null", () => {
    expect(pickBestAutoCoupon([c("age", 0, "2026-01-01")])).toBeNull();
    expect(pickBestAutoCoupon([])).toBeNull();
  });
});

describe("quantityCouponCardPreview", () => {
  it("risca só os ingressos do appliesTo; 'all' = todos", () => {
    expect(quantityCouponCardPreview(qc({ appliesTo: '["tk-A"]' })).appliesTo).toEqual(["tk-A"]);
    expect(quantityCouponCardPreview(qc()).appliesTo).toBeNull();
  });
});

describe("stackableQuantityCoupons", () => {
  const list = [qc({ id: "solo" }), qc({ id: "acumula", allowStacking: true })];
  const all = ["tk-A", "tk-B"];

  it("sem cupom de código: todos valem", () => {
    expect(stackableQuantityCoupons(list, null, all)?.map((c) => c.id)).toEqual(["solo", "acumula"]);
  });

  it("cupom de código em todos os ingressos: só os que acumulam", () => {
    expect(stackableQuantityCoupons(list, { appliesTo: null }, all)?.map((c) => c.id)).toEqual(["acumula"]);
  });

  it("automático perde só os ingressos do cupom de código (2026-11-11)", () => {
    const r = stackableQuantityCoupons(list, { appliesTo: ["tk-A"] }, all);
    expect(r?.map((c) => [c.id, c.appliesTo])).toEqual([["solo", '["tk-B"]'], ["acumula", "all"]]);
    const scoped = [qc({ id: "ab", appliesTo: '["tk-A","tk-B"]' })];
    expect(stackableQuantityCoupons(scoped, { appliesTo: ["tk-B"] }, all)?.map((c) => c.appliesTo)).toEqual(['["tk-A"]']);
  });

  it("sem ingresso sobrando o automático sai", () => {
    expect(stackableQuantityCoupons([qc({ id: "b", appliesTo: '["tk-B"]' })], { appliesTo: ["tk-B"] }, all)).toEqual([]);
  });

  it("cupom de código em outro ingresso: o automático vale junto, igual", () => {
    const scoped = [qc({ id: "a", appliesTo: '["tk-A"]' })];
    expect(stackableQuantityCoupons(scoped, { appliesTo: ["tk-B"] }, all)).toEqual(scoped);
  });
});

describe("autoDiscountOnTickets", () => {
  const selected = [
    { id: "tk-A", price: 100, quantity: 3 },
    { id: "tk-B", price: 50, quantity: 1 },
  ];

  it("automático em outro ingresso não entra no rebase do manual", () => {
    const auto = quantityCouponCandidates([qc({ appliesTo: '["tk-A"]' })], selected, 350);
    expect(autoDiscountOnTickets(auto, selected, ["tk-B"])).toBe(0);
    expect(autoDiscountOnTickets(auto, selected, ["tk-A"])).toBe(30);
    expect(autoDiscountOnTickets(auto, selected, null)).toBe(30);
  });

  it("automático em vários ingressos: só a parte dos ingressos do manual", () => {
    const auto = quantityCouponCandidates([qc({ maxQuantity: null })], selected, 350);
    expect(autoDiscountOnTickets(auto, selected, ["tk-B"])).toBe(5);
  });
});
