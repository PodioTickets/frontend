"use client";

import { useState, useMemo, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ArrowButton } from "../ArrowButton";

const ITEMS_PER_PAGE = 4;

export interface BestSellingVariationItem {
  productName: string;
  variationName: string;
  /** UUID do produto (API topProductVariations) */
  productId?: string;
  /** UUID da variação ou undefined se "Sem variação" (API topProductVariations) */
  variationId?: string | null;
  id?: string;
  /** Quantidade vendida (para o drawer; API: quantitySold) */
  quantity?: number;
  /** Receita total em centavos (para o drawer; opcional, API pode não enviar) */
  totalCents?: number;
  /** % das vendas (API) */
  percentage?: number;
  /** Estoque restante (API) */
  remainingStock?: number;
  /** Estoque total (API) */
  totalStock?: number;
}

function stockStatusFromRemaining(
  remaining: number,
  total: number,
): "Normal" | "Atenção" | "Crítico" {
  if (total <= 0 || !Number.isFinite(remaining)) return "Normal";
  const ratio = remaining / total;
  if (ratio <= 0.1) return "Crítico";
  if (ratio <= 0.25) return "Atenção";
  return "Normal";
}

function getStatusColor(status: string) {
  if (status === "Crítico") return "bg-red-11";
  if (status === "Atenção") return "bg-yellow-11";
  return "bg-gray-11";
}

function VariationsPaginationBar({
  page,
  totalPages,
  onPageChange,
  compact,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  compact?: boolean;
}) {
  if (totalPages <= 1) return null;
  const btnClass =
    "size-8 rounded-lg border border-gray-6 bg-gray-1 hover:bg-gray-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-gray-1 flex items-center justify-center transition-colors";
  const textClass = compact
    ? "font-family-dm-sans text-xs text-gray-11 tabular-nums"
    : "font-family-dm-sans text-sm text-gray-11 tabular-nums";
  return (
    <div className="flex items-center justify-center gap-3 px-4 py-3 border-t border-gray-6">
      <button
        type="button"
        className={btnClass}
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        aria-label="Página anterior"
      >
        <ChevronLeft className="size-4 text-gray-11" />
      </button>
      <span className={textClass}>
        {page} / {totalPages}
      </span>
      <button
        type="button"
        className={btnClass}
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        aria-label="Próxima página"
      >
        <ChevronRight className="size-4 text-gray-11" />
      </button>
    </div>
  );
}

interface BestSellingVariationsProps {
  items: BestSellingVariationItem[];
  onItemClick?: (item: BestSellingVariationItem) => void;
  /** Mesmo estilo compacto da paginação de "Lotes próximos de esgotamento" no mobile */
  paginationCompact?: boolean;
}

export function BestSellingVariations({
  items,
  onItemClick,
  paginationCompact = false,
}: BestSellingVariationsProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / ITEMS_PER_PAGE));
  const sliceStart = (currentPage - 1) * ITEMS_PER_PAGE;
  const displayItems = useMemo(
    () => items.slice(sliceStart, sliceStart + ITEMS_PER_PAGE),
    [items, sliceStart],
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [items]);

  useEffect(() => {
    setCurrentPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [totalPages]);

  return (
    <div className="bg-gray-1 border border-gray-6 rounded-xl overflow-hidden flex flex-col w-full h-full">
      <div className="px-4 py-3 md:py-5 border-b border-gray-6 shrink-0">
        <p className="font-family-dm-sans font-normal text-base md:text-[16px] md:leading-[1.3] text-gray-11">
          Produtos mais vendidos
        </p>
      </div>
      <div className="flex-1 min-h-0 flex flex-col">
        {items.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <p className="font-family-dm-sans font-normal text-sm text-gray-11">
              Nenhuma variação encontrada
            </p>
          </div>
        ) : (
          <>
            {displayItems.map((item, index) => {
              const key = item.id ?? `${sliceStart + index}-${item.productId}-${item.variationName}`;
              return (
                <div
                  key={key}
                  role="button"
                  tabIndex={0}
                  className="px-4 py-3 md:py-2 border-b border-gray-6 last:border-b-0 cursor-pointer hover:bg-gray-2/60 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-8 focus-visible:ring-inset"
                  onClick={() => onItemClick?.(item)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onItemClick?.(item);
                    }
                  }}
                >
                  <div className="flex items-center justify-between gap-2 py-2">
                    <div className="flex items-center gap-2">
                      <p className="px-2 flex items-center justify-center bg-gray-4 rounded text-gray-12 font-semibold text-sm">{currentPage === 1 ? index + 1 : (sliceStart + index + 1)} <span className="text-xl">º</span></p>
                      <p className="font-family-dm-sans font-semibold text-sm md:text-[16px] md:leading-[1.2] text-gray-12 truncate">
                        {item.productName}
                      </p>
                    </div>
                    <ArrowButton isOpen={false} />
                  </div>
                </div>
              );
            })}
            <VariationsPaginationBar
              page={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              compact={paginationCompact}
            />
          </>
        )}
      </div>
    </div>
  );
}
