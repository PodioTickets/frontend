import { useQuery, useMutation } from "@tanstack/react-query";
import { organizerService } from "@/services";
import { queryKeys, invalidateQueries } from "@/services/cache/QueryClient";
import toast from "react-hot-toast";

export interface Ticket {
  id: string;
  name: string;
  groupId: string;
  modality: string;
  distance: string;
  distanceUnit: string;
  price: string;
  ageLimit?: {
    min?: number;
    max?: number;
  };
  gender?: string;
  products: string[];
  batches: Array<{
    id: string;
    quantity: string;
    price: string;
  }>;
  createdAt: string;
}

export function useTickets(eventId: string | null, enabled: boolean = true) {
  // Query para buscar tickets
  const {
    data: tickets = [],
    isLoading,
    error,
    refetch: loadTickets,
  } = useQuery<Ticket[]>({
    queryKey: queryKeys.events.tickets(eventId || ""),
    queryFn: async () => {
      if (!eventId) return [];
      const response = await organizerService.getTickets(eventId);
      const formattedTickets: Ticket[] = response.tickets.map((ticket: any) => ({
        id: ticket.id,
        name: ticket.name,
        groupId: ticket.categoryId || "uncategorized",
        modality: ticket.modality || "",
        distance: ticket.distance || "",
        distanceUnit: ticket.distanceUnit || "KM",
        price:
          ticket.batches && ticket.batches.length > 0
            ? `R$ ${(parseFloat(ticket.batches[0].price) / 100).toFixed(2).replace(".", ",")}`
            : "R$ 0,00",
        ageLimit: ticket.ageLimit,
        gender: ticket.gender,
        products: ticket.productIds || [],
        batches: ticket.batches || [],
        createdAt: ticket.createdAt,
      }));
      return formattedTickets;
    },
    enabled: enabled && !!eventId,
  });

  // Mutation para deletar ticket
  const deleteMutation = useMutation({
    mutationFn: async (ticketId: string) => {
      if (!eventId) throw new Error("Event ID is required");
      return organizerService.deleteTicket(eventId, ticketId);
    },
    onSuccess: () => {
      invalidateQueries.events.tickets(eventId!);
      toast.success("Ingresso excluído com sucesso!");
    },
    onError: (error: any) => {
      console.error("Error deleting ticket:", error);
      toast.error(error.response?.data?.message || "Erro ao excluir ingresso");
    },
  });

  return {
    tickets,
    loading: isLoading,
    error,
    loadTickets,
    deleteTicket: (ticketId: string) => deleteMutation.mutateAsync(ticketId),
  };
}
