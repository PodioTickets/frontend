import { useQuery } from "@tanstack/react-query";
import { userService } from "@/services";
import { queryKeys } from "@/services/cache/QueryClient";
import type { Ticket } from "@/components/Ticket/Card";

const DEFAULT_MODALITY_ICON = "/icons-3d/Icon3D-corrida-de-rua.webp";

/**
 * A lista GET /registrations/me costuma trazer `ticket.modality` (string) sem o array `modalities`.
 * Também aceita `modalities[0].modality`, snake_case e ícone em `template.icon`.
 */
function modalityFromRegistration(reg: any): {
  name: string;
  icon: string;
  distance?: string;
} {
  const modalities = reg?.modalities;
  let nested: any = null;
  if (Array.isArray(modalities) && modalities.length > 0) {
    nested = modalities[0]?.modality ?? modalities[0];
  }
  if (!nested && reg?.modality && typeof reg.modality === "object") {
    nested = reg.modality;
  }

  const ticketBlock =
    reg?.ticket || reg?.tickets?.[0]?.ticket || reg?.tickets?.[0];

  const nameFromNested =
    (typeof nested?.name === "string" && nested.name.trim()) ||
    nested?.modality_name ||
    nested?.label;

  const nameFromTicket =
    (typeof ticketBlock?.modality === "string" && ticketBlock.modality.trim()) ||
    (typeof ticketBlock?.modalityName === "string" &&
      ticketBlock.modalityName.trim()) ||
    (typeof ticketBlock?.modality_name === "string" &&
      ticketBlock.modality_name.trim());

  const name = nameFromNested || nameFromTicket || "Modalidade não informada";

  const icon =
    nested?.icon ||
    nested?.template?.icon ||
    nested?.icon_url ||
    nested?.iconUrl ||
    reg?.modalityIcon ||
    reg?.modality_icon ||
    DEFAULT_MODALITY_ICON;

  let distance: string | undefined;
  if (ticketBlock?.distance != null && String(ticketBlock.distance) !== "") {
    const distanceStr = String(ticketBlock.distance);
    const distanceMatch = distanceStr.match(/(\d+(?:\.\d+)?)/);
    if (distanceMatch && /km|KM|\bm\b/i.test(distanceStr)) {
      distance = /km/i.test(distanceStr)
        ? `${distanceMatch[1]} Km`
        : distanceStr;
    } else {
      const distanceNum = parseFloat(distanceStr);
      if (!Number.isNaN(distanceNum)) {
        distance =
          distanceNum >= 1000
            ? `${(distanceNum / 1000).toFixed(1)} Km`
            : `${distanceNum} m`;
      } else {
        distance = distanceStr;
      }
    }
  } else if (
    nested?.distance != null &&
    String(nested.distance) !== ""
  ) {
    const n = parseFloat(String(nested.distance));
    if (!Number.isNaN(n)) {
      distance = `${(n / 1000).toFixed(1)} Km`;
    }
  }

  return { name, icon, distance };
}

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
      const registrations = response.registrations || (response as any).data?.registrations || [];

      // Transform API response to Ticket format
      const transformedTickets: Ticket[] = registrations.map(
        (reg: any) => {
          const { name: modalityName, icon: modalityIcon, distance } =
            modalityFromRegistration(reg);

          return {
            id: reg.id,
            event: {
              id: reg.event?.id || "",
              name: reg.event?.name || "Evento sem nome",
              imageUrl: reg.event?.logoUrl || "",
              eventDate: reg.event?.eventDate || reg.purchaseDate,
              location: {
                city: reg.event?.city || reg.event?.location?.city || "Cidade não informada",
                state: reg.event?.state || reg.event?.location?.state || "Estado não informado",
              },
            },
            modality: {
              icon: modalityIcon,
              name: modalityName,
            },
            status: reg.status || "PENDING",
            distance,
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
