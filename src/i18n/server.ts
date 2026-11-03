import { cookies, headers } from "next/headers";
import { isLocale, LOCALE_COOKIE, type Locale } from "./config";
import { localeFromRequest } from "./detectLocale";
import { ptBR, type Messages, type Namespace } from "./messages/pt-BR";
import { createTranslator, type Translator } from "./translate";

/**
 * Idioma do request: cookie do seletor (escolha explícita) → país do IP (`CF-IPCountry`,
 * do Cloudflare) → `Accept-Language` → pt-BR. Ver `localeFromRequest`.
 */
export async function getLocale(): Promise<Locale> {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(value)) return value;
  const h = await headers();
  return localeFromRequest(h.get("cf-ipcountry"), h.get("accept-language"), h.get("user-agent"));
}

/** Import dinâmico: en/es só carregam no server quando alguém escolheu o idioma. */
export async function loadMessages(locale: Locale): Promise<Messages> {
  if (locale === "en") return (await import("./messages/en")).en;
  if (locale === "es") return (await import("./messages/es")).es;
  return ptBR;
}

/** Equivalente server do `useT` (server components / `generateMetadata`). */
export async function getT<N extends Namespace>(ns: N): Promise<Translator<N>> {
  return createTranslator(await loadMessages(await getLocale()), ns);
}
