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
 * Rótulo distintivo (1º segmento) do host configurado. Ex.: `app.localhost` e
 * `app.podioticket.com.br` → "app"; `test890.localhost` → "test890". É o sinal
 * ESTÁVEL da superfície entre ambientes: o host completo muda
 * (localhost ↔ homologacao.* ↔ prod), mas o rótulo permanece como segmento.
 */
function distinctiveLabel(raw?: string): string | null {
  const host = hostnameOf(raw);
  const first = host?.split(".")[0];
  return first || null;
}

/**
 * O host atual tem `label` como SEGMENTO de subdomínio? Igualdade de segmento
 * (não substring) → "app" casa `homologacao.app.podioticket.com.br`, mas NÃO
 * `myapp.com`.
 */
function hostHasSegment(host: string, label: string | null): boolean {
  return !!label && host.split(".").includes(label);
}

/**
 * Superfície atual:
 *  - HOST: match exato com NEXT_PUBLIC_ADMIN/ORGANIZER_APP_HOST OU pelo RÓTULO
 *    distintivo do subdomínio (`app`/`test890`). O rótulo resolve o caso em que o
 *    build herdou o host de DEV (`app.localhost`) mas roda em
 *    `homologacao.app.podioticket.com.br`/`app.podioticket.com.br` — o segmento
 *    `app` aparece nos três → superfície correta sem depender do env por ambiente.
 *  - PATH: fallback p/ same-host (/admin, /organizer; resto = client).
 *  - SSR (sem window): 'client' (chamadas SSR são anônimas ou usam Bearer).
 */
export function getCurrentSurface(): AuthSurface {
  if (typeof window === "undefined") return "client";

  const host = window.location.hostname.toLowerCase();
  const adminHostEnv = process.env.NEXT_PUBLIC_ADMIN_APP_HOST;
  const orgHostEnv = process.env.NEXT_PUBLIC_ORGANIZER_APP_HOST;

  // 1) Host exato (dev same-host, ou env apontando o host real do ambiente).
  if (host === hostnameOf(adminHostEnv)) return "admin";
  if (host === hostnameOf(orgHostEnv)) return "organizer";

  // 2) Rótulo do subdomínio — resiliente ao ambiente (ver doc acima).
  if (hostHasSegment(host, distinctiveLabel(adminHostEnv))) return "admin";
  if (hostHasSegment(host, distinctiveLabel(orgHostEnv))) return "organizer";

  // 3) Path (same-host dev, ou painéis sob /admin|/organizer).
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
