import { describe, it, expect } from "vitest";
import {
  kitPayloadsEqual,
  normalizePrimaryMap,
} from "../KitImagePositionDrawer";
import type { KitImagePositionPayload } from "@/lib/eventKitSelectionDisplay";

const base = (
  over: Partial<KitImagePositionPayload> = {},
): KitImagePositionPayload => ({
  layout: "on_tickets",
  primaryImageUrlByTicketId: { t1: "a.jpg" },
  primaryImageUrlByCategoryId: {},
  hiddenImageUrlsByTicketId: {},
  hiddenImageUrlsByCategoryId: {},
  ...over,
});

describe("kitPayloadsEqual", () => {
  it("iguais → true (mesmo conteúdo, referências diferentes)", () => {
    expect(kitPayloadsEqual(base(), base())).toBe(true);
  });

  it("layout diferente → false", () => {
    expect(kitPayloadsEqual(base(), base({ layout: "on_category" }))).toBe(
      false,
    );
  });

  it("principal diferente → false", () => {
    expect(
      kitPayloadsEqual(
        base(),
        base({ primaryImageUrlByTicketId: { t1: "b.jpg" } }),
      ),
    ).toBe(false);
  });

  it("ocultas com MESMO conjunto em ordem diferente → true (set, não ordem)", () => {
    const a = base({ hiddenImageUrlsByTicketId: { t1: ["a.jpg", "b.jpg"] } });
    const b = base({ hiddenImageUrlsByTicketId: { t1: ["b.jpg", "a.jpg"] } });
    expect(kitPayloadsEqual(a, b)).toBe(true);
  });

  it("ocultas com conjunto diferente → false", () => {
    const a = base({ hiddenImageUrlsByTicketId: { t1: ["a.jpg"] } });
    const b = base({ hiddenImageUrlsByTicketId: { t1: ["b.jpg"] } });
    expect(kitPayloadsEqual(a, b)).toBe(false);
  });

  it("quantidade de ocultas diferente → false", () => {
    const a = base({ hiddenImageUrlsByTicketId: { t1: ["a.jpg"] } });
    const b = base({ hiddenImageUrlsByTicketId: { t1: ["a.jpg", "b.jpg"] } });
    expect(kitPayloadsEqual(a, b)).toBe(false);
  });
});

describe("normalizePrimaryMap", () => {
  const urls = { t1: ["a.jpg", "b.jpg", "c.jpg"] };

  it("mantém a principal quando visível e existente", () => {
    expect(normalizePrimaryMap({ t1: "b.jpg" }, {}, urls)).toEqual({
      t1: "b.jpg",
    });
  });

  it("migra p/ a 1ª visível quando a principal está oculta", () => {
    expect(
      normalizePrimaryMap({ t1: "a.jpg" }, { t1: ["a.jpg"] }, urls),
    ).toEqual({ t1: "b.jpg" });
  });

  it("remove a chave quando todas as imagens estão ocultas", () => {
    expect(
      normalizePrimaryMap(
        { t1: "a.jpg" },
        { t1: ["a.jpg", "b.jpg", "c.jpg"] },
        urls,
      ),
    ).toEqual({});
  });

  it("preenche a 1ª visível quando não havia principal definida", () => {
    expect(normalizePrimaryMap({}, {}, urls)).toEqual({ t1: "a.jpg" });
  });
});
