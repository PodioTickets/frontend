"use client";

/**
 * Meta (Facebook) Pixel — carregamento sob demanda + disparo de eventos
 * STANDARD com deduplicação.
 *
 * O pixel é POR-EVENTO (`event.tracking.metaPixelId`), então usamos
 * `trackSingle` para mirar exatamente o pixel do evento em questão — evita
 * contaminar pixels de outros eventos caso o usuário visite vários na mesma
 * sessão. O script base é injetado uma única vez e cada `pixelId` é inicializado
 * no máximo uma vez.
 *
 * Deduplicação (evita re-disparo em F5 / revisita):
 *  - `onceKey` sem `persist` → sessionStorage (sobrevive a F5 na mesma aba).
 *  - `onceKey` com `persist`  → localStorage  (sobrevive sessões/reabrir aba).
 *    Usado no Purchase: a conversão precisa contar UMA vez por pedido.
 */

export type MetaStandardEvent =
  | "ViewContent"
  | "AddToCart"
  | "InitiateCheckout"
  | "AddPaymentInfo"
  | "Purchase";

type Fbq = ((...args: unknown[]) => void) & {
  queue?: unknown[];
  loaded?: boolean;
  version?: string;
  push?: unknown;
  callMethod?: (...args: unknown[]) => void;
};

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
  }
}

// Pixels já inicializados nesta sessão de página (reset a cada full reload).
const initedPixels = new Set<string>();

/** Injeta o snippet base do Pixel uma única vez (idempotente). */
function ensurePixelScript(): void {
  if (typeof window === "undefined" || window.fbq) return;

  const fbq = function (...args: unknown[]) {
    fbq.callMethod
      ? fbq.callMethod.apply(fbq, args)
      : fbq.queue!.push(args);
  } as Fbq;

  window.fbq = fbq;
  if (!window._fbq) window._fbq = fbq;
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = "2.0";
  fbq.queue = [];

  const script = document.createElement("script");
  script.async = true;
  script.src = "https://connect.facebook.net/en_US/fbevents.js";
  const first = document.getElementsByTagName("script")[0];
  first?.parentNode?.insertBefore(script, first);
}

/** Garante script carregado + `init` do pixel (uma vez por `pixelId`). */
export function initMetaPixel(pixelId?: string | null): void {
  if (!pixelId || typeof window === "undefined") return;
  ensurePixelScript();
  if (initedPixels.has(pixelId)) return;
  window.fbq?.("init", pixelId);
  initedPixels.add(pixelId);
}

interface TrackOptions {
  /** Dispara só uma vez por chave (deduplicação). */
  onceKey?: string;
  /** `true` → dedup persistente em localStorage; senão sessionStorage. */
  persist?: boolean;
}

/** Marca a chave como disparada; retorna `true` se já havia disparado antes. */
function alreadyFired(onceKey: string, persist?: boolean): boolean {
  if (typeof window === "undefined") return true;
  try {
    const storage = persist ? window.localStorage : window.sessionStorage;
    const key = `mp:fired:${onceKey}`;
    if (storage.getItem(key)) return true;
    storage.setItem(key, String(Date.now()));
    return false;
  } catch {
    // Storage bloqueado (aba privada / cookies off): segue sem dedup persistente.
    return false;
  }
}

/**
 * Dispara um evento standard do Meta Pixel para o `pixelId` do evento.
 * No-op se não houver `pixelId` ou se a `onceKey` já tiver sido disparada.
 */
export function trackMetaPixel(
  pixelId: string | null | undefined,
  event: MetaStandardEvent,
  params?: Record<string, unknown>,
  options?: TrackOptions,
): void {
  if (!pixelId || typeof window === "undefined") {
    return;
  }
  if (options?.onceKey && alreadyFired(options.onceKey, options.persist)) {
    return;
  }
  initMetaPixel(pixelId);
  window.fbq?.("trackSingle", pixelId, event, params ?? {});
}
