/**
 * Destino pós-login ("voltar pra onde eu estava") resiliente ao round-trip do
 * OAuth (Google). O fluxo sai do frontend para a API/Google e volta no
 * `/auth/callback`; se o destino ficasse só em `sessionStorage`, qualquer
 * cenário em que o storage por-origem não sobrevive ao bounce (origem
 * canônica diferente, partição de storage, MFA, etc.) jogaria o usuário na home
 * e perderia a seleção do checkout (que vive no MESMO sessionStorage).
 *
 * Estratégia (em camadas, da mais à menos resiliente):
 *  1. Param `redirect_to` na URL do callback — único que cruza troca de origem
 *     (depende do backend ecoar o param; inofensivo se ignorado).
 *  2. `localStorage` — sobrevive a mais cenários que `sessionStorage`.
 *  3. `sessionStorage` — mantido por compatibilidade/legado.
 *
 * Segurança: só aceitamos caminhos RELATIVOS same-site (`/...`). Como o destino
 * pode vir da URL (atacável), barramos open-redirect — `//host`, `http://…`,
 * `javascript:`, `/\evil`, etc.
 */

const STORAGE_KEY = "redirectAfterLogin";

/** Retorna o caminho se for relativo same-site seguro; senão `null`. */
export function sanitizeReturnPath(
  path: string | null | undefined,
): string | null {
  if (!path) return null;
  // Precisa começar com "/" (relativo) e não ser protocol-relative ("//") nem
  // backslash-relative ("/\") — ambos podem ser tratados como host externo.
  if (path[0] !== "/") return null;
  if (path[1] === "/" || path[1] === "\\") return null;
  return path;
}

/** Persiste o destino pós-login (local + session). No-op fora do browser. */
export function saveReturnPath(path: string): void {
  const safe = sanitizeReturnPath(path);
  if (!safe || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, safe);
  } catch {
    /* quota/disabled — ignora */
  }
  try {
    window.sessionStorage.setItem(STORAGE_KEY, safe);
  } catch {
    /* quota/disabled — ignora */
  }
}

/**
 * Lê o destino pós-login já saneado, na ordem de resiliência: param de URL >
 * localStorage > sessionStorage. NÃO limpa — chame `clearReturnPath` após
 * navegar.
 */
export function readReturnPath(urlValue?: string | null): string | null {
  const fromUrl = sanitizeReturnPath(urlValue);
  if (fromUrl) return fromUrl;
  if (typeof window === "undefined") return null;
  let stored: string | null = null;
  try {
    stored = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    /* ignora */
  }
  if (!stored) {
    try {
      stored = window.sessionStorage.getItem(STORAGE_KEY);
    } catch {
      /* ignora */
    }
  }
  return sanitizeReturnPath(stored);
}

/** Remove o destino salvo de ambos os storages. No-op fora do browser. */
export function clearReturnPath(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignora */
  }
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignora */
  }
}
