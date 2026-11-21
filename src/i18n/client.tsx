"use client";
import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { useOrganizerAppSurface } from "@/contexts/OrganizerAppSurfaceContext";
import { useAdminAppSurface } from "@/contexts/AdminAppSurfaceContext";
import { withOrganizerPathPrefix } from "@/lib/organizerPathPresentation";
import { isOrganizerShortSurfacePath } from "@/lib/organizerSurfacePath";
import { withAdminPathPrefix } from "@/lib/adminPathPresentation";
import { DEFAULT_LOCALE, LOCALE_COOKIE, intlLocale, type Locale } from "./config";
import { ptBR, type Messages, type Namespace } from "./messages/pt-BR";
import { createTranslator, type Translator } from "./translate";

type I18nValue = { locale: Locale; messages: Messages };

// Sem provider (testes RTL, por ex.) → pt-BR: os textos esperados continuam os mesmos.
const I18nContext = createContext<I18nValue>({ locale: DEFAULT_LOCALE, messages: ptBR });

/**
 * `messages` chega do RootLayout só quando o idioma NÃO é pt-BR (o pt-BR já está no
 * bundle) — quem usa o site em PT não paga payload extra.
 * Painel do organizador/admin fica fora da tradução: força pt-BR lá, senão
 * componentes compartilhados (dropdown, date picker) sairiam em inglês no meio do painel.
 */
export function I18nProvider({
  locale,
  messages,
  children,
}: {
  locale: Locale;
  messages?: Messages;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const appSurface = useOrganizerAppSurface();
  const adminSurface = useAdminAppSurface();
  const isPanel =
    withOrganizerPathPrefix(pathname, appSurface).startsWith("/organizer") ||
    isOrganizerShortSurfacePath(pathname) ||
    withAdminPathPrefix(pathname, adminSurface).includes("/admin");

  const value = useMemo<I18nValue>(
    () =>
      isPanel || !messages
        ? { locale: DEFAULT_LOCALE, messages: ptBR }
        : { locale, messages },
    [isPanel, locale, messages],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** `const t = useT("checkout"); t("pay")` — ver `createTranslator`. */
export function useT<N extends Namespace>(ns: N): Translator<N> {
  const { messages } = useContext(I18nContext);
  return useMemo(() => createTranslator(messages, ns), [messages, ns]);
}

/** `locale` p/ lógica; `intl` p/ `Intl.*` / helpers de data (`formatDateBR(v, opts, intl)`). */
export function useLocale(): { locale: Locale; intl: string } {
  const { locale } = useContext(I18nContext);
  return { locale, intl: intlLocale(locale) };
}

/**
 * Troca o idioma: grava o cookie (1 ano) e `router.refresh()` — o RootLayout re-renderiza
 * no server com o novo dicionário, sem perder o estado client (ex.: checkout em andamento).
 */
export function useSetLocale(): (locale: Locale) => void {
  const router = useRouter();
  return useCallback(
    (locale: Locale) => {
      Cookies.set(LOCALE_COOKIE, locale, { expires: 365, sameSite: "lax", path: "/" });
      router.refresh();
    },
    [router],
  );
}

/** Idioma do widget Cloudflare Turnstile ("pt-br" | "en" | "es"); sem isso ele segue o navegador. */
export function useTurnstileLanguage(): string {
  return useLocale().locale.toLowerCase();
}
