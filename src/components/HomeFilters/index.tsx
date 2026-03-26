"use client";
import { modalitiesColumns } from "@/constants";
import { resolveLegacyLocationSlug } from "@/constants/legacyLocationSlugs";
import { Dropdown } from "../Dropdown";
import { LocationIcon } from "../Icons/LocationIcon";
import { MoneyIcon } from "../Icons/MoneyIcon";
import { SneakersIcon } from "../Icons/SneakersIcon";
import { CalendarIcon } from "../Icons/CalendarIcon";
import { SearchIcon } from "lucide-react";
import { DateRangePicker } from "../DateRangePicker";
import { PriceRangeSlider } from "../PriceRangeSlider";
import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { DateRange } from "react-day-picker";
import Link from "next/link";
import { useEventLocationFacets } from "@/hooks/useEventLocationFacets";
import { LocationCascadePicker } from "@/components/LocationCascadePicker";

interface HomeFiltersProps {
  /** Valor exato de `state` na API / URL */
  initialState?: string | null;
  /** Valor exato de `city` na API / URL */
  initialCity?: string | null;
  /** @deprecated use `initialState` / `initialCity` */
  initialLocation?: string | null;
  initialModalities?: string[];
  initialDateRange?: DateRange | undefined;
  initialPriceRange?: [number, number];
}

const arraysEqual = (a: string[], b: string[]) => {
  if (a.length !== b.length) return false;
  return a.every((val, index) => val === b[index]);
};

const dateRangesEqual = (
  a: DateRange | undefined,
  b: DateRange | undefined
) => {
  if (!a && !b) return true;
  if (!a || !b) return false;
  const aFrom = a.from?.getTime();
  const bFrom = b.from?.getTime();
  const aTo = a.to?.getTime();
  const bTo = b.to?.getTime();
  return aFrom === bFrom && aTo === bTo;
};

const priceRangesEqual = (a: [number, number], b: [number, number]) => {
  return a[0] === b[0] && a[1] === b[1];
};

function resolveInitialFromProps(
  initialState: string | null | undefined,
  initialCity: string | null | undefined,
  initialLocation: string | null | undefined
): { state: string | null; city: string | null } {
  if (initialState) {
    return { state: initialState, city: initialCity ?? null };
  }
  const leg = resolveLegacyLocationSlug(initialLocation);
  if (leg) {
    return { state: leg.state, city: leg.city };
  }
  return { state: null, city: null };
}

export function HomeFilters({
  initialState = null,
  initialCity = null,
  initialLocation = null,
  initialModalities = [],
  initialDateRange = undefined,
  initialPriceRange = [0, 10000],
}: HomeFiltersProps = {}) {
  const router = useRouter();
  const { facets, isLoading: facetsLoading } = useEventLocationFacets();

  const [selectedModalities, setSelectedModalities] =
    useState<string[]>(initialModalities);
  const [selectedStateApi, setSelectedStateApi] = useState<string | null>(() =>
    resolveInitialFromProps(initialState, initialCity, initialLocation).state
  );
  const [selectedCityApi, setSelectedCityApi] = useState<string | null>(() =>
    resolveInitialFromProps(initialState, initialCity, initialLocation).city
  );
  const [locationPickerKey, setLocationPickerKey] = useState(0);
  const [selectedDateRange, setSelectedDateRange] = useState<
    DateRange | undefined
  >(initialDateRange);
  const [priceRange, setPriceRange] =
    useState<[number, number]>(initialPriceRange);

  const prevInitialStateRef = useRef(initialState);
  const prevInitialCityRef = useRef(initialCity);
  const prevInitialLocationRef = useRef(initialLocation);
  const prevInitialModalitiesRef = useRef(initialModalities);
  const prevInitialDateRangeRef = useRef(initialDateRange);
  const prevInitialPriceRangeRef = useRef(initialPriceRange);

  useEffect(() => {
    if (
      prevInitialStateRef.current !== initialState ||
      prevInitialCityRef.current !== initialCity ||
      prevInitialLocationRef.current !== initialLocation
    ) {
      const next = resolveInitialFromProps(
        initialState,
        initialCity,
        initialLocation
      );
      setSelectedStateApi(next.state);
      setSelectedCityApi(next.city);
      prevInitialStateRef.current = initialState;
      prevInitialCityRef.current = initialCity;
      prevInitialLocationRef.current = initialLocation;
    }
  }, [initialState, initialCity, initialLocation]);

  useEffect(() => {
    if (!arraysEqual(prevInitialModalitiesRef.current, initialModalities)) {
      setSelectedModalities(initialModalities);
      prevInitialModalitiesRef.current = initialModalities;
    }
  }, [initialModalities]);

  useEffect(() => {
    if (!dateRangesEqual(prevInitialDateRangeRef.current, initialDateRange)) {
      setSelectedDateRange(initialDateRange);
      prevInitialDateRangeRef.current = initialDateRange;
    }
  }, [initialDateRange]);

  useEffect(() => {
    if (
      !priceRangesEqual(prevInitialPriceRangeRef.current, initialPriceRange)
    ) {
      setPriceRange(initialPriceRange);
      prevInitialPriceRangeRef.current = initialPriceRange;
    }
  }, [initialPriceRange]);

  const handleModalitiesChange = useCallback((ids: string[]) => {
    setSelectedModalities(ids);
  }, []);

  const handlePriceRangeChange = useCallback((range: [number, number]) => {
    setPriceRange(range);
  }, []);

  const handleDateRangeSelect = useCallback((range: DateRange | undefined) => {
    setSelectedDateRange(range);
  }, []);

  const memoizedSelectedModalities = useMemo(
    () => selectedModalities,
    [selectedModalities]
  );

  const isAllPrices = useMemo(() => {
    return priceRange[0] === 0 && priceRange[1] === 10000;
  }, [priceRange]);

  const formatPriceRange = useCallback(() => {
    if (isAllPrices) {
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
  }, [priceRange]);

  const formatDateRange = useCallback(() => {
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
  }, [selectedDateRange]);

  const locationSummary = useMemo(() => {
    if (!selectedStateApi) return null;
    const facet = facets.find((f) => f.apiValue === selectedStateApi);
    const stateName = facet?.displayLabel ?? selectedStateApi;
    if (!selectedCityApi) {
      return `${stateName} — todas as cidades`;
    }
    return `${selectedCityApi}, ${stateName}`;
  }, [facets, selectedStateApi, selectedCityApi]);

  const handleSearch = useCallback(() => {
    const params = new URLSearchParams();

    if (selectedStateApi) {
      params.set("state", selectedStateApi);
    }
    if (selectedCityApi) {
      params.set("city", selectedCityApi);
    }

    if (selectedModalities.length > 0) {
      params.set("modalities", selectedModalities.join(","));
    }

    if (selectedDateRange?.from) {
      params.set(
        "dateFrom",
        selectedDateRange.from.toISOString().split("T")[0]
      );
    }

    if (selectedDateRange?.to) {
      params.set("dateTo", selectedDateRange.to.toISOString().split("T")[0]);
    }

    if (priceRange[0] > 0) {
      params.set("priceMin", priceRange[0].toString());
    }

    if (priceRange[1] < 10000) {
      params.set("priceMax", priceRange[1].toString());
    }

    const queryString = params.toString();
    router.push(`/search${queryString ? `?${queryString}` : ""}`);
  }, [
    selectedStateApi,
    selectedCityApi,
    selectedModalities,
    selectedDateRange,
    priceRange,
    router,
  ]);

  return (
    <div className="w-full md:px-0 mt-6 md:mt-14">
      {/* Mobile Layout */}
      <Link href="/search" className="flex flex-col gap-3 md:hidden relative">
        <div className="rounded-full border border-gray-6 p-3 px-4 flex items-center gap-4">
          <div className="flex items-center justify-between">
            <SearchIcon className="size-5 text-gray-11 shrink-0" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-sm font-medium">
              Encontre sua próxima corrida
            </h1>
            <p className="text-xs text-gray-11">Local - Data - Modalidade</p>
          </div>
        </div>
      </Link>

      {/* Desktop Layout */}
      <div className="hidden md:flex relative items-center justify-between shadow-[0_5px_10px_rgba(0,0,0,0.3)] rounded-4xl h-[75px]">
        <Dropdown
          dataAttribute="location"
          width="w-full min-w-[280px] max-w-[320px]"
          maxHeight="max-h-[430px]"
          className="top-20"
          onOpenChange={(open) => {
            if (open) setLocationPickerKey((k) => k + 1);
          }}
          trigger={() => (
            <div className="flex items-center w-[280px] gap-2 px-4 h-full bg-transparent hover:bg-gray-6 transition-all duration-200 rounded-2xl cursor-pointer">
              <LocationIcon />
              <div className="flex flex-col min-w-0">
                <h1 className="font-family-manrope font-bold">Local</h1>
                <p className="font-family-dm-sans font-normal text-gray-11 truncate">
                  {locationSummary ?? "Selecione um local"}
                </p>
              </div>
            </div>
          )}
        >
          {({ close }) => (
            <LocationCascadePicker
              key={locationPickerKey}
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
              close={close}
            />
          )}
        </Dropdown>

        <div className="w-px h-[30px] bg-gray-6" />

        <Dropdown
          dataAttribute="dates"
          width="w-auto min-w-[600px]"
          maxHeight="max-h-[500px]"
          className="top-20"
          trigger={() => (
            <div className="flex items-center w-[280px] gap-2 px-4 h-full bg-transparent hover:bg-gray-6 transition-all duration-200 rounded-2xl cursor-pointer">
              <CalendarIcon className="size-8" />
              <div className="flex flex-col">
                <h1 className="font-family-manrope font-bold">Datas</h1>
                <p
                  className={`font-family-dm-sans font-normal text-gray-11 ${
                    selectedDateRange?.from ? "text-base" : "text-base"
                  }`}
                >
                  {formatDateRange()}
                </p>
              </div>
            </div>
          )}
        >
          <DateRangePicker
            onSelect={handleDateRangeSelect}
            value={selectedDateRange}
          />
        </Dropdown>

        <div className="w-px h-[30px] bg-gray-6" />

        <Dropdown
          dataAttribute="modalities"
          width="w-auto min-w-[280px]"
          maxHeight="max-h-[430px]"
          className="top-20 left-1/2 -translate-x-1/2"
          align="center"
          columns={[modalitiesColumns.flat()]}
          multiSelect={true}
          selectedIds={memoizedSelectedModalities}
          onMultiSelectChange={handleModalitiesChange}
          trigger={() => (
            <div className="flex items-center w-[280px] gap-2 px-4 h-full bg-transparent hover:bg-gray-6 transition-all duration-200 rounded-2xl cursor-pointer">
              <SneakersIcon />
              <div className="flex flex-col">
                <h1 className="font-family-manrope font-bold">Modalidade</h1>
                <p className="font-family-dm-sans font-normal text-gray-11">
                  {selectedModalities.length > 0
                    ? `${selectedModalities.length} selecionada${
                        selectedModalities.length > 1 ? "s" : ""
                      }`
                    : "Qual modalidade?"}
                </p>
              </div>
            </div>
          )}
        />

        <div className="w-px h-[30px] bg-gray-6" />

        <Dropdown
          dataAttribute="price"
          width="w-auto min-w-[570px]"
          maxHeight="max-h-[300px]"
          className="top-20 right-0"
          align="end"
          trigger={() => (
            <div className="flex items-center w-[280px] gap-2 px-4 pr-20 h-full bg-transparent hover:bg-gray-6 transition-all duration-200 rounded-2xl cursor-pointer">
              <MoneyIcon />
              <div className="flex flex-col">
                <h1 className="font-family-manrope font-bold">Preço</h1>
                <p
                  className={`font-family-dm-sans font-normal text-gray-11 ${
                    isAllPrices ? "text-base" : "text-xs"
                  }`}
                >
                  {formatPriceRange()}
                </p>
              </div>
            </div>
          )}
        >
          <PriceRangeSlider
            min={0}
            max={10000}
            defaultValue={priceRange}
            onChange={handlePriceRangeChange}
          />
        </Dropdown>

        <button
          onClick={handleSearch}
          className="absolute right-0 flex items-center justify-center gap-2 bg-[#5CC870] hover:bg-[#4db860] transition-colors p-2 rounded-full w-10 h-10 ml-4 mr-4 cursor-pointer"
          aria-label="Pesquisar eventos"
        >
          <SearchIcon />
        </button>
      </div>
    </div>
  );
}
