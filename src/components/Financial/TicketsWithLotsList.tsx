"use client";

import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { ArrowButton } from "@/components/ArrowButton";
import { Tooltip } from "@/components/Tooltip";
import { TicketIcon } from "@/components/Icons/TicketIcon";
import { cn } from "@/utils/cn";
import type { FinancialTicket } from "@/services/organizer/OrganizerService";

/**
 * Lista compartilhada "Ingressos de lotes" usada nas páginas de financeiro
 * e dashboard (organizer + admin).
 *
 * Mobile: cards expandíveis (cinza minimizado / azul expandido).
 * Desktop: tabela com sub-rows azuis pros lotes.
 *
 * Estado de expansão e paginação ficam no caller — facilita compartilhar entre
 * páginas que podem ter políticas distintas (server-side vs client-side, persist
 * via querystring, etc.). Componente puramente controlado.
 */

interface TicketsWithLotsListProps {
  tickets: FinancialTicket[];
  expandedRows: Set<string>;
  onToggleRow: (id: string) => void;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /** Title da seção mobile — desktop não tem header próprio. */
  mobileTitle?: string;
}

function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  return (
    <div className="flex items-center justify-center gap-2 py-3">
      <button
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page <= 1}
        className="size-8 flex items-center justify-center rounded-lg border border-gray-6 text-gray-12 disabled:opacity-50 hover:bg-gray-3 transition-colors"
      >
        <ChevronLeft className="size-4" />
      </button>
      <div className="flex items-center gap-1">
        {Array.from({ length: Math.min(totalPages, 8) }, (_, i) => {
          const pageNum = i + 1;
          const isActive = pageNum === page;
          return (
            <button
              key={pageNum}
              onClick={() => onChange(pageNum)}
              className={`size-8 flex items-center justify-center border rounded-lg text-sm font-family-dm-sans font-medium transition-colors ${
                isActive
                  ? "bg-primary-11 border-primary-11 text-primary-2"
                  : "border-gray-6 hover:bg-gray-3 text-gray-12 bg-gray-4"
              }`}
            >
              {pageNum}
            </button>
          );
        })}
      </div>
      <button
        onClick={() => onChange(Math.min(totalPages, page + 1))}
        disabled={page >= totalPages}
        className="size-8 flex items-center justify-center rounded-lg border border-gray-6 text-gray-12 disabled:opacity-50 hover:bg-gray-3 transition-colors"
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}

const formatBRL = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export function TicketsWithLotsList({
  tickets,
  expandedRows,
  onToggleRow,
  page,
  totalPages,
  onPageChange,
  mobileTitle = "Ingressos de lotes",
}: TicketsWithLotsListProps) {
  return (
    <>
      {/* ========== MOBILE ========== */}
      <div className="lg:hidden w-full flex flex-col gap-4">
        <h2 className="font-manrope font-bold text-xl leading-[1.1] text-gray-12">
          {mobileTitle}
        </h2>
        <div className="flex flex-col gap-3">
          {tickets.map((item) => {
            const isExpanded = expandedRows.has(item.id);
            const hasLots = !!item.lots && item.lots.length > 0;
            const revenueLabel = `R$ ${formatBRL(item.revenue)}`;
            const subtitleLabel = item.subtitle || "Sem categoria";

            /* Card de CATEGORIA com lotes — cinza minimizado / azul expandido. */
            if (hasLots) {
              return (
                <div
                  key={item.id}
                  className={cn(
                    "overflow-hidden rounded-lg border",
                    isExpanded
                      ? "border-blue-6 bg-blue-2"
                      : "border-gray-6 bg-gray-1",
                  )}
                >
                  <button
                    onClick={() => onToggleRow(item.id)}
                    className={cn(
                      "flex w-full flex-col gap-4 px-3 py-4 text-left transition-colors",
                      isExpanded
                        ? "border-b border-blue-6 bg-blue-3 hover:bg-blue-4/50"
                        : "hover:bg-gray-3/50",
                    )}
                  >
                    <div className="flex w-full flex-col gap-2">
                      <div className="flex items-center justify-between gap-3 min-w-0">
                        <p className="font-family-dm-sans font-medium text-sm leading-[1.3] text-gray-12 truncate min-w-0">
                          {subtitleLabel}
                        </p>
                        <p className="font-family-dm-sans font-medium text-sm leading-[1.3] text-gray-12 whitespace-nowrap shrink-0">
                          {item.sold} vendidos
                        </p>
                      </div>
                      <div className="flex items-center justify-between gap-3 min-w-0">
                        <p className="font-family-dm-sans font-semibold text-sm leading-[1.3] text-gray-12 truncate min-w-0">
                          {item.name}
                        </p>
                        <ChevronDown
                          className={cn(
                            "size-5 shrink-0 text-gray-12 transition-transform",
                            isExpanded ? "rotate-0" : "-rotate-90",
                          )}
                        />
                      </div>
                    </div>
                    <p className="font-manrope font-extrabold text-base leading-[1.1] text-gray-12">
                      {revenueLabel}
                    </p>
                  </button>
                  {isExpanded &&
                    item.lots &&
                    item.lots.map((lot: any, lotIndex: number) => {
                      const lotSold = lot.quantitySold || 0;
                      const lotRevenue = lotSold * (lot.price || 0);
                      const lotRevenueLabel = `R$ ${formatBRL(lotRevenue)}`;
                      return (
                        <div
                          key={`${item.id}-lot-${lot.id}`}
                          className="flex flex-col gap-4 border-b border-blue-6 px-3 py-4 last:border-b-0"
                        >
                          <p className="font-family-dm-sans font-medium text-sm leading-[1.3] text-gray-12">
                            Lote {lotIndex + 1}
                          </p>
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-manrope font-extrabold text-base leading-[1.1] text-gray-12">
                              {lotRevenueLabel}
                            </p>
                            <p className="font-family-dm-sans font-medium text-sm leading-[1.3] text-gray-12 whitespace-nowrap">
                              {lotSold} vendidos
                            </p>
                          </div>
                        </div>
                      );
                    })}
                </div>
              );
            }

            /* Card sem lotes — ícone ticket, layout horizontal. */
            return (
              <div
                key={item.id}
                className="flex flex-col gap-4 rounded-lg border border-gray-6 bg-gray-1 px-3 py-4"
              >
                <div className="flex items-center gap-2">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gray-5">
                    <TicketIcon className="size-5 text-gray-12" />
                  </div>
                  <div className="flex flex-1 min-w-0 flex-col gap-2">
                    <div className="flex items-center justify-between gap-3 min-w-0">
                      <p className="font-family-dm-sans font-medium text-sm leading-[1.3] text-gray-12 truncate min-w-0">
                        {subtitleLabel}
                      </p>
                      <p className="font-family-dm-sans font-medium text-sm leading-[1.3] text-gray-12 whitespace-nowrap shrink-0">
                        {item.sold} vendidos
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-3 min-w-0">
                      <p className="font-family-dm-sans font-semibold text-sm leading-[1.3] text-gray-12 truncate min-w-0">
                        {item.name}
                      </p>
                      <ChevronRight className="size-5 shrink-0 text-gray-12" />
                    </div>
                  </div>
                </div>
                <p className="font-manrope font-extrabold text-base leading-[1.1] text-gray-12">
                  {revenueLabel}
                </p>
              </div>
            );
          })}
        </div>
        <Pagination
          page={page}
          totalPages={totalPages}
          onChange={onPageChange}
        />
      </div>

      {/* ========== DESKTOP ========== */}
      <div className="hidden lg:block bg-gray-2 border border-gray-6 rounded-lg overflow-hidden w-full">
        {/* Header */}
        <div className="bg-gray-4 border-b border-gray-6 flex h-[44px] items-center">
          <div className="flex h-full items-center p-4 w-[289.5px]">
            <p className="font-inter font-medium leading-[1.3] text-sm text-gray-12">
              Ingresso/Lotes
            </p>
          </div>
          <div className="flex flex-1 h-full items-center min-h-px min-w-px p-4">
            <p className="font-inter font-medium leading-[1.3] text-sm text-gray-12">
              Vendidos
            </p>
          </div>
          <div className="flex flex-1 h-full items-center min-h-px min-w-px p-4">
            <p className="font-inter font-medium leading-[1.3] text-sm text-gray-12">
              Receita líquida
            </p>
          </div>
          <div className="flex flex-1 h-full items-center min-h-px min-w-px p-4">
            <p className="font-inter font-medium leading-[1.3] text-sm text-gray-12">
              Criado em
            </p>
          </div>
        </div>

        {/* Rows */}
        <div className="flex flex-col items-start w-full">
          {tickets.map((item) => {
            const isExpanded = expandedRows.has(item.id);
            const isCategory = item.type === "category";
            const hasLots = !!item.lots && item.lots.length > 0;
            return (
              <div key={item.id} className="w-full">
                <div
                  className={cn(
                    "border-b border-gray-6 flex items-center justify-between w-full hover:bg-gray-2 transition-colors",
                    isExpanded && hasLots ? "bg-blue-3" : "bg-gray-1",
                    isCategory ? "h-[56px]" : "h-[48px]",
                  )}
                >
                  <div className="flex h-full items-center px-4 py-3 w-[289.5px]">
                    <div className="flex items-center gap-3">
                      {hasLots && (
                        <button
                          onClick={() => onToggleRow(item.id)}
                          className="flex items-center justify-center cursor-pointer"
                        >
                          <div className="relative size-6">
                            <div
                              className={cn(
                                "absolute inset-0 rounded p-1",
                                isExpanded ? "bg-blue-5" : "bg-gray-4",
                              )}
                            >
                              <div className="size-full rounded-lg flex items-center justify-center p-1">
                                <ArrowButton isOpen={isExpanded} />
                              </div>
                            </div>
                          </div>
                        </button>
                      )}
                      <div className="flex flex-col gap-0 w-[200px]">
                        {item.subtitle && (
                          <Tooltip
                            contentClassName="w-auto px-3 py-2 gap-0"
                            position="topRight"
                            content={
                              <p className="font-inter font-normal text-xs text-gray-11 leading-[1.3] whitespace-nowrap">
                                {item.subtitle}
                              </p>
                            }
                          >
                            <p className="font-inter font-normal leading-[1.3] text-sm text-gray-11 truncate">
                              {item.subtitle}
                            </p>
                          </Tooltip>
                        )}
                        <Tooltip
                          contentClassName="w-auto px-3 py-2 gap-0"
                          position="topRight"
                          content={
                            <p className="font-family-dm-sans text-xs font-semibold text-gray-12 leading-[1.3] whitespace-nowrap">
                              {item.name}
                            </p>
                          }
                        >
                          <p className="overflow-hidden text-ellipsis whitespace-nowrap font-family-dm-sans text-sm font-semibold leading-[1.3] text-gray-12">
                            {item.name}
                          </p>
                        </Tooltip>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-1 h-full items-center min-h-px min-w-px px-4 py-3">
                    <p className="font-inter font-semibold leading-[1.3] text-sm text-gray-12">
                      {item.sold}
                    </p>
                  </div>

                  <div className="flex flex-1 h-full items-center min-h-px min-w-px px-4 py-3">
                    <div className="flex items-center gap-1">
                      <span className="font-inter font-semibold leading-[1.3] text-sm text-gray-12">
                        R$
                      </span>
                      <span className="font-inter font-semibold leading-[1.3] text-sm text-gray-12">
                        {(item.revenue / 100).toFixed(2).replace(".", ",")}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-1 h-full items-center min-h-px min-w-px px-4 py-3">
                    <p className="font-inter font-semibold leading-[1.3] text-sm text-gray-12">
                      {new Date(item.createdAt).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>

                {isExpanded &&
                  hasLots &&
                  item.lots &&
                  item.lots.map((lot: any, lotIndex: number) => {
                    const lotSold = lot.quantitySold || 0;
                    const lotRevenue = (lot.price || 0) * lotSold;
                    const lotCreatedAt = lot.createdAt || item.createdAt;
                    const lotName = `Lote ${lotIndex + 1}`;

                    return (
                      <div
                        key={`${item.id}-lot-${lot.id}`}
                        className="bg-blue-2 border-b border-blue-6 flex items-center justify-between w-full h-[48px] hover:bg-blue-3 transition-colors last:border-b-0"
                      >
                        <div className="flex h-full items-center px-4 py-3 w-[289.5px]">
                          <div className="flex items-center gap-3">
                            <div className="flex flex-col gap-0">
                              <p className="font-inter max-w-[250px] font-semibold leading-[1.3] text-sm text-gray-12 truncate">
                                {lotName}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-1 h-full items-center min-h-px min-w-px px-4 py-3">
                          <p className="font-inter font-semibold leading-[1.3] text-sm text-gray-12">
                            {lotSold}
                          </p>
                        </div>

                        <div className="flex flex-1 h-full items-center min-h-px min-w-px px-4 py-3">
                          <div className="flex items-center gap-1">
                            <span className="font-inter font-semibold leading-[1.3] text-sm text-gray-12">
                              R$
                            </span>
                            <span className="font-inter font-semibold leading-[1.3] text-sm text-gray-12">
                              {(lotRevenue / 100)
                                .toFixed(2)
                                .replace(".", ",")}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-1 h-full items-center min-h-px min-w-px px-4 py-3">
                          <p className="font-inter font-semibold leading-[1.3] text-sm text-gray-12">
                            {new Date(lotCreatedAt).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                      </div>
                    );
                  })}
              </div>
            );
          })}
        </div>
        <div className="px-4">
          <Pagination
            page={page}
            totalPages={totalPages}
            onChange={onPageChange}
          />
        </div>
      </div>
    </>
  );
}
