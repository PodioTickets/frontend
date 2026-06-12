import { describe, it, expect } from "vitest";
import {
  variationHoldsStock,
  isVariationSoldOut,
  previewVariationListPriceLabelForProduct,
  billableReaisForProductSelection,
} from "../SubscriptionStep.utils";
import type { Product } from "../SubscriptionStep.utils";

/**
 * Regra de estoque no checkout (espelha `holdsStock` do backend). Política atual:
 * TODO produto segura o próprio estoque da variação — inclusive incluso+obrigatório.
 */
describe("SubscriptionStep.utils — regra de estoque", () => {
  describe("variationHoldsStock", () => {
    it("incluso+obrigatório AGORA segura estoque", () => {
      expect(variationHoldsStock({ isIncludedInTicket: true, isRequired: true })).toBe(true);
    });
    it("demais combinações também seguram", () => {
      expect(variationHoldsStock({ isIncludedInTicket: true, isRequired: false })).toBe(true);
      expect(variationHoldsStock({ isIncludedInTicket: false, isRequired: true })).toBe(true);
      expect(variationHoldsStock({ isIncludedInTicket: false, isRequired: false })).toBe(true);
    });
  });

  describe("isVariationSoldOut", () => {
    const incRequired = { isIncludedInTicket: true, isRequired: true };

    it("incluso+obrigatório com estoque LIMITADO esgotado → esgotado", () => {
      expect(isVariationSoldOut(incRequired, { stock: 10, availableStock: 0 })).toBe(true);
    });
    it("incluso+obrigatório com disponível → NÃO esgotado", () => {
      expect(isVariationSoldOut(incRequired, { stock: 10, availableStock: 3 })).toBe(false);
    });
    it("stock 0 = ilimitado → nunca esgota (mesmo incluso+obrigatório)", () => {
      expect(isVariationSoldOut(incRequired, { stock: 0, availableStock: 0 })).toBe(false);
    });
    it("produto opcional limitado esgotado → esgotado", () => {
      expect(
        isVariationSoldOut({ isIncludedInTicket: false, isRequired: false }, { stock: 5, availableStock: 0 }),
      ).toBe(true);
    });
  });
});

/**
 * Semântica do preço da variação (decisão 2026-06-12): o valor digitado é o
 * PREÇO TOTAL daquela variação. Para produto NÃO incluso, prévia e cobrança
 * mostram/cobram o total cheio (não subtraem a base). Para produto INCLUSO no
 * ingresso a base já está paga → mostra/cobra só o acréscimo sobre a base.
 */
describe("SubscriptionStep.utils — preço de variação (total, não acréscimo)", () => {
  // Intl.NumberFormat insere espaço não-quebrável (NBSP/NNBSP) entre "R$" e o
  // valor. `\s` em JS cobre esses espaços → remove todo whitespace antes de comparar.
  const norm = (s: string | undefined) =>
    s == null ? s : s.replace(/\s/g, "");

  const makeProduct = (over: Partial<Product>): Product => ({
    id: "p1",
    name: "Camiseta",
    image: null,
    basePrice: 10,
    isRequired: false,
    isIncludedInTicket: false,
    variations: [
      { name: "P", price: 0, stock: 0 },
      { name: "G", price: 32, stock: 0 },
    ],
    ...over,
  });

  describe("previewVariationListPriceLabelForProduct (rótulo da prévia)", () => {
    it("não incluso: variação 32 com base 10 → mostra 32 (total, não 22)", () => {
      const product = makeProduct({});
      expect(norm(previewVariationListPriceLabelForProduct(product, 32))).toBe("R$32,00");
    });

    it("não incluso: variação menor que a base → mostra o total da variação", () => {
      const product = makeProduct({ variations: [{ name: "G", price: 5, stock: 0 }] });
      expect(norm(previewVariationListPriceLabelForProduct(product, 5))).toBe("R$5,00");
    });

    it("não incluso: variação sem preço específico → mostra a base", () => {
      const product = makeProduct({});
      expect(norm(previewVariationListPriceLabelForProduct(product, 0))).toBe("R$10,00");
    });

    it("incluso no ingresso: ainda mostra só o acréscimo sobre a base (32 - 10 = 22)", () => {
      const product = makeProduct({ isIncludedInTicket: true });
      expect(norm(previewVariationListPriceLabelForProduct(product, 32))).toBe("R$22,00");
    });

    it('"Sem interesse" não exibe preço', () => {
      const product = makeProduct({});
      expect(
        previewVariationListPriceLabelForProduct(product, 32, "Sem interesse"),
      ).toBeUndefined();
    });
  });

  describe("billableReaisForProductSelection (valor cobrado) bate com o rótulo", () => {
    it("não incluso: cobra o total da variação (32)", () => {
      const product = makeProduct({});
      expect(billableReaisForProductSelection(product, product.variations[1])).toBe(32);
    });

    it("incluso no ingresso: cobra só o acréscimo (22)", () => {
      const product = makeProduct({ isIncludedInTicket: true });
      expect(billableReaisForProductSelection(product, product.variations[1])).toBe(22);
    });
  });
});
