import { describe, it, expect } from "vitest";
import { variationHoldsStock, isVariationSoldOut } from "../SubscriptionStep.utils";

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
