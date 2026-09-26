import { useApiQuery } from "./base/useApiQuery";
import { eventService } from "@/services";
import { useEvents } from "./useEvents";
import type { Event } from "@/interfaces/event";

/**
 * Eventos em destaque do carrossel da home (selecionados pelo admin, na ordem
 * definida). Contrato idêntico ao de `useEvents` para o `EventCard` renderizar
 * sem adaptação. Quando vazio, o consumidor decide o fallback (ex.: recentes).
 */
export function useFeaturedEvents(limit = 20, options?: { enabled?: boolean }) {
  const { data, isLoading, error, refetch } = useApiQuery<Event[]>(
    ["events", "featured", limit],
    () => eventService.getFeaturedEvents(limit),
    {
      enabled: options?.enabled ?? true,
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
    },
  );

  return {
    events: data ?? [],
    isLoading,
    error,
    refetch,
  };
}

/**
 * Lista da HOME (hero + "Eventos em destaque"): destaques do admin e, só quando não
 * há nenhum, eventos recentes — a home nunca fica vazia. Os dois consumidores usam o
 * MESMO `limit`, então compartilham o cache do React Query (1 request, não 2).
 */
export function useHomeFeaturedEvents(limit = 20) {
  const { events: featured, isLoading } = useFeaturedEvents(limit);
  const useFallback = !isLoading && featured.length === 0;
  const { events: fallback, isLoading: loadingFallback } = useEvents({
    page: 1,
    limit,
    enabled: useFallback,
  });
  return {
    events: featured.length > 0 ? featured : fallback,
    isLoading: isLoading || (useFallback && loadingFallback),
  };
}
