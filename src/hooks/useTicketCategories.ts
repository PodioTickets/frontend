import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { organizerService } from "@/services";
import type { ModalityGroup } from "@/services/organizer/OrganizerService";
import { queryKeys, invalidateQueries } from "@/services/cache/QueryClient";
import toast from "react-hot-toast";

export function useTicketCategories(eventId: string | null, enabled: boolean = true) {
  const queryClient = useQueryClient();

  // Query para buscar categorias
  const {
    data: categories = [],
    isLoading,
    error,
  } = useQuery<ModalityGroup[]>({
    queryKey: queryKeys.events.ticketCategories(eventId || ""),
    queryFn: async () => {
      if (!eventId) return [];
      const groups = await organizerService.getTicketCategories(eventId).catch(() => []);
      return Array.isArray(groups) ? groups : [];
    },
    enabled: enabled && !!eventId,
  });

  // Mutation para criar categoria
  const createMutation = useMutation({
    mutationFn: async ({ name, order }: { name: string; order?: number }) => {
      if (!eventId) throw new Error("Event ID is required");
      return organizerService.createTicketCategory(eventId, {
        name,
        order: order ?? categories.length,
      });
    },
    onSuccess: () => {
      invalidateQueries.events.ticketCategories(eventId!);
      toast.success("Categoria criada com sucesso!");
    },
    onError: (error: any) => {
      console.error("Error creating category:", error);
      toast.error(error.response?.data?.message || "Erro ao criar categoria");
    },
  });

  // Mutation para atualizar categoria
  const updateMutation = useMutation({
    mutationFn: async ({
      categoryId,
      data,
    }: {
      categoryId: string;
      data: { name?: string; order?: number };
    }) => {
      if (!eventId) throw new Error("Event ID is required");
      return organizerService.updateTicketCategory(eventId, categoryId, data);
    },
    onSuccess: () => {
      invalidateQueries.events.ticketCategories(eventId!);
      toast.success("Categoria atualizada com sucesso!");
    },
    onError: (error: any) => {
      console.error("Error updating category:", error);
      toast.error(error.response?.data?.message || "Erro ao atualizar categoria");
    },
  });

  // Mutation para deletar categoria
  const deleteMutation = useMutation({
    mutationFn: async (categoryId: string) => {
      if (!eventId) throw new Error("Event ID is required");
      return organizerService.deleteTicketCategory(eventId, categoryId);
    },
    onSuccess: () => {
      invalidateQueries.events.ticketCategories(eventId!);
      toast.success("Categoria excluída com sucesso!");
    },
    onError: (error: any) => {
      console.error("Error deleting category:", error);
      toast.error(error.response?.data?.message || "Erro ao excluir categoria");
    },
  });

  return {
    categories,
    loading: isLoading,
    error,
    createCategory: (name: string, order?: number) =>
      createMutation.mutateAsync({ name, order }),
    updateCategory: (categoryId: string, data: { name?: string; order?: number }) =>
      updateMutation.mutateAsync({ categoryId, data }),
    deleteCategory: (categoryId: string) => deleteMutation.mutateAsync(categoryId),
  };
}
