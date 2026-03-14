"use client";

import { useState, useMemo, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ArrowButton } from "../ArrowButton";

const ITEMS_PER_PAGE = 5;

export interface QuestionListingItem {
  id: string;
  question: string;
  answerSummary: string;
}

interface QuestionsListingProps {
  items: QuestionListingItem[];
  onItemClick?: (item: QuestionListingItem) => void;
}

export function QuestionsListing({ items, onItemClick }: QuestionsListingProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);
  const displayItems = useMemo(
    () => items.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE),
    [items, currentPage]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [items.length]);

  const showPagination = items.length > ITEMS_PER_PAGE;

  return (
    <div className="bg-gray-1 border border-gray-6 rounded-xl overflow-hidden flex flex-col w-full">
      <div className="px-4 py-5 shrink-0">
        <p className="font-family-dm-sans font-normal text-base leading-[1.3] text-gray-11">
          Listagem de perguntas
        </p>
      </div>
      <div className="bg-gray-2 border-t border-gray-6 flex flex-col overflow-auto">
        {items.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <p className="font-family-dm-sans font-normal text-sm text-gray-11">
              Nenhuma pergunta cadastrada
            </p>
          </div>
        ) : (
          <>
            {displayItems.map((item) => (
              <div
                key={item.id}
                className="bg-gray-1 border-b border-gray-6 last:border-b-0 flex h-[52px] items-center justify-between pt-4 pb-3 px-4 cursor-pointer hover:bg-gray-3 transition-colors"
                onClick={() => onItemClick?.(item)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onItemClick?.(item);
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <div className="min-w-0 flex-1 pr-4">
                  <p className="font-manrope font-semibold text-base leading-[1.1] text-gray-12 truncate">
                    {item.question}
                  </p>
                </div>
                <div className="flex flex-1 min-w-0 items-center justify-end gap-1">
                  <p className="font-family-dm-sans font-normal text-sm leading-[1.3] text-gray-11 truncate text-right">
                    {item.answerSummary}
                  </p>
                  <div className="shrink-0 flex items-center justify-center">
                    <ArrowButton isOpen={false} />
                  </div>
                </div>
              </div>
            ))}
            {showPagination && totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 py-3 px-4 border-t border-gray-6 shrink-0">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="size-8 flex items-center justify-center rounded-lg border border-gray-6 hover:bg-gray-3 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Página anterior"
                >
                  <ChevronLeft className="size-4" />
                </button>
                {Array.from({ length: Math.min(totalPages, 8) }, (_, i) => {
                  const pageNum = i + 1;
                  const isActive = pageNum === currentPage;
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setCurrentPage(pageNum)}
                      className={`size-8 flex items-center justify-center rounded-lg text-sm font-family-dm-sans font-medium transition-colors ${isActive ? "bg-primary-11 border-primary-11 text-primary-2 border" : "border border-gray-6 bg-gray-1 text-gray-12 hover:bg-gray-3"}`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="size-8 flex items-center justify-center rounded-lg border border-gray-6 hover:bg-gray-3 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Próxima página"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
