import DOMPurify from "isomorphic-dompurify";

/**
 * Sanitização de conteúdo rico (HTML autorado por organizadores via Quill,
 * ou notificações administrativas) antes de ir para `dangerouslySetInnerHTML`.
 *
 * Por que existe:
 * - O HTML vem de uma fonte semi-confiável (organizador) mas é exibido para
 *   terceiros (compradores) na página pública do evento. Sem sanitização, um
 *   `<img onerror>`, `<script>` inline ou `<iframe src="javascript:...">`
 *   executa JS arbitrário no navegador da vítima (XSS armazenado) — e como o
 *   token de sessão é legível por JS, vira roubo de sessão.
 * - Embeds legítimos (Instagram, Strava, YouTube, etc.) precisam de `<iframe>`
 *   e, em alguns casos, de um `<script>` externo do provedor. Liberamos esses
 *   dois vetores APENAS para uma allowlist explícita de domínios; todo o resto
 *   é removido pelo DOMPurify.
 *
 * Segurança em camadas: o DOMPurify nunca deixa passar `<script>` (inline ou
 * com src) nem handlers `on*`. A ativação dos embeds é feita separadamente,
 * injetando no `<head>` somente scripts cujo host esteja em
 * EMBED_SCRIPT_HOST_ALLOWLIST (ver `isAllowedEmbedScriptSrc`).
 */

/**
 * Hosts cujos `<iframe src>` são permitidos no conteúdo renderizado.
 * Comparação por sufixo de hostname (ex.: "youtube.com" cobre
 * "www.youtube.com"), sempre exigindo fronteira de ponto para evitar bypass
 * tipo "evil-youtube.com".
 */
const EMBED_IFRAME_HOST_ALLOWLIST: readonly string[] = [
  "instagram.com",
  "strava.com",
  "strava-embeds.com",
  "facebook.com",
  "platform.twitter.com",
  "twitter.com",
  "x.com",
  "tiktok.com",
  "youtube.com",
  "youtube-nocookie.com",
  "vimeo.com",
  "player.vimeo.com",
  "open.spotify.com",
  "spotify.com",
  "google.com", // Google Maps embed
  "maps.google.com",
];

/**
 * Hosts cujos `<script src>` de embed podem ser injetados no documento.
 * Mais restritivo que o de iframes: só provedores que de fato exigem um script
 * de ativação (Instagram, Strava, Facebook SDK, Twitter widgets, TikTok).
 */
const EMBED_SCRIPT_HOST_ALLOWLIST: readonly string[] = [
  "instagram.com",
  "strava-embeds.com",
  "connect.facebook.net",
  "platform.twitter.com",
  "tiktok.com",
];

/** Normaliza `//host/...` (protocol-relative) para `https:` antes do parse. */
function toAbsoluteUrl(src: string): URL | null {
  try {
    const normalized = src.startsWith("//") ? `https:${src}` : src;
    // Base só é usada para resolver caminhos relativos; embeds sempre são absolutos.
    const url = new URL(normalized, "https://podiotickets.invalid");
    return url;
  } catch {
    return null;
  }
}

/** `true` se `host` é igual a `allowed` ou um subdomínio dele (fronteira de ponto). */
function hostMatches(host: string, allowed: string): boolean {
  return host === allowed || host.endsWith(`.${allowed}`);
}

function isHostAllowed(src: string, allowlist: readonly string[]): boolean {
  const url = toAbsoluteUrl(src);
  if (!url) return false;
  // Apenas http(s); bloqueia javascript:, data:, etc.
  if (url.protocol !== "https:" && url.protocol !== "http:") return false;
  const host = url.hostname.toLowerCase();
  return allowlist.some((allowed) => hostMatches(host, allowed));
}

/** Decide se um `<iframe src>` pode permanecer no HTML renderizado. */
export function isAllowedEmbedIframeSrc(src: string): boolean {
  return isHostAllowed(src, EMBED_IFRAME_HOST_ALLOWLIST);
}

/** Decide se um `<script src>` de embed pode ser injetado no documento. */
export function isAllowedEmbedScriptSrc(src: string): boolean {
  return isHostAllowed(src, EMBED_SCRIPT_HOST_ALLOWLIST);
}

/**
 * Filtra uma lista de `src` de script, mantendo só os de provedores na
 * allowlist. Os descartados são reportados via `onBlocked` (logging opcional).
 */
export function filterAllowedEmbedScriptSrcs(
  srcs: readonly string[],
  onBlocked?: (src: string) => void,
): string[] {
  const allowed: string[] = [];
  for (const src of srcs) {
    if (isAllowedEmbedScriptSrc(src)) {
      allowed.push(src);
    } else {
      onBlocked?.(src);
    }
  }
  return allowed;
}

// Atributos extras que os embeds precisam, além do conjunto padrão do DOMPurify.
const IFRAME_ATTRS = [
  "allow",
  "allowfullscreen",
  "allowtransparency",
  "frameborder",
  "scrolling",
  "loading",
  "referrerpolicy",
];

// Registrado uma única vez por runtime. O hook valida o `src` de cada iframe
// contra a allowlist depois que o DOMPurify já limpou os atributos perigosos.
let hookRegistered = false;
function ensureIframeHook(): void {
  if (hookRegistered) return;
  hookRegistered = true;
  DOMPurify.addHook("uponSanitizeElement", (node, data) => {
    if (data.tagName !== "iframe") return;
    const el = node as Element;
    const src = el.getAttribute("src") ?? "";
    if (!src || !isAllowedEmbedIframeSrc(src)) {
      // Remove o iframe inteiro se a origem não for confiável.
      el.parentNode?.removeChild(el);
    }
  });
}

/**
 * Sanitiza HTML rico preservando embeds de provedores confiáveis.
 *
 * Funciona em SSR e no client (isomorphic-dompurify usa jsdom no servidor e o
 * DOM nativo no browser), então pode ser chamada no render inicial sem perder
 * o conteúdo para o crawler/SEO.
 */
export function sanitizeRichHtml(html: string | null | undefined): string {
  if (typeof html !== "string" || html.length === 0) return "";
  ensureIframeHook();
  return DOMPurify.sanitize(html, {
    ADD_TAGS: ["iframe"],
    ADD_ATTR: IFRAME_ATTRS,
    // `<script>` (inline ou com src) e handlers on* são removidos por padrão —
    // não os reabilitamos aqui. Ativação de embed é feita à parte, via allowlist.
    FORBID_TAGS: ["script", "style"],
    ALLOW_DATA_ATTR: true,
  });
}
