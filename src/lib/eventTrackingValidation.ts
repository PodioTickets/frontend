/** Validação alinhada ao backend (valores não vazios). */

export interface EventTrackingFormFields {
  metaPixelId?: string;
  googleAnalyticsId?: string;
  googleAdsId?: string;
}

const META_PIXEL = /^\d{10,20}$/;
const GA4 = /^G-[A-Za-z0-9]+$/;
const GOOGLE_ADS = /^AW-[A-Za-z0-9]+$/;

export function validateNonEmptyEventTrackingFields(
  d: EventTrackingFormFields,
): string | null {
  const meta = (d.metaPixelId ?? "").trim();
  if (meta && !META_PIXEL.test(meta)) {
    return "Meta Pixel: use apenas números, entre 10 e 20 dígitos.";
  }
  const ga = (d.googleAnalyticsId ?? "").trim();
  if (ga && !GA4.test(ga)) {
    return "GA4: use o formato G- seguido apenas de letras e números.";
  }
  const ads = (d.googleAdsId ?? "").trim();
  if (ads && !GOOGLE_ADS.test(ads)) {
    return "Google Ads: use o formato AW- seguido apenas de letras e números.";
  }
  return null;
}
