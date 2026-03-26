import { useMemo } from "react";
import { useApiQuery } from "./base/useApiQuery";
import { eventService } from "@/services";
import type { EventSearchLocationPair } from "@/services/events/EventService";
import {
  aggregateLocationFacetPairs,
  type LocationFacetCity,
  type LocationFacetState,
} from "@/utils/locationFacets";

export type { LocationFacetCity, LocationFacetState };

export function useEventLocationFacets() {
  const query = useApiQuery<EventSearchLocationPair[]>(
    ["events-search-location-facets"],
    () => eventService.getSearchLocationFacets(),
    {
      staleTime: 5 * 60 * 1000,
      gcTime: 15 * 60 * 1000,
    }
  );

  const facets = useMemo(
    () => aggregateLocationFacetPairs(query.data ?? []),
    [query.data]
  );

  return { ...query, facets };
}
