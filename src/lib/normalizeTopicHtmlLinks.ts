/**
 * Hrefs como `www.google.com` ou `google.com/path` viram caminhos relativos no browser
 * (ex.: /events/www.google.com). Prefixa https:// quando for claramente URL externa.
 */
export function normalizeBareExternalHref(href: string): string {
  const t = href.trim();
  if (!t) return href;

  if (/^https?:\/\//i.test(t)) return href;
  if (/^\/\//.test(t)) return href;
  if (/^(\/|#|mailto:|tel:)/i.test(t)) return href;
  if (/^javascript:/i.test(t)) return href;

  // Provável arquivo relativo (evita https://report.pdf)
  if (
    /^[^/\\s]+\.(pdf|png|jpe?g|gif|webp|svg|docx?|xlsx?|zip)$/i.test(t)
  ) {
    return href;
  }

  if (/^www\./i.test(t)) {
    return `https://${t}`;
  }

  // hostname.tld com path/query/hash opcional (sem começar por /)
  if (
    /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+(?::\d+)?(?:\/|\?|#|$)/i.test(
      t,
    ) ||
    /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+(?::\d+)?$/i.test(
      t,
    )
  ) {
    return `https://${t}`;
  }

  return href;
}

/**
 * Ajusta todos os `href` de `<a>` no HTML dos tópicos (Quill).
 */
export function normalizeTopicHtmlAnchorHrefs(html: string): string {
  if (!html || !html.toLowerCase().includes("<a")) return html;

  return html.replace(/<a\b[^>]*>/gi, (openTag) =>
    openTag.replace(
      /\bhref\s*=\s*(["'])([^"']*)\1|\bhref\s*=\s*([^\s>]+)/i,
      (
        m,
        quote: string | undefined,
        hrefQuoted: string | undefined,
        hrefBare: string | undefined,
      ) => {
        const href = (hrefQuoted ?? hrefBare ?? "").trim();
        const normalized = normalizeBareExternalHref(href);
        if (normalized === href) return m;
        if (quote) return `href=${quote}${normalized}${quote}`;
        return `href="${normalized}"`;
      },
    ),
  );
}
