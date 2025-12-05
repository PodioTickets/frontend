"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useMemo, Suspense, useState, useEffect } from "react";
import { mockEvents } from "@/constants/events";
import { EventCard } from "@/components/Event/Card";
import { HomeFilters } from "@/components/HomeFilters";
import { Button } from "@/components/Button";
import { Dropdown, DropdownOption } from "@/components/Dropdown";

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [itemsToShow, setItemsToShow] = useState(8);

  const location = searchParams.get("location");
  const modalities =
    searchParams.get("modalities")?.split(",").filter(Boolean) || [];
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const priceMin = searchParams.get("priceMin");
  const priceMax = searchParams.get("priceMax");
  const searchQuery = searchParams.get("q")?.toLowerCase() || "";
  const statusFilter = searchParams.get("status") || null;
  const orderBy = searchParams.get("orderBy") || "date-asc";

  useEffect(() => {
    setItemsToShow(8);
  }, [
    location,
    modalities.join(","),
    dateFrom,
    dateTo,
    priceMin,
    priceMax,
    searchQuery,
    statusFilter,
    orderBy,
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

  const parsedFilters = useMemo(() => {
    return {
      fromDate: dateFrom ? new Date(dateFrom) : null,
      toDate: dateTo
        ? (() => {
            const d = new Date(dateTo);
            d.setHours(23, 59, 59, 999);
            return d;
          })()
        : null,
      minPrice: priceMin ? parseInt(priceMin, 10) : null,
      maxPrice: priceMax ? parseInt(priceMax, 10) : null,
      modalitiesSet: modalities.length > 0 ? new Set(modalities) : null,
      searchLower: searchQuery || null,
    };
  }, [dateFrom, dateTo, priceMin, priceMax, modalities, searchQuery]);

  const filteredEvents = useMemo(() => {
    let events = mockEvents;

    if (location) {
      events = events.filter((event) => event.location.locationId === location);
    }

    if (parsedFilters.modalitiesSet) {
      events = events.filter((event) =>
        event.modalities.some((modality) =>
          parsedFilters.modalitiesSet!.has(modality)
        )
      );
    }

    if (parsedFilters.fromDate) {
      events = events.filter((event) => event.date >= parsedFilters.fromDate!);
    }
    if (parsedFilters.toDate) {
      events = events.filter((event) => event.date <= parsedFilters.toDate!);
    }

    if (parsedFilters.minPrice !== null) {
      events = events.filter((event) => event.price >= parsedFilters.minPrice!);
    }
    if (parsedFilters.maxPrice !== null) {
      events = events.filter((event) => event.price <= parsedFilters.maxPrice!);
    }

    if (parsedFilters.searchLower) {
      const query = parsedFilters.searchLower;
      events = events.filter(
        (event) =>
          event.title.toLowerCase().includes(query) ||
          event.organizer.toLowerCase().includes(query) ||
          event.location.city.toLowerCase().includes(query) ||
          event.location.state.toLowerCase().includes(query) ||
          event.description?.toLowerCase().includes(query)
      );
    }

    // Filter by status
    if (statusFilter) {
      events = events.filter((event) => event.status === statusFilter);
    }

    // Sort events
    const sortedEvents = [...events].sort((a, b) => {
      switch (orderBy) {
        case "date-asc":
          return a.date.getTime() - b.date.getTime();
        case "date-desc":
          return b.date.getTime() - a.date.getTime();
        case "price-asc":
          return a.price - b.price;
        case "price-desc":
          return b.price - a.price;
        case "name-asc":
          return a.title.localeCompare(b.title, "pt-BR");
        case "name-desc":
          return b.title.localeCompare(a.title, "pt-BR");
        default:
          return a.date.getTime() - b.date.getTime();
      }
    });

    return sortedEvents;
  }, [location, parsedFilters, statusFilter, orderBy]);

  const hasFilters = useMemo(() => {
    return !!(
      location ||
      modalities.length > 0 ||
      dateFrom ||
      dateTo ||
      priceMin ||
      priceMax ||
      searchQuery ||
      statusFilter ||
      orderBy !== "date-asc"
    );
  }, [
    location,
    modalities,
    dateFrom,
    dateTo,
    priceMin,
    priceMax,
    searchQuery,
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

  const getOrderLabel = () => {
    const option = orderOptions.find((opt) => opt.id === orderBy);
    return option?.label || "Ordenar por";
  };

  const paginatedEvents = useMemo(() => {
    return filteredEvents.slice(0, itemsToShow);
  }, [filteredEvents, itemsToShow]);

  const hasMore = filteredEvents.length > itemsToShow;

  const handleLoadMore = () => {
    setItemsToShow((prev) => prev + 8);
  };

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
              ? `Resultados da busca (${filteredEvents.length})`
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

        {filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-xl text-gray-11 mb-4">
              Nenhum evento encontrado
            </p>
            <p className="text-sm text-gray-10">
              Tente ajustar os filtros ou buscar por outros termos
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
              {paginatedEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
            {hasMore && (
              <Button
                onClick={handleLoadMore}
                className="w-full mt-8 border border-gray-6 text-gray-12"
                variant="outline"
              >
                Carregar mais eventos
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

