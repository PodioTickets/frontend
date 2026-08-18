"use client";

/**
 * Google tag (gtag.js) POR-EVENTO — carrega/configura os IDs que o organizador
 * cadastra em "Rastreamento e Conversões" (`event.tracking.googleAdsId` e
 * `event.tracking.googleAnalyticsId`) nas páginas públicas do evento.
 *
 * Espelha o `lib/metaPixel.ts`:
 *  - Gate de PRODUÇÃO real (`isTrackingEnabled()` → `ENABLE_TRACKING_SCRIPTS`),
 *    igual ao Meta Pixel — em homologação NÃO carrega nem dispara.
 *  - Idempotente: o loader `gtag/js` é injetado no máximo uma vez (a lib do
 *    Google carrega UM script e serve todos os IDs via `gtag('config', id)`),
 *    e cada `id` é configurado no máximo uma vez por carregamento de página.
 *  - NÃO duplica o loader que o RootLayout já injeta em produção (pixel global
 *    da plataforma `AW-...`): se já existe um `script` do `gtag/js` no DOM,
 *    reaproveita; a `config` do ID do evento apenas se soma.
 *
 * Aceita tanto Google Ads (`AW-XXXX`) quanto GA4 (`G-XXXX`): `gtag('config', id)`
 * é o mesmo verbo para ambos e já emite o page_view/remarketing do ID.
 */

import { isTrackingEnabled } from "@/lib/trackingEnabled";

type Gtag = (...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
  }
}

// IDs já configurados nesta sessão de página (reset a cada full reload).
const configuredIds = new Set<string>();

/** Garante `window.dataLayer` + `window.gtag` (stub oficial) — idempotente. */
function ensureGtagBase(): void {
  if (typeof window === "undefined") return;
  if (!window.dataLayer) window.dataLayer = [];
  if (!window.gtag) {
    // Stub idêntico ao snippet oficial (empurra `arguments` no dataLayer).
    function gtag() {
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer!.push(arguments);
    }
    window.gtag = gtag as unknown as Gtag;
    window.gtag("js", new Date());
  }
}

/** Injeta o loader `gtag/js` uma única vez (reusa o do RootLayout se já existir). */
function ensureGtagLoader(id: string): void {
  if (typeof document === "undefined") return;
  // Já há um loader do gtag no DOM (global do layout OU de outro ID) → reaproveita.
  if (document.querySelector('script[src*="googletagmanager.com/gtag/js"]')) return;
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(script);
}

/**
 * Carrega o gtag + `config` do ID informado (uma vez por `id`).
 * No-op fora de produção real, sem ID, ou se o ID já foi configurado.
 */
export function initGoogleTag(id?: string | null): void {
  // Gate de produção: fora de prod NÃO injeta o script nem configura o ID.
  if (!isTrackingEnabled()) return;
  const clean = id?.trim();
  if (!clean || typeof window === "undefined") return;
  if (configuredIds.has(clean)) return;
  ensureGtagBase();
  ensureGtagLoader(clean);
  window.gtag?.("config", clean);
  configuredIds.add(clean);
}

/**
 * Configura os IDs de Google de um evento (Ads + Analytics) de uma vez.
 * Cada um é opcional; só os preenchidos são configurados.
 */
export function initEventGoogleTags(
  tracking?: { googleAdsId?: string | null; googleAnalyticsId?: string | null } | null,
): void {
  if (!tracking) return;
  initGoogleTag(tracking.googleAdsId);
  initGoogleTag(tracking.googleAnalyticsId);
}

/** Marca a `onceKey` como disparada; retorna `true` se já havia disparado antes.
 *  Persistente (localStorage): a conversão conta no MÁXIMO 1× por pedido, mesmo
 *  com F5/revisita. Storage bloqueado (aba privada) → segue sem dedup. */
function alreadyFired(onceKey: string): boolean {
  if (typeof window === "undefined") return true;
  try {
    const key = `gt:fired:${onceKey}`;
    if (window.localStorage.getItem(key)) return true;
    window.localStorage.setItem(key, String(Date.now()));
    return false;
  } catch {
    return false;
  }
}

/**
 * Conversão de COMPRA (`purchase`) para os IDs de Google do evento — espelha o
 * `Purchase` do Meta Pixel no sucesso do checkout.
 *
 * Envia `gtag('event','purchase', { send_to: id, ... })` para cada ID preenchido
 * (Ads `AW-` e/ou GA4 `G-`). Em GA4 é o evento de compra recomendado; em Google
 * Ads é best-effort — uma conversão Ads "oficial" exigiria também o LABEL
 * (`AW-XXXX/label`), que hoje não é coletado do organizador (só o ID).
 *
 * Gate de produção ANTES da `onceKey` (preserva a 1ª conversão real em prod).
 */
export function trackGooglePurchase(
  tracking: { googleAdsId?: string | null; googleAnalyticsId?: string | null } | null | undefined,
  params: { transactionId: string; value: number; currency?: string },
  options?: { onceKey?: string },
): void {
  // Gate de produção: fora de prod nada dispara (nem consome a `onceKey`).
  if (!isTrackingEnabled()) return;
  if (!tracking || typeof window === "undefined") return;
  const ids = [tracking.googleAdsId, tracking.googleAnalyticsId]
    .map((v) => v?.trim())
    .filter((v): v is string => !!v);
  if (ids.length === 0) return;
  if (options?.onceKey && alreadyFired(options.onceKey)) return;
  for (const id of ids) {
    initGoogleTag(id); // garante script + config antes do evento
    window.gtag?.("event", "purchase", {
      send_to: id,
      transaction_id: params.transactionId,
      value: params.value,
      currency: params.currency ?? "BRL",
    });
  }
}
