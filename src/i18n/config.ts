/**
 * Idiomas do site PÚBLICO (home, busca, evento, checkout, login/cadastro, área do
 * usuário). Painel do organizador e admin seguem só em pt-BR (ver `I18nProvider`).
 *
 * A escolha vive num COOKIE (não na URL): as rotas e o proxy de hosts (organizer/admin)
 * ficam intactos, e o server lê o idioma no mesmo request (sem flash de PT → EN).
 * Contrapartida: o Google indexa só a versão pt-BR.
 */
export const LOCALES = ["pt-BR", "en", "es"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "pt-BR";
export const LOCALE_COOKIE = "pt_locale";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** Tag BCP 47 para o `Intl` (datas por extenso, dia da semana). */
const INTL_TAGS: Record<Locale, string> = { "pt-BR": "pt-BR", en: "en-US", es: "es-ES" };
export function intlLocale(locale: Locale): string {
  return INTL_TAGS[locale];
}

/** Rótulos do seletor de idioma — sempre no PRÓPRIO idioma (padrão de mercado). */
export const LOCALE_LABELS: Record<Locale, { short: string; name: string }> = {
  "pt-BR": { short: "PT", name: "Português" },
  en: { short: "EN", name: "English" },
  es: { short: "ES", name: "Español" },
};
