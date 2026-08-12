"use client";

import { useEffect, useState } from "react";
import { Search, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/utils/cn";
import { Button } from "@/components/Button";
import { Dropdown } from "@/components/Dropdown";
import type { DropdownOption } from "@/components/Dropdown";
import { NotificationDetailsDrawer } from "@/components/Organizer/NotificationDetailsDrawer";
import {
  CHANNEL_META,
  STATUS_META,
  type EventNotificationRow,
  type NotificationChannel,
  type NotificationRowStatus,
} from "@/components/Organizer/eventNotificationConstants";
import { organizerService } from "@/services";
import type { EventNotificationsPagination } from "@/services";
import toast from "react-hot-toast";
import { formatDateBRT, formatTimeBRT } from "@/utils/datetimeBR";

export type {
  EventNotificationRow,
  NotificationChannel,
  NotificationRowStatus,
} from "@/components/Organizer/eventNotificationConstants";

const ITEMS_PER_PAGE = 8;

const STATUS_FILTER_OPTIONS: DropdownOption[] = [
  { id: "all", label: "Status: Todos" },
  { id: "review", label: STATUS_META.review.label },
  { id: "sent", label: STATUS_META.sent.label },
  { id: "denied", label: STATUS_META.denied.label },
];

function formatDateParts(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: "—", time: "—" };
  // occurredAt é INSTANTE real (envio/ocorrência) → fuso de Brasília (BRT),
  // não UTC; senão a hora aparece +3h.
  const date = formatDateBRT(iso, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const time = formatTimeBRT(iso, {
    hour: "2-digit",
    minute: "2-digit",
  });
  return { date, time };
}

function formatOccurredAtLine(iso: string) {
  const { date, time } = formatDateParts(iso);
  return `${date} • ${time}`;
}

function NotificationChannelBadges({
  channels,
  justify = "center",
}: {
  channels: NotificationChannel[];
  justify?: "center" | "start";
}) {
  if (channels.length === 0) {
    return (
      <span className="text-xs text-gray-11 font-family-dm-sans">—</span>
    );
  }
  return (
    <div
      className={cn(
        "flex flex-wrap gap-1.5",
        justify === "center" && "items-center justify-center",
        justify === "start" && "items-center justify-start"
      )}
    >
      {channels.map((ch) => {
        const meta = CHANNEL_META[ch];
        if (!meta) {
          return (
            <span
              key={ch}
              className="inline-flex rounded-md border border-gray-6 px-2 py-1 text-xs text-gray-12 font-family-dm-sans"
            >
              {ch}
            </span>
          );
        }
        const { label, Icon } = meta;
        return (
          <span
            key={ch}
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-3 px-2 py-1 text-xs font-medium text-blue-12 font-family-dm-sans"
          >
            <Icon className="size-4 shrink-0 text-blue-11" />
            {label}
          </span>
        );
      })}
    </div>
  );
}

function NotificationsPagination({
  totalPages,
  safePage,
  onPageChange,
  className,
}: {
  totalPages: number;
  safePage: number;
  onPageChange: (page: number) => void;
  className?: string;
}) {
  if (totalPages <= 1) return null;
  return (
    <div
      className={cn(
        "flex items-center gap-2 min-w-0 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden",
        className
      )}
      style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
    >
      <button
        type="button"
        onClick={() => onPageChange(Math.max(1, safePage - 1))}
        disabled={safePage <= 1}
        className="size-8 shrink-0 rounded-lg border border-gray-6 bg-gray-4/80 hover:bg-gray-4 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
        aria-label="Página anterior"
      >
        <ChevronLeft className="size-4 text-gray-12" />
      </button>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onPageChange(p)}
          className={cn(
            "size-8 shrink-0 rounded-lg border text-sm font-medium font-family-dm-sans transition-colors",
            safePage === p
              ? "bg-primary-11 text-gray-1 border-primary-11"
              : "bg-gray-4 text-gray-12 border-transparent hover:bg-gray-5"
          )}
        >
          {p}
        </button>
      ))}
      <button
        type="button"
        onClick={() => onPageChange(Math.min(totalPages, safePage + 1))}
        disabled={safePage >= totalPages}
        className="size-8 shrink-0 rounded-lg border border-gray-6 bg-gray-4/80 hover:bg-gray-4 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
        aria-label="Próxima página"
      >
        <ChevronRight className="size-4 text-gray-12" />
      </button>
    </div>
  );
}

export function EventNotificationsPanel({
  eventId,
  eventName,
  refreshKey = 0,
}: {
  eventId: string;
  eventName?: string;
  /** Incrementar após criar notificação para recarregar a lista. */
  refreshKey?: number;
}) {
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailNotificationId, setDetailNotificationId] = useState<
    string | null
  >(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | NotificationRowStatus>(
    "all"
  );
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<EventNotificationRow[]>([]);
  const [pagination, setPagination] = useState<EventNotificationsPagination>({
    page: 1,
    limit: ITEMS_PER_PAGE,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, refreshKey]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setForbidden(false);
      try {
        const status =
          statusFilter === "all" ? undefined : statusFilter;
        const { items: nextItems, pagination: p } =
          await organizerService.getEventNotifications(eventId, {
            page,
            limit: ITEMS_PER_PAGE,
            q: debouncedSearch || undefined,
            status,
          });
        if (cancelled) return;
        setItems(nextItems as EventNotificationRow[]);
        setPagination(p);
      } catch (e: any) {
        if (cancelled) return;
        if (e?.response?.status === 403) {
          setForbidden(true);
          setItems([]);
          setPagination({
            page: 1,
            limit: ITEMS_PER_PAGE,
            total: 0,
            totalPages: 1,
          });
        } else if (e?.response?.status === 429) {
          toast.error(
            e?.response?.data?.message ||
              "Muitas requisições. Aguarde um momento e tente de novo."
          );
          setItems([]);
        } else {
          toast.error(
            e?.response?.data?.message ||
              e?.message ||
              "Erro ao carregar notificações."
          );
          setItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    eventId,
    page,
    debouncedSearch,
    statusFilter,
    refreshKey,
  ]);

  const totalPages = pagination.totalPages;
  const safePage = Math.min(page, totalPages);

  useEffect(() => {
    setPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  const inputShell =
    "h-12 w-full rounded-lg border border-gray-6 bg-gray-1 px-3 text-sm text-gray-12 placeholder:text-gray-11 font-family-dm-sans outline-none focus-visible:border-gray-4 focus-visible:ring-[3px] focus-visible:ring-gray-4/50 ";

  const countLabel =
    pagination.total === 1
      ? "1 Registro encontrado"
      : `${pagination.total} Registros encontrados`;

  if (forbidden) {
    return (
      <div className="rounded-xl border border-gray-6 bg-gray-1 p-10 text-center ">
        <p className="text-gray-11 font-family-dm-sans text-sm max-w-md mx-auto leading-relaxed">
          Você não tem permissão para{" "}
          <strong className="text-gray-12">notificar inscritos</strong> deste
          evento. Peça ao administrador da organização o acesso adequado.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="rounded-xl border border-gray-6 bg-gray-1 p-3 md:p-4  mb-4 md:mb-5">
        <h2 className="text-base font-bold text-gray-12 font-manrope leading-[1.1] mb-3 md:hidden">
          Lista de mensagens
        </h2>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-stretch">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-11 pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por título..."
              className={cn(inputShell, "pl-11 text-base md:text-sm")}
              aria-label="Buscar por título"
            />
          </div>
          <div className="relative w-full lg:w-[188px] shrink-0 h-12">
            <Dropdown
              width="w-full"
              position="bottom"
              align="start"
              dataAttribute="notif-status-filter"
              options={STATUS_FILTER_OPTIONS}
              onSelect={(opt) => {
                const id = opt.id;
                if (id === "all") setStatusFilter("all");
                else if (
                  id === "review" ||
                  id === "sent" ||
                  id === "denied"
                ) {
                  setStatusFilter(id);
                }
              }}
              trigger={(isOpen) => (
                <div
                  className={cn(
                    inputShell,
                    "flex h-12 items-center justify-between gap-2 pr-3 select-none text-base md:text-sm"
                  )}
                  aria-label="Filtrar por status"
                  aria-expanded={isOpen}
                >
                  <span className="truncate text-left flex-1 min-w-0 font-family-dm-sans">
                    {statusFilter === "all"
                      ? "Status: Todos"
                      : STATUS_META[statusFilter].label}
                  </span>
                  <ChevronRight
                    className={cn(
                      "size-4 text-gray-11 shrink-0 transition-transform duration-200 md:hidden",
                      isOpen && "rotate-90"
                    )}
                    aria-hidden
                  />
                  <ChevronDown
                    className={cn(
                      "size-4 text-gray-11 shrink-0 transition-transform duration-200 hidden md:block",
                      isOpen && "rotate-180"
                    )}
                    aria-hidden
                  />
                </div>
              )}
            />
          </div>
        </div>
      </div>

      <p className="hidden md:block text-sm text-gray-11 font-medium font-family-dm-sans mb-3">
        {loading ? "Carregando…" : countLabel}
      </p>

      {/* Mobile: cards (Figma 3025:56070) */}
      <div className="md:hidden flex flex-col gap-3">
        {loading ? (
          <div className="rounded-xl border border-gray-6 bg-gray-1 py-14 text-center text-sm text-gray-11 font-family-dm-sans ">
            Carregando registros…
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-gray-6 bg-gray-1 py-14 text-center text-sm text-gray-11 font-family-dm-sans  px-4">
            {debouncedSearch || statusFilter !== "all"
              ? "Nenhuma notificação encontrada com os filtros atuais."
              : "Nenhuma notificação cadastrada."}
          </div>
        ) : (
          items.map((row) => {
            const st = STATUS_META[row.status];
            return (
              <div
                key={row.id}
                className="rounded-xl border border-gray-6 bg-gray-1 p-4 "
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-gray-11 font-family-dm-sans leading-[1.3]">
                      Título:
                    </p>
                    <p className="text-base font-bold text-gray-12 font-family-dm-sans leading-[1.3] wrap-break-word">
                      {row.title}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 inline-flex rounded-md px-2.5 py-1 text-xs font-semibold font-family-dm-sans",
                      st.className
                    )}
                  >
                    {st.label}
                  </span>
                </div>
                <NotificationChannelBadges
                  channels={row.channels}
                  justify="start"
                />
                <div className="mt-3 rounded-lg bg-gray-3 px-3 py-2.5 text-center">
                  <span className="text-sm text-gray-11 font-family-dm-sans">
                    {formatOccurredAtLine(row.occurredAt)}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-3 h-11 w-full border-gray-6 text-gray-12 font-semibold font-family-dm-sans"
                  onClick={() => {
                    setDetailNotificationId(row.id);
                    setDetailOpen(true);
                  }}
                >
                  Detalhes
                </Button>
              </div>
            );
          })
        )}
      </div>

      <NotificationsPagination
        totalPages={totalPages}
        safePage={safePage}
        onPageChange={setPage}
        className="md:hidden justify-center w-full max-w-full px-0 py-4"
      />

      <div className="hidden md:block rounded-xl border border-gray-6 bg-gray-1 overflow-hidden ">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="bg-gray-3 border-b border-gray-6">
                <th className="text-left py-3.5 px-4 text-xs font-semibold text-gray-11 font-family-dm-sans uppercase tracking-wide w-[140px]">
                  Data / Hora
                </th>
                <th className="text-left py-3.5 px-4 text-xs font-semibold text-gray-11 font-family-dm-sans uppercase tracking-wide min-w-[200px]">
                  Título da mensagem
                </th>
                <th className="text-center py-3.5 px-4 text-xs font-semibold text-gray-11 font-family-dm-sans uppercase tracking-wide w-[220px]">
                  Canais
                </th>
                <th className="text-center py-3.5 px-4 text-xs font-semibold text-gray-11 font-family-dm-sans uppercase tracking-wide w-[140px]">
                  Status
                </th>
                <th className="text-right py-3.5 px-4 text-xs font-semibold text-gray-11 font-family-dm-sans uppercase tracking-wide w-[120px]">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-6">
              {loading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="py-16 text-center text-sm text-gray-11 font-family-dm-sans"
                  >
                    Carregando registros…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="py-16 text-center text-sm text-gray-11 font-family-dm-sans"
                  >
                    {debouncedSearch || statusFilter !== "all"
                      ? "Nenhuma notificação encontrada com os filtros atuais."
                      : "Nenhuma notificação cadastrada."}
                  </td>
                </tr>
              ) : (
                items.map((row, idx) => {
                  const { date, time } = formatDateParts(row.occurredAt);
                  const st = STATUS_META[row.status];
                  return (
                    <tr
                      key={row.id}
                      className={cn(
                        "transition-colors hover:bg-gray-2/60",
                        idx % 2 === 1 ? "bg-gray-2/35" : "bg-gray-1"
                      )}
                    >
                      <td className="py-3.5 px-4 align-top">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-semibold text-gray-12 font-family-dm-sans">
                            {date}
                          </span>
                          <span className="text-xs text-gray-11 font-family-dm-sans">
                            {time}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 align-middle">
                        <span className="text-sm font-semibold text-gray-12 font-family-dm-sans">
                          {row.title}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 align-middle">
                        <NotificationChannelBadges channels={row.channels} />
                      </td>
                      <td className="py-3.5 px-4 align-middle text-center">
                        <span
                          className={cn(
                            "inline-flex rounded-md px-3 py-1 text-xs font-semibold font-family-dm-sans",
                            st.className
                          )}
                        >
                          {st.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 align-middle text-right">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-10 px-3 border-gray-6 text-gray-12 font-family-dm-sans"
                          onClick={() => {
                            setDetailNotificationId(row.id);
                            setDetailOpen(true);
                          }}
                        >
                          Detalhes
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <NotificationsPagination
          totalPages={totalPages}
          safePage={safePage}
          onPageChange={setPage}
          className="justify-end px-4 py-5 border-t border-gray-6"
        />
      </div>

      <NotificationDetailsDrawer
        open={detailOpen}
        onOpenChange={(o) => {
          setDetailOpen(o);
          if (!o) setDetailNotificationId(null);
        }}
        eventId={eventId}
        eventName={eventName}
        notificationId={detailNotificationId}
      />
    </div>
  );
}
