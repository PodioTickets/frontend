/**
 * Conversão do link do Google Maps informado pelo organizador (campo
 * `googleMapsLink` do evento) em URL de embed pro iframe do mapa.
 *
 * Formatos aceitos (com ou sem protocolo):
 * - google.com/maps/search/?api=1&query=Av.+Paulista+2084
 * - google.com/maps?q=...
 * - google.com/maps/place/Nome+Do+Lugar/@-23.56,-46.65,17z
 * - google.com/maps/search/Termo+Livre
 * - maps.app.goo.gl/xxxx (link curto — NÃO conversível client-side; retorna
 *   null e o chamador usa o fallback por cidade/estado)
 *
 * Segurança: só hosts do Google são aceitos — o resultado vai num iframe e o
 * link externo abre _blank; nunca embedar/linkar URL arbitrária do banco.
 */

const GOOGLE_MAPS_HOSTS = new Set([
  "google.com",
  "maps.google.com",
  "maps.app.goo.gl",
  "goo.gl",
]);

function isAllowedGoogleHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (GOOGLE_MAPS_HOSTS.has(h)) return true;
  // www.google.com, google.com.br, www.google.com.br, maps.google.com.br…
  return /^(www\.|maps\.)?google\.(com|com\.[a-z]{2}|[a-z]{2})$/.test(h);
}

/** Parseia o link normalizando protocolo ausente ("www.google.com/..."). */
function parseMapsLink(link: string): URL | null {
  const t = link.trim();
  if (!t) return null;
  const withProtocol = /^https?:\/\//i.test(t) ? t : `https://${t}`;
  let url: URL;
  try {
    url = new URL(withProtocol);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (!isAllowedGoogleHost(url.hostname)) return null;
  return url;
}

/** Extrai o termo de busca/coordenada que identifica o local no link. */
function extractMapsQuery(url: URL): string | null {
  // 1. Query params explícitos (formato recomendado no form do organizador).
  const fromParams = url.searchParams.get("query") || url.searchParams.get("q");
  if (fromParams?.trim()) return fromParams.trim();

  // 2. /maps/place/<nome>/@lat,lng — coordenada é o sinal mais preciso.
  const coords = url.pathname.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (coords) return `${coords[1]},${coords[2]}`;

  // 3. Segmento de path: /maps/place/<nome> ou /maps/search/<termo>.
  const segment = url.pathname.match(/\/maps\/(?:place|search|dir)\/([^/@]+)/);
  if (segment?.[1]) {
    try {
      const decoded = decodeURIComponent(segment[1]).replace(/\+/g, " ").trim();
      if (decoded) return decoded;
    } catch {
      /* segmento malformado — segue pro fallback */
    }
  }

  return null;
}

/**
 * Link do organizador → URL de embed (`output=embed`).
 * Retorna `null` quando não dá pra derivar (link curto, formato desconhecido,
 * host não-Google) — o chamador decide o fallback (cidade/estado).
 */
export function googleMapsLinkToEmbedUrl(
  link: string | null | undefined,
): string | null {
  if (!link) return null;
  const url = parseMapsLink(link);
  if (!url) return null;
  const query = extractMapsQuery(url);
  if (!query) return null;
  return `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
}

/**
 * Link externo seguro ("Abrir no Google Maps"): o link do organizador
 * normalizado, ou `null` se inválido/host estranho (chamador usa fallback).
 * Links curtos goo.gl SÃO válidos aqui (o redirect resolve no browser).
 */
export function safeGoogleMapsExternalLink(
  link: string | null | undefined,
): string | null {
  if (!link) return null;
  const url = parseMapsLink(link);
  return url ? url.toString() : null;
}
