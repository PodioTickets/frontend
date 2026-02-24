"use client";

import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMyTickets } from "@/hooks/useMyTickets";
import { TicketCard } from "@/components/Ticket/Card";
import { Button } from "@/components/Button";
import { Dropdown, DropdownOption } from "@/components/Dropdown";
import { useRouter } from "next/navigation";
import { orderOptions } from "@/constants";
import Image from "next/image";

export default function UserTicketsPage() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [orderBy, setOrderBy] = useState<string>("date-asc");
  const [page, setPage] = useState(1);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  const { tickets, pagination, loading } = useMyTickets(
    {
      page,
      limit: 20,
      status: statusFilter || undefined,
    },
    isAuthenticated
  );

  const statusOptions = [
    { id: "CONFIRMED", label: "Inscrição confirmada" },
    { id: "PENDING", label: "Pagamento pendente" },
    { id: "COMPLETED", label: "Evento realizado" },
    { id: "CANCELLED", label: "Cancelado" },
  ];

  // Filter and sort tickets
  const filteredTickets = useMemo(() => {
    let filtered = [...tickets];

    // Filter by search term (status filter is already applied in the API)
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
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page === 1}
            >
              Anterior
            </Button>
            <span className="text-sm text-gray-11">
              Página {page} de {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              onClick={() => setPage((prev) => Math.min(pagination.totalPages, prev + 1))}
              disabled={page === pagination.totalPages}
            >
              Próxima
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
