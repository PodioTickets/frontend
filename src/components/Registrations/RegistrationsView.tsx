"use client";

import type { Dispatch, ReactNode, SetStateAction } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search, Users, CheckCircle, XCircle, UserPlus } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Dropdown } from "@/components/Dropdown";
import { DateRangePicker } from "@/components/DateRangePicker";
import { ArrowButton } from "@/components/ArrowButton";
import { Tooltip } from "@/components/Tooltip";
import { Loading } from "@/components/Loading";
import { CalendarIcon } from "@/components/Icons/CalendarIcon";
import { TicketIcon } from "@/components/Icons/TicketIcon";
import { SelectTicketsFilterModal } from "@/components/Registrations/SelectTicketsFilterModal";
import { getAvatarUrl } from "@/utils/avatar";
import { formatDateBRT, formatTimeBRT, toCivilDayString } from "@/utils/datetimeBR";
import type { Event } from "@/interfaces/event";
import type { RegistrationStats } from "@/services/organizer/OrganizerService";
import {
  getFinalStatus,
  isVoucherRegistration,
  type RegistrationListRow,
  type RegistrationStatusBadge,
} from "@/lib/registrations";
import { formatShortId } from "@/utils/shortId";
import { RegistrationsStatsCards } from "./RegistrationsStatsCards";
import { RegistrationRow } from "./RegistrationRow";
import { Pagination } from "@/components/Pagination";

/**
 * Corpo COMPLETO da página de inscrições, compartilhado entre admin e organizer.
 * Layout canônico = organizer (decisão do usuário: divergências visuais seguem o
 * organizer). O único ponto que difere entre as duas superfícies é o cabeçalho,
 * injetado via slot `header`. Toda a lógica/estado fica na página e é passada
 * por props (componente puramente apresentacional, testável isoladamente).
 */

type RegistrationsPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

interface ModalTarget {
  registrationId: string;
  eventId: string;
  eventName?: string;
}

interface ExportTarget {
  registrations: RegistrationListRow[];
  eventId: string;
  eventName?: string;
  filters: {
    search?: string;
    status?: string;
    ticketIds?: string[];
    startDate?: string;
    endDate?: string;
  };
}

export interface RegistrationsViewProps {
  header: ReactNode;
  /**
   * Quando presente, exibe o botão "Adicionar inscrito" à direita do título
   * (desktop) e nas ações do mobile — leva ao wizard de inscrição de cortesia.
   * A página decide a visibilidade (permissão `edit_event`); ausente = escondido.
   */
  addRegistrantHref?: string;
  event: (Pick<Event, "id" | "name"> & { slug?: string }) | null;
  eventId: string;
  registrations: RegistrationListRow[];
  stats: RegistrationStats;
  pagination: RegistrationsPagination;
  setPagination: Dispatch<SetStateAction<RegistrationsPagination>>;
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  selectedTicketIds: string[];
  setSelectedTicketIds: (v: string[]) => void;
  isTicketModalOpen: boolean;
  setIsTicketModalOpen: (v: boolean) => void;
  dateRange: DateRange | undefined;
  setDateRange: (v: DateRange | undefined) => void;
  appliedDateRange: DateRange | undefined;
  setAppliedDateRange: (v: DateRange | undefined) => void;
  mobileFiltersOpen: boolean;
  setMobileFiltersOpen: Dispatch<SetStateAction<boolean>>;
  loadingList: boolean;
  hasActiveFilters: boolean;
  handleClearFilters: () => void;
  getStatusBadge: (status: string) => RegistrationStatusBadge;
  openViewRegistrationModal: (args: ModalTarget) => void;
  openPaymentDetailsModal: (args: ModalTarget) => void;
  openExportDataModal: (args: ExportTarget) => void;
}

export function RegistrationsView({
  header,
  addRegistrantHref,
  event,
  eventId,
  registrations,
  stats,
  pagination,
  setPagination,
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  selectedTicketIds,
  setSelectedTicketIds,
  isTicketModalOpen,
  setIsTicketModalOpen,
  dateRange,
  setDateRange,
  appliedDateRange,
  setAppliedDateRange,
  mobileFiltersOpen,
  setMobileFiltersOpen,
  loadingList,
  hasActiveFilters,
  handleClearFilters,
  getStatusBadge,
  openViewRegistrationModal,
  openPaymentDetailsModal,
  openExportDataModal,
}: RegistrationsViewProps) {
  // Registros exibidos na página ATUAL (página cheia, exceto a última).
  const registrosShown = Math.max(
    0,
    Math.min(pagination.page * pagination.limit, pagination.total) -
      (pagination.page - 1) * pagination.limit
  );
  return (
    <div className="min-h-screen bg-gray-2">
      {header}

      <div className="max-w-7xl mx-auto px-4 lg:px-6 2xl:px-0 pb-8 md:pb-10">
        {/* Page Title - Desktop only */}
        <div className="mb-6 hidden md:flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-12 mb-2">Inscrições</h1>
            <p className="text-gray-11">
              Acompanhe todas as inscrições do evento e gerencie pedidos, pagamentos e status.
            </p>
          </div>
          {addRegistrantHref && (
            <Button asChild variant={"outline"} className="h-11 border-gray-6 text-gray-12 shrink-0 gap-2 font-manrope font-bold">
              <Link href={addRegistrantHref}>
                Adicionar inscrito
              </Link>
            </Button>
          )}
        </div>

        {/* Mobile: botão "Adicionar inscrito" (full-width, quando permitido) */}
        {addRegistrantHref && (
          <div className="md:hidden mt-4">
            <Button variant={"outline"} asChild className="h-11 border-gray-6 text-gray-12 w-full gap-2 font-manrope font-bold">
              <Link href={addRegistrantHref}>
                Adicionar inscrito
              </Link>
            </Button>
          </div>
        )}

        {/* Mobile: Search + Limpar + Filtros row */}
        <div className="md:hidden flex flex-col gap-2 items-center my-4">
          <div className="flex-1 w-full min-w-[140px] border border-gray-6 rounded-lg h-10 flex items-center gap-2 px-3 bg-gray-1">
            <Search className="size-5 text-gray-11 shrink-0" />
            <input
              type="text"
              placeholder="Nome, Documento, cupom, pagamento.."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 min-w-0 h-10 bg-transparent font-family-dm-sans font-normal text-sm text-gray-12 placeholder:text-gray-11 outline-none"
            />
          </div>
          <div className="flex items-center justify-between gap-2 w-full">
            <button
              type="button"
              onClick={() => setMobileFiltersOpen((v) => !v)}
              className="flex w-max items-center gap-2 px-3 rounded-lg border border-gray-6 bg-gray-1 text-gray-11 font-family-dm-sans font-normal text-sm h-10"
            >
              Filtros
              <ArrowButton isOpen={mobileFiltersOpen} />
            </button>
            <Button
              type="button"
              variant="outline"
              disabled={!hasActiveFilters}
              onClick={handleClearFilters}
              className="h-10 px-3 text-sm border-gray-6 text-gray-12 disabled:opacity-50 flex-1"
            >
              Limpar filtros
            </Button>

          </div>
        </div>

        {/* Mobile: Filters panel (when open) */}
        {mobileFiltersOpen && (
          <div className="md:hidden flex flex-col gap-2 mb-4 p-3 bg-gray-1 rounded-lg border border-gray-6">
            <Dropdown
              dataAttribute="status-filter-mobile"
              width="w-full"
              maxHeight="max-h-[300px]"
              align="start"
              options={[
                { id: "all", label: "Todos" },
                { id: "COMPLETED", label: "Pago", icon: CheckCircle },
                { id: "CANCELLED", label: "Cancelado", icon: XCircle },
                { id: "CHARGEBACK", label: "ChargeBack", icon: XCircle },
                { id: "REFUNDED", label: "Estornado", icon: XCircle },
              ]}
              selectedIds={statusFilter !== "all" ? [statusFilter] : []}
              onSelect={(option) => {
                setStatusFilter(option.id || "all");
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              trigger={() => {
                const statusLabels: Record<string, string> = {
                  all: "Todos",
                  COMPLETED: "Pago",
                  CANCELLED: "Cancelado",
                  CHARGEBACK: "ChargeBack",
                  REFUNDED: "Estornado",
                };
                return (
                  <div className="flex items-center justify-between px-3 py-2 rounded-lg border border-gray-6 bg-gray-2 text-gray-12 text-sm w-full">
                    <span>Status: {statusLabels[statusFilter] ?? "Todos"}</span>
                    <ArrowButton isOpen={false} />
                  </div>
                );
              }}
            />
            <button
              type="button"
              onClick={() => setIsTicketModalOpen(true)}
              className="flex items-center justify-between px-3 py-2 rounded-lg border border-gray-6 bg-gray-2 text-gray-12 text-sm"
            >
              <span>{selectedTicketIds.length === 0 ? "Ingressos: Todos" : `${selectedTicketIds.length} selecionado(s)`}</span>
              <ArrowButton isOpen={false} />
            </button>
            <Dropdown
              width="w-max"
              align="start"
              trigger={() => {
                const fmt = !dateRange?.from ? "Data: Recentes" : dateRange.from && dateRange.to && dateRange.from.getTime() !== dateRange.to.getTime()
                  ? `Data: ${dateRange.from.getDate()}/${dateRange.from.getMonth() + 1} - ${dateRange.to.getDate()}/${dateRange.to.getMonth() + 1}`
                  : `Data: ${dateRange.from.getDate()}/${dateRange.from.getMonth() + 1}`;
                return (
                  <div className="flex items-center justify-between px-3 py-2 rounded-lg border border-gray-6 bg-gray-2 text-gray-12 text-sm">
                    <span>{fmt}</span>
                    <ArrowButton isOpen={false} />
                  </div>
                );
              }}
            >
              <DateRangePicker
                allowPastDates
                onSelect={(range) => {
                  setDateRange(range);
                  // Aplica em DIA ÚNICO (só `from` → [from, from]) ou INTERVALO; limpo → remove.
                  setAppliedDateRange(
                    range?.from ? (range.to ? range : { from: range.from, to: range.from }) : undefined,
                  );
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                value={dateRange}
              />
            </Dropdown>
          </div>
        )}

        {/* Search and Filters - Desktop */}
        <div className="hidden md:flex mb-6 flex-col sm:flex-row gap-4 items-center p-4 bg-gray-1 rounded-lg border border-gray-6 flex-wrap">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-11" />
            <Input
              type="text"
              placeholder="Nome, Documento, ID, cupom e voucher"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-[46px]"
            />
          </div>

          {/* Status Filter */}
          <Dropdown
            dataAttribute="status-filter"
            width="w-auto"
            maxHeight="max-h-[300px]"
            className="top-full mt-2"
            align="start"
            options={[
              { id: "all", label: "Todos" },
              { id: "COMPLETED", label: "Pago", icon: CheckCircle },
              { id: "CANCELLED", label: "Cancelado", icon: XCircle },
              { id: "CHARGEBACK", label: "ChargeBack", icon: XCircle },
              { id: "REFUNDED", label: "Estornado", icon: XCircle },
            ]}
            selectedIds={statusFilter !== "all" ? [statusFilter] : []}
            onSelect={(option) => {
              setStatusFilter(option.id || "all");
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            trigger={() => {
              const getStatusLabel = () => {
                const statusMap: Record<string, string> = {
                  all: "Status: Todos",
                  PENDING: "Status: Pendente",
                  CONFIRMED: "Status: Pago",
                  CANCELLED: "Status: Cancelado",
                  COMPLETED: "Status: Pago",
                  CHARGEBACK: "Status: ChargeBack",
                  REFUNDED: "Status: Estornado",
                };
                return statusMap[statusFilter] || "Status: Todos";
              };

              return (
                <div className="flex items-center gap-2 px-4 py-3 rounded-lg border border-gray-6 bg-gray-1 text-gray-12 hover:bg-gray-3 transition-colors cursor-pointer min-w-[140px]">
                  <span className="text-sm flex-1 text-left">{getStatusLabel()}</span>
                  <ArrowButton />
                </div>
              );
            }}
          />

          {/* Ticket Filter */}
          <button
            onClick={() => setIsTicketModalOpen(true)}
            name="select-tickets"
            aria-label="Selecionar ingressos"
            title="Selecionar ingressos"
            className="flex items-center gap-2 px-4 py-3 rounded-lg border border-gray-6 bg-gray-1 text-gray-12 hover:bg-gray-3 transition-colors cursor-pointer min-w-[140px]"
          >
            <TicketIcon className="size-4 shrink-0" />
            <span className="text-sm flex-1 text-left">
              {selectedTicketIds.length === 0
                ? "Selecionar ingresso"
                : `${selectedTicketIds.length} ingresso${selectedTicketIds.length > 1 ? "s" : ""} selecionado${selectedTicketIds.length > 1 ? "s" : ""}`}
            </span>
            <ArrowButton />
          </button>

          {/* Date Filter */}
          <Dropdown
            dataAttribute="date-range"
            width="w-auto"
            maxHeight="max-h-[500px]"
            className="top-full mt-2 right-0"
            align="end"
            trigger={() => {
              const formatDateRange = () => {
                if (!dateRange?.from) {
                  return "Data: Recentes";
                }

                const formatDate = (date: Date) => {
                  return new Intl.DateTimeFormat("pt-BR", {
                    day: "2-digit",
                    month: "short",
                  }).format(date);
                };

                // Só mostra intervalo quando são duas datas diferentes (range completo)
                if (dateRange.from && dateRange.to && dateRange.from.getTime() !== dateRange.to.getTime()) {
                  return `Data: ${formatDate(dateRange.from)} - ${formatDate(dateRange.to)}`;
                }

                return `Data: ${formatDate(dateRange.from)}`;
              };

              return (
                <div className="flex items-center gap-2 px-4 py-3 rounded-lg border border-gray-6 bg-gray-1 text-gray-12 hover:bg-gray-3 transition-colors cursor-pointer min-w-[140px]">
                  <CalendarIcon className="size-4 shrink-0" />
                  <span className="text-sm flex-1 text-left">{formatDateRange()}</span>
                  <ArrowButton />
                </div>
              );
            }}
          >
            <DateRangePicker
              allowPastDates
              onSelect={(range) => {
                setDateRange(range);
                // Aplica em DIA ÚNICO (só `from` → [from, from]) ou INTERVALO; limpo → remove.
                setAppliedDateRange(
                  range?.from ? (range.to ? range : { from: range.from, to: range.from }) : undefined,
                );
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              value={dateRange}
            />
          </Dropdown>

          <Button
            type="button"
            variant="outline"
            disabled={!hasActiveFilters}
            onClick={handleClearFilters}
            className="h-[46px] shrink-0 border-gray-6 text-gray-12 disabled:opacity-50 px-4"
          >
            Limpar filtros
          </Button>
        </div>

        {/* Registrations List */}
        <div className="relative">
          {loadingList && registrations.length > 0 && (
            <div className="absolute inset-0 bg-gray-2/80 z-10 flex items-center justify-center rounded-lg min-h-[200px]">
              <Loading />
            </div>
          )}
          {registrations.length === 0 && !loadingList ? (
            <div className="bg-gray-1 rounded-lg p-12 border border-gray-6 text-center">
              <Users className="size-12 text-gray-11 mx-auto mb-4" />
              <p className="text-gray-11 mb-4">
                {hasActiveFilters
                  ? "Nenhuma inscrição encontrada"
                  : "Nenhuma inscrição ainda"}
              </p>
            </div>
          ) : registrations.length === 0 && loadingList ? (
            <div className="bg-gray-1 rounded-lg p-12 border border-gray-6 text-center min-h-[200px] flex items-center justify-center">
              <Loading />
            </div>
          ) : (
            <>
              {/* Mobile: Lista de inscrições + cards */}
              <div className="md:hidden flex flex-col gap-4">
                <h2 className="font-manrope font-bold text-xl text-gray-12">Lista de inscrições</h2>
                <div className="flex flex-col gap-3">
                  {registrations.map((registration) => {
                    const finalStatus = getFinalStatus(registration);
                    const paymentStatus = registration.order?.payment?.status;
                    const isCancelled = finalStatus === "CANCELLED" || paymentStatus === "FAILED";
                    const isRefunded = finalStatus === "REFUNDED";
                    const isChargeback = finalStatus === "CHARGEBACK";
                    // "Pago" só sem estado terminal — senão free order cancelado
                    // (pagamento R$0 segue PAID) apareceria como "Pago". Ver RegistrationRow.
                    const isPaid =
                      !isCancelled &&
                      !isRefunded &&
                      !isChargeback &&
                      (finalStatus === "CONFIRMED" ||
                        finalStatus === "COMPLETED" ||
                        paymentStatus === "PAID");
                    // "Voucher" só substitui o "Pago"/grátis (cortesia do painel ou
                    // voucher totalmente grátis) — gate por isPaid mantém a precedência.
                    const isVoucher = isPaid && isVoucherRegistration(registration);
                    // Cortesia (criada pelo organizador) não tem pedido real → sem "Ver pedido".
                    const isCourtesy = registration.order?.isCourtesy === true;
                    const statusLabel = isVoucher ? "Voucher" : isPaid ? "Pago" : isCancelled ? "Cancelado" : isRefunded ? "Estornado" : isChargeback ? "ChargeBack" : "Pendente";
                    const statusClass = isVoucher ? "bg-[#21835d] text-primary-1" : isPaid ? "bg-[#21835d] text-primary-1" : isCancelled || isRefunded || isChargeback ? "bg-red-11 text-white" : "bg-yellow-11 text-yellow-1";
                    const fullName = `${registration.user?.firstName || ""} ${registration.user?.lastName || ""}`.trim();
                    const createdDate = registration.createdAt ? new Date(registration.createdAt) : null;
                    // registration.createdAt é INSTANTE real → BRT (America/Sao_Paulo).
                    const timeStr = createdDate ? formatTimeBRT(registration.createdAt, { hour: "2-digit", minute: "2-digit" }) + "H" : "—";
                    const dateStr = createdDate ? formatDateBRT(registration.createdAt, { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";
                    const price = registration?.order?.finalAmount != null ? (registration?.order?.finalAmount / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0,00";
                    return (
                      <div key={registration.id} className="bg-gray-1 border border-gray-6 rounded-lg">
                        <div className="flex flex-col gap-5 px-3 py-4">
                          <div className="flex items-center justify-between">
                            <div className="flex gap-2 items-center min-w-0 flex-1">
                              {registration.user?.avatarUrl ? (
                                <Image src={getAvatarUrl(registration.user.avatarUrl ?? "") as string} alt={fullName} width={36} height={36} className="size-9 rounded-full object-cover shrink-0" />
                              ) : (
                                <div className="size-9 rounded-full bg-primary-10/20 flex items-center justify-center shrink-0">
                                  <span className="text-primary-11 font-semibold text-sm">{(fullName || "U").charAt(0).toUpperCase()}</span>
                                </div>
                              )}
                              <div className="flex flex-col gap-1 min-w-0 flex-1">
                                {/* Tooltip envolvendo o nome — `block min-w-0 max-w-full`
                                    sobrescreve o `inline-block` default do Tooltip pra que
                                    o `truncate` corte quando o nome estourar a largura. */}
                                <Tooltip
                                  position="topRight"
                                  trigger="hover"
                                  content={<p className="font-family-dm-sans font-normal text-sm leading-[1.3] text-gray-12 text-left break-all">{fullName || "—"}</p>}
                                  contentClassName="max-w-[min(320px,calc(100vw-2rem))] w-max min-w-0 px-3 py-2 gap-0 !items-stretch"
                                  className="block min-w-0 max-w-full"
                                >
                                  <p className="font-family-dm-sans font-medium text-base text-gray-12 truncate cursor-help">{fullName || ""}</p>
                                </Tooltip>
                                <div className="flex items-center gap-2">
                                  <span className="font-family-dm-sans font-normal text-sm text-gray-11">{timeStr}</span>
                                  <span className="size-1 rounded-full bg-gray-11 shrink-0" />
                                  <span className="font-family-dm-sans font-normal text-sm text-gray-11">{dateStr}</span>
                                </div>
                              </div>
                            </div>
                            <span className={`shrink-0 px-3 py-2 rounded text-xs font-family-dm-sans font-normal ${statusClass}`}>{statusLabel}</span>
                          </div>
                          <div className="flex flex-col gap-2">
                            <p className="font-family-dm-sans font-normal text-xs text-gray-11">{registration.ticket?.category?.name || "Ingresso avulso"}</p>
                            <p className="font-manrope font-semibold text-base text-gray-12">{registration.ticket?.name || "—"}</p>
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="font-manrope font-extrabold text-xl text-gray-12">R$ {price}</p>
                            {/* ID com 3 pontos no meio (`#xxxxxx...xxxx`) + tooltip
                                mostrando ID completo — padrão dos drawers financeiros.
                                `topLeft` alinha pela direita do trigger (tooltip estende
                                pra ESQUERDA) — necessário aqui porque o trigger fica no
                                canto direito do card; `topRight` estouraria a viewport.
                                `usePortal` escapa `overflow-hidden` do card. */}
                            <Tooltip
                              position="topLeft"
                              trigger="hover"
                              usePortal
                              content={<p className="font-family-dm-sans font-normal text-sm leading-[1.3] text-gray-12 text-left break-all">{registration.id}</p>}
                              contentClassName="max-w-[min(320px,calc(100vw-2rem))] w-max min-w-0 px-3 py-2 gap-0 !items-stretch"
                              className="block min-w-0 max-w-full"
                            >
                              <p className="font-family-dm-sans font-medium text-sm text-gray-12 truncate cursor-help">
                                ID inscrição: {formatShortId(registration.id)}
                              </p>
                            </Tooltip>
                          </div>
                        </div>
                        {!isCancelled && (
                          <>
                            <div className="h-px bg-gray-6" />
                            <div className="flex gap-2 p-3">
                              <button
                                type="button"
                                onClick={() => openViewRegistrationModal({ registrationId: registration.id, eventId, eventName: event?.name })}
                                className="flex-1 h-11 flex items-center justify-center rounded-lg border border-gray-6 font-manrope font-bold text-base text-gray-12 hover:bg-gray-3 transition-colors"
                              >
                                Ver ingresso
                              </button>
                              {!isCourtesy && (
                                <button
                                  type="button"
                                  onClick={() => openPaymentDetailsModal({ registrationId: registration.id, eventId, eventName: event?.name })}
                                  className="flex-1 h-11 flex items-center justify-center rounded-lg border border-gray-6 font-manrope font-bold text-base text-gray-12 hover:bg-gray-3 transition-colors"
                                >
                                  Ver pedido
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
                {pagination.totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 flex-wrap">
                    <Pagination
                      currentPage={pagination.page}
                      totalPages={pagination.totalPages}
                      onPageChange={(page) => setPagination((p) => ({ ...p, page }))}
                      className="w-max py-0"
                    />
                    <p className="ml-2 text-xs text-gray-11 font-family-dm-sans whitespace-nowrap">
                      {registrosShown.toLocaleString("pt-BR")} de {pagination.total.toLocaleString("pt-BR")} registros
                    </p>
                  </div>
                )}
                <Button
                  className="w-full h-12 rounded-lg font-manrope font-bold"
                  onClick={() => openExportDataModal({
                    registrations: registrations,
                    eventId,
                    eventName: event?.name,
                    filters: {
                      search: searchTerm || undefined,
                      status: statusFilter !== "all" ? statusFilter : undefined,
                      ticketIds: selectedTicketIds.length > 0 ? selectedTicketIds : undefined,
                      startDate: toCivilDayString(appliedDateRange?.from),
                      endDate: toCivilDayString(appliedDateRange?.to),
                    },
                  })}
                >
                  Exportar dados
                </Button>
              </div>

              {/* Desktop: Table */}
              <div className="hidden md:block bg-gray-2 border border-gray-6 rounded-lg overflow-hidden w-full">
                {/* Header */}
                <div className="bg-gray-4 border-b border-gray-6 flex h-[44px] items-center">
                  <div className="flex h-full items-center p-4 w-[136px]">
                    <p className="font-inter font-medium leading-[1.3] text-sm text-gray-12">
                      ID da inscrição
                    </p>
                  </div>
                  <div className="flex flex-1 h-full items-center min-h-px min-w-px p-4">
                    <p className="font-inter font-medium leading-[1.3] text-sm text-gray-12">
                      Participante
                    </p>
                  </div>
                  <div className="flex flex-1 h-full items-center min-h-px min-w-px p-4">
                    <p className="font-inter font-medium leading-[1.3] text-sm text-gray-12">
                      Ingresso
                    </p>
                  </div>
                  <div className="flex h-full items-center justify-center p-4 w-[140px]">
                    <p className="font-inter font-medium leading-[1.3] text-sm text-gray-12 text-center">
                      Data compra
                    </p>
                  </div>
                  <div className="flex h-full items-center justify-center p-4 w-[120px]">
                    <p className="font-inter font-medium leading-[1.3] text-sm text-gray-12">
                      Status
                    </p>
                  </div>
                  <div className="flex h-full items-center justify-center p-4 w-[112px]">
                    <p className="font-inter font-medium leading-[1.3] text-sm text-gray-12">
                      Ações
                    </p>
                  </div>
                </div>

                {/* Rows */}
                <div className="flex flex-col items-start w-full">
                  {registrations.map((registration) => (
                    <RegistrationRow
                      key={registration.id}
                      registration={registration}
                      getStatusBadge={getStatusBadge}
                      onViewRegistration={() => {
                        openViewRegistrationModal({
                          registrationId: registration.id,
                          eventId,
                          eventName: event?.name,
                        });
                      }}
                      onViewPaymentDetails={() => {
                        openPaymentDetailsModal({
                          registrationId: registration.id,
                          eventId,
                          eventName: event?.name,
                        });
                      }}
                    />
                  ))}
                </div>

                {/* Pagination */}
                {/* A contagem de registros fica ao lado da barra — é a única
                    tela que a mantém, por isso o wrapper próprio em vez do
                    `variant="table-footer"`. */}
                {pagination.totalPages > 1 && (
                  <div className="flex items-center justify-start gap-2 py-4 px-5 border-t border-gray-6">
                    <Pagination
                      currentPage={pagination.page}
                      totalPages={pagination.totalPages}
                      onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
                      className="w-max py-0"
                    />
                    <p className="ml-2 text-xs text-gray-11 font-family-dm-sans whitespace-nowrap">
                      {registrosShown.toLocaleString("pt-BR")} de {pagination.total.toLocaleString("pt-BR")} registros
                    </p>
                  </div>
                )}
              </div>

              {/* Export Button - Desktop only (mobile has full-width button above) */}
              <div className="mt-6 justify-end hidden md:flex">
                <Button
                  onClick={() => {
                    openExportDataModal({
                      registrations: registrations,
                      eventId,
                      eventName: event?.name,
                      filters: {
                        search: searchTerm || undefined,
                        status: statusFilter !== "all" ? statusFilter : undefined,
                        ticketIds: selectedTicketIds.length > 0 ? selectedTicketIds : undefined,
                        startDate: toCivilDayString(appliedDateRange?.from),
                        endDate: toCivilDayString(appliedDateRange?.to),
                      },
                    });
                  }}
                >
                  Exportar dados
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Ticket Selection Modal */}
        <SelectTicketsFilterModal
          isOpen={isTicketModalOpen}
          onClose={() => setIsTicketModalOpen(false)}
          onConfirm={(ticketIds) => {
            setSelectedTicketIds(ticketIds);
            setPagination((prev) => ({ ...prev, page: 1 }));
          }}
          eventId={eventId}
          selectedTicketIds={selectedTicketIds}
        />
      </div>
    </div>
  );
}
