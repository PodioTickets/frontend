"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/utils/cn";

/**
 * `default`      — barra centralizada, para listas/cards e views mobile.
 * `table-footer` — rodapé de tabela desktop: alinhado à direita, com a borda
 *                  superior que separa da última linha (o card já tem a borda
 *                  externa, então aqui só entra o divisor).
 * `card-footer`  — rodapé de card do dashboard: centralizado, mesmo divisor,
 *                  com o respiro menor que os cards usam.
 * `compact`      — só `‹ 2 / 5 ›`, sem os botões numerados. Para os cards do
 *                  dashboard e o seletor de organização da auditoria, onde a
 *                  lista é estreita e uma fileira de números estoura a largura.
 *                  O tamanho da fonte vem do container (`text-sm` por padrão),
 *                  então `className="text-xs"` reduz o rótulo junto.
 */
type PaginationVariant =
  | "default"
  | "table-footer"
  | "card-footer"
  | "compact";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
  className?: string;
  variant?: PaginationVariant;
  /**
   * @deprecated Aceito por compatibilidade com os chamadores, mas não renderiza
   * mais nada. A contagem "Exibindo {N} de {total}" foi removida de todas as
   * telas (a lista de inscritos mantém contagem inline própria em RegistrationsView).
   */
  totalItems?: number;
  /** @deprecated Sem efeito — ver `totalItems`. */
  pageSize?: number;
  /** @deprecated Sem efeito — ver `totalItems`. */
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
  variant = "default",
}: PaginationProps) {
  // Uma única página (ou nenhuma) não tem o que paginar: o controle some.
  // A regra vive aqui, e não em cada chamador, para que nenhuma tela nova
  // esqueça o `totalPages > 1` e acabe renderizando uma barra inútil.
  if (!Number.isFinite(totalPages) || totalPages <= 1) return null;

  const goPrev = () => onPageChange(Math.max(1, currentPage - 1));
  const goNext = () => onPageChange(Math.min(totalPages, currentPage + 1));

  if (variant === "compact") {
    const navBtn =
      "size-8 shrink-0 rounded-lg border border-gray-6 bg-gray-1 hover:bg-gray-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-gray-1 flex items-center justify-center transition-colors";
    return (
      <div
        className={cn(
          "flex w-full items-center justify-center gap-3 border-t border-gray-6 px-4 py-3 text-sm",
          className
        )}
      >
        <button
          type="button"
          className={navBtn}
          disabled={disabled || currentPage <= 1}
          onClick={goPrev}
          aria-label="Página anterior"
        >
          <ChevronLeft className="size-4 text-gray-11" />
        </button>
        {/* Sem `text-*` aqui de propósito: o tamanho vem do container, então o
            chamador reduz o rótulo junto com `className="text-xs"`. */}
        <span className="font-family-dm-sans text-gray-11 tabular-nums">
          {currentPage} / {totalPages}
        </span>
        <button
          type="button"
          className={navBtn}
          disabled={disabled || currentPage >= totalPages}
          onClick={goNext}
          aria-label="Próxima página"
        >
          <ChevronRight className="size-4 text-gray-11" />
        </button>
      </div>
    );
  }

  // `totalItems`/`pageSize`/`totalItemsLabel` continuam na interface por
  // compatibilidade com os chamadores, mas NÃO são mais renderizados: o texto
  // "Exibindo N de X" foi removido de todas as telas (exceto a lista de
  // inscritos, que tem contagem inline própria em RegistrationsView).
  const pages = getPageRange(currentPage, totalPages);

  return (
    <div
      className={cn(
        "flex items-center gap-2 w-full",
        variant === "table-footer" &&
          "justify-end border-t border-gray-6 px-4 py-5",
        variant === "card-footer" &&
          "justify-center border-t border-gray-6 px-4 py-3",
        variant === "default" && "justify-center py-2",
        className
      )}
    >
      {/* Controles — mantêm o scroll horizontal sem barra em telas estreitas. */}
      <div
        className="flex items-center justify-center gap-2 min-w-0 max-w-full overflow-x-auto [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        <button
          type="button"
          onClick={goPrev}
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
          onClick={goNext}
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
