import { useQuery, useMutation } from "@tanstack/react-query";
import { organizerService } from "@/services";
import { queryKeys, invalidateQueries } from "@/services/cache/QueryClient";
import toast from "react-hot-toast";

export interface Topic {
  id: string;
  title: string;
  content: string;
  order: number;
  isEnabled: boolean;
}

export function useTopics(eventId: string | null, enabled: boolean = true) {
  const {
    data: topics = [],
    isLoading,
    error,
  } = useQuery<Topic[]>({
    queryKey: queryKeys.events.topics(eventId || ""),
    queryFn: async () => {
      if (!eventId) return [];
      const event = await organizerService.getEventById(eventId);
      return event.topics || [];
    },
    enabled: enabled && !!eventId,
  });

  const createMutation = useMutation({
    mutationFn: async ({
      title,
      content,
      order,
    }: {
      title: string;
      content: string;
      order: number;
    }) => {
      if (!eventId) throw new Error("Event ID is required");
      return organizerService.createTopic(eventId, {
        title,
        content,
        isEnabled: true,
        order,
      });
    },
    onSuccess: () => {
      invalidateQueries.events.topics(eventId!);
      invalidateQueries.events.detail(eventId!);
      toast.success("Tópico criado com sucesso!");
    },
    onError: (error: any) => {
      console.error("Error creating topic:", error);
      toast.error(error.response?.data?.message || "Erro ao criar tópico");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      topicId,
      data,
    }: {
      topicId: string;
      data: { title?: string; content?: string };
    }) => {
      if (!eventId) throw new Error("Event ID is required");
      return organizerService.updateTopic(eventId, topicId, data);
    },
    onSuccess: () => {
      invalidateQueries.events.topics(eventId!);
      invalidateQueries.events.detail(eventId!);
      toast.success("Tópico atualizado com sucesso!");
    },
    onError: (error: any) => {
      console.error("Error updating topic:", error);
      toast.error(error.response?.data?.message || "Erro ao atualizar tópico");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (topicId: string) => {
      if (!eventId) throw new Error("Event ID is required");
      return organizerService.deleteTopic(eventId, topicId);
    },
    onSuccess: () => {
      invalidateQueries.events.topics(eventId!);
      invalidateQueries.events.detail(eventId!);
      toast.success("Tópico deletado com sucesso!");
    },
    onError: (error: any) => {
      console.error("Error deleting topic:", error);
      toast.error(error.response?.data?.message || "Erro ao deletar tópico");
    },
  });

  return {
    topics,
    loading: isLoading,
    error,
    createTopic: (title: string, content: string, order: number) =>
      createMutation.mutateAsync({ title, content, order }),
    updateTopic: (topicId: string, data: { title?: string; content?: string }) =>
      updateMutation.mutateAsync({ topicId, data }),
    deleteTopic: (topicId: string) => deleteMutation.mutateAsync(topicId),
  };
}
