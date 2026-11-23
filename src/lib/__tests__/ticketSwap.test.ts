import { describe, expect, it } from "vitest";
import {
  ageOnEventDay,
  buildSwapProductsPayload,
  effectiveSwapSelection,
  hasMissingRequiredVariation,
  swapBlockedReason,
} from "../ticketSwap";

describe("ticketSwap", () => {
  it("idade no dia do evento", () => {
    expect(ageOnEventDay("2008-12-15", "2026-12-15T00:00:00.000Z")).toBe(18);
    expect(ageOnEventDay("2008-12-16", "2026-12-15")).toBe(17);
  });

  it("bloqueia fora da faixa de idade e do gênero", () => {
    const event = "2026-12-01";
    const kids = { ageLimit: { min: 9, max: 11 } };
    expect(swapBlockedReason({ birthDate: "2016-01-01", gender: "M" }, kids, event)).toBeNull();
    expect(swapBlockedReason({ birthDate: "2018-01-01", gender: "M" }, kids, event)).toMatch(/mínima/);
    expect(swapBlockedReason({ birthDate: "2010-01-01", gender: "M" }, kids, event)).toMatch(/máxima/);
    expect(swapBlockedReason({ birthDate: null, gender: "M" }, kids, event)).toMatch(/nascimento/);
    expect(swapBlockedReason({ birthDate: null, gender: "Feminino" }, { gender: "male" }, event)).toMatch(/masculino/);
    expect(swapBlockedReason({ birthDate: null, gender: null }, { gender: "all" }, event)).toBeNull();
  });

  it("monta o payload de produtos como o checkout", () => {
    const v = (id: string) => ({ id, name: id, price: 0, stock: 0, availableStock: 0, soldCount: 0 });
    const base = { name: "", image: "", images: [], basePrice: 0, variationType: "SIZE" };
    const products = [
      { ...base, id: "kit", isRequired: true, isIncludedInTicket: true, variations: [v("P"), v("M")] },
      { ...base, id: "medalha", isRequired: true, isIncludedInTicket: true, variations: [] },
      { ...base, id: "unica", isRequired: true, isIncludedInTicket: true, variations: [v("U")] },
      { ...base, id: "extra", isRequired: false, isIncludedInTicket: false, variations: [v("G"), v("GG")] },
    ] as unknown as Parameters<typeof buildSwapProductsPayload>[0];
    expect(buildSwapProductsPayload(products, { kit: ["P"] })).toEqual([
      { productId: "kit", variationIds: ["P"], variationId: "P" },
      { productId: "unica", variationIds: ["U"], variationId: "U" },
    ]);
    expect(buildSwapProductsPayload(products, { kit: ["P"], extra: ["G"] })).toContainEqual({
      productId: "extra",
      variationIds: ["G"],
      variationId: "G",
    });
    // Valor legado (id único) continua aceito.
    expect(buildSwapProductsPayload(products, { kit: "M" })[0]).toEqual({
      productId: "kit",
      variationIds: ["M"],
      variationId: "M",
    });
    expect(hasMissingRequiredVariation(products, {})).toBe(true);
    expect(hasMissingRequiredVariation(products, { kit: ["P"] })).toBe(false);
  });

  it("kit com várias variações: uma opção por variação, auto-seleção da opção única", () => {
    const v = (id: string) => ({ id, name: id, price: 0, stock: 0 });
    const kit = {
      id: "kit",
      name: "",
      image: "",
      basePrice: 0,
      isRequired: true,
      isIncludedInTicket: true,
      variations: [v("P"), v("M"), v("SU")],
      variationGroups: [
        { id: "camisa", name: "Tamanho da camisa", variations: [v("P"), v("M")] },
        { id: "short", name: "Tamanho do short", variations: [v("SU")] },
      ],
    } as unknown as Parameters<typeof buildSwapProductsPayload>[0][number];
    // Short (opção única) é auto-selecionado; falta a camisa.
    expect(effectiveSwapSelection(kit, {})).toEqual(["SU"]);
    expect(hasMissingRequiredVariation([kit], {})).toBe(true);
    expect(buildSwapProductsPayload([kit], {})).toEqual([]);
    expect(buildSwapProductsPayload([kit], { kit: ["M"] })).toEqual([
      { productId: "kit", variationIds: ["M", "SU"], variationId: "M" },
    ]);
    expect(hasMissingRequiredVariation([kit], { kit: ["M"] })).toBe(false);
  });

  it("opcional começado e incompleto bloqueia; opt-out completa sozinho", () => {
    const v = (id: string, name = id) => ({ id, name, price: 0, stock: 0 });
    const extra = {
      id: "extra",
      name: "",
      image: "",
      basePrice: 0,
      isRequired: false,
      isIncludedInTicket: false,
      variations: [v("P"), v("M"), v("G"), v("GG"), v("NO", "Sem interesse")],
      variationGroups: [
        { id: "camisa", name: "Camisa", variations: [v("P"), v("M")] },
        { id: "short", name: "Short", variations: [v("G"), v("GG")] },
      ],
    } as unknown as Parameters<typeof buildSwapProductsPayload>[0][number];
    expect(hasMissingRequiredVariation([extra], {})).toBe(false);
    expect(hasMissingRequiredVariation([extra], { extra: ["P"] })).toBe(true);
    expect(buildSwapProductsPayload([extra], { extra: ["NO"] })).toEqual([
      { productId: "extra", variationIds: ["NO"], variationId: "NO" },
    ]);
  });
});
