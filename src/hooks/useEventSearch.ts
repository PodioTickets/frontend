import { useApiQuery } from "./base/useApiQuery";
import { eventService } from "@/services";
import type {
  SearchEventsParams,
  SearchEventsResponse,
} from "@/services/events/EventService";
import { useMemo } from "react";

export function useEventSearch(params: SearchEventsParams = {}) {
  const { page = 1, limit = 20 } = params;

  const modalitiesKey = params.modalities?.join(",") ?? "";

  const queryKey = useMemo(
    () => [
      "events-search",
      {
        q: params.q,
        country: params.country,
        state: params.state,
        city: params.city,
        startDate: params.startDate,
        endDate: params.endDate,
        includePast: params.includePast,
        modalities: modalitiesKey,
        minPrice: params.minPrice,
        maxPrice: params.maxPrice,
        page,
        limit,
      },
    ],
    [
      params.q,
      params.country,
      params.state,
      params.city,
      params.startDate,
      params.endDate,
      params.includePast,
      modalitiesKey,
      params.minPrice,
      params.maxPrice,
      page,
      limit,
    ]
  );

  const { data, isLoading, error, refetch } = useApiQuery<SearchEventsResponse>(
    queryKey,
    () => eventService.searchEvents(params),
    {
      enabled: true,
      staleTime: 2 * 60 * 1000,
      gcTime: 5 * 60 * 1000,
    }
  );

  return {
    events: data?.events || [],
    pagination: data?.pagination || {
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 1,
    },
    query: data?.query,
    isLoading,
    error,
    refetch,
    hasNextPage:
      (data?.pagination?.page || 1) < (data?.pagination?.totalPages || 1),
    hasPreviousPage: (data?.pagination?.page || 1) > 1,
  };
}
