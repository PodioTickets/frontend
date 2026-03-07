import { useQuery } from "@tanstack/react-query";
import { userService } from "@/services";
import { queryKeys } from "@/services/cache/QueryClient";
import type { Ticket } from "@/components/Ticket/Card";

interface UseMyTicketsParams {
  page?: number;
  limit?: number;
  status?: string;
}

interface UseMyTicketsReturn {
  tickets: Ticket[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useMyTickets(
  params: UseMyTicketsParams = {},
  enabled: boolean = true
): UseMyTicketsReturn {
  const { page = 1, limit = 20, status } = params;

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.user.tickets(params),
    queryFn: async () => {
      const response = await userService.getMyTickets({ page, limit, status });
      
      // O serviço já retorna { registrations, pagination }
      // Mas a API pode retornar { message, data: { registrations } }
      // Então verificamos ambas as estruturas
      const registrations = response.registrations || (response as any).data?.registrations || [];

      // Transform API response to Ticket format
      const transformedTickets: Ticket[] = registrations.map(
        (reg: any) => {
          // Pegar a primeira modalidade disponível
          const firstModality = reg.modalities?.[0]?.modality || reg.modality || null;
          
          return {
            id: reg.id,
            event: {
              id: reg.event?.id || "",
              name: reg.event?.name || "Evento sem nome",
              imageUrl: reg.event?.bannerUrl || reg.event?.imageUrl,
              eventDate: reg.event?.eventDate || reg.purchaseDate,
              location: {
                city: reg.event?.city || reg.event?.location?.city || "Cidade não informada",
                state: reg.event?.state || reg.event?.location?.state || "Estado não informado",
              },
            },
            modality: {
              icon:
                firstModality?.icon ||
                "/icons-3d/Icon3D-corrida-de-rua.webp",
              name:
                firstModality?.name ||
                "Modalidade não informada",
            },
            status: reg.status || "PENDING",
            distance: firstModality?.distance,
            // Campos adicionais que podem ser úteis no futuro
            qrCode: reg.qrCode,
            purchaseDate: reg.purchaseDate,
            payment: reg.payment,
          };
        }
      );

      return {
        tickets: transformedTickets,
        pagination: response.pagination || {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 1,
        },
      };
    },
    enabled,
    refetchOnMount: 'always', // Sempre buscar dados atualizados quando a página for montada
    staleTime: 0, // Considerar dados como obsoletos imediatamente
  });

  return {
    tickets: data?.tickets || [],
    pagination: data?.pagination || {
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 1,
    },
    loading: isLoading,
    error: error as Error | null,
    refetch: () => refetch(),
  };
}
