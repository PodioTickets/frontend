import { useApiQuery } from "./base/useApiQuery";
import { eventService } from "@/services";
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
