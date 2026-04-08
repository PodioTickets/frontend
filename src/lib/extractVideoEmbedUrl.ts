/**
 * Normaliza entrada do usuário (URL ou código `<iframe ...>`) para uma URL
 * de embed que o Quill Video blot consegue renderizar dentro de um iframe.
 *
 * Suporta YouTube (watch, youtu.be, shorts, embed) e Vimeo. Para outras URLs
 * absolutas (https://), retorna a URL crua — permitindo qualquer provedor
 * que sirva um embed navegável em iframe.
 *
 * Retorna `null` quando a entrada não é reconhecível como URL/iframe.
 */
export function extractVideoEmbedUrl(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;

  // Caso 1: entrada é um <iframe ...> completo — extrai o src
  let candidate = raw;
  const iframeMatch = raw.match(/<iframe\b[^>]*\ssrc\s*=\s*["']([^"']+)["'][^>]*>/i);
  if (iframeMatch) {
    candidate = iframeMatch[1].trim();
  }

  // Decodifica entities comuns (&amp; -> &) que aparecem em embeds colados
  candidate = candidate.replace(/&amp;/gi, "&");

  // YouTube — normaliza para /embed/<id>
  const yt = candidate.match(
    /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/i,
  );
  if (yt) {
    return `https://www.youtube.com/embed/${yt[1]}`;
  }

  // Vimeo — normaliza para player.vimeo.com/video/<id>
  const vimeo = candidate.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  if (vimeo) {
    return `https://player.vimeo.com/video/${vimeo[1]}`;
  }

  // Qualquer outra URL absoluta: deixa passar
  if (/^https?:\/\//i.test(candidate)) return candidate;

  // Protocolo-relativo (//host/path) — prefixa https
  if (/^\/\//.test(candidate)) return `https:${candidate}`;

  return null;
}
