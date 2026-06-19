"use client";

/**
 * Telemetria de atividade do usuário — ingestão no backend via
 * `POST /api/v1/me/activity/events` (aceita anônimo).
 *
 * Decisões:
 *  - `sessionId` persistente em localStorage costura a jornada
 *    anônimo → autenticado (o mesmo id também vai como header
 *    `x-session-id` em TODA chamada do ApiClient, então os eventos
 *    capturados pelo BACKEND — reserve/pay/etc. — carregam a mesma
 *    identidade e o funil de compra fecha de ponta a ponta).
 *  - Fire-and-forget com `fetch` + `keepalive`: nada de axios/refresh aqui —
 *    telemetria nunca pode atrasar nem quebrar o fluxo principal. Falha é
 *    silenciosa por design.
 *  - Throttle por chave (ex.: 1 page view por evento a cada 30s) absorve o
 *    double-effect do StrictMode e re-renders sem inflar a métrica.
 */

const SESSION_ID_KEY = "pt:activity:sid";
const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3333"
).replace(/\/$/, "");

/** Throttle em escopo de módulo: chave → timestamp do último disparo. */
const lastFiredAt = new Map<string, number>();

export type UserActivityCategory =
  | "PAGE_VIEW"
  | "CLICK"
  | "API"
  | "AUTH"
  | "CHECKOUT"
  | "PROFILE"
  | "COMPLIANCE"
  | "OTHER";

export interface ActivityEvent {
  category: UserActivityCategory;
  /** Identificador curto/estável. Ex.: "page:event". Sem IDs no string. */
  action: string;
  path?: string;
  referrer?: string;
  metadata?: Record<string, unknown>;
}

/** UUID v4 com fallback pra ambientes sem `crypto.randomUUID` (http antigo). */
function generateUuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // Fallback RFC4122-ish — suficiente pra identidade de telemetria.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/**
 * Id de sessão de telemetria, persistente entre navegações/abas do mesmo
 * perfil de browser. `null` no SSR ou com storage bloqueado (aba privada).
 */
export function getActivitySessionId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    let sid = window.localStorage.getItem(SESSION_ID_KEY);
    if (!sid) {
      sid = generateUuid();
      window.localStorage.setItem(SESSION_ID_KEY, sid);
    }
    return sid;
  } catch {
    return null;
  }
}

interface TrackOptions {
  /** Dispara no máximo 1x por chave dentro de `throttleMs` (default 30s). */
  throttleKey?: string;
  throttleMs?: number;
}

/**
 * Envia um evento de telemetria. Fire-and-forget: nunca lança, nunca espera.
 */
export function trackUserActivity(
  event: ActivityEvent,
  options?: TrackOptions
): void {
  if (typeof window === "undefined") return;

  try {
    if (options?.throttleKey) {
      const now = Date.now();
      const last = lastFiredAt.get(options.throttleKey) ?? 0;
      if (now - last < (options.throttleMs ?? 30_000)) return;
      lastFiredAt.set(options.throttleKey, now);
    }

    const sessionId = getActivitySessionId();
    // Auth por cookie httpOnly: `credentials: "include"` envia o cookie quando
    // logado (backend associa o userId); deslogado vai anônimo e o sessionId
    // costura depois. Não lê mais o token em JS (invisível com httpOnly).
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    void fetch(`${API_BASE}/api/v1/me/activity/events`, {
      method: "POST",
      credentials: "include",
      headers,
      keepalive: true, // sobrevive à navegação/fechamento da aba
      body: JSON.stringify({
        ...(sessionId ? { sessionId } : {}),
        events: [event],
      }),
    }).catch(() => {
      // Telemetria é best-effort — rede fora do ar não vira erro de UX.
    });
  } catch {
    // Nunca propagar: storage bloqueado, JSON exótico, etc.
  }
}

/**
 * Page view da página pública do evento — topo do funil de compra.
 * Throttle de 30s por evento absorve StrictMode/re-mounts; F5 ou revisita
 * depois disso conta como nova visualização (semântica de page view).
 */
export function trackEventPageView(eventId: string, slug: string): void {
  trackUserActivity(
    {
      category: "PAGE_VIEW",
      action: "page:event",
      path: typeof window !== "undefined" ? window.location.pathname : undefined,
      referrer:
        typeof document !== "undefined" && document.referrer
          ? document.referrer
          : undefined,
      metadata: { eventId, slug },
    },
    { throttleKey: `pv:${eventId}` }
  );
}
