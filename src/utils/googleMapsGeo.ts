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

/**
 * Link do Google Maps para o CLIQUE do usuário ("abrir no mapa") mostrando o
 * NOME do local, não as coordenadas. Quando há `locationName` (POI escolhido no
 * mapa), busca por `"Nome, Cidade, UF"` — o Google rotula com o nome do lugar.
 * Sem `locationName` (evento legado), cai no `fallback` (link por coordenadas),
 * que mantém o pino exato mesmo sem nome.
 *
 * Obs.: o EMBED (`EventMap`) continua usando o link por coordenadas — pino
 * preciso; aqui é só o rótulo do clique externo.
 */
export function buildGoogleMapsPlaceLink(parts: {
  locationName?: string | null;
  city?: string | null;
  state?: string | null;
  fallback?: string | null;
}): string {
  const name = parts.locationName?.trim();
  if (name) {
    const query = [name, parts.city?.trim(), parts.state?.trim()]
      .filter((v): v is string => !!v)
      .join(", ");
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  }
  return parts.fallback?.trim() || "";
}

/**
 * Endereço estruturado derivado do local escolhido no mapa. Preenchido no
 * MELHOR ESFORÇO a partir do reverse-geocode/Place do Google — qualquer campo
 * pode vir vazio (ex.: POI sem número, área rural sem bairro).
 */
export interface ParsedAddressComponents {
  /** CEP como o Google devolve (ex.: "01310-100"); pode vir vazio. */
  cep: string;
  /** Logradouro + número quando disponível (ex.: "Avenida Paulista, 1578"). */
  street: string;
  neighborhood: string;
  city: string;
  /** UF (short_name, ex.: "SP") — cai no nome completo se o short faltar. */
  state: string;
}

/** Shape de um address component tolerando as DUAS APIs do Google:
 *  Geocoder clássico (`long_name`/`short_name`) e Places New (`longText`/`shortText`). */
type RawAddressComponent = {
  types?: string[];
  long_name?: string;
  short_name?: string;
  longText?: string;
  shortText?: string;
};

const EMPTY_ADDRESS: ParsedAddressComponents = {
  cep: "",
  street: "",
  neighborhood: "",
  city: "",
  state: "",
};

/**
 * Converte o array de `address_components`/`addressComponents` do Google num
 * endereço estruturado PT-BR. Puro e defensivo: entrada inválida → tudo vazio.
 *
 * Usado pelo `LocationPickerModal` para preencher automaticamente o endereço do
 * evento (o formulário manual de endereço foi removido — a fonte é o mapa).
 */
export function parseGoogleAddressComponents(
  components: unknown,
): ParsedAddressComponents {
  if (!Array.isArray(components)) return { ...EMPTY_ADDRESS };

  const list = components as RawAddressComponent[];
  const longOf = (c: RawAddressComponent | undefined): string =>
    (c?.long_name ?? c?.longText ?? "").trim();
  const shortOf = (c: RawAddressComponent | undefined): string =>
    (c?.short_name ?? c?.shortText ?? "").trim();
  // Primeiro componente cujo `types` inclui o tipo pedido.
  const byType = (type: string): RawAddressComponent | undefined =>
    list.find((c) => Array.isArray(c?.types) && c.types.includes(type));

  const routeName = longOf(byType("route"));
  const number = longOf(byType("street_number"));
  // Ordem PT-BR: "Rua X, 123".
  const street = routeName && number ? `${routeName}, ${number}` : routeName;

  const neighborhoodC =
    byType("sublocality_level_1") ?? byType("sublocality") ?? byType("neighborhood");
  // Cidade: preferimos `locality`; em alguns municípios só vem no nível 2.
  const cityC = byType("locality") ?? byType("administrative_area_level_2");
  const stateC = byType("administrative_area_level_1");

  return {
    cep: longOf(byType("postal_code")),
    street,
    neighborhood: longOf(neighborhoodC),
    city: longOf(cityC),
    // UF pelo short_name ("SP"); fallback pro nome completo se faltar.
    state: shortOf(stateC) || longOf(stateC),
  };
}

/**
 * O local escolhido no mapa está "identificado" quando o geocode devolveu, no
 * mínimo, CIDADE e ESTADO — a mesma validação que a publicação do evento exige
 * (`events.service.submitForReview` barra sem `city`/`state`; `country` é sempre
 * "BR" e `location` é garantido no build a partir do nome/endereço do local).
 *
 * NÃO exigimos logradouro (`street`): muitos locais legítimos (POIs, praças,
 * ginásios, áreas rurais) não retornam rua no geocode, e cobrar isso disparava
 * "endereço não identificado" quase sempre. Cidade+estado é o sinal geográfico
 * que praticamente todo ponto em terra traz; pontos sem eles (mar, área sem
 * município) continuam corretamente barrados.
 */
export function isAddressIdentified(
  components: ParsedAddressComponents | null | undefined,
): boolean {
  if (!components) return false;
  return !!components.city.trim() && !!components.state.trim();
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
