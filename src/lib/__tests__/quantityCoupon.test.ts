import { describe, it, expect } from "vitest";
import {
  pickBestAutoCoupon,
  quantityCouponCandidates,
  quantityCouponCardPreview,
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
  ...over,
});
const sel = (qty: number, id = "tk-A", price = 100) => [{ id, price, quantity: qty }];
const first = (coupons: QuantityAutoCoupon[], s: ReturnType<typeof sel>, subtotal: number) =>
  quantityCouponCandidates(coupons, s, subtotal)[0] ?? null;

describe("quantityCouponCandidates", () => {
  it("dentro da faixa (bordas inclusivas) → aplica sobre o subtotal coberto", () => {
    expect(first([qc()], sel(3), 300)).toEqual({ coupon: qc(), discount: 30 });
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
