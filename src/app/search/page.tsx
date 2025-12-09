"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useMemo, Suspense, useState, useEffect } from "react";
import { EventCard } from "@/components/Event/Card";
import { HomeFilters } from "@/components/HomeFilters";
import { Button } from "@/components/Button";
import { Dropdown, DropdownOption } from "@/components/Dropdown";
import { useEventSearch } from "@/hooks/useEventSearch";

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);

  // Extrair parâmetros da URL
  const searchQuery = searchParams.get("q") || undefined;
  const country = searchParams.get("country") || undefined;
  const state = searchParams.get("state") || undefined;
  const city = searchParams.get("city") || undefined;
  const dateFrom = searchParams.get("dateFrom") || undefined;
  const dateTo = searchParams.get("dateTo") || undefined;
  const includePast = searchParams.get("includePast") === "true";
  const location = searchParams.get("location");
  const modalities =
    searchParams.get("modalities")?.split(",").filter(Boolean) || [];
  const priceMin = searchParams.get("priceMin");
  const priceMax = searchParams.get("priceMax");
  const statusFilter = searchParams.get("status") || null;
  const orderBy = searchParams.get("orderBy") || "date-asc";

  // Converter datas para formato ISO se necessário
  const startDate = dateFrom
    ? new Date(dateFrom).toISOString().split("T")[0]
    : undefined;
  const endDate = dateTo
    ? new Date(dateTo).toISOString().split("T")[0]
    : undefined;

  // Buscar eventos usando a API
  const { events, pagination, isLoading, query } = useEventSearch({
    q: searchQuery,
    country,
    state,
    city,
    startDate,
    endDate,
    includePast: includePast || undefined,
    page: currentPage,
    limit: 20,
  });

  // Resetar página quando filtros mudarem
  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchQuery,
    country,
    state,
    city,
    dateFrom,
    dateTo,
    includePast,
  ]);

  const initialDateRange = useMemo(() => {
    if (dateFrom || dateTo) {
      return {
        from: dateFrom ? new Date(dateFrom) : undefined,
        to: dateTo ? new Date(dateTo) : undefined,
      };
    }
    return undefined;
  }, [dateFrom, dateTo]);

  const initialPriceRange = useMemo(() => {
    const min = priceMin ? parseInt(priceMin) : 0;
    const max = priceMax ? parseInt(priceMax) : 10000;
    return [min, max] as [number, number];
  }, [priceMin, priceMax]);

  // Filtrar eventos por status e ordenar (filtros que não estão na API)
  const filteredEvents = useMemo(() => {
    let filtered = [...events];

    // Filtrar por status (se necessário, pois a API pode não suportar)
    if (statusFilter) {
      // Mapear status do filtro para status da API
      const statusMap: Record<string, string> = {
        "inscricoes-abertas": "PUBLISHED",
        "inscricoes-encerradas": "PUBLISHED", // Pode precisar de lógica adicional
        "evento-encerrado": "COMPLETED",
      };
      const apiStatus = statusMap[statusFilter];
      if (apiStatus) {
        filtered = filtered.filter((event) => event.status === apiStatus);
      }
    }

    // Ordenar eventos (se a API não suportar ordenação)
    const sortedEvents = [...filtered].sort((a, b) => {
      switch (orderBy) {
        case "date-asc":
          if (!a.eventDate || !b.eventDate) return 0;
          return (
            new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()
          );
        case "date-desc":
          if (!a.eventDate || !b.eventDate) return 0;
          return (
            new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime()
          );
        case "name-asc":
          return a.name.localeCompare(b.name, "pt-BR");
        case "name-desc":
          return b.name.localeCompare(a.name, "pt-BR");
        default:
          if (!a.eventDate || !b.eventDate) return 0;
          return (
            new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()
          );
      }
    });

    return sortedEvents;
  }, [events, statusFilter, orderBy]);

  const hasFilters = useMemo(() => {
    return !!(
      searchQuery ||
      country ||
      state ||
      city ||
      dateFrom ||
      dateTo ||
      includePast ||
      statusFilter ||
      orderBy !== "date-asc"
    );
  }, [
    searchQuery,
    country,
    state,
    city,
    dateFrom,
    dateTo,
    includePast,
    statusFilter,
    orderBy,
  ]);

  const handleStatusChange = (option: DropdownOption) => {
    const params = new URLSearchParams(searchParams.toString());
    if (option.id) {
      params.set("status", option.id);
    } else {
      params.delete("status");
    }
    router.push(`/search?${params.toString()}`);
  };

  const handleOrderChange = (option: DropdownOption) => {
    const params = new URLSearchParams(searchParams.toString());
    if (option.id) {
      params.set("orderBy", option.id);
    } else {
      params.delete("orderBy");
    }
    router.push(`/search?${params.toString()}`);
  };

  const handleClearFilters = () => {
    router.push("/search");
  };

  const statusOptions: DropdownOption[] = [
    {
      id: "inscricoes-abertas",
      label: "Inscrições abertas",
    },
    {
      id: "inscricoes-encerradas",
      label: "Inscrições encerradas",
    },
    {
      id: "evento-encerrado",
      label: "Evento encerrado",
    },
  ];

  const orderOptions: DropdownOption[] = [
    {
      id: "date-asc",
      label: "Data: mais próximo",
    },
    {
      id: "date-desc",
      label: "Data: mais distante",
    },
    {
      id: "price-asc",
      label: "Preço: menor para maior",
    },
    {
      id: "price-desc",
      label: "Preço: maior para menor",
    },
    {
      id: "name-asc",
      label: "Nome: A-Z",
    },
    {
      id: "name-desc",
      label: "Nome: Z-A",
    },
  ];

  const getStatusLabel = () => {
    const option = statusOptions.find((opt) => opt.id === statusFilter);
    return option?.label || "Status";
  };

  const handleLoadMore = () => {
    if (currentPage < pagination.totalPages) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const hasMore = currentPage < pagination.totalPages;

  return (
    <section className="flex flex-col min-h-screen items-center max-w-[1760px] mx-auto lg:px-8">
      <HomeFilters
        initialLocation={location}
        initialModalities={modalities}
        initialDateRange={initialDateRange}
        initialPriceRange={initialPriceRange}
      />

      <div className="w-full mt-14 px-4">
        <div className="flex items-center justify-between mb-6 gap-4">
          <h1 className="text-[28px] font-extrabold">
            {hasFilters
              ? `Resultados da busca (${pagination.total})`
              : "Todos os eventos"}
          </h1>
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

        {isLoading && filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-xl text-gray-11 mb-4">Carregando eventos...</p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-xl text-gray-11 mb-4">
              Nenhum evento encontrado
            </p>
            <p className="text-sm text-gray-10">
              {query
                ? `Nenhum resultado para "${query}". Tente ajustar os filtros ou buscar por outros termos.`
                : "Tente ajustar os filtros ou buscar por outros termos"}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
              {filteredEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
            {hasMore && (
              <Button
                onClick={handleLoadMore}
                className="w-full mt-8 border border-gray-6 text-gray-12"
                variant="outline"
                disabled={isLoading}
              >
                {isLoading ? "Carregando..." : "Carregar mais eventos"}
              </Button>
            )}
          </>
        )}
      </div>
    </section>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <section className="flex flex-col min-h-screen items-center max-w-[1760px] mx-auto lg:px-8">
          <div className="w-full mt-14 px-4">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-[28px] font-extrabold">Carregando...</h1>
            </div>
          </div>
        </section>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
