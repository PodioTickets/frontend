"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { userService } from "@/services";
import { TicketCard, Ticket } from "@/components/Ticket/Card";
import { Search } from "lucide-react";
import { Button } from "@/components/Button";
import { Dropdown, DropdownOption } from "@/components/Dropdown";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { modalitiesColumns, orderOptions } from "@/constants";
import Image from "next/image";

// Mock tickets for testing
const mockTickets: Ticket[] = [
  {
    id: "1",
    event: {
      id: "event-1",
      name: "Maratona de Santhiago",
      imageUrl: "/banners/card_placeholder.png",
      eventDate: "2026-04-26T12:03:00Z",
      location: {
        city: "Curitiba",
        state: "Paraná",
      },
    },
    modality: {
      name: modalitiesColumns[0][0].label,
    },
    status: "CONFIRMED",
    distance: "0.3Km",
  },
  {
    id: "2",
    event: {
      id: "event-2",
      name: "Corrida de São Paulo",
      imageUrl: "/banners/card_placeholder.png",
      eventDate: "2025-06-15T08:00:00Z",
      location: {
        city: "São Paulo",
        state: "São Paulo",
      },
    },
    modality: {
      name: modalitiesColumns[0][0].label,
    },
    status: "PENDING",
    distance: "5Km",
  },
  {
    id: "3",
    event: {
      id: "event-3",
      name: "Maratona do Rio",
      imageUrl: "/banners/card_placeholder.png",
      eventDate: "2024-12-10T07:30:00Z",
      location: {
        city: "Rio de Janeiro",
        state: "Rio de Janeiro",
      },
    },
    modality: {
      name: modalitiesColumns[0][0].label,
    },
    status: "COMPLETED",
    distance: "42Km",
  },
  {
    id: "4",
    event: {
      id: "event-4",
      name: "Caminhada Ecológica",
      imageUrl: "/banners/card_placeholder.png",
      eventDate: "2025-08-20T09:00:00Z",
      location: {
        city: "Belo Horizonte",
        state: "Minas Gerais",
      },
    },
    modality: {
      name: modalitiesColumns[0][0].label,
    },
    status: "CONFIRMED",
    distance: "10Km",
  },
  {
    id: "5",
    event: {
      id: "event-5",
      name: "Triathlon de Florianópolis",
      imageUrl: "/banners/card_placeholder.png",
      eventDate: "2025-09-05T06:00:00Z",
      location: {
        city: "Florianópolis",
        state: "Santa Catarina",
      },
    },
    modality: {
      name: modalitiesColumns[0][0].label,
    },
    status: "PENDING",
    distance: "51.5Km",
  },
  {
    id: "6",
    event: {
      id: "event-6",
      name: "Corrida Noturna",
      imageUrl: "/banners/card_placeholder.png",
      eventDate: "2024-11-15T19:00:00Z",
      location: {
        city: "Porto Alegre",
        state: "Rio Grande do Sul",
      },
    },
    modality: {
      name: modalitiesColumns[0][0].label,
    },
    status: "COMPLETED",
    distance: "21Km",
  },
  {
    id: "7",
    event: {
      id: "event-7",
      name: "Ciclismo de Estrada",
      imageUrl: "/banners/card_placeholder.png",
      eventDate: "2025-07-10T07:00:00Z",
      location: {
        city: "Brasília",
        state: "Distrito Federal",
      },
    },
    modality: {
      name: modalitiesColumns[0][0].label,
    },
    status: "CANCELLED",
    distance: "100Km",
  },
  {
    id: "8",
    event: {
      id: "event-8",
      name: "Natação em Águas Abertas",
      imageUrl: "/banners/card_placeholder.png",
      eventDate: "2025-10-12T08:30:00Z",
      location: {
        city: "Salvador",
        state: "Bahia",
      },
    },
    modality: {
      name: modalitiesColumns[0][0].label,
    },
    status: "CONFIRMED",
    distance: "2.5Km",
  },
  {
    id: "9",
    event: {
      id: "event-9",
      name: "Corrida de Aventura",
      imageUrl: "/banners/card_placeholder.png",
      eventDate: "2024-10-05T06:00:00Z",
      location: {
        city: "Manaus",
        state: "Amazonas",
      },
    },
    modality: {
      name: modalitiesColumns[0][0].label,
    },
    status: "COMPLETED",
    distance: "15Km",
  },
];

export default function UserTicketsPage() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [orderBy, setOrderBy] = useState<string>("date-asc");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/");
      return;
    }

    loadTickets();
  }, [isAuthenticated, statusFilter, pagination.page]);

  // Reset page when filters change
  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [statusFilter]);

  const loadTickets = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: pagination.page,
        limit: pagination.limit,
      };
      if (statusFilter) {
        params.status = statusFilter;
      }

      const data = await userService.getMyTickets(params);

      // Transform API response to Ticket format
      const transformedTickets: Ticket[] = (data.registrations || []).map(
        (reg: any) => ({
          id: reg.id,
          event: {
            id: reg.event?.id || "",
            name: reg.event?.name || "Evento sem nome",
            imageUrl: reg.event?.imageUrl,
            eventDate: reg.event?.eventDate || reg.purchaseDate,
            location: {
              city: reg.event?.location?.city || "Cidade não informada",
              state: reg.event?.location?.state || "Estado não informado",
            },
          },
          modality: {
            icon:
              reg.modalities?.[0]?.modality?.icon ||
              "/icons-3d/Icon3D-corrida-de-rua.webp",
            name:
              reg.modalities?.[0]?.modality?.name ||
              reg.modality?.name ||
              "Modalidade não informada",
          },
          status: reg.status || "PENDING",
          distance: reg.modalities?.[0]?.modality?.distance,
        })
      );

      // Use mock tickets if API returns empty or fails
      if (transformedTickets.length === 0) {
        setTickets(mockTickets);
        setPagination({
          page: 1,
          limit: 20,
          total: mockTickets.length,
          totalPages: 1,
        });
      } else {
        setTickets(transformedTickets);
        setPagination(data.pagination || pagination);
      }
    } catch (error: any) {
      console.error("Error loading tickets:", error);
      // Use mock tickets on error
      setTickets(mockTickets);
      setPagination({
        page: 1,
        limit: 20,
        total: mockTickets.length,
        totalPages: 1,
      });
      // Don't show error toast when using mock data
      // toast.error("Erro ao carregar ingressos");
    } finally {
      setLoading(false);
    }
  };

  const statusOptions = [
    { id: "CONFIRMED", label: "Inscrição confirmada" },
    { id: "PENDING", label: "Pagamento pendente" },
    { id: "COMPLETED", label: "Evento realizado" },
    { id: "CANCELLED", label: "Cancelado" },
  ];

  // Filter and sort tickets
  const filteredTickets = useMemo(() => {
    let filtered = [...tickets];

    // Filter by search term
    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (ticket) =>
          ticket.event.name.toLowerCase().includes(query) ||
          ticket.event.location.city.toLowerCase().includes(query) ||
          ticket.event.location.state.toLowerCase().includes(query) ||
          ticket.modality.name.toLowerCase().includes(query)
      );
    }

    // Filter by status
    if (statusFilter) {
      filtered = filtered.filter((ticket) => ticket.status === statusFilter);
    }

    // Sort tickets
    const sortedTickets = [...filtered].sort((a, b) => {
      switch (orderBy) {
        case "date-asc":
          if (!a.event.eventDate || !b.event.eventDate) return 0;
          return (
            new Date(a.event.eventDate).getTime() -
            new Date(b.event.eventDate).getTime()
          );
        case "date-desc":
          if (!a.event.eventDate || !b.event.eventDate) return 0;
          return (
            new Date(b.event.eventDate).getTime() -
            new Date(a.event.eventDate).getTime()
          );
        case "name-asc":
          return a.event.name.localeCompare(b.event.name, "pt-BR");
        case "name-desc":
          return b.event.name.localeCompare(a.event.name, "pt-BR");
        default:
          if (!a.event.eventDate || !b.event.eventDate) return 0;
          return (
            new Date(a.event.eventDate).getTime() -
            new Date(b.event.eventDate).getTime()
          );
      }
    });

    return sortedTickets;
  }, [tickets, searchTerm, statusFilter, orderBy]);

  const hasFilters = useMemo(() => {
    return !!(searchTerm || statusFilter || orderBy !== "date-asc");
  }, [searchTerm, statusFilter, orderBy]);

  const handleStatusChange = (option: DropdownOption) => {
    if (option.id) {
      setStatusFilter(option.id);
    } else {
      setStatusFilter(null);
    }
  };

  const handleOrderChange = (option: DropdownOption) => {
    if (option.id) {
      setOrderBy(option.id);
    } else {
      setOrderBy("date-asc");
    }
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setStatusFilter(null);
    setOrderBy("date-asc");
  };

  const getStatusLabel = () => {
    const option = statusOptions.find((opt) => opt.id === statusFilter);
    return option?.label || "Status";
  };

  return (
    <div className="min-h-screen bg-gray-2">
      {/* Container */}
      <div className="mx-auto max-w-[1280px] px-20 pt-13 pb-20">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Image
              src="/images/search_image.png"
              alt="Ingressos"
              width={40}
              height={40}
              draggable={false}
            />
            <h1 className="text-[28px] font-extrabold text-gray-12 font-manrope">
              {hasFilters
                ? `Meus ingressos (${filteredTickets.length})`
                : "Meus ingressos"}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <Dropdown
              options={statusOptions}
              dataAttribute="status-filter"
              width="w-[200px]"
              maxHeight="max-h-[200px]"
              className="top-12"
              selectedIds={statusFilter ? [statusFilter] : []}
              onSelect={handleStatusChange}
              trigger={() => (
                <div className="flex items-center gap-2 px-4 py-2 bg-gray-2 border border-gray-6 rounded-lg cursor-pointer hover:bg-gray-4 transition-colors">
                  <span className="text-sm text-gray-12 font-medium">
                    {getStatusLabel()}
                  </span>
                </div>
              )}
            />
            <Dropdown
              options={orderOptions}
              dataAttribute="order-filter"
              width="w-[220px]"
              maxHeight="max-h-[250px]"
              className="top-12 right-1/2 -translate-x-1/2"
              selectedIds={[orderBy]}
              onSelect={handleOrderChange}
              trigger={() => (
                <div className="flex items-center gap-2 px-4 py-2 bg-gray-2 border border-gray-6 rounded-lg cursor-pointer hover:bg-gray-4 transition-colors">
                  <span className="text-sm text-gray-12 font-medium">
                    Ordenar por
                  </span>
                </div>
              )}
            />
            {hasFilters && (
              <h1
                onClick={handleClearFilters}
                className="text-sm text-gray-12 font-medium cursor-pointer hover:text-gray-11 transition-colors"
              >
                Limpar
              </h1>
            )}
          </div>
        </div>

        {/* Tickets Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-gray-11">Carregando ingressos...</p>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-lg text-gray-11 mb-2">
              {hasFilters
                ? "Nenhum ingresso encontrado com os filtros aplicados"
                : "Você ainda não possui ingressos"}
            </p>
            {hasFilters && (
              <Button
                variant="ghost"
                onClick={handleClearFilters}
                className="mt-4"
              >
                Limpar filtros
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-max">
            {filteredTickets.map((ticket) => (
              <TicketCard key={ticket.id} ticket={ticket} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            <Button
              variant="outline"
              onClick={() =>
                setPagination((prev) => ({
                  ...prev,
                  page: Math.max(1, prev.page - 1),
                }))
              }
              disabled={pagination.page === 1}
            >
              Anterior
            </Button>
            <span className="text-sm text-gray-11">
              Página {pagination.page} de {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              onClick={() =>
                setPagination((prev) => ({
                  ...prev,
                  page: Math.min(prev.totalPages, prev.page + 1),
                }))
              }
              disabled={pagination.page === pagination.totalPages}
            >
              Próxima
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
