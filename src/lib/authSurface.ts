/**
 * Superfície de sessão (admin / organizador / cliente). As três sessões são
 * ISOLADAS: cada superfície usa seu próprio jogo de cookies (`pt_*_<surface>`)
 * → convivem no mesmo navegador sem se sobrescrever.
 *
 * O front DECLARA a superfície atual à API em toda request (header
 * `X-PT-Surface`). O backend (`resolveAuthSurface` em auth-cookies.util.ts) usa
 * esse header pra escolher qual cookie ler/escrever. Precisa ser explícito
 * porque em dev tudo roda no MESMO host (localhost) — não dá pra deduzir do host.
 */

export type AuthSurface = "admin" | "organizer" | "client";

/** Header HTTP que carrega a superfície. Mantido em sincronia com o backend. */
export const SURFACE_HEADER = "X-PT-Surface";

/** Extrai só o hostname de um valor que pode ser URL completa ou host:porta. */
function hostnameOf(raw?: string): string | null {
  const v = raw?.trim();
  if (!v) return null;
  try {
    const url = v.includes("://") ? new URL(v) : new URL(`http://${v}`);
    return url.hostname.toLowerCase();
  } catch {
    return v.split("/")[0].split(":")[0].toLowerCase();
  }
}

/**
 * Superfície atual:
 *  - PROD/homolog: por HOST (subdomínio dedicado — NEXT_PUBLIC_ADMIN_APP_HOST /
 *    NEXT_PUBLIC_ORGANIZER_APP_HOST). No host dedicado a URL é curta (sem o
 *    prefixo /admin|/organizer), por isso o host é o sinal primário.
 *  - DEV/same-host (localhost): por PATH (/admin, /organizer; resto = client).
 *  - SSR (sem window): 'client' (as chamadas SSR são anônimas ou usam Bearer).
 */
export function getCurrentSurface(): AuthSurface {
  if (typeof window === "undefined") return "client";

  const host = window.location.hostname.toLowerCase();
  const adminHost = hostnameOf(process.env.NEXT_PUBLIC_ADMIN_APP_HOST);
  const orgHost = hostnameOf(process.env.NEXT_PUBLIC_ORGANIZER_APP_HOST);
  if (adminHost && host === adminHost) return "admin";
  if (orgHost && host === orgHost) return "organizer";

  const p = window.location.pathname;
  if (p === "/admin" || p.startsWith("/admin/")) return "admin";
  if (p === "/organizer" || p.startsWith("/organizer/")) return "organizer";
  return "client";
}

/** `{ "X-PT-Surface": <surface> }` para espalhar em headers de `fetch` cru. */
export function surfaceHeader(): Record<string, string> {
  return { [SURFACE_HEADER]: getCurrentSurface() };
}

/** Nome do cookie-dica (não-httpOnly) da superfície atual. */
export function sessionHintCookieName(
  surface: AuthSurface = getCurrentSurface(),
): string {
  return `pt_authed_${surface}`;
}
