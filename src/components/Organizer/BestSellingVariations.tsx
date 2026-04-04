"use client";

import { useState, useMemo, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

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
          Variações mais vendidas de cada produto
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
              const total =
                item.totalStock != null && item.totalStock > 0
                  ? item.totalStock
                  : null;
              const qtySold = item.quantity ?? 0;
              const remaining =
                item.remainingStock != null
                  ? item.remainingStock
                  : total != null
                    ? Math.max(0, total - qtySold)
                    : null;
              const sold =
                total != null && remaining != null
                  ? Math.max(0, total - remaining)
                  : qtySold;
              const hasStockBar = total != null && total > 0;
              const percentage =
                hasStockBar && total > 0 ? (sold / total) * 100 : 0;
              const status =
                hasStockBar && remaining != null
                  ? stockStatusFromRemaining(remaining, total)
                  : "Normal";
              const statusColor = getStatusColor(status);

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
                  <div className="flex items-start justify-between gap-2 mb-2 md:mb-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-family-dm-sans font-semibold text-sm md:text-[16px] md:leading-[1.2] text-gray-12 truncate">
                        {item.variationName?.trim() || "Sem variação"}
                      </p>
                      <p className="font-family-dm-sans font-normal text-xs md:text-[14px] text-gray-11 truncate mt-0.5">
                        {item.productName}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 px-2 py-0.5 md:py-1 rounded text-xs md:text-[14px] font-family-dm-sans text-gray-1 ${statusColor}`}
                    >
                      {status}
                    </span>
                  </div>
                  {hasStockBar ? (
                    <>
                      <div className="mb-2">
                        <div className="relative h-2 md:h-3 bg-gray-6 rounded-full overflow-hidden">
                          <div
                            className={`absolute left-0 top-0 h-full rounded-full ${statusColor}`}
                            style={{ width: `${Math.min(100, percentage)}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm md:text-[14px] text-gray-11">
                        <div>
                          <span className="font-family-dm-sans font-normal leading-[1.3]">
                            Restantes:{" "}
                          </span>
                          <span className="font-family-dm-sans font-semibold leading-[1.3] text-gray-12">
                            {(remaining ?? 0).toLocaleString("pt-BR")}
                          </span>
                        </div>
                        <div>
                          <span className="font-family-dm-sans font-normal leading-[1.3]">
                            Total:{" "}
                          </span>
                          <span className="font-family-dm-sans font-semibold leading-[1.3] text-gray-12">
                            {total.toLocaleString("pt-BR")}
                          </span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between text-sm md:text-[14px] text-gray-11">
                      <span>
                        Vendidos:{" "}
                        <span className="font-semibold text-gray-12">
                          {(item.quantity ?? 0).toLocaleString("pt-BR")}
                        </span>
                      </span>
                    </div>
                  )}
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
