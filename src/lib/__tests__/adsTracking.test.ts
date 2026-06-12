import { describe, it, expect } from "vitest";
import {
  emptyAdsForm,
  adsTrackingSnapshot,
  trackingToFormData,
  buildTrackingPatch,
} from "../adsTracking";

describe("adsTrackingSnapshot", () => {
  it("trima os valores e é estável independente de undefined", () => {
    expect(adsTrackingSnapshot({ metaPixelId: "  123 " })).toBe(
      adsTrackingSnapshot({ metaPixelId: "123", googleAnalyticsId: "", googleAdsId: undefined }),
    );
  });
  it("form vazio = snapshot de strings vazias", () => {
    expect(adsTrackingSnapshot(emptyAdsForm())).toBe(
      JSON.stringify({ metaPixelId: "", googleAnalyticsId: "", googleAdsId: "" }),
    );
  });
});

describe("trackingToFormData", () => {
  it("mapeia os 3 campos", () => {
    const out = trackingToFormData({ metaPixelId: "m", googleAnalyticsId: "g", googleAdsId: "a" } as never);
    expect(out).toEqual({ metaPixelId: "m", googleAnalyticsId: "g", googleAdsId: "a" });
  });
});

describe("buildTrackingPatch", () => {
  const committed = adsTrackingSnapshot({ metaPixelId: "m", googleAnalyticsId: "g", googleAdsId: "a" });

  it("vazio quando nada mudou (com trim)", () => {
    const patch = buildTrackingPatch({ metaPixelId: " m ", googleAnalyticsId: "g", googleAdsId: "a" }, committed);
    expect(patch).toEqual({});
  });

  it("inclui só os campos alterados", () => {
    const patch = buildTrackingPatch({ metaPixelId: "novo", googleAnalyticsId: "g", googleAdsId: "a" }, committed);
    expect(patch).toEqual({ metaPixelId: "novo" });
  });

  it("limpar um campo vira string vazia no patch", () => {
    const patch = buildTrackingPatch({ metaPixelId: "m", googleAnalyticsId: "", googleAdsId: "a" }, committed);
    expect(patch).toEqual({ googleAnalyticsId: "" });
  });
});
