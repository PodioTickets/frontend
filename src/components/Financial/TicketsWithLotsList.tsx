"use client";

import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { ArrowButton } from "@/components/ArrowButton";
import { Tooltip } from "@/components/Tooltip";
import { TicketIcon } from "@/components/Icons/TicketIcon";
import { cn } from "@/utils/cn";
import type {
  FinancialTicket,
  FinancialTicketBatch,
} from "@/services/organizer/OrganizerService";
// createdAt/lotCreatedAt são INSTANTES reais → BRT (America/Sao_Paulo).
import { formatDateBRT } from "@/utils/datetimeBR";

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

// ── Derivações de exibição a partir do shape cru do backend ──────────────────
// O backend já entrega `quantitySold` agregado e os lotes (centavos). Estas
// funções puras calculam o que a tabela mostra — sem etapa de formatação prévia.

const batchSold = (batch: FinancialTicketBatch) => batch.quantitySold ?? 0;
const batchGrossCents = (batch: FinancialTicketBatch) =>
  batchSold(batch) * (batch.price || 0);

/** Categoria do ingresso; ingressos avulsos não têm categoria. */
const ticketSubtitle = (ticket: FinancialTicket) =>
  ticket.category?.name || "Ingresso avulso";

/** Total vendido: usa o agregado do backend, com fallback à soma dos lotes. */
const ticketSold = (ticket: FinancialTicket) =>
  ticket.quantitySold ?? ticket.batches.reduce((sum, b) => sum + batchSold(b), 0);

/** Receita bruta do ingresso = soma de `vendidos × preço` por lote (centavos). */
const ticketGrossCents = (ticket: FinancialTicket) =>
  ticket.batches.reduce((sum, b) => sum + batchGrossCents(b), 0);

/**
 * Receita LÍQUIDA do ingresso (centavos) — o que a coluna "Receita líquida"
 * exibe. Prioriza `organizerNet` (líquido do organizador no período, já calculado
 * pelo backend em `/dashboard/rankings`). Onde ele não vem (ex.: `/events/:id/
 * financial`), cai na receita bruta dos lotes.
 */
const ticketNetCents = (ticket: FinancialTicket) =>
  ticket.organizerNet ?? ticketGrossCents(ticket);

/**
 * Receita líquida POR LOTE (centavos), na mesma métrica do total do ingresso.
 * O backend não fornece líquido por lote, então quando há `organizerNet` ele é
 * rateado proporcionalmente à receita bruta de cada lote — e o último lote
 * absorve o arredondamento para que a soma feche exatamente com `organizerNet`.
 * Sem `organizerNet`, retorna a receita bruta de cada lote.
 */
const lotNetCents = (ticket: FinancialTicket): number[] => {
  const grosses = ticket.batches.map(batchGrossCents);
  const net = ticket.organizerNet;
  if (net == null) return grosses;

  const totalGross = grosses.reduce((sum, g) => sum + g, 0);
  // Sem base bruta para ratear (ex.: 100% cortesia): concentra tudo no 1º lote.
  if (totalGross <= 0)
    return grosses.map((_, i) => (i === 0 ? net : 0));

  let allocated = 0;
  return grosses.map((gross, i) => {
    if (i === grosses.length - 1) return net - allocated; // remanescente
    const share = Math.round((net * gross) / totalGross);
    allocated += share;
    return share;
  });
};

export function TicketsWithLotsList({
  tickets,
  expandedRows,
  onToggleRow,
  page,
  totalPages,
  onPageChange,
  mobileTitle = "Ingressos de lotes",
}: TicketsWithLotsListProps) {
  console.log(tickets)
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
            const hasLots = item.batches.length > 0;
            const revenueLabel = `R$ ${formatBRL(ticketNetCents(item))}`;
            const subtitleLabel = ticketSubtitle(item);
            const soldLabel = ticketSold(item);
            const lotNets = lotNetCents(item);

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
                          {soldLabel} vendidos
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
                    item.batches.map((lot, lotIndex) => {
                      const lotSold = batchSold(lot);
                      const lotRevenueLabel = `R$ ${formatBRL(lotNets[lotIndex])}`;
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
                        {soldLabel} vendidos
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
              Ingresso
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
            const hasLots = item.batches.length > 0;
            const subtitleLabel = ticketSubtitle(item);
            const lotNets = lotNetCents(item);
            return (
              <div key={item.id} className="w-full">
                <div
                  className={cn(
                    "border-b border-gray-6 flex items-center justify-between w-full h-[56px] hover:bg-gray-2 transition-colors",
                    isExpanded && hasLots ? "bg-blue-3" : "bg-gray-1",
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
                        <Tooltip
                          contentClassName="w-auto px-3 py-2 gap-0"
                          position="topRight"
                          content={
                            <p className="font-inter font-normal text-xs text-gray-11 leading-[1.3] whitespace-nowrap">
                              {subtitleLabel}
                            </p>
                          }
                        >
                          <p className="font-inter font-normal leading-[1.3] text-sm text-gray-11 truncate">
                            {subtitleLabel}
                          </p>
                        </Tooltip>
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
                      {ticketSold(item)}
                    </p>
                  </div>

                  <div className="flex flex-1 h-full items-center min-h-px min-w-px px-4 py-3">
                    <div className="flex items-center gap-1">
                      <span className="font-inter font-semibold leading-[1.3] text-sm text-gray-12">
                        R$
                      </span>
                      <span className="font-inter font-semibold leading-[1.3] text-sm text-gray-12">
                        {formatBRL(ticketNetCents(item))}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-1 h-full items-center min-h-px min-w-px px-4 py-3">
                    <p className="font-inter font-semibold leading-[1.3] text-sm text-gray-12">
                      {formatDateBRT(item.createdAt)}
                    </p>
                  </div>
                </div>

                {isExpanded &&
                  item.batches.map((lot, lotIndex) => {
                    const lotSold = batchSold(lot);
                    const lotRevenueLabel = formatBRL(lotNets[lotIndex]);
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
                              {lotRevenueLabel}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-1 h-full items-center min-h-px min-w-px px-4 py-3">
                          <p className="font-inter font-semibold leading-[1.3] text-sm text-gray-12">
                            {formatDateBRT(lotCreatedAt)}
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
