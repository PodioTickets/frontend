import { describe, it, expect, vi, beforeEach } from "vitest";

// Estado mutável do gate (prod on/off), hoisted p/ o factory do vi.mock.
const state = vi.hoisted(() => ({ enabled: true }));
vi.mock("@/lib/trackingEnabled", () => ({
  isTrackingEnabled: () => state.enabled,
}));

async function load() {
  vi.resetModules(); // zera o Set module-scope de IDs configurados
  return await import("@/lib/googleTag");
}

function gtagScripts(): HTMLScriptElement[] {
  return Array.from(
    document.querySelectorAll('script[src*="googletagmanager.com/gtag/js"]'),
  );
}
function entriesOf(verb: string): unknown[][] {
  const dl = (window.dataLayer ?? []) as unknown[];
  return dl.map((a) => Array.from(a as ArrayLike<unknown>)).filter((a) => a[0] === verb);
}
function configEntries(): unknown[][] {
  return entriesOf("config");
}
function purchaseEvents(): Record<string, unknown>[] {
  return entriesOf("event")
    .filter((a) => a[1] === "purchase")
    .map((a) => a[2] as Record<string, unknown>);
}

beforeEach(() => {
  document.head.innerHTML = "";
  delete (window as { gtag?: unknown }).gtag;
  delete (window as { dataLayer?: unknown }).dataLayer;
  window.localStorage.clear();
  state.enabled = true;
});

describe("googleTag", () => {
  it("gate OFF (homologação): não injeta script nem define gtag", async () => {
    state.enabled = false;
    const { initGoogleTag } = await load();
    initGoogleTag("AW-123");
    expect(window.gtag).toBeUndefined();
    expect(gtagScripts()).toHaveLength(0);
  });

  it("gate ON: injeta o loader, define gtag e configura o ID (page_view)", async () => {
    const { initGoogleTag } = await load();
    initGoogleTag("AW-123");
    expect(typeof window.gtag).toBe("function");
    const scripts = gtagScripts();
    expect(scripts).toHaveLength(1);
    expect(scripts[0].src).toContain("id=AW-123");
    expect(configEntries().some((a) => a[1] === "AW-123")).toBe(true);
  });

  it("é idempotente por ID: 2ª chamada do mesmo ID não re-configura", async () => {
    const { initGoogleTag } = await load();
    initGoogleTag("G-ABC");
    initGoogleTag("G-ABC");
    expect(configEntries().filter((a) => a[1] === "G-ABC")).toHaveLength(1);
  });

  it("reaproveita loader existente (não duplica o gtag/js do RootLayout)", async () => {
    // Simula o loader global já injetado pelo layout em produção.
    const pre = document.createElement("script");
    pre.src = "https://www.googletagmanager.com/gtag/js?id=AW-GLOBAL";
    document.head.appendChild(pre);
    const { initGoogleTag } = await load();
    initGoogleTag("AW-EVENTO");
    // Continua havendo só 1 script de loader; a config do evento apenas se soma.
    expect(gtagScripts()).toHaveLength(1);
    expect(configEntries().some((a) => a[1] === "AW-EVENTO")).toBe(true);
  });

  it("initEventGoogleTags: configura Ads + Analytics e ignora vazios", async () => {
    const { initEventGoogleTags } = await load();
    initEventGoogleTags({ googleAdsId: "AW-1", googleAnalyticsId: "G-2" });
    expect(configEntries().some((a) => a[1] === "AW-1")).toBe(true);
    expect(configEntries().some((a) => a[1] === "G-2")).toBe(true);

    initEventGoogleTags({ googleAdsId: "  ", googleAnalyticsId: null });
    // Nada novo configurado a partir de valores vazios/nulos.
    expect(configEntries()).toHaveLength(2);
  });

  it("trackGooglePurchase: dispara purchase p/ Ads + GA4 com valor/moeda/txn", async () => {
    const { trackGooglePurchase } = await load();
    trackGooglePurchase(
      { googleAdsId: "AW-1", googleAnalyticsId: "G-2" },
      { transactionId: "ORDER-9", value: 123.45, currency: "BRL" },
      { onceKey: "purchase:ORDER-9" },
    );
    const ev = purchaseEvents();
    expect(ev).toHaveLength(2); // um por ID (send_to)
    expect(ev.map((e) => e.send_to).sort()).toEqual(["AW-1", "G-2"]);
    expect(ev.every((e) => e.transaction_id === "ORDER-9")).toBe(true);
    expect(ev.every((e) => e.value === 123.45 && e.currency === "BRL")).toBe(true);
  });

  it("trackGooglePurchase: gate OFF não dispara nem consome a onceKey", async () => {
    state.enabled = false;
    const { trackGooglePurchase } = await load();
    trackGooglePurchase({ googleAdsId: "AW-1" }, { transactionId: "O", value: 1 }, { onceKey: "purchase:O" });
    expect(purchaseEvents()).toHaveLength(0);
    // onceKey NÃO foi consumida (gate antes) → em prod a 1ª conversão real conta.
    expect(window.localStorage.getItem("gt:fired:purchase:O")).toBeNull();
  });

  it("trackGooglePurchase: dedup persistente por pedido (não conta 2×)", async () => {
    const { trackGooglePurchase } = await load();
    const fire = (mod: { trackGooglePurchase: typeof trackGooglePurchase }) =>
      mod.trackGooglePurchase(
        { googleAnalyticsId: "G-2" },
        { transactionId: "ORDER-1", value: 10 },
        { onceKey: "purchase:ORDER-1" },
      );
    fire({ trackGooglePurchase });
    // 2ª chamada (ex.: F5) — mesmo com módulo re-carregado, localStorage persiste.
    const reloaded = await load();
    fire(reloaded);
    expect(purchaseEvents()).toHaveLength(1);
  });

  it("trackGooglePurchase: sem IDs preenchidos = no-op", async () => {
    const { trackGooglePurchase } = await load();
    trackGooglePurchase({ googleAdsId: "", googleAnalyticsId: null }, { transactionId: "O", value: 1 });
    expect(purchaseEvents()).toHaveLength(0);
  });
});
