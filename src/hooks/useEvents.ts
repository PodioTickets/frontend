import { useApiQuery } from "./base/useApiQuery";
import { eventService } from "@/services";
import type { EventResponse } from "@/interfaces/event";

interface UseEventsOptions {
  page?: number;
  limit?: number;
  enabled?: boolean;
}

export function useEvents(options: UseEventsOptions = {}) {
  const { page = 1, limit = 10, enabled = true } = options;

  const { data, isLoading, error, refetch } = useApiQuery<EventResponse>(
    ["events", { page, limit }],
    () => eventService.getEvents({ page, limit }),
    {
      enabled,
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
    }
  );

  return {
    events: data?.events || [],
    pagination: data?.pagination || {
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 1,
    },
    isLoading,
    error,
    refetch,
    hasNextPage:
      (data?.pagination?.page || 1) < (data?.pagination?.totalPages || 1),
    hasPreviousPage: (data?.pagination?.page || 1) > 1,
    nextPage: () => page + 1,
    previousPage: () => page - 1,
  };
}
