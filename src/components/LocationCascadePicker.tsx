"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ChevronRight, Search } from "lucide-react";
import { LocationIcon } from "@/components/Icons/LocationIcon";
import type { LocationFacetState } from "@/hooks/useEventLocationFacets";

type Step = "states" | "cities";

export interface LocationCascadePickerProps {
  facets: LocationFacetState[];
  isLoading: boolean;
  selectedStateApi: string | null;
  onSelect: (payload: { stateApi: string; cityApi: string | null }) => void;
  onClear: () => void;
  close: () => void;
}

export function LocationCascadePicker({
  facets,
  isLoading,
  selectedStateApi,
  onSelect,
  onClear,
  close,
}: LocationCascadePickerProps) {
  const [step, setStep] = useState<Step>("states");
  const [browsingStateApi, setBrowsingStateApi] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const browsingFacet = useMemo(
    () => facets.find((f) => f.apiValue === browsingStateApi) ?? null,
    [facets, browsingStateApi]
  );

  const filteredStates = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return facets;
    return facets.filter((f) => {
      if (f.displayLabel.toLowerCase().includes(q)) return true;
      return f.cities.some((c) => c.displayLabel.toLowerCase().includes(q));
    });
  }, [facets, query]);

  const filteredCities = useMemo(() => {
    if (!browsingFacet) return [];
    const q = query.trim().toLowerCase();
    if (!q) return browsingFacet.cities;
    return browsingFacet.cities.filter((c) =>
      c.displayLabel.toLowerCase().includes(q)
    );
  }, [browsingFacet, query]);

  const goStates = () => {
    setStep("states");
    setBrowsingStateApi(null);
    setQuery("");
  };

  const openCities = (stateApi: string) => {
    setBrowsingStateApi(stateApi);
    setStep("cities");
    setQuery("");
  };

  if (isLoading) {
    return (
      <div className="p-4 text-sm text-gray-11 font-family-dm-sans">
        Carregando locais com eventos…
      </div>
    );
  }

  if (!facets.length) {
    return (
      <div className="p-4 text-sm text-gray-11 font-family-dm-sans">
        Nenhum local disponível no momento.
      </div>
    );
  }

  if (step === "cities" && browsingFacet) {
    return (
      <div className="flex flex-col min-h-[200px]">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-6">
          <button
            type="button"
            onClick={goStates}
            className="p-1 rounded-lg hover:bg-gray-3 text-gray-12"
            aria-label="Voltar para estados"
          >
            <ArrowLeft className="size-5" />
          </button>
          <span className="text-sm font-semibold text-gray-12 font-family-dm-sans truncate">
            {browsingFacet.displayLabel}
          </span>
        </div>
        <div className="px-3 py-2 border-b border-gray-6">
          <div className="border border-gray-6 rounded-lg h-10 px-3 flex items-center gap-2">
            <Search className="size-4 text-gray-11 shrink-0" />
            <input
              type="text"
              placeholder="Buscar cidade…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-transparent text-sm text-gray-12 placeholder:text-gray-11 outline-none font-family-dm-sans"
            />
          </div>
        </div>
        {/* Mobile: teto de 5 itens (5 × h-12 = 240px) → rola a partir do 6º local.
            Desktop mantém o teto maior (o Dropdown de HomeFilters já limita a altura). */}
        <div className="overflow-y-auto max-h-[240px] md:max-h-[320px] overscroll-contain [-webkit-overflow-scrolling:touch] [touch-action:pan-y]">
          {filteredCities.map((city, index) => (
            <button
              key={city.apiValue}
              type="button"
              onClick={() => {
                onSelect({
                  stateApi: browsingFacet.apiValue,
                  cityApi: city.apiValue,
                });
                close();
              }}
              className={`w-full flex items-center gap-2 h-12 px-4 text-left border-b border-gray-4 hover:bg-gray-3 transition-colors ${index === filteredCities.length - 1 ? "border-b-0" : ""
                }`}
            >
              <LocationIcon className="size-5 shrink-0" />
              <span className="font-medium text-sm text-gray-12 font-family-dm-sans truncate">
                {city.displayLabel}
              </span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              onSelect({ stateApi: browsingFacet.apiValue, cityApi: null });
              close();
            }}
            className="w-full flex items-center gap-2 h-12 px-4 text-left border-b border-gray-4 hover:bg-gray-3 transition-colors"
          >
            <LocationIcon className="size-5 shrink-0" />
            <span className="font-medium text-sm text-gray-12 font-family-dm-sans">
              Todas as cidades
            </span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[200px]">
      <div className="px-3 py-2 border-b border-gray-6">
        <div className="border border-gray-6 rounded-lg h-10 px-3 flex items-center gap-2">
          <Search className="size-4 text-gray-11 shrink-0" />
          <input
            type="text"
            placeholder="Buscar estado ou cidade…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-gray-12 placeholder:text-gray-11 outline-none font-family-dm-sans"
          />
        </div>
      </div>
      {selectedStateApi && (
        <div className="px-2 py-2 border-b border-gray-6">
          <button
            type="button"
            onClick={() => {
              onClear();
              close();
            }}
            className="w-full text-center text-sm font-medium text-primary-9 hover:underline font-family-dm-sans py-1"
          >
            Limpar local
          </button>
        </div>
      )}
      {/* Mobile: teto de 5 itens (5 × h-12 = 240px) → rola a partir do 6º local.
          Desktop mantém o teto maior (o Dropdown de HomeFilters já limita a altura). */}
      <div className="overflow-y-auto max-h-[240px] md:max-h-[320px] overscroll-contain [-webkit-overflow-scrolling:touch] [touch-action:pan-y]">
        {filteredStates.map((state, index) => (
          <button
            key={state.apiValue}
            type="button"
            onClick={() => openCities(state.apiValue)}
            className={`w-full flex items-center gap-2 h-12 px-4 text-left border-b border-gray-4 hover:bg-gray-3 transition-colors ${index === filteredStates.length - 1 ? "border-b-0" : ""
              }`}
          >
            <LocationIcon className="size-5 shrink-0" />
            <span className="flex-1 font-medium text-sm text-gray-12 font-family-dm-sans truncate">
              {state.displayLabel}
            </span>
            <ChevronRight className="size-5 text-gray-11 shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}
