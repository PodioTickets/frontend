"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useMemo, Suspense, useState, useEffect } from "react";
import { EventCard } from "@/components/Event/Card";
import { HomeFilters } from "@/components/HomeFilters";
import { Button } from "@/components/Button";
import { Dropdown, DropdownOption } from "@/components/Dropdown";
import { useEventSearch } from "@/hooks/useEventSearch";
import { eventWindowInstant } from "@/utils/datetimeBR";
import { statusOptions, orderOptions } from "@/constants";
import { resolveLegacyLocationSlug } from "@/constants/legacyLocationSlugs";
import type { DateRange } from "react-day-picker";

function MobileAdvancedSearch() {
  const searchParams = useSearchParams();
  const [currentPage, setCurrentPage] = useState(1);

  const legacyLocation = searchParams.get("location");
  const stateFromUrl = searchParams.get("state");
  const cityFromUrl = searchParams.get("city");

  const effectiveLocation = useMemo(() => {
    if (stateFromUrl) {
      return { state: stateFromUrl, city: cityFromUrl };
    }
    const leg = resolveLegacyLocationSlug(legacyLocation);
    if (leg) return { state: leg.state, city: leg.city };
    return { state: null as string | null, city: null as string | null };
  }, [stateFromUrl, cityFromUrl, legacyLocation]);

  const searchQuery = searchParams.get("q") || undefined;
  const dateFrom = searchParams.get("dateFrom") || undefined;
  const dateTo = searchParams.get("dateTo") || undefined;
  const modalities =
    searchParams.get("modalities")?.split(",").filter(Boolean) || [];
  const priceMin = searchParams.get("priceMin");
  const priceMax = searchParams.get("priceMax");

  const startDate = dateFrom
    ? new Date(dateFrom).toISOString().split("T")[0]
    : undefined;
  const endDate = dateTo
    ? new Date(dateTo).toISOString().split("T")[0]
    : undefined;

  const { events, pagination, isLoading, query } = useEventSearch({
    q: searchQuery,
    state: effectiveLocation.state || undefined,
    city: effectiveLocation.city || undefined,
    startDate,
    endDate,
    modalities: modalities.length > 0 ? modalities : undefined,
    // Preço (reais) → filtro server-side. Presente na URL só quando o usuário
    // mexeu no slider (piso > 0 / teto < 1000), então é seguro repassar direto.
    minPrice: priceMin ? parseFloat(priceMin) : undefined,
    maxPrice: priceMax ? parseFloat(priceMax) : undefined,
    page: currentPage,
    limit: 20,
  });

  // Resetar página quando filtros mudarem
  useEffect(() => {
    setCurrentPage(1);
  }, [
    dateFrom,
    dateTo,
    searchQuery,
    effectiveLocation.state,
    effectiveLocation.city,
    searchParams.get("modalities"),
    priceMin,
    priceMax,
  ]);

  const hasFilters = useMemo(() => {
    return !!(
      searchQuery ||
      dateFrom ||
      dateTo ||
      modalities.length > 0 ||
      priceMin ||
      priceMax ||
      effectiveLocation.state ||
      effectiveLocation.city ||
      legacyLocation
    );
  }, [
    searchQuery,
    dateFrom,
    dateTo,
    modalities,
    priceMin,
    priceMax,
    effectiveLocation.state,
    effectiveLocation.city,
    legacyLocation,
  ]);

  // Props iniciais do HomeFilters (refletem os filtros ativos na URL).
  const initialDateRange = useMemo<DateRange | undefined>(() => {
    if (!dateFrom && !dateTo) return undefined;
    return {
      from: dateFrom ? new Date(dateFrom) : undefined,
      to: dateTo ? new Date(dateTo) : undefined,
    };
  }, [dateFrom, dateTo]);

  const initialPriceRange = useMemo<[number, number]>(
    () => [
      priceMin ? parseFloat(priceMin) : 0,
      priceMax ? parseFloat(priceMax) : 1000,
    ],
    [priceMin, priceMax],
  );

  return (
    <div className="md:hidden flex flex-col min-h-screen bg-gray-2 relative">
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-4 px-4 pt-0 pb-8">
          {/* Card de busca (abre o bottom-sheet de filtros) — MESMO da home */}
          <HomeFilters
            initialState={effectiveLocation.state}
            initialCity={effectiveLocation.city}
            initialLocation={legacyLocation}
            initialModalities={modalities}
            initialDateRange={initialDateRange}
            initialPriceRange={initialPriceRange}
          />

          {/* Results Header */}
          <div className="mt-2">
            <h2 className="text-xl font-extrabold text-gray-12">
              {isLoading
                ? "Carregando..."
                : hasFilters
                  ? `Resultados (${pagination.total})`
                  : `Todos os eventos (${pagination.total})`}
            </h2>
          </div>
        </div>

        {/* Events Results */}
        <div className="px-4 pb-8">
          {isLoading && events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <p className="text-lg text-gray-11 mb-4">Carregando eventos...</p>
            </div>
          ) : events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <p className="text-lg text-gray-11 mb-4">
                Nenhum evento encontrado
              </p>
              <p className="text-sm text-gray-10 text-center">
                {query
                  ? `Nenhum resultado para "${query}". Tente ajustar os filtros ou buscar por outros termos.`
                  : "Tente ajustar os filtros ou buscar por outros termos"}
              </p>
            </div>
          ) : (
            <>
              {/* Mobile: MESMO card da home (EventCard vertical), em coluna única. */}
              <div className="grid grid-cols-2 gap-6">
                {events.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
              {currentPage < pagination.totalPages && (
                <Button
                  onClick={() => setCurrentPage((prev) => prev + 1)}
                  className="w-full mt-6 border border-gray-6 text-gray-12"
                  variant="outline"
                  disabled={isLoading}
                >
                  {isLoading ? "Carregando..." : "Carregar mais eventos"}
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);

  // Extrair parâmetros da URL
  const searchQuery = searchParams.get("q") || undefined;
  const country = searchParams.get("country") || undefined;
  const dateFrom = searchParams.get("dateFrom") || undefined;
  const dateTo = searchParams.get("dateTo") || undefined;
  const includePast = searchParams.get("includePast") === "true";
  const legacyLocation = searchParams.get("location");
  const stateFromUrl = searchParams.get("state");
  const cityFromUrl = searchParams.get("city");

  const effectiveLocation = useMemo(() => {
    if (stateFromUrl) {
      return { state: stateFromUrl, city: cityFromUrl };
    }
    const leg = resolveLegacyLocationSlug(legacyLocation);
    if (leg) return { state: leg.state, city: leg.city };
    return { state: null as string | null, city: null as string | null };
  }, [stateFromUrl, cityFromUrl, legacyLocation]);

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
    state: effectiveLocation.state || undefined,
    city: effectiveLocation.city || undefined,
    startDate,
    endDate,
    includePast: includePast || undefined,
    modalities: modalities.length > 0 ? modalities : undefined,
    // Preço (reais) → filtro server-side (ver useEventSearch). Substitui o filtro
    // client-side antigo, que comparava `event.price` (nunca retornado) e não funcionava.
    minPrice: priceMin ? parseFloat(priceMin) : undefined,
    maxPrice: priceMax ? parseFloat(priceMax) : undefined,
    page: currentPage,
    limit: 20,
  });

  // Resetar página quando filtros mudarem
  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchQuery,
    country,
    effectiveLocation.state,
    effectiveLocation.city,
    dateFrom,
    dateTo,
    includePast,
    searchParams.get("modalities"),
    priceMin,
    priceMax,
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
    const min = priceMin ? parseFloat(priceMin) : 0;
    const max = priceMax ? parseFloat(priceMax) : 1000;
    return [min, max] as [number, number];
  }, [priceMin, priceMax]);

  // Filtrar por status e ordenar. Preço e modalidades são filtrados na API
  // (server-side) — o filtro de preço client-side antigo comparava `event.price`,
  // que o endpoint nunca retorna, então não funcionava.
  const filteredEvents = useMemo(() => {
    let filtered = [...events];

    // Filtrar por status REAL da inscrição. "Abertas" vs "encerradas" NÃO dá pra
    // distinguir pelo `status` (ambos são PUBLISHED) — depende da JANELA de inscrição
    // (datas). Usa o instante em BRT (eventWindowInstant) pra não errar 3h.
    if (statusFilter) {
      const nowMs = Date.now();
      const reached = (iso?: string | null) => {
        const at = eventWindowInstant(iso);
        return !!at && nowMs >= at.getTime();
      };
      const beforeStart = (iso?: string | null) => {
        const at = eventWindowInstant(iso);
        return !!at && nowMs < at.getTime();
      };
      filtered = filtered.filter((event) => {
        const eventPassed = reached(event.eventDate);
        const regEnded = reached(event.registrationEndDate);
        const regNotOpenYet = beforeStart(event.registrationStartDate);
        switch (statusFilter) {
          case "evento-encerrado":
            return eventPassed;
          case "inscricoes-encerradas":
            // Inscrição fechou, mas o evento ainda não aconteceu.
            return !eventPassed && regEnded;
          case "inscricoes-abertas":
            // Evento futuro com janela aberta (já começou e ainda não encerrou).
            return !eventPassed && !regEnded && !regNotOpenYet;
          default:
            return true;
        }
      });
    }

    // Destaque PRIMEIRO só na ordem PADRÃO (data crescente). Ordenações explícitas
    // do usuário (nome, data-desc) respeitam a escolha dele. `featuredOrder` nulo =
    // não destacado → vai para o fim (Infinity). O backend já pagina destaque-primeiro,
    // então a página atual traz os destacados; aqui só garantimos a ordem dentro dela.
    const byFeatured = (a: (typeof filtered)[number], b: (typeof filtered)[number]) => {
      const fa = a.featuredOrder ?? Infinity;
      const fb = b.featuredOrder ?? Infinity;
      return fa - fb;
    };

    // Ordenar
    return [...filtered].sort((a, b) => {
      switch (orderBy) {
        case "date-asc": {
          const f = byFeatured(a, b);
          if (f !== 0) return f;
          if (!a.eventDate || !b.eventDate) return 0;
          return new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime();
        }
        case "date-desc":
          if (!a.eventDate || !b.eventDate) return 0;
          return new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime();
        case "name-asc":
          return a.name.localeCompare(b.name, "pt-BR");
        case "name-desc":
          return b.name.localeCompare(a.name, "pt-BR");
        default: {
          // Ordem padrão = data crescente com destaque no topo.
          const f = byFeatured(a, b);
          if (f !== 0) return f;
          if (!a.eventDate || !b.eventDate) return 0;
          return new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime();
        }
      }
    });
  }, [events, priceMin, priceMax, statusFilter, orderBy]);

  const hasFilters = useMemo(() => {
    return !!(
      searchQuery ||
      country ||
      effectiveLocation.state ||
      effectiveLocation.city ||
      legacyLocation ||
      dateFrom ||
      dateTo ||
      includePast ||
      statusFilter ||
      orderBy !== "date-asc"
    );
  }, [
    searchQuery,
    country,
    effectiveLocation.state,
    effectiveLocation.city,
    legacyLocation,
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
    <>
      <MobileAdvancedSearch />
      {/* Largura p/ caber 4 cards de 308px por linha (4×308 + 3 gaps = 1304 +
          padding). Antes 1280 só cabia 3. */}
      <section className="hidden md:flex flex-col min-h-screen items-center max-w-[1376px] mx-auto px-4 lg:px-8">
        <HomeFilters
          initialState={effectiveLocation.state}
          initialCity={effectiveLocation.city}
          initialLocation={legacyLocation}
          initialModalities={modalities}
          initialDateRange={initialDateRange}
          initialPriceRange={initialPriceRange}
        />

        <div className="w-full mt-14">
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
              {/* Cards com largura fixa do Figma (308px); no máx. 4 por linha
                  (max-w = 4×308 + 3 gaps de 24). flex-wrap resolve a responsividade. */}
              <div className="grid grid-cols-4 2xl:grid-cols-5 w-full justify-start gap-6 mx-auto max-w-[1304px]">
                {filteredEvents.map((event) => (
                  <div key={event.id} className="w-full md:w-[308px] max-w-full">
                    <EventCard event={event} />
                  </div>
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
    </>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <section className="flex flex-col min-h-screen items-center max-w-[1280px] mx-auto lg:px-8">
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
