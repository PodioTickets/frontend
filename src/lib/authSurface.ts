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
 * Resolve a superfície SÓ pelo host (sem path/window) — helper compartilhado pelo
 * client (`getCurrentSurface`), pelo SSR (`readServerSurfaceToken`) e pelo
 * `RootLayout`. Retorna `null` quando o host não identifica admin/organizer (aí
 * cada caller decide o fallback: path no client, ordem de cookie no SSR, client).
 *
 *  - HOST exato: match com o env (quando aponta o host real do ambiente).
 *  - RÓTULO distintivo do subdomínio (`app`/`test890`): resolve o caso em que o
 *    build herdou o host de DEV (`app.localhost`) mas roda em
 *    `homologacao.app.podioticket.com.br`/`app.podioticket.com.br` — o segmento
 *    `app` aparece nos três → superfície correta sem depender do env por ambiente.
 */
export function surfaceFromHost(
  host: string,
  adminHostEnv?: string,
  orgHostEnv?: string,
): AuthSurface | null {
  if (!host) return null;
  const h = host.toLowerCase();
  if (h === hostnameOf(adminHostEnv)) return "admin";
  if (h === hostnameOf(orgHostEnv)) return "organizer";
  if (hostHasSegment(h, distinctiveLabel(adminHostEnv))) return "admin";
  if (hostHasSegment(h, distinctiveLabel(orgHostEnv))) return "organizer";
  return null;
}

/**
 * Superfície atual (CLIENT): host (ver `surfaceFromHost`) → path
 * (/admin, /organizer) → client. SSR (sem window) = 'client'.
 */
export function getCurrentSurface(): AuthSurface {
  if (typeof window === "undefined") return "client";

  const byHost = surfaceFromHost(
    window.location.hostname,
    process.env.NEXT_PUBLIC_ADMIN_APP_HOST,
    process.env.NEXT_PUBLIC_ORGANIZER_APP_HOST,
  );
  if (byHost) return byHost;

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

/**
 * Chave do cache de user no localStorage, SCOPED por superfície. Como cookies são
 * de domínio-pai (compartilhados entre subdomínios) e localStorage é por-origin,
 * sem o sufixo a sessão de uma superfície (ex.: organizer) "vazaria" pra outra
 * (client) servida no MESMO origin → o storefront mostraria o organizador logado.
 */
export function userCacheKey(
  surface: AuthSurface = getCurrentSurface(),
): string {
  return `user_${surface}`;
}

/** Chave LEGADA (global, pré-isolamento). Limpada no logout p/ não deixar lixo. */
export const LEGACY_USER_CACHE_KEY = "user";
