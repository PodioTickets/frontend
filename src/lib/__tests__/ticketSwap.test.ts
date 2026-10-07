import { describe, expect, it } from "vitest";
import {
  ageOnEventDay,
  buildSwapProductsPayload,
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
    expect(buildSwapProductsPayload(products, { kit: "P" })).toEqual([
      { productId: "kit", variationId: "P" },
      { productId: "unica", variationId: "U" },
    ]);
    expect(buildSwapProductsPayload(products, { kit: "P", extra: "G" })).toContainEqual({
      productId: "extra",
      variationId: "G",
    });
    expect(hasMissingRequiredVariation(products, {})).toBe(true);
    expect(hasMissingRequiredVariation(products, { kit: "P" })).toBe(false);
  });
});
