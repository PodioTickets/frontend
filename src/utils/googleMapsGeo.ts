/**
 * Helpers PUROS de geolocalização para o seletor de local do evento
 * (`LocationPickerModal`). Isolados de qualquer dependência de UI/Google SDK
 * para serem testáveis e reutilizáveis nos boundaries de build/validação.
 *
 * O local escolhido no mapa é persistido de forma ESTRUTURADA (`latitude` /
 * `longitude` / `locationName`), mas continuamos derivando um `googleMapsLink`
 * canônico a partir das coordenadas — assim o consumo público existente
 * (`EventMap` → `googleMapsLinkToEmbedUrl`, que lê o param `query`) segue
 * funcionando sem qualquer mudança no lado de leitura.
 */

/** Precisão máxima das coordenadas persistidas: ~1 cm (7 casas decimais).
 *  Evita ruído de ponto flutuante do SDK sem perder precisão de pino. */
const COORD_DECIMALS = 7;

/**
 * Converte um valor livre (string do form, número do SDK) numa coordenada
 * numérica finita, ou `null` quando não representa um número válido.
 * Aceita vírgula decimal ("−23,5" → −23.5) para tolerar entrada localizada.
 */
export function parseCoordinate(
  value: string | number | null | undefined,
): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  // Só troca a vírgula por ponto quando não há ponto (evita quebrar "1.234,5").
  const normalized = trimmed.includes(".")
    ? trimmed.replace(/,/g, "")
    : trimmed.replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

/** Latitude válida: número finito em [-90, 90]. */
export function isValidLatitude(value: string | number | null | undefined): boolean {
  const n = parseCoordinate(value);
  return n !== null && n >= -90 && n <= 90;
}

/** Longitude válida: número finito em [-180, 180]. */
export function isValidLongitude(value: string | number | null | undefined): boolean {
  const n = parseCoordinate(value);
  return n !== null && n >= -180 && n <= 180;
}

/** Par (lat, lng) presente e dentro dos limites geográficos. */
export function hasValidCoordinates(
  lat: string | number | null | undefined,
  lng: string | number | null | undefined,
): boolean {
  return isValidLatitude(lat) && isValidLongitude(lng);
}

/** Arredonda para `COORD_DECIMALS` casas, removendo zeros/ponto finais. */
export function roundCoordinate(value: number): number {
  return Number(value.toFixed(COORD_DECIMALS));
}

/**
 * Coordenadas → URL canônica do Google Maps (formato "search by query" com
 * `query=lat,lng`). Retorna `""` se as coordenadas forem inválidas.
 *
 * O resultado é compatível com `googleMapsLinkToEmbedUrl`/`safeGoogleMapsExternalLink`
 * (host google.com + param `query`), então o embed do local exato e o botão
 * "Abrir no Google Maps" continuam funcionando sem alteração.
 */
export function buildGoogleMapsLinkFromCoordinates(
  lat: string | number | null | undefined,
  lng: string | number | null | undefined,
): string {
  const latNum = parseCoordinate(lat);
  const lngNum = parseCoordinate(lng);
  if (
    latNum === null ||
    lngNum === null ||
    latNum < -90 ||
    latNum > 90 ||
    lngNum < -180 ||
    lngNum > 180
  ) {
    return "";
  }
  const q = `${roundCoordinate(latNum)},${roundCoordinate(lngNum)}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

/** Rótulo curto "lat, lng" (5 casas ~1 m) para exibir no preview do local. */
export function formatCoordinatesLabel(
  lat: string | number | null | undefined,
  lng: string | number | null | undefined,
): string {
  const latNum = parseCoordinate(lat);
  const lngNum = parseCoordinate(lng);
  if (latNum === null || lngNum === null) return "";
  return `${latNum.toFixed(5)}, ${lngNum.toFixed(5)}`;
}
