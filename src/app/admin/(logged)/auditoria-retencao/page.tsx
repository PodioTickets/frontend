"use client";

import { useEffect, useState } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Clock,
  Lock,
  LockOpen,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/utils/cn";
import { Button } from "@/components/Button";
import { getApiClient } from "@/services/base/ApiClient";
import { queryKeys } from "@/services/cache/QueryClient";
import toast from "react-hot-toast";
import Image from "next/image";
import { RetencaoReleaseModal } from "@/components/Admin/RetencaoReleaseModal";

// ─── Types ────────────────────────────────────────────────────────────────────

type RetentionStatus = "pending" | "released";

interface RetentionEvent {
  id: string;
  name: string;
  slug: string;
  status: RetentionStatus;
  logoUrl?: string | null;
  eventDate: string;
  retentionRate: number;
  organization: {
    id: string;
    name: string;
    email: string;
    logoUrl?: string | null;
  };
  retainedAmount: number;
  grossRevenue: number;
}

interface RetentionStats {
  pendingCount: number;
  totalPendingVolume: number;
  totalProcessedThisMonth: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface RetentionListResponse {
  data: {
    stats: RetentionStats;
    events: RetentionEvent[];
    pagination: Pagination;
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

function formatDate(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: "—", time: "" };
  const months = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez",
  ];
  return {
    date: `${String(d.getDate()).padStart(2, "0")} ${months[d.getMonth()]}, ${d.getFullYear()}`,
    time: d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
  };
}

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<RetentionStatus, { label: string; bg: string; text: string }> = {
  pending: { label: "Retido", bg: "bg-yellow-11", text: "text-yellow-1" },
  released: { label: "Liberado", bg: "bg-primary-11", text: "text-primary-1" },
};

function StatusBadge({ status }: { status: RetentionStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-2.5 py-1 text-xs font-normal font-family-dm-sans whitespace-nowrap",
        cfg?.bg,
        cfg?.text
      )}
    >
      {cfg?.label}
    </span>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  icon,
  iconBg,
  label,
  value,
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex-1 min-w-[200px] rounded-xl border border-gray-6 bg-gray-1 px-4 py-4 shadow-[0px_2px_6px_0px_rgba(17,17,17,0.08)] flex flex-row items-center justify-between">
      <div className="flex flex-col gap-1 min-w-0">
        <p className="text-xs font-normal text-gray-11 font-family-dm-sans leading-[1.3] truncate">
          {label}
        </p>
        <p className="text-2xl font-extrabold text-gray-12 font-manrope leading-[1.1] truncate">
          {value}
        </p>
      </div>
      <div
        className={cn(
          "size-[28px] rounded-lg flex items-center justify-center shrink-0 ml-4",
          iconBg
        )}
      >
        {icon}
      </div>
    </div>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function PaginationBar({
  totalPages,
  page,
  onPageChange,
  variant,
}: {
  totalPages: number;
  page: number;
  onPageChange: (p: number) => void;
  variant: "desktop" | "mobile";
}) {
  if (totalPages <= 1) return null;
  const safePage = Math.min(page, totalPages);
  const isMobile = variant === "mobile";

  const navBtn = isMobile
    ? "size-8 shrink-0 rounded-lg border border-gray-6 bg-gray-4/80 hover:bg-gray-4 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
    : "size-8 rounded-full border border-gray-6 bg-gray-1 hover:bg-gray-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors";

  const pageBtn = (active: boolean) =>
    cn(
      "size-8 shrink-0 border text-sm font-medium font-family-dm-sans transition-colors",
      isMobile ? "rounded-lg" : "rounded-full",
      active
        ? "bg-primary-11 text-gray-1 border-primary-11"
        : isMobile
          ? "bg-gray-4 text-gray-12 border-transparent hover:bg-gray-5"
          : "bg-gray-1 border-gray-6 text-gray-12 hover:bg-gray-2"
    );

  return (
    <div
      className={cn(
        "flex items-center gap-2",
        isMobile
          ? "justify-center w-full py-4 flex-wrap"
          : "justify-end px-4 py-5 border-t border-gray-6"
      )}
    >
      <button
        type="button"
        onClick={() => onPageChange(Math.max(1, safePage - 1))}
        disabled={safePage <= 1}
        className={navBtn}
        aria-label="Página anterior"
      >
        <ChevronLeft className={cn("size-4", isMobile ? "text-gray-12" : "text-gray-11")} />
      </button>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
        <button key={p} type="button" onClick={() => onPageChange(p)} className={pageBtn(safePage === p)}>
          {p}
        </button>
      ))}
      <button
        type="button"
        onClick={() => onPageChange(Math.min(totalPages, safePage + 1))}
        disabled={safePage >= totalPages}
        className={navBtn}
        aria-label="Próxima página"
      >
        <ChevronRight className={cn("size-4", isMobile ? "text-gray-12" : "text-gray-11")} />
      </button>
    </div>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: "", label: "Todos os status" },
  { value: "pending", label: "Retido" },
  { value: "released", label: "Liberado" },
];

const inputShell =
  "h-12 w-full rounded-lg border border-gray-6 bg-gray-1 px-3 text-sm text-gray-12 placeholder:text-gray-11 font-family-dm-sans outline-none focus-visible:border-gray-4 focus-visible:ring-[3px] focus-visible:ring-gray-4/50 shadow-[0px_2px_6px_0px_rgba(17,17,17,0.08)]";

const ITEMS_PER_PAGE = 20;

// ─── Page ─────────────────────────────────────────────────────────────────────

interface RetentionResult {
  stats: RetentionStats;
  events: RetentionEvent[];
  pagination: Pagination;
}

async function fetchRetentionList(params: {
  page: number;
  search: string;
}): Promise<RetentionResult> {
  const api = getApiClient();
  const qs = new URLSearchParams({
    page: String(params.page),
    limit: String(ITEMS_PER_PAGE),
  });
  if (params.search) qs.set("search", params.search);
  const res = await api.get<RetentionListResponse>(
    `/api/v1/admin/retention?${qs.toString()}`,
  );
  return {
    stats: res.data.data.stats,
    events: res.data.data.events ?? [],
    pagination:
      res.data.data.pagination ?? {
        page: params.page,
        limit: ITEMS_PER_PAGE,
        total: 0,
        totalPages: 1,
      },
  };
}

const EMPTY_STATS: RetentionStats = {
  pendingCount: 0,
  totalPendingVolume: 0,
  totalProcessedThisMonth: 0,
};

export default function AdminAuditoriaRetencaoPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);

  const [modalEvent, setModalEvent] = useState<RetentionEvent | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter]);

  const listKey = queryKeys.admin.retention.list({ page, search: debouncedSearch });
  const listQuery = useQuery({
    queryKey: listKey,
    queryFn: () => fetchRetentionList({ page, search: debouncedSearch }),
    placeholderData: (prev) => prev,
  });

  useEffect(() => {
    if (listQuery.error) {
      const err = listQuery.error as any;
      toast.error(
        err?.response?.data?.message ?? err?.message ?? "Erro ao carregar auditoria.",
      );
    }
  }, [listQuery.error]);

  const stats = listQuery.data?.stats ?? EMPTY_STATS;
  const items = listQuery.data?.events ?? [];
  const pagination =
    listQuery.data?.pagination ?? { page, limit: ITEMS_PER_PAGE, total: 0, totalPages: 1 };
  const loading = listQuery.isLoading;

  const handleReleaseSuccess = (releasedId: string) => {
    queryClient.setQueryData<RetentionResult>(listKey, (old) => {
      if (!old) return old;
      const released = old.events.find((i) => i.id === releasedId);
      return {
        ...old,
        events: old.events.map((item) =>
          item.id === releasedId ? { ...item, status: "released" as const } : item,
        ),
        stats: {
          ...old.stats,
          pendingCount: Math.max(0, old.stats.pendingCount - 1),
          totalProcessedThisMonth:
            old.stats.totalProcessedThisMonth + (released?.retainedAmount ?? 0),
        },
      };
    });
  };

  const visibleItems = statusFilter
    ? items.filter((item) => item.status === statusFilter)
    : items;

  const filtersActive = Boolean(debouncedSearch) || Boolean(statusFilter);

  return (
    <div className="min-h-screen bg-gray-2 pb-10">
      <RetencaoReleaseModal
        isOpen={Boolean(modalEvent)}
        onClose={() => setModalEvent(null)}
        eventId={modalEvent?.id ?? null}
        eventName={modalEvent?.name ?? ""}
        retainedAmount={modalEvent?.retainedAmount ?? 0}
        onSuccess={handleReleaseSuccess}
      />
      <div className="max-w-[1222px] mx-auto w-full">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-gray-12 tracking-tight text-2xl font-extrabold font-manrope leading-[1.1]">
            Auditoria de retenção
          </h1>
          <p className="mt-1 text-gray-11 font-family-dm-sans leading-[1.3] text-sm">
            Gerencie a liberação dos 10% retidos de cada evento.
          </p>
        </div>

        {/* Stat cards */}
        <div className="flex flex-wrap gap-4 mb-6">
          <StatCard
            iconBg="bg-gray-4"
            icon={<Clock className="size-4 text-gray-11" />}
            label="Pendentes"
            value={String(stats.pendingCount)}
          />
          <StatCard
            iconBg="bg-yellow-3"
            icon={<Lock className="size-4 text-yellow-11" />}
            label="Volume pendente"
            value={formatCurrency(stats.totalPendingVolume)}
          />
          <StatCard
            iconBg="bg-[#d6f5e3]"
            icon={<LockOpen className="size-4 text-[#21835d]" />}
            label="Processados este mês"
            value={formatCurrency(stats.totalProcessedThisMonth)}
          />
        </div>

        {/* Filters */}
        <div className="rounded-xl border border-gray-6 bg-gray-1 p-3 md:p-4 shadow-[0px_2px_6px_0px_rgba(17,17,17,0.08)] mb-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch sm:flex-wrap">
            <div className="relative flex-1 min-w-0 sm:min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-11 pointer-events-none" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por evento ou organização…"
                className={cn(inputShell, "pl-11")}
              />
            </div>
            <div className="w-full sm:w-[min(100%,220px)] shrink-0">
              <label className="sr-only">Filtrar por status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={cn(
                  inputShell,
                  "cursor-pointer appearance-none bg-[length:1rem] bg-[right_0.75rem_center] bg-no-repeat pr-10"
                )}
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23737373' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                }}
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value || "all"} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden flex flex-col gap-3">
          {loading ? (
            <div className="rounded-xl border border-gray-6 bg-gray-1 py-14 text-center text-sm text-gray-11 font-family-dm-sans shadow-[0px_2px_6px_0px_rgba(17,17,17,0.08)]">
              Carregando…
            </div>
          ) : visibleItems.length === 0 ? (
            <div className="rounded-xl border border-gray-6 bg-gray-1 py-14 text-center text-sm text-gray-11 font-family-dm-sans shadow-[0px_2px_6px_0px_rgba(17,17,17,0.08)] px-4">
              {filtersActive
                ? "Nenhum resultado com os filtros atuais."
                : "Nenhuma retenção pendente."}
            </div>
          ) : (
            visibleItems.map((row) => {
              const { date, time } = formatDate(row.eventDate);
              const status = row.status;
              return (
                <div
                  key={row.id}
                  className="rounded-xl border border-gray-6 bg-gray-1 p-4 shadow-[0px_2px_6px_0px_rgba(17,17,17,0.08)] flex flex-col gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-lg border border-gray-6 overflow-hidden shrink-0 bg-gray-4 relative">
                      {row.logoUrl ? (
                        <Image src={row.logoUrl} alt={row.name} fill className="object-cover" />
                      ) : (
                        <div className="size-full flex items-center justify-center text-xs font-bold text-gray-11">
                          {row.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-gray-12 font-family-dm-sans line-clamp-2">
                      {row.name}
                    </p>
                  </div>

                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <p className="text-xs text-gray-11 font-family-dm-sans">Data</p>
                      <p className="text-sm font-semibold text-gray-12 font-family-dm-sans whitespace-nowrap">
                        {date}
                        {time && <span className="text-gray-11 font-normal"> {time}</span>}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-11 font-family-dm-sans">Valor retido</p>
                      <p className="text-sm font-semibold text-gray-12 font-family-dm-sans whitespace-nowrap">
                        {formatCurrency(row.retainedAmount)}
                      </p>
                    </div>
                    <StatusBadge status={status} />
                  </div>

                  {status === "pending" && (
                    <Button
                      type="button"
                      variant="outline"
                      className="text-gray-12 border border-gray-6"
                      onClick={() => setModalEvent(row)}
                    >
                      Liberar valor
                    </Button>
                  )}
                </div>
              );
            })
          )}

          {!loading && (
            <PaginationBar
              totalPages={pagination.totalPages}
              page={pagination.page}
              onPageChange={setPage}
              variant="mobile"
            />
          )}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block rounded-xl border border-gray-6 bg-gray-1 overflow-hidden shadow-[0px_2px_6px_0px_rgba(17,17,17,0.08)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="bg-gray-3 border-b border-gray-6">
                  <th className="text-left py-3.5 px-4 text-xs font-semibold text-gray-11 font-family-dm-sans uppercase tracking-wide">
                    Evento
                  </th>
                  <th className="text-center py-3.5 px-4 text-xs font-semibold text-gray-11 font-family-dm-sans uppercase tracking-wide">
                    Data
                  </th>
                  <th className="text-center py-3.5 px-4 text-xs font-semibold text-gray-11 font-family-dm-sans uppercase tracking-wide">
                    Status
                  </th>
                  <th className="text-center py-3.5 px-4 text-xs font-semibold text-gray-11 font-family-dm-sans uppercase tracking-wide">
                    Valor
                  </th>
                  <th className="text-right py-3.5 px-4 text-xs font-semibold text-gray-11 font-family-dm-sans uppercase tracking-wide">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-6">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-16 text-center text-sm text-gray-11 font-family-dm-sans">
                      Carregando…
                    </td>
                  </tr>
                ) : visibleItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-16 text-center text-sm text-gray-11 font-family-dm-sans">
                      {filtersActive
                        ? "Nenhum resultado com os filtros atuais."
                        : "Nenhuma retenção pendente."}
                    </td>
                  </tr>
                ) : (
                  visibleItems.map((row) => {
                    const { date, time } = formatDate(row.eventDate);
                    const status = row.status;
                    return (
                      <tr key={row.id} className="hover:bg-gray-2/80 transition-colors">
                        {/* Order ID → Event */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="size-9 rounded-lg border border-gray-6 overflow-hidden shrink-0 relative bg-gray-4">
                              {row.logoUrl ? (
                                <Image src={row.logoUrl} alt={row.name} fill className="object-cover" />
                              ) : (
                                <div className="size-full flex items-center justify-center text-xs font-bold text-gray-11">
                                  {row.name.slice(0, 2).toUpperCase()}
                                </div>
                              )}
                            </div>
                            <span className="text-sm font-semibold text-gray-12 font-family-dm-sans line-clamp-2 max-w-[220px]">
                              {row.name}
                            </span>
                          </div>
                        </td>

                        {/* Purchase Date → Event date */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-center">
                          <p className="text-sm font-semibold text-gray-12 font-family-dm-sans">
                            {date}
                          </p>
                          {time && (
                            <p className="text-sm text-gray-11 font-family-dm-sans">{time}</p>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 text-center">
                          <StatusBadge status={status} />
                        </td>

                        {/* Amount → retainedAmount */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-center">
                          <span className="text-sm font-semibold text-gray-12 font-family-dm-sans">
                            {formatCurrency(row.retainedAmount)}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          {status === "pending" && (
                            <Button
                              type="button"
                              variant="outline"
                              className="text-gray-12 border border-gray-6"
                              onClick={() => setModalEvent(row)}
                            >
                              Liberar valor
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {!loading && (
            <PaginationBar
              totalPages={pagination.totalPages}
              page={pagination.page}
              onPageChange={setPage}
              variant="desktop"
            />
          )}
        </div>
      </div>
    </div>
  );
}
