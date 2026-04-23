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
  description?: string
  gender?: string;
  activeBatch?: { id: string; price: number; label?: string; status?: string };
  activeBatchStatus?: string;
  products: string[];
  productImages: Array<{ id: string; name: string; images: string[]; primaryImageIndex?: number }>;
  batches: Array<{
    id: string;
    quantity: string;
    price: string;
  }>;
  availableQuantity: number | null;
  isSoldOut: boolean;
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
        price: (() => {
          const raw = ticket.activeBatch?.price ?? ticket.batches?.[0]?.price;
          return raw != null
            ? `R$ ${(Number(raw) / 100).toFixed(2).replace(".", ",")}`
            : "R$ 0,00";
        })(),
        description: ticket.description ?? undefined,
        ageLimit: ticket.ageLimit,
        gender: ticket.gender,
        activeBatch: ticket.activeBatch
          ? {
            id: ticket.activeBatch.id,
            price: ticket.activeBatch.price,
            label: ticket.activeBatchLabel,
            status: ticket.activeBatchStatus,
          }
          : undefined,
        activeBatchStatus: ticket.activeBatchStatus ?? undefined,
        products: ticket.productIds || [],
        productImages: (ticket.products || []).map((tp: any) => ({
          id: tp.productId,
          name: tp.product?.name ?? "Produto",
          images: Array.isArray(tp.product?.images) && tp.product.images.length > 0
            ? tp.product.images
            : tp.product?.image ? [tp.product.image] : [],
          primaryImageIndex: typeof tp.product?.primaryImageIndex === "number"
            ? tp.product.primaryImageIndex
            : undefined,
        })),
        batches: (ticket.batches || []).map((b: any) => ({
          id: b.id ?? b.batchId ?? "",
          quantity: String(b.quantity ?? ""),
          price: String(b.price ?? ""),
        })),
        availableQuantity: ticket.availableQuantity ?? null,
        isSoldOut: ticket.isSoldOut ?? false,
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
