/**
 * Encurta um UUID para exibição: mostra só o primeiro segmento (os 8 chars hex
 * antes do primeiro "-"). Ex.: "999ef0df-a1a3-4e10-95eb-7b2b8df6f0c7" -> "999ef0df".
 *
 * É puramente visual — o ID completo continua sendo usado em links, chamadas de
 * API e chaves internas. Use só onde um humano LÊ o id (painéis, modais, etc.).
 */
export function shortId(id?: string | null): string {
  if (!id) return "";
  const str = String(id);
  const first = str.split("-")[0];
  return first || str;
}

/**
 * Igual a {@link shortId}, mas com o prefixo "#": "#999ef0df".
 * Retorna "" quando não há id.
 */
export function formatShortId(id?: string | null): string {
  const s = shortId(id);
  return s ? `#${s}` : "";
}
