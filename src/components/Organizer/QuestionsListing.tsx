"use client";

import { useState, useMemo, useEffect } from "react";
import { ArrowButton } from "../ArrowButton";
import { Pagination } from "@/components/Pagination";

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
            {showPagination && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                variant="card-footer"
                className="shrink-0"
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
