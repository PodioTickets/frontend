import { describe, it, expect } from "vitest";
import { formatRawTicket } from "@/hooks/useTickets";

/**
 * Gate de kit no normalizador de ticket do checkout: um ingresso SEM kit (hasKit=false)
 * NUNCA expõe produtos, mesmo que o payload ainda traga vínculos órfãos (dados legados
 * criados antes do fix do backend). Corrige "ingresso sem kit aparecendo com os produtos"
 * nas telas de ingressos e produtos.
 */
describe("formatRawTicket — gate de produtos por hasKit", () => {
  const baseRaw = {
    id: "t1",
    name: "Ingresso",
    batches: [{ id: "b1", quantity: 100, price: 5000 }],
    productIds: ["p1", "p2"],
    products: [
      { productId: "p1", product: { name: "Camiseta", images: ["/a.jpg"] } },
      { productId: "p2", product: { name: "Boné", images: ["/b.jpg"] } },
    ],
  };

  it("hasKit=false → products e productImages VAZIOS (mesmo com vínculos no payload)", () => {
    const t = formatRawTicket({ ...baseRaw, hasKit: false });
    expect(t.hasKit).toBe(false);
    expect(t.products).toEqual([]);
    expect(t.productImages).toEqual([]);
  });

  it("hasKit=true → produtos preservados", () => {
    const t = formatRawTicket({ ...baseRaw, hasKit: true });
    expect(t.hasKit).toBe(true);
    expect(t.products).toEqual(["p1", "p2"]);
    expect(t.productImages).toHaveLength(2);
  });

  it("hasKit ausente (undefined) → comportamento atual preservado (não bloqueia)", () => {
    const t = formatRawTicket({ ...baseRaw });
    expect(t.hasKit).toBeUndefined();
    expect(t.products).toEqual(["p1", "p2"]);
    expect(t.productImages).toHaveLength(2);
  });

  it("hasKit=false + fallback pelo join products (sem productIds) → também vazio", () => {
    const { productIds, ...noBundle } = baseRaw;
    void productIds;
    const t = formatRawTicket({ ...noBundle, hasKit: false });
    expect(t.products).toEqual([]);
    expect(t.productImages).toEqual([]);
  });
});
