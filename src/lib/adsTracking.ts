import type { EventTracking, EventTrackingPatch } from "@/services";

/**
 * Lógica pura do formulário de Rastreamento e Conversões (página "ads").
 * Compartilhada entre admin e organizer (antes duplicada byte a byte).
 */

export interface AdsTrackingData {
  metaPixelId?: string;
  googleAnalyticsId?: string;
  googleAdsId?: string;
}

export const emptyAdsForm = (): AdsTrackingData => ({
  metaPixelId: "",
  googleAnalyticsId: "",
  googleAdsId: "",
});

/** Comparação estável para dirty-check (trim nos valores). */
export function adsTrackingSnapshot(d: AdsTrackingData): string {
  return JSON.stringify({
    metaPixelId: (d.metaPixelId ?? "").trim(),
    googleAnalyticsId: (d.googleAnalyticsId ?? "").trim(),
    googleAdsId: (d.googleAdsId ?? "").trim(),
  });
}

export function trackingToFormData(t: EventTracking): AdsTrackingData {
  return {
    metaPixelId: t.metaPixelId,
    googleAnalyticsId: t.googleAnalyticsId,
    googleAdsId: t.googleAdsId,
  };
}

export function buildTrackingPatch(
  form: AdsTrackingData,
  committedSnapshot: string,
): EventTrackingPatch {
  const committed = JSON.parse(committedSnapshot) as {
    metaPixelId: string;
    googleAnalyticsId: string;
    googleAdsId: string;
  };
  const cur = {
    metaPixelId: (form.metaPixelId ?? "").trim(),
    googleAnalyticsId: (form.googleAnalyticsId ?? "").trim(),
    googleAdsId: (form.googleAdsId ?? "").trim(),
  };
  const patch: EventTrackingPatch = {};
  if (cur.metaPixelId !== committed.metaPixelId) patch.metaPixelId = cur.metaPixelId;
  if (cur.googleAnalyticsId !== committed.googleAnalyticsId) {
    patch.googleAnalyticsId = cur.googleAnalyticsId;
  }
  if (cur.googleAdsId !== committed.googleAdsId) patch.googleAdsId = cur.googleAdsId;
  return patch;
}
