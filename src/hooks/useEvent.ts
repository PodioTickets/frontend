import { eventService } from "@/services";
import { useApiQuery } from "./base/useApiQuery";
import type { Event } from "@/interfaces/event";

export function useEvent(id: string) {
  const { data, isLoading, error } = useApiQuery<Event>(["event", id], () =>
    eventService.getEventById(id)
  );
  return { event: data, isLoading, error };
}
