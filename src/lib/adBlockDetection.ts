/**
 * Detecção de bloqueador de anúncios (adblock) — lógica pura, testável.
 *
 * Dois sinais independentes, do mais barato para o mais caro:
 *  1. BAIT no DOM — elemento com as classes das listas de filtro (EasyList & cia).
 *     Custo ~1 reflow, síncrono. Pega o bloqueio COSMÉTICO (regra de CSS).
 *  2. PROBE de rede — `fetch` nos MESMOS scripts que o app já carrega no root
 *     layout (gtag/Meta Pixel). Pega o bloqueio por REQUEST, que é o que de fato
 *     quebra conversão/remarketing.
 *
 * O risco real aqui é o FALSO POSITIVO (mostrar o modal para quem não tem
 * adblock). Por isso o probe de rede só acusa quando um controle same-origin
 * responde: offline, rede instável ou CSP derrubam os dois igualmente e o
 * resultado é "não detectado" (fail-safe → sem modal).
 *
 * As URLs sondadas são as MESMAS do `app/layout.tsx` e estão liberadas no
 * `connect-src` da CSP (`src/proxy.ts`) — trocar uma exige trocar a outra.
 */

/** Classes presentes nas listas de filtro públicas — usadas como isca. */
export const AD_BAIT_CLASS_NAMES = [
  "adsbox",
  "ad-banner",
  "ad-placement",
  "banner_ad",
  "pub_300x250",
  "sponsored-ad",
  "adsbygoogle",
] as const;

/** Scripts de tracking que o app realmente carrega (root layout). */
export const AD_PROBE_URLS = [
  "https://www.googletagmanager.com/gtag/js?id=AW-18266397975",
  "https://connect.facebook.net/en_US/fbevents.js",
] as const;

/** Same-origin: se ISTO falhar, o problema é rede — não adblock. */
export const AD_PROBE_CONTROL_URL = "/";

export const AD_BLOCK_NOTICE_STORAGE_KEY = "adBlockNoticeDismissed";

/** Rotas fora do fluxo do participante (painéis) — não exibem o aviso. */
const NON_PARTICIPANT_PATH_PREFIXES = ["/organizer", "/admin"] as const;

/**
 * `true` quando o pathname pertence ao fluxo público/participante.
 * Nos hosts curtos (app./admin.) o path não tem prefixo — quem cobre esse caso
 * são os contextos de superfície; aqui tratamos só o host principal.
 */
export function isParticipantPath(pathname: string): boolean {
  return !NON_PARTICIPANT_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Sinal 1 — isca no DOM. Insere um elemento com as classes bloqueadas, mede e
 * remove (sempre, mesmo em erro) para não deixar lixo na árvore.
 */
export function detectAdBlockBait(doc: Document): boolean {
  if (!doc?.body) return false;

  const bait = doc.createElement("div");
  bait.className = AD_BAIT_CLASS_NAMES.join(" ");
  bait.setAttribute("aria-hidden", "true");
  // Fora da viewport e sem interação: invisível ao usuário, mensurável pelo layout.
  bait.style.cssText =
    "position:absolute;top:-9999px;left:-9999px;width:10px;height:10px;pointer-events:none;";

  doc.body.appendChild(bait);
  try {
    const style = doc.defaultView?.getComputedStyle(bait);
    return (
      bait.offsetParent === null ||
      bait.offsetHeight === 0 ||
      bait.clientHeight === 0 ||
      style?.display === "none" ||
      style?.visibility === "hidden"
    );
  } finally {
    bait.remove();
  }
}

interface NetworkProbeOptions {
  urls?: readonly string[];
  controlUrl?: string;
  timeoutMs?: number;
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
}

/**
 * Sinal 2 — probe de rede. Dispara controle + sondas EM PARALELO (um único
 * round-trip de latência) e aborta tudo no timeout.
 */
export async function detectAdBlockNetwork({
  urls = AD_PROBE_URLS,
  controlUrl = AD_PROBE_CONTROL_URL,
  timeoutMs = 3000,
  signal,
  fetchImpl = typeof globalThis.fetch === "function"
    ? globalThis.fetch.bind(globalThis)
    : undefined,
}: NetworkProbeOptions = {}): Promise<boolean> {
  if (typeof fetchImpl !== "function") return false;
  if (signal?.aborted) return false;

  const controller = new AbortController();
  const abortFromOutside = () => controller.abort();
  signal?.addEventListener("abort", abortFromOutside, { once: true });
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const request = (url: string, init: RequestInit): Promise<boolean> =>
    fetchImpl(url, { cache: "no-store", signal: controller.signal, ...init })
      .then(() => true)
      .catch(() => false);

  try {
    const [controlOk, ...probeResults] = await Promise.all([
      request(controlUrl, { method: "HEAD" }),
      // `no-cors`: só interessa se a request SAI — a resposta é opaca de propósito.
      ...urls.map((url) => request(url, { mode: "no-cors" })),
    ]);

    // Aborto externo (unmount) ou rede indisponível → não acusa nada.
    if (signal?.aborted || !controlOk) return false;
    return probeResults.some((ok) => !ok);
  } finally {
    clearTimeout(timeoutId);
    signal?.removeEventListener("abort", abortFromOutside);
  }
}

/** Bait (síncrono, barato) primeiro; probe de rede só se a isca não acusar. */
export async function detectAdBlock(
  options: NetworkProbeOptions & { doc?: Document } = {},
): Promise<boolean> {
  const { doc = typeof document !== "undefined" ? document : undefined, ...network } =
    options;

  if (doc && detectAdBlockBait(doc)) return true;
  return detectAdBlockNetwork(network);
}

function safeSessionStorage(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.sessionStorage : null;
  } catch {
    // Safari em modo privado / cookies bloqueados lançam ao acessar o storage.
    return null;
  }
}

export function isAdBlockNoticeDismissed(
  storage: Storage | null = safeSessionStorage(),
): boolean {
  try {
    return storage?.getItem(AD_BLOCK_NOTICE_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function dismissAdBlockNotice(
  storage: Storage | null = safeSessionStorage(),
): void {
  try {
    storage?.setItem(AD_BLOCK_NOTICE_STORAGE_KEY, "1");
  } catch {
    // Sem storage o aviso volta na próxima navegação — degradação aceitável.
  }
}
