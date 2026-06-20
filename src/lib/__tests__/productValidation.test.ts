import { describe, it, expect } from "vitest";
import {
  variationStockToPersist,
  categoryLabelFromTicket,
  buyerVariationEditStateFromApiProduct,
  sanitizeVariationTypeLabelInput,
  parsePriceReais,
  formatPriceFromApi,
  variationHasMeaningfulSpecificPrice,
  maskPriceInputFromDigits,
  validateProductForm,
} from "../productValidation";
import type { ProductVariation } from "@/components/Product/CreateProductModal.types";

const variation = (over: Partial<ProductVariation> = {}): ProductVariation => ({
  id: "v1",
  name: "P",
  price: "",
  stock: "10",
  ...over,
});

describe("variationStockToPersist", () => {
  it("variação nova (sem snapshot) → limite = restante digitado", () => {
    expect(variationStockToPersist(variation({ stock: "5" }))).toBe(5);
    expect(variationStockToPersist(variation({ stock: "" }))).toBe(0);
  });

  it("edição: aplica ao limite persistido o MESMO delta do restante", () => {
    // restante caiu de 8 → 6 (delta -2); limite 10 → 8.
    expect(
      variationStockToPersist(
        variation({ stock: "6", persistedStock: 10, persistedAvailable: 8 }),
      ),
    ).toBe(8);
  });

  it("nunca abaixo de 0", () => {
    expect(
      variationStockToPersist(
        variation({ stock: "0", persistedStock: 1, persistedAvailable: 8 }),
      ),
    ).toBe(0);
  });
});

describe("parsePriceReais / formatPriceFromApi / maskPriceInputFromDigits", () => {
  it("parsePriceReais lê vírgula decimal", () => {
    expect(parsePriceReais("10,50")).toBe(10.5);
    expect(parsePriceReais("")).toBe(0);
    expect(parsePriceReais("abc")).toBe(0);
  });

  it("formatPriceFromApi converte centavos numéricos → reais string", () => {
    expect(formatPriceFromApi(1050)).toBe("10,50");
    expect(formatPriceFromApi("")).toBe("");
    expect(formatPriceFromApi(undefined)).toBe("");
  });

  it("maskPriceInputFromDigits interpreta dígitos como centavos", () => {
    expect(maskPriceInputFromDigits("1050")).toBe("10,50");
    expect(maskPriceInputFromDigits("")).toBe("");
    expect(maskPriceInputFromDigits("R$ 9")).toBe("0,09");
  });

  it("variationHasMeaningfulSpecificPrice: vazio/0 = false", () => {
    expect(variationHasMeaningfulSpecificPrice("")).toBe(false);
    expect(variationHasMeaningfulSpecificPrice("0")).toBe(false);
    expect(variationHasMeaningfulSpecificPrice("0,00")).toBe(false);
    expect(variationHasMeaningfulSpecificPrice("10,50")).toBe(true);
  });
});

describe("sanitizeVariationTypeLabelInput", () => {
  it("mantém letras/números/espaço, remove pontuação", () => {
    expect(sanitizeVariationTypeLabelInput("Tamanho 1, cor-2.")).toBe(
      "Tamanho 1 cor2",
    );
    expect(sanitizeVariationTypeLabelInput("Camisa")).toBe("Camisa");
  });
});

describe("categoryLabelFromTicket", () => {
  it("prioriza category.name aninhado", () => {
    expect(categoryLabelFromTicket({ category: { name: " Pro " } })).toBe("Pro");
  });
  it("fallback snake_case category_name", () => {
    expect(categoryLabelFromTicket({ category_name: "Geral" })).toBe("Geral");
  });
  it('sem categoria → "Sem categoria"', () => {
    expect(categoryLabelFromTicket({})).toBe("Sem categoria");
  });
});

describe("buyerVariationEditStateFromApiProduct", () => {
  it("nulo → não permitido, 30 dias", () => {
    expect(buyerVariationEditStateFromApiProduct(null)).toEqual({
      allowed: false,
      deadlineDays: "30",
    });
  });
  it("aceita variantes truthy (camel/snake, string/number)", () => {
    expect(
      buyerVariationEditStateFromApiProduct({
        buyerVariationEditAllowed: "true",
        variationEditDeadlineDays: 7,
      }),
    ).toEqual({ allowed: true, deadlineDays: "7" });
    expect(
      buyerVariationEditStateFromApiProduct({
        buyer_variation_edit_allowed: 1,
        variation_edit_deadline_days: "15",
      }),
    ).toEqual({ allowed: true, deadlineDays: "15" });
  });
  it("permitido sem dias válidos → fallback 30", () => {
    expect(
      buyerVariationEditStateFromApiProduct({ buyerVariationEditAllowed: true }),
    ).toEqual({ allowed: true, deadlineDays: "30" });
  });
});

describe("validateProductForm", () => {
  const base = {
    productName: "Camisa",
    variations: [variation({ name: "M", stock: "5" })],
    eventId: "ev1",
    productHoldsStock: true,
    isIncludedInTicket: false,
    basePrice: "10,00",
  };

  it("válido → ok", () => {
    expect(validateProductForm(base)).toEqual({ ok: true });
  });

  it("nome vazio", () => {
    expect(validateProductForm({ ...base, productName: "  " })).toEqual({
      ok: false,
      message: "Digite o nome do produto",
    });
  });

  it("nome > 100 chars", () => {
    expect(
      validateProductForm({ ...base, productName: "x".repeat(101) }),
    ).toEqual({
      ok: false,
      message: "O nome do produto deve ter no máximo 100 caracteres",
    });
  });

  it("sem variação com nome", () => {
    expect(
      validateProductForm({ ...base, variations: [variation({ name: " " })] }),
    ).toEqual({ ok: false, message: "Preencha o nome de pelo menos uma variação" });
  });

  it("nomes duplicados (case-insensitive)", () => {
    const r = validateProductForm({
      ...base,
      variations: [
        variation({ id: "a", name: "M", stock: "5" }),
        variation({ id: "b", name: "m", stock: "5" }),
      ],
    });
    expect(r.ok).toBe(false);
    expect((r as { message: string }).message).toContain("Variação duplicada");
  });

  it("sem eventId", () => {
    expect(validateProductForm({ ...base, eventId: null })).toEqual({
      ok: false,
      message: "Evento não encontrado",
    });
  });

  it("estoque resultante 0 quando holdsStock", () => {
    const r = validateProductForm({
      ...base,
      variations: [variation({ name: "M", stock: "0" })],
    });
    expect(r.ok).toBe(false);
    expect((r as { message: string }).message).toContain("estoque maior que zero");
  });

  it("preço base 0 quando NÃO incluso", () => {
    expect(validateProductForm({ ...base, basePrice: "0,00" })).toEqual({
      ok: false,
      message: "Informe um preço maior que zero para o produto.",
    });
  });

  it("incluso no ingresso dispensa preço base", () => {
    expect(
      validateProductForm({
        ...base,
        isIncludedInTicket: true,
        basePrice: "0,00",
      }),
    ).toEqual({ ok: true });
  });
});
