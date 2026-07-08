import { useApiQuery } from "./base/useApiQuery";
import { geoService, type IpLocation } from "@/services";

/**
 * Localização aproximada (cidade) do usuário pelo IP, resolvida no servidor
 * (`geoip-lite`, base local — sem terceiros). Usada só para CENTRALIZAR o mapa
 * de seleção de local ao CRIAR um evento; nunca fixa o pino.
 *
 * `enabled` liga a busca só quando faz sentido (fluxo de criação, sem local já
 * escolhido, mapa habilitado). Cache longo: o IP não muda dentro da sessão.
 */
export function useIpLocation(enabled: boolean) {
  return useApiQuery<IpLocation | null>(
    ["geo-ip-location"],
    () => geoService.getIpLocation(),
    {
      enabled,
      staleTime: 30 * 60 * 1000,
      gcTime: 60 * 60 * 1000,
      // Não é dado crítico; o GeoService já engole o erro (retorna null).
      retry: false,
      refetchOnWindowFocus: false,
    }
  );
}
