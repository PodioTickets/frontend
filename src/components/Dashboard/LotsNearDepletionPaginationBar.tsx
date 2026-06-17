import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Barra de paginação compacta usada nas listas do dashboard (lotes perto de
 * esgotar, etc.). Compartilhada entre admin e organizer.
 */
export function LotsNearDepletionPaginationBar({
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
