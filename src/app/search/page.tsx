"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useMemo, Suspense, useState, useEffect } from "react";
import { EventCard } from "@/components/Event/Card";
import { HomeFilters } from "@/components/HomeFilters";
import { Button } from "@/components/Button";
import { Dropdown, DropdownOption } from "@/components/Dropdown";
import { useEventSearch } from "@/hooks/useEventSearch";
import { eventWindowInstant } from "@/utils/datetimeBR";
import {
  statusOptions,
  orderOptions,
  modalitiesColumns,
} from "@/constants";
import { resolveLegacyLocationSlug } from "@/constants/legacyLocationSlugs";
import { useEventLocationFacets } from "@/hooks/useEventLocationFacets";
import { LocationCascadePicker } from "@/components/LocationCascadePicker";
import { ArrowLeft, Plus, Minus } from "lucide-react";
import { LocationIcon } from "@/components/Icons/LocationIcon";
import { CalendarIcon } from "@/components/Icons/CalendarIcon";
import { SneakersIcon } from "@/components/Icons/SneakersIcon";
import { MoneyIcon } from "@/components/Icons/MoneyIcon";
import { DateRangePicker } from "@/components/DateRangePicker";
import { PriceRangeSlider } from "@/components/PriceRangeSlider";
import { Input } from "@/components/Input";
import Image from "next/image";
import Link from "next/link";
import type { DateRange } from "react-day-picker";

function MobileAdvancedSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentPage, setCurrentPage] = useState(1);
  const { facets, isLoading: facetsLoading } = useEventLocationFacets();

  const [expandedSections, setExpandedSections] = useState({
    local: false,
    datas: false,
    modalidade: false,
    preco: false,
  });

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

  const [selectedStateApi, setSelectedStateApi] = useState<string | null>(
    effectiveLocation.state
  );
  const [selectedCityApi, setSelectedCityApi] = useState<string | null>(
    effectiveLocation.city
  );

  useEffect(() => {
    setSelectedStateApi(effectiveLocation.state);
    setSelectedCityApi(effectiveLocation.city);
  }, [effectiveLocation.state, effectiveLocation.city]);
  const [selectedModalities, setSelectedModalities] = useState<string[]>(
    searchParams.get("modalities")?.split(",").filter(Boolean) || []
  );
  const [selectedDateRange, setSelectedDateRange] = useState<
    DateRange | undefined
  >(
    searchParams.get("dateFrom") || searchParams.get("dateTo")
      ? {
          from: searchParams.get("dateFrom")
            ? new Date(searchParams.get("dateFrom")!)
            : undefined,
          to: searchParams.get("dateTo")
            ? new Date(searchParams.get("dateTo")!)
            : undefined,
        }
      : undefined
  );
  const [priceRange, setPriceRange] = useState<[number, number]>([
    searchParams.get("priceMin") ? parseInt(searchParams.get("priceMin")!) : 0,
    searchParams.get("priceMax")
      ? parseInt(searchParams.get("priceMax")!)
      : 10000,
  ]);

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

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const mobileLocationSummary = useMemo(() => {
    if (!selectedStateApi) return null;
    const facet = facets.find((f) => f.apiValue === selectedStateApi);
    const stateName = facet?.displayLabel ?? selectedStateApi;
    if (!selectedCityApi) {
      return `${stateName} — todas as cidades`;
    }
    return `${selectedCityApi}, ${stateName}`;
  }, [facets, selectedStateApi, selectedCityApi]);

  const formatDateRange = () => {
    if (!selectedDateRange?.from) {
      return "Dia do evento";
    }
    const formatDate = (date: Date) => {
      return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "short",
      }).format(date);
    };
    if (selectedDateRange.from && selectedDateRange.to) {
      return `${formatDate(selectedDateRange.from)} - ${formatDate(
        selectedDateRange.to
      )}`;
    }
    return formatDate(selectedDateRange.from);
  };

  const formatPriceRange = () => {
    if (priceRange[0] === 0 && priceRange[1] === 10000) {
      return "Todos os preços";
    }
    const formatCurrency = (value: number) => {
      return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        minimumFractionDigits: 0,
      }).format(value);
    };
    return `${formatCurrency(priceRange[0])} - ${formatCurrency(
      priceRange[1]
    )}`;
  };

  const handleSearch = () => {
    const params = new URLSearchParams();
    // Preservar busca textual se existir
    const q = searchParams.get("q");
    if (q) params.set("q", q);

    if (selectedStateApi) params.set("state", selectedStateApi);
    if (selectedCityApi) params.set("city", selectedCityApi);
    if (selectedModalities.length > 0) params.set("modalities", selectedModalities.join(","));
    if (selectedDateRange?.from) params.set("dateFrom", selectedDateRange.from.toISOString().split("T")[0]);
    if (selectedDateRange?.to) params.set("dateTo", selectedDateRange.to.toISOString().split("T")[0]);
    if (priceRange[0] > 0) params.set("priceMin", priceRange[0].toString());
    if (priceRange[1] < 10000) params.set("priceMax", priceRange[1].toString());
    router.push(`/search?${params.toString()}`);
  };

  const handleClearAll = () => {
    setSelectedStateApi(null);
    setSelectedCityApi(null);
    setSelectedModalities([]);
    setSelectedDateRange(undefined);
    setPriceRange([0, 10000]);
    router.push("/search");
  };

  const handleModalityToggle = (modalityId: string) => {
    setSelectedModalities((prev) =>
      prev.includes(modalityId)
        ? prev.filter((id) => id !== modalityId)
        : [...prev, modalityId]
    );
  };

  const allModalities = modalitiesColumns.flat();

  return (
    <div className="md:hidden flex flex-col min-h-screen bg-gray-2 relative">
      {/* Mobile Header */}
      <div className="bg-gray-2 border-b border-gray-6 flex items-center justify-between px-4 py-4">
        <button
          onClick={() => router.back()}
          className="flex items-center justify-center"
        >
          <ArrowLeft className="size-5 text-gray-12" />
        </button>
        <h1 className="font-medium text-base text-gray-12 font-family-dm-sans">
          Pesquisa avançada
        </h1>
        <div className="size-6 shrink-0" />
      </div>

      {/* Filters Container */}
      <div className="flex-1 overflow-y-auto pb-24">
        <div className="flex flex-col gap-4 px-4 pt-6 pb-8">
          {/* Results Header */}
          <div className="mb-2">
            <h2 className="text-xl font-extrabold text-gray-12">
              {isLoading
                ? "Carregando..."
                : hasFilters
                ? `Resultados (${pagination.total})`
                : `Todos os eventos (${pagination.total})`}
            </h2>
          </div>
          {/* Local Filter */}
          <div className="bg-gray-2 border border-gray-6 rounded-xl shadow-[0px_2px_6px_0px_rgba(17,17,17,0.25)] overflow-hidden">
            <button
              onClick={() => toggleSection("local")}
              className="w-full flex items-center gap-2 px-4 py-5 border-b border-gray-6"
            >
              <LocationIcon className="size-6 shrink-0" />
              <div className="flex-1 text-left">
                <h2 className="font-bold text-sm text-gray-12 font-family-dm-sans">
                  Local
                </h2>
                <p className="font-normal text-xs text-gray-11 font-family-dm-sans truncate">
                  {mobileLocationSummary ?? "Selecione um local"}
                </p>
              </div>
              {expandedSections.local ? (
                <Minus className="size-6 text-gray-12 shrink-0" />
              ) : (
                <Plus className="size-6 text-gray-12 shrink-0" />
              )}
            </button>
            {expandedSections.local && (
              <LocationCascadePicker
                facets={facets}
                isLoading={facetsLoading}
                selectedStateApi={selectedStateApi}
                onSelect={({ stateApi, cityApi }) => {
                  setSelectedStateApi(stateApi);
                  setSelectedCityApi(cityApi);
                }}
                onClear={() => {
                  setSelectedStateApi(null);
                  setSelectedCityApi(null);
                }}
                close={() => toggleSection("local")}
              />
            )}
          </div>

          {/* Datas Filter */}
          <div className="bg-gray-2 border border-gray-6 rounded-xl shadow-[0px_2px_6px_0px_rgba(17,17,17,0.25)] overflow-hidden">
            <button
              onClick={() => toggleSection("datas")}
              className="w-full flex items-center gap-2 px-4 py-5 border-b border-gray-6"
            >
              <CalendarIcon className="size-6 shrink-0" />
              <div className="flex-1 text-left">
                <h2 className="font-bold text-sm text-gray-12 font-family-dm-sans">
                  Datas
                </h2>
                <p className="font-normal text-xs text-gray-11 font-family-dm-sans truncate">
                  {formatDateRange()}
                </p>
              </div>
              {expandedSections.datas ? (
                <Minus className="size-6 text-gray-12 shrink-0" />
              ) : (
                <Plus className="size-6 text-gray-12 shrink-0" />
              )}
            </button>
            {expandedSections.datas && (
              <div className="p-4">
                <DateRangePicker
                  onSelect={setSelectedDateRange}
                  value={selectedDateRange}
                  className="**:text-sm!"
                />
              </div>
            )}
          </div>

          {/* Modalidade Filter */}
          <div className="bg-gray-2 border border-gray-6 rounded-xl shadow-[0px_2px_6px_0px_rgba(17,17,17,0.25)] overflow-hidden">
            <button
              onClick={() => toggleSection("modalidade")}
              className="w-full flex items-center gap-2 px-4 py-5 border-b border-gray-6"
            >
              <SneakersIcon className="size-6 shrink-0" />
              <div className="flex-1 text-left">
                <h2 className="font-bold text-sm text-gray-12 font-family-dm-sans">
                  Modalidade
                </h2>
                <p className="font-normal text-xs text-gray-11 font-family-dm-sans truncate">
                  {selectedModalities.length > 0
                    ? `${selectedModalities.length} selecionada${
                        selectedModalities.length > 1 ? "s" : ""
                      }`
                    : "Qual modalidade?"}
                </p>
              </div>
              {expandedSections.modalidade ? (
                <Minus className="size-6 text-gray-12 shrink-0" />
              ) : (
                <Plus className="size-6 text-gray-12 shrink-0" />
              )}
            </button>
            {expandedSections.modalidade && (
              <div className="p-4 max-h-[400px] overflow-y-auto">
                <div className="grid grid-cols-1 gap-2">
                  {allModalities.map((modality) => (
                    <button
                      key={modality.id}
                      onClick={() => handleModalityToggle(modality.id)}
                      className={`flex items-center gap-2 h-14 px-4 rounded-lg border transition-colors ${
                        selectedModalities.includes(modality.id)
                          ? "bg-primary-5 border-primary-8"
                          : "bg-gray-2 border-gray-6 hover:bg-gray-3"
                      }`}
                    >
                      {modality.icon && (
                        <div className="size-6 shrink-0">
                          <Image
                            src={modality.icon}
                            alt={modality.label}
                            width={24}
                            height={24}
                            className="size-6 object-contain"
                          />
                        </div>
                      )}
                      <span className="font-normal text-sm text-gray-12 font-family-dm-sans text-left">
                        {modality.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Preço Filter */}
          <div className="bg-gray-2 border border-gray-6 rounded-xl shadow-[0px_2px_6px_0px_rgba(17,17,17,0.25)] overflow-hidden">
            <button
              onClick={() => toggleSection("preco")}
              className="w-full flex items-center gap-2 px-4 py-5"
            >
              <MoneyIcon className="size-6 shrink-0" />
              <div className="flex-1 text-left">
                <h2 className="font-bold text-sm text-gray-12 font-family-dm-sans">
                  Preço
                </h2>
                <p className="font-normal text-xs text-gray-11 font-family-dm-sans">
                  {formatPriceRange()}
                </p>
              </div>
              {expandedSections.preco ? (
                <Minus className="size-6 text-gray-12 shrink-0" />
              ) : (
                <Plus className="size-6 text-gray-12 shrink-0" />
              )}
            </button>
            {expandedSections.preco && (
              <div className="p-4">
                <PriceRangeSlider
                  min={0}
                  max={10000}
                  defaultValue={priceRange}
                  onChange={setPriceRange}
                />
              </div>
            )}
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
              <div className="grid grid-cols-1 gap-4">
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

      {/* Footer */}
      <div className="fixed z-50 bottom-0 left-0 right-0 bg-gray-1 border-t border-gray-6 px-4 py-4 flex items-center justify-between">
        <button
          onClick={handleClearAll}
          className="font-semibold text-base text-gray-12 font-family-dm-sans"
        >
          Limpar tudo
        </button>
        <Button onClick={handleSearch} className="w-[116px] h-11">
          Buscar
        </Button>
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

  // Filtrar por status e ordenar (modalidades e preço são filtrados na API)
  const filteredEvents = useMemo(() => {
    let filtered = [...events];

    // Filtrar por preço
    const hasPriceFilter =
      (priceMin && parseInt(priceMin) > 0) ||
      (priceMax && parseInt(priceMax) < 10000);
    if (hasPriceFilter) {
      filtered = filtered.filter((event) => {
        const eventPrice = (event as any).price || 0;
        const min = priceMin ? parseInt(priceMin) : 0;
        const max = priceMax ? parseInt(priceMax) : 10000;
        return eventPrice >= min && eventPrice <= max;
      });
    }

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

    // Ordenar
    return [...filtered].sort((a, b) => {
      switch (orderBy) {
        case "date-asc":
          if (!a.eventDate || !b.eventDate) return 0;
          return new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime();
        case "date-desc":
          if (!a.eventDate || !b.eventDate) return 0;
          return new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime();
        case "name-asc":
          return a.name.localeCompare(b.name, "pt-BR");
        case "name-desc":
          return b.name.localeCompare(a.name, "pt-BR");
        default:
          if (!a.eventDate || !b.eventDate) return 0;
          return new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime();
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
      <section className="hidden md:flex flex-col min-h-screen items-center max-w-[1280px] mx-auto px-4 lg:px-8">
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
