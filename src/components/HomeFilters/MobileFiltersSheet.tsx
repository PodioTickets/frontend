"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useDragControls } from "framer-motion";
import Image from "next/image";
import { Plus, Minus } from "lucide-react";
import { LocationIcon } from "@/components/Icons/LocationIcon";
import { CalendarIcon } from "@/components/Icons/CalendarIcon";
import { SneakersIcon } from "@/components/Icons/SneakersIcon";
import { MoneyIcon } from "@/components/Icons/MoneyIcon";
import { DateRangePicker } from "@/components/DateRangePicker";
import { PriceRangeSlider } from "@/components/PriceRangeSlider";
import { LocationCascadePicker } from "@/components/LocationCascadePicker";
import { Button } from "@/components/Button";
import { modalitiesColumns } from "@/constants";
import type { DateRange } from "react-day-picker";
import type { LocationFacetState } from "@/hooks/useEventLocationFacets";

/**
 * Bottom-sheet de filtros (MOBILE) — compartilhado pela home e pelo /search via
 * `HomeFilters`. Reúne os filtros de hoje (Local / Datas / Modalidade / Preço) em
 * acordeões, com rodapé "Limpar tudo / Buscar". Puramente presentational: o estado
 * dos filtros vive no `HomeFilters` (fonte única entre a barra desktop e este sheet).
 *
 * UX de abrir/fechar espelha o `MobileSummaryBar`: backdrop com fade + painel
 * slide-up + arrasto pra baixo pra fechar (framer-motion), montado em portal.
 */

type SectionKey = "local" | "datas" | "modalidade" | "preco";

export interface MobileFiltersSheetProps {
  open: boolean;
  onClose: () => void;

  // Local
  facets: LocationFacetState[];
  facetsLoading: boolean;
  selectedStateApi: string | null;
  onSelectLocation: (payload: { stateApi: string; cityApi: string | null }) => void;
  onClearLocation: () => void;
  locationSummary: string | null;

  // Datas
  selectedDateRange: DateRange | undefined;
  onDateRangeSelect: (range: DateRange | undefined) => void;
  dateSummary: string;

  // Modalidade
  selectedModalities: string[];
  onToggleModality: (id: string) => void;

  // Preço
  priceRange: [number, number];
  onPriceChange: (range: [number, number]) => void;
  priceSummary: string;

  // Ações
  onSearch: () => void;
  onClearAll: () => void;
}

export function MobileFiltersSheet({
  open,
  onClose,
  facets,
  facetsLoading,
  selectedStateApi,
  onSelectLocation,
  onClearLocation,
  locationSummary,
  selectedDateRange,
  onDateRangeSelect,
  dateSummary,
  selectedModalities,
  onToggleModality,
  priceRange,
  onPriceChange,
  priceSummary,
  onSearch,
  onClearAll,
}: MobileFiltersSheetProps) {
  const [mounted, setMounted] = useState(false);
  const [expanded, setExpanded] = useState<SectionKey | null>(null);
  const dragControls = useDragControls();
  const startDrag = useCallback(
    (event: React.PointerEvent) => dragControls.start(event),
    [dragControls],
  );

  useEffect(() => setMounted(true), []);

  // Trava o scroll do body enquanto o sheet está aberto (evita "scroll atrás").
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const toggleSection = useCallback(
    (key: SectionKey) => setExpanded((cur) => (cur === key ? null : key)),
    [],
  );

  const handleSearch = useCallback(() => {
    onSearch();
    onClose();
  }, [onSearch, onClose]);

  const allModalities = modalitiesColumns.flat();

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="mobile-filters-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="md:hidden fixed inset-0 bg-black/50 z-[60]"
          onClick={onClose}
        />
      )}
      {open && (
        <motion.div
          key="mobile-filters-panel"
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "tween", duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
          drag="y"
          dragControls={dragControls}
          dragListener={false}
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 0.6 }}
          dragMomentum={false}
          onDragEnd={(_, info) => {
            if (info.offset.y > 120 || info.velocity.y > 600) onClose();
          }}
          className="md:hidden fixed bottom-0 left-0 right-0 z-[61] bg-gray-1 rounded-t-2xl max-h-[90dvh] flex flex-col overflow-hidden shadow-2xl"
          role="dialog"
          aria-modal="true"
          aria-label="Filtros de busca"
        >
          {/* Grabber + header (área de arrasto pra fechar) */}
          <div
            onPointerDown={startDrag}
            className="shrink-0 pt-3 px-4 pb-3 border-b border-gray-6 cursor-grab active:cursor-grabbing touch-none select-none"
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-gray-6" />
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-manrope font-bold text-lg leading-[1.1] text-gray-12">
                Filtros
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 text-sm font-semibold text-gray-11 font-family-dm-sans hover:text-gray-12 active:scale-95 transition"
              >
                Fechar
              </button>
            </div>
          </div>

          {/* Corpo rolável — min-h-0 é obrigatório p/ o overflow no flex-col. */}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] px-4 py-4 flex flex-col gap-4">
            {/* Local */}
            <FilterCard
              icon={<LocationIcon className="size-6 shrink-0" />}
              title="Local"
              summary={locationSummary ?? "Selecione um local"}
              open={expanded === "local"}
              onToggle={() => toggleSection("local")}
              borderBelowHeader
            >
              <LocationCascadePicker
                facets={facets}
                isLoading={facetsLoading}
                selectedStateApi={selectedStateApi}
                onSelect={onSelectLocation}
                onClear={onClearLocation}
                close={() => toggleSection("local")}
              />
            </FilterCard>

            {/* Datas */}
            <FilterCard
              icon={<CalendarIcon className="size-6 shrink-0" />}
              title="Datas"
              summary={dateSummary}
              open={expanded === "datas"}
              onToggle={() => toggleSection("datas")}
              borderBelowHeader
            >
              <div className="p-4 flex justify-center">
                <DateRangePicker
                  onSelect={onDateRangeSelect}
                  value={selectedDateRange}
                  className="**:text-sm!"
                />
              </div>
            </FilterCard>

            {/* Modalidade */}
            <FilterCard
              icon={<SneakersIcon className="size-6 shrink-0" />}
              title="Modalidade"
              summary={
                selectedModalities.length > 0
                  ? `${selectedModalities.length} selecionada${selectedModalities.length > 1 ? "s" : ""}`
                  : "Qual modalidade?"
              }
              open={expanded === "modalidade"}
              onToggle={() => toggleSection("modalidade")}
              borderBelowHeader
            >
              <div className="p-4 max-h-[400px] overflow-y-auto">
                <div className="grid grid-cols-1 gap-2 pb-10">
                  {allModalities.map((modality) => (
                    <button
                      key={modality.id}
                      type="button"
                      onClick={() => onToggleModality(modality.id)}
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
            </FilterCard>

            {/* Preço */}
            <FilterCard
              icon={<MoneyIcon className="size-6 shrink-0" />}
              title="Preço"
              summary={priceSummary}
              open={expanded === "preco"}
              onToggle={() => toggleSection("preco")}
            >
              <div className="p-4">
                <PriceRangeSlider
                  min={0}
                  max={1000}
                  defaultValue={priceRange}
                  onChange={onPriceChange}
                />
              </div>
            </FilterCard>
          </div>

          {/* Rodapé */}
          <div className="shrink-0 border-t border-gray-6 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={onClearAll}
              className="font-semibold text-base text-gray-12 font-family-dm-sans active:scale-95 transition"
            >
              Limpar tudo
            </button>
            <Button onClick={handleSearch} className="w-[140px] h-11">
              Buscar
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

/** Card de filtro colapsável (cabeçalho com ícone/título/resumo + conteúdo). */
function FilterCard({
  icon,
  title,
  summary,
  open,
  onToggle,
  borderBelowHeader = false,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  summary: string;
  open: boolean;
  onToggle: () => void;
  borderBelowHeader?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-gray-2 border border-gray-6 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className={`w-full flex items-center gap-2 px-4 py-2 ${
          open && borderBelowHeader ? "border-b border-gray-6" : ""
        }`}
      >
        {icon}
        <div className="flex-1 text-left min-w-0">
          <h2 className="font-bold text-sm text-gray-12 font-family-dm-sans">{title}</h2>
          <p className="font-normal text-xs text-gray-11 font-family-dm-sans truncate">
            {summary}
          </p>
        </div>
        {open ? (
          <Minus className="size-6 text-gray-12 shrink-0" />
        ) : (
          <Plus className="size-6 text-gray-12 shrink-0" />
        )}
      </button>
      {open && children}
    </div>
  );
}
