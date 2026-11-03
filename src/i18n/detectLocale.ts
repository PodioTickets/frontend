import { DEFAULT_LOCALE, type Locale } from "./config";

/** Países de língua portuguesa e espanhola (ISO 3166-1 alpha-2). Resto do mundo → en. */
const PT_COUNTRIES = new Set(["BR", "PT", "AO", "MZ", "CV", "GW", "ST", "TL"]);
const ES_COUNTRIES = new Set([
  "ES", "MX", "AR", "CO", "CL", "PE", "VE", "EC", "GT", "CU", "BO", "DO",
  "HN", "PY", "SV", "NI", "CR", "PA", "UY", "GQ", "PR",
]);

/**
 * Robôs (Google, Bing, prévias de link) ficam SEMPRE em pt-BR: rastreiam de IPs dos EUA
 * e, sem isso, o Google indexaria o site em inglês (o idioma não está na URL — ver `config.ts`).
 */
const BOT_UA = /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|telegram|preview|lighthouse/i;

/**
 * Idioma de quem ainda NÃO escolheu no seletor (sem cookie): país do IP (`CF-IPCountry`,
 * header que o Cloudflare injeta — sem request nem base de IP no front) → idioma do
 * navegador (`Accept-Language`) → pt-BR. Códigos especiais do Cloudflare ("XX" sem país,
 * "T1" Tor) caem para o navegador.
 */
export function localeFromRequest(
  country: string | null | undefined,
  acceptLanguage: string | null | undefined,
  userAgent: string | null | undefined,
): Locale {
  if (userAgent && BOT_UA.test(userAgent)) return DEFAULT_LOCALE;

  const cc = (country ?? "").trim().toUpperCase();
  if (/^[A-Z]{2}$/.test(cc) && cc !== "XX" && cc !== "T1") {
    if (PT_COUNTRIES.has(cc)) return "pt-BR";
    if (ES_COUNTRIES.has(cc)) return "es";
    return "en";
  }

  // 1º idioma do navegador (ordem do header; q-values quase sempre já vêm decrescentes).
  const lang = (acceptLanguage ?? "").split(",")[0]?.trim().slice(0, 2).toLowerCase();
  if (lang === "pt") return "pt-BR";
  if (lang === "es") return "es";
  // Outro idioma (fr, de…) → en, igual ao país estrangeiro; sem header → pt-BR.
  return lang && lang !== "*" ? "en" : DEFAULT_LOCALE;
}
