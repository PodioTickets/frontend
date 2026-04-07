import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { organizerService } from "@/services";
import { queryKeys, invalidateQueries } from "@/services/cache/QueryClient";
import toast from "react-hot-toast";

export interface Ticket {
  id: string;
  name: string;
  groupId: string;
  /** Ordem de exibição dentro da categoria (ou entre avulsos). */
  sortOrder?: number;
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

const EMPTY_TICKETS: Ticket[] = [];

export function useTickets(eventId: string | null, enabled: boolean = true) {
  const queryClient = useQueryClient();

  // Query para buscar tickets
  const {
    data,
    isLoading,
    error,
    refetch: loadTickets,
  } = useQuery<Ticket[]>({
    queryKey: queryKeys.events.tickets(eventId || ""),
    queryFn: async () => {
      if (!eventId) return [];
      const response = await organizerService.getTickets(eventId, {
        page: 1,
        limit: 500,
      });
      const formattedTickets: Ticket[] = response.tickets.map((ticket: any) => ({
        id: ticket.id,
        name: ticket.name,
        groupId: ticket.categoryId || "uncategorized",
        sortOrder:
          typeof ticket.sortOrder === "number" ? ticket.sortOrder : undefined,
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
    /** Lista precisa refletir criação/edição ao voltar do formulário (defaults globais: refetchOnMount: false, staleTime longo). */
    staleTime: 0,
    refetchOnMount: true,
  });

  const tickets = data ?? EMPTY_TICKETS;

  // Mutation para deletar ticket (desvincula da categoria antes, se necessário)
  const deleteMutation = useMutation({
    mutationFn: async (ticketId: string) => {
      if (!eventId) throw new Error("Event ID is required");
      const list = queryClient.getQueryData<Ticket[]>(
        queryKeys.events.tickets(eventId),
      );
      const ticket = list?.find((t) => t.id === ticketId);
      if (ticket?.groupId && ticket.groupId !== "uncategorized") {
        try {
          await organizerService.updateTicket(eventId, ticketId, {
            categoryId: null,
          });
        } catch (e) {
          console.warn(
            "Could not unlink ticket from category before delete:",
            e,
          );
        }
      }
      return organizerService.deleteTicket(eventId, ticketId);
    },
    onSuccess: () => {
      invalidateQueries.events.tickets(eventId!);
      toast.success("Ingresso deletado com sucesso!");
    },
    onError: (error: any) => {
      console.error("Error deleting ticket:", error);
      toast.error(error.response?.data?.message || "Erro ao deletar ingresso");
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
