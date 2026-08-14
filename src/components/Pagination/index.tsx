"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/utils/cn";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
  className?: string;
  /**
   * Total de registros (não de páginas). Quando informado, exibe
   * "Exibindo {N} de {total} registros" ao lado dos controles (à esquerda no
   * desktop, empilhado no mobile). Ausente = só os controles, centralizados
   * (comportamento anterior — retrocompatível).
   */
  totalItems?: number;
  /**
   * Itens por página (o `limit`/`ITEMS_PER_PAGE` da lista). Usado para calcular
   * quantos registros a página ATUAL exibe ("Exibindo {N} de {total}"). Ausente →
   * cai para "Exibindo {total} registros" (sem o "N de").
   */
  pageSize?: number;
  /**
   * Rótulo do total (default: "registro"/"registros"). Ex.: "inscrições",
   * "eventos". Aceita string única (usada no singular e plural).
   */
  totalItemsLabel?: string;
}

function getPageRange(current: number, total: number): (number | "...")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | "...")[] = [1];
  const rangeStart = Math.max(2, current - 1);
  const rangeEnd = Math.min(total - 1, current + 1);

  if (rangeStart > 2) pages.push("...");
  for (let i = rangeStart; i <= rangeEnd; i++) pages.push(i);
  if (rangeEnd < total - 1) pages.push("...");
  pages.push(total);

  return pages;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  disabled,
  className,
  totalItems,
  pageSize,
  totalItemsLabel,
}: PaginationProps) {
  const pages = getPageRange(currentPage, totalPages);
  const showCount = typeof totalItems === "number";
  const countLabel =
    totalItemsLabel ?? (totalItems === 1 ? "registro" : "registros");
  // Quantidade exibida na página ATUAL (paginação uniforme: página cheia, exceto
  // a última). Sem `pageSize` não dá pra saber → mostra só o total.
  const shownOnPage =
    showCount && typeof pageSize === "number" && pageSize > 0
      ? Math.max(
          0,
          Math.min(currentPage * pageSize, totalItems!) -
            (currentPage - 1) * pageSize,
        )
      : null;

  return (
    <div
      className={cn(
        "flex flex-col-reverse items-center gap-2 w-full py-2 sm:flex-row",
        showCount ? "sm:justify-between" : "sm:justify-center",
        className
      )}
    >
      {showCount && (
        <p className="shrink-0 text-sm text-gray-11 font-family-dm-sans whitespace-nowrap">
          {shownOnPage != null
            ? `Exibindo ${shownOnPage.toLocaleString("pt-BR")} de ${totalItems!.toLocaleString("pt-BR")} ${countLabel}`
            : `Exibindo ${totalItems!.toLocaleString("pt-BR")} ${countLabel}`}
        </p>
      )}

      {/* Controles — mantêm o scroll horizontal sem barra em telas estreitas. */}
      <div
        className="flex items-center justify-center gap-2 min-w-0 max-w-full overflow-x-auto [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={disabled || currentPage <= 1}
          className="size-8 shrink-0 rounded-lg border border-gray-6 bg-gray-4/80 hover:bg-gray-4 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
          aria-label="Página anterior"
        >
          <ChevronLeft className="size-4 text-gray-12" />
        </button>

        {pages.map((page, i) =>
          page === "..." ? (
            <span
              key={`ellipsis-${i}`}
              className="size-8 shrink-0 flex items-center justify-center text-sm text-gray-11 font-family-dm-sans"
            >
              …
            </span>
          ) : (
            <button
              key={page}
              type="button"
              onClick={() => onPageChange(page)}
              disabled={disabled}
              className={cn(
                "size-8 shrink-0 rounded-lg border text-sm font-medium font-family-dm-sans transition-colors",
                currentPage === page
                  ? "bg-primary-11 text-gray-1 border-primary-11"
                  : "bg-gray-4 text-gray-12 border-transparent hover:bg-gray-5"
              )}
            >
              {page}
            </button>
          )
        )}

        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={disabled || currentPage >= totalPages}
          className="size-8 shrink-0 rounded-lg border border-gray-6 bg-gray-4/80 hover:bg-gray-4 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
          aria-label="Próxima página"
        >
          <ChevronRight className="size-4 text-gray-12" />
        </button>
      </div>
    </div>
  );
}
