"use client";

import { useQuery } from "@tanstack/react-query";
import { geoService, queryKeys, type GeoState, type GeoCity } from "@/services";
import { getCountryCodeFromName } from "@/utils/phone";

/**
 * Hooks de geo (estados/cidades por país) para o checkout estrangeiro.
 *
 * - Resolvem o nome PT-BR do país → ISO alpha-2 (mesmo helper do telefone).
 * - Sobrescrevem a política global "menos cache": geo é dado de REFERÊNCIA
 *   imutável, então `staleTime: Infinity` + `refetchOnMount: false` evitam
 *   refetch desnecessário a cada montagem (a política global re-buscaria sempre).
 * - `retry: false`: se o endpoint falhar/não existir, queremos cair no fallback
 *   de texto livre rápido, sem 2 tentativas atrasando a UI.
 * - Erro/lista vazia é tratado pelo consumidor como "sem lista" (texto livre).
 */

const GEO_QUERY_OPTIONS = {
  staleTime: Infinity,
  gcTime: 24 * 60 * 60 * 1000, // 24h em memória
  refetchOnMount: false as const,
  refetchOnWindowFocus: false as const,
  refetchOnReconnect: false as const,
  retry: false as const,
};

export interface UseGeoStatesResult {
  states: GeoState[];
  isLoading: boolean;
  isError: boolean;
}

/**
 * Estados/províncias do país. `enabled` deve ser ligado SÓ para país
 * estrangeiro (o Brasil usa UF fixa). Desabilita automaticamente se o nome
 * do país não resolver para um ISO alpha-2.
 */
export function useGeoStates(
  countryName: string | null | undefined,
  enabled = true,
): UseGeoStatesResult {
  const iso = getCountryCodeFromName(countryName);
  const query = useQuery({
    queryKey: queryKeys.geo.states(iso ?? "__none__"),
    queryFn: () => geoService.getStates(iso as string),
    enabled: enabled && !!iso,
    ...GEO_QUERY_OPTIONS,
  });

  return {
    states: query.data ?? [],
    isLoading: query.isLoading && query.fetchStatus !== "idle",
    isError: query.isError,
  };
}

export interface UseGeoCitiesResult {
  cities: GeoCity[];
  isLoading: boolean;
  isError: boolean;
}

/**
 * Cidades do estado selecionado (`stateCode` = `code` vindo de `useGeoStates`).
 * Só dispara quando há país estrangeiro resolvido E um estado selecionado.
 */
export function useGeoCities(
  countryName: string | null | undefined,
  stateCode: string | null | undefined,
  enabled = true,
): UseGeoCitiesResult {
  const iso = getCountryCodeFromName(countryName);
  const code = stateCode?.trim() || "";
  const query = useQuery({
    queryKey: queryKeys.geo.cities(iso ?? "__none__", code || "__none__"),
    queryFn: () => geoService.getCities(iso as string, code),
    enabled: enabled && !!iso && !!code,
    ...GEO_QUERY_OPTIONS,
  });

  return {
    cities: query.data ?? [],
    isLoading: query.isLoading && query.fetchStatus !== "idle",
    isError: query.isError,
  };
}
