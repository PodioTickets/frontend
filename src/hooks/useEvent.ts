import { useQuery, useMutation } from "@tanstack/react-query";
import { organizerService, eventService } from "@/services";
import { queryKeys, invalidateQueries } from "@/services/cache/QueryClient";
import toast from "react-hot-toast";

export function useEvent(eventId: string | null, enabled: boolean = true) {
  const {
    data: event,
    isLoading,
    error,
  } = useQuery({
    queryKey: queryKeys.events.detail(eventId || ""),
    queryFn: async () => {
      if (!eventId) return null;
      return organizerService.getEventById(eventId);
    },
    enabled: enabled && !!eventId,
  });

  return {
    event,
    loading: isLoading,
    error,
  };
}

export function useEventBySlug(slug: string | null, enabled: boolean = true) {
  const {
    data: event,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["event", "slug", slug],
    queryFn: async () => {
      if (!slug) return null;
      return eventService.getEventBySlug(slug);
    },
    enabled: enabled && !!slug,
  });

  return {
    event,
    loading: isLoading,
    error,
  };
}

export function useEventMutations() {
  const createMutation = useMutation({
    mutationFn: async (eventData: any) => {
      return organizerService.createEvent(eventData);
    },
    onSuccess: () => {
      invalidateQueries.events.all();
      toast.success("Evento criado com sucesso!");
    },
    onError: (error: any) => {
      console.error("Error creating event:", error);
      const errorMessage =
        error.response?.data?.message || "Erro ao criar evento";
      toast.error(errorMessage);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      eventId,
      data,
      clientPage,
    }: {
      eventId: string;
      data: any;
      clientPage?: string;
    }) => {
      return organizerService.updateEvent(eventId, data, { clientPage });
    },
    onSuccess: (_, variables) => {
      invalidateQueries.events.detail(variables.eventId);
      toast.success("Evento atualizado com sucesso!");
    },
    onError: (error: any) => {
      console.error("Error updating event:", error);
      const errorMessage =
        error.response?.data?.message || "Erro ao atualizar evento";
      toast.error(errorMessage);
    },
  });

  return {
    createEvent: (eventData: any) => createMutation.mutateAsync(eventData),
    updateEvent: (eventId: string, data: any, clientPage?: string) =>
      updateMutation.mutateAsync({ eventId, data, clientPage }),
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
  };
}
