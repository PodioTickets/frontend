import type { ApiClient } from "../base/ApiClient";

/**
 * Geo (estados/províncias e cidades por país) — dado de referência público.
 *
 * Contrato: ver `geo-states-cities-spec.md`. Usado SÓ no checkout estrangeiro
 * (endereço de cobrança) para os dropdowns em cascata país → estado → cidade.
 * Brasil não consome (usa UF fixa + ViaCEP).
 *
 * Resiliência: estes métodos NÃO devem derrubar o checkout. Os consumidores
 * (hooks `useGeo`) tratam erro/vazio como "sem lista" → UI cai em texto livre.
 */

export interface GeoState {
  /** Identificador opaco e estável da subdivisão (usado só p/ buscar cidades). */
  code: string;
  /** Nome legível — é o valor persistido em `billingAddress.state`. */
  name: string;
}

export interface GeoCity {
  /** Nome da cidade — valor persistido em `billingAddress.city`. */
  name: string;
}

/** Localização aproximada (nível cidade) resolvida pelo IP do cliente no servidor. */
export interface IpLocation {
  lat: number;
  lng: number;
  city: string | null;
  region: string | null;
  country: string | null;
}

export class GeoService {
  constructor(private apiClient: ApiClient) {}

  /** Estados/províncias de um país (ISO 3166-1 alpha-2, ex.: "US"). */
  async getStates(countryCode: string): Promise<GeoState[]> {
    const cc = countryCode.trim().toUpperCase();
    const { data } = await this.apiClient.get(
      `/api/v1/geo/countries/${encodeURIComponent(cc)}/states`,
    );
    const states = data?.data?.states;
    return Array.isArray(states) ? (states as GeoState[]) : [];
  }

  /** Cidades de um estado/província (pelo `code` retornado em `getStates`). */
  async getCities(countryCode: string, stateCode: string): Promise<GeoCity[]> {
    const cc = countryCode.trim().toUpperCase();
    const sc = stateCode.trim();
    const { data } = await this.apiClient.get(
      `/api/v1/geo/countries/${encodeURIComponent(cc)}/states/${encodeURIComponent(sc)}/cities`,
    );
    const cities = data?.data?.cities;
    return Array.isArray(cities) ? (cities as GeoCity[]) : [];
  }

  /**
   * Localização aproximada (cidade) pelo IP do cliente — usada só para CENTRALIZAR
   * o mapa ao criar um evento. Retorna `null` quando o servidor não resolve o IP
   * (privado/dev, sem match). Resiliente: nunca lança (não é dado crítico).
   */
  async getIpLocation(): Promise<IpLocation | null> {
    try {
      const { data } = await this.apiClient.get(`/api/v1/geo/ip-location`);
      const loc = data?.data?.location;
      if (loc && typeof loc.lat === "number" && typeof loc.lng === "number") {
        return loc as IpLocation;
      }
    } catch {
      /* sem localização → mapa cai no centro do Brasil */
    }
    return null;
  }
}
