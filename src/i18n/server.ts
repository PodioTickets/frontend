import { cookies } from "next/headers";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, type Locale } from "./config";
import { ptBR, type Messages, type Namespace } from "./messages/pt-BR";
import { createTranslator, type Translator } from "./translate";

/** Idioma do request (cookie do seletor); sem cookie/valor inválido → pt-BR. */
export async function getLocale(): Promise<Locale> {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
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
