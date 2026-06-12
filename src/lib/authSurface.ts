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

/**
 * Nome da `<meta>` que o `RootLayout` (SERVER) renderiza com a superfície do
 * host do painel (admin/organizer), resolvida do env RUNTIME — a MESMA fonte que
 * dirige o rewrite do proxy. É o sinal AUTORITATIVO no client: independe do
 * `NEXT_PUBLIC_*_APP_HOST` (build-time) e funciona nas URLs curtas reescritas
 * (/events), onde o path perde o prefixo /organizer.
 */
export const APP_SURFACE_META = "pt-app-surface";

/** Lê a `<meta name="pt-app-surface">` (só admin/organizer; ausente no site público). */
function readAppSurfaceMeta(): AuthSurface | null {
  if (typeof document === "undefined") return null;
  const v = document
    .querySelector(`meta[name="${APP_SURFACE_META}"]`)
    ?.getAttribute("content");
  return v === "admin" || v === "organizer" ? v : null;
}

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
 * Resolve a superfície SÓ pelo host (sem path/window) — helper compartilhado pelo
 * client (`getCurrentSurface`), pelo SSR (`readServerSurfaceToken`) e pelo
 * `RootLayout`. Retorna `null` quando o host não identifica admin/organizer (aí
 * cada caller decide o fallback: path no client, ordem de cookie no SSR, client).
 *
 * Match EXATO do host configurado (NEXT_PUBLIC_*_APP_HOST). NÃO usar heurística
 * de "rótulo de subdomínio": o host do app pode servir tanto o painel quanto
 * páginas públicas, então marcar pelo host genérico esconderia o Header/Footer das
 * páginas públicas. Por isso o env DEVE apontar o host real de cada ambiente
 * (dev/homolog/prod); quando não bate, cai no path (no client) ou em client.
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
  return null;
}

/**
 * Superfície atual (CLIENT), em ordem de prioridade:
 *  1. `<meta name="pt-app-surface">` do SERVER (env runtime; vale para TODO o host
 *     do painel, inclusive nas URLs curtas reescritas /events) — autoritativo.
 *  2. Host via `NEXT_PUBLIC_*_APP_HOST` (build-time) — fallback se o meta faltar.
 *  3. Path (/admin, /organizer) — caminho de DEV (host único, sem rewrite).
 *  4. client.
 * SSR (sem window) = 'client'.
 */
export function getCurrentSurface(): AuthSurface {
  if (typeof window === "undefined") return "client";

  const byMeta = readAppSurfaceMeta();
  if (byMeta) return byMeta;

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
