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

export function isAllowedGoogleHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (GOOGLE_MAPS_HOSTS.has(h)) return true;
  // www.google.com, google.com.br, www.google.com.br, maps.google.com.br…
  return /^(www\.|maps\.)?google\.(com|com\.[a-z]{2}|[a-z]{2})$/.test(h);
}

/**
 * Link curto de compartilhamento (maps.app.goo.gl / goo.gl)? Não é conversível
 * client-side (redirect bloqueado por CORS) — precisa ser resolvido pelo
 * endpoint `/api/maps/resolve` antes de virar embed.
 */
export function isShortGoogleMapsLink(link: string | null | undefined): boolean {
  if (!link) return false;
  const url = parseMapsLink(link);
  if (!url) return false;
  const h = url.hostname.toLowerCase();
  return h === "maps.app.goo.gl" || h === "goo.gl";
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

  // 2. data=!…!3d<lat>!4d<lng> — coordenada DO PIN (links longos resolvidos de
  //    links curtos têm esse formato; mais preciso que o @, que é só a câmera).
  const pin = url.pathname.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  if (pin) return `${pin[1]},${pin[2]}`;

  // 3. /maps/place/<nome>/@lat,lng — centro da câmera (aproxima o local).
  const coords = url.pathname.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (coords) return `${coords[1]},${coords[2]}`;

  // 4. Segmento de path: /maps/place/<nome> ou /maps/search/<termo>.
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
