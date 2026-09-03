"use client";

import { useEffect, useState } from "react";
import { Search, Clock, CircleDollarSign, XCircle, Percent } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/utils/cn";
import { Button } from "@/components/Button";
import { getApiClient } from "@/services/base/ApiClient";
import { queryKeys } from "@/services/cache/QueryClient";
// createdAt/repasse são INSTANTES reais → BRT (America/Sao_Paulo).
import { formatDateBRT, formatTimeBRT } from "@/utils/datetimeBR";
import toast from "react-hot-toast";
import Image from "next/image";
import { Pagination } from "@/components/Pagination";
import {
  WithdrawalDetailsDrawer,
  type WithdrawalItem,
  type WithdrawalStatus,
} from "@/components/Admin/WithdrawalDetailsDrawer";

// ─── Types ────────────────────────────────────────────────────────────────────

interface WithdrawalStats {
  pending: { count: number; totalAmount: number; totalNetAmount: number };
  completed: { count: number; totalAmount: number; totalNetAmount: number };
  cancelled: { count: number; totalAmount: number; totalNetAmount: number };
  fees: { totalCollected: number; avgFeeRate: number; effectiveFeePercent: number };
  overview: { totalEventsWithWithdrawals: number; totalWithdrawals: number; totalGrossRequested: number };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const date = formatDateBRT(iso, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const time = formatTimeBRT(iso, {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${date} • ${time}`;
}

function fullName(item: WithdrawalItem): string {
  return `${item.requestedBy.firstName} ${item.requestedBy.lastName}`.trim();
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  WithdrawalStatus,
  { label: string; bg: string; text: string; }
> = {
  COMPLETED: {
    label: "Concluído",
    bg: "bg-primary-11",
    text: "text-primary-1",
  },
  CANCELLED: {
    label: "Negado",
    bg: "bg-red-11",
    text: "text-red-1",
  },
  PENDING: {
    label: "Pendente",
    bg: "bg-gray-4",
    text: "text-gray-12",
  },
};

function StatusBadge({ status }: { status: WithdrawalStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-2.5 py-1 text-xs font-normal font-family-dm-sans whitespace-nowrap",
        cfg.bg,
        cfg.text
      )}
    >
      {cfg.label}
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
    <div className="flex-1 min-w-[200px] rounded-xl border border-gray-6 bg-gray-1 p-5  flex items-center gap-4">
      <div
        className={cn(
          "size-12 rounded-xl flex items-center justify-center shrink-0",
          iconBg
        )}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-extrabold text-gray-12 font-manrope leading-[1.1] truncate">
          {value}
        </p>
        <p className="text-sm text-gray-11 font-family-dm-sans leading-[1.3] mt-0.5">
          {label}
        </p>
      </div>
    </div>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: "", label: "Todos os status" },
  { value: "PENDING", label: "Pendente" },
  { value: "COMPLETED", label: "Concluído" },
  { value: "CANCELLED", label: "Negado" },
];

const inputShell =
  "h-12 w-full rounded-lg border border-gray-6 bg-gray-1 px-3 text-sm text-gray-12 placeholder:text-gray-11 font-family-dm-sans outline-none focus-visible:border-gray-4 focus-visible:ring-[3px] focus-visible:ring-gray-4/50 ";

const ITEMS_PER_PAGE = 20;

// ─── Page ─────────────────────────────────────────────────────────────────────

const EMPTY_REPASSE_STATS: WithdrawalStats = {
  pending: { count: 0, totalAmount: 0, totalNetAmount: 0 },
  completed: { count: 0, totalAmount: 0, totalNetAmount: 0 },
  cancelled: { count: 0, totalAmount: 0, totalNetAmount: 0 },
  fees: { totalCollected: 0, avgFeeRate: 0, effectiveFeePercent: 0 },
  overview: { totalEventsWithWithdrawals: 0, totalWithdrawals: 0, totalGrossRequested: 0 },
};

export default function AdminRepassePage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<WithdrawalItem | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter]);

  const listQuery = useQuery({
    queryKey: queryKeys.admin.repasse.list({
      page,
      search: debouncedSearch,
      status: statusFilter,
    }),
    queryFn: async () => {
      const api = getApiClient();
      const params = new URLSearchParams({
        page: String(page),
        limit: String(ITEMS_PER_PAGE),
      });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (statusFilter) params.set("status", statusFilter);

      const [statsRes, listRes] = await Promise.all([
        api.get<{ data: WithdrawalStats }>("/api/v1/admin/withdrawals/stats"),
        api.get<{ data: { withdrawals: WithdrawalItem[]; pagination: Pagination } }>(
          `/api/v1/admin/withdrawals?${params.toString()}`,
        ),
      ]);

      return {
        stats: statsRes.data.data,
        items: listRes.data.data.withdrawals ?? [],
        pagination:
          listRes.data.data.pagination ?? {
            page,
            limit: ITEMS_PER_PAGE,
            total: 0,
            totalPages: 1,
          },
      };
    },
    placeholderData: (prev) => prev,
  });

  useEffect(() => {
    if (listQuery.error) {
      const e = listQuery.error as any;
      toast.error(
        e?.response?.data?.message ?? e?.message ?? "Erro ao carregar repasses.",
      );
    }
  }, [listQuery.error]);

  const stats = listQuery.data?.stats ?? EMPTY_REPASSE_STATS;
  const items = listQuery.data?.items ?? [];
  const pagination =
    listQuery.data?.pagination ?? { page, limit: ITEMS_PER_PAGE, total: 0, totalPages: 1 };
  const loading = listQuery.isLoading;

  const handleStatusChange = (_id: string, _newStatus: WithdrawalStatus) => {
    // Mutação de status precisa ressincronizar valores agregados (stats);
    // refetch da listagem cobre tudo.
    queryClient.invalidateQueries({ queryKey: queryKeys.admin.repasse.all() });
  };

  const filtersActive = Boolean(debouncedSearch) || Boolean(statusFilter);

  return (
    <div className="min-h-screen bg-gray-2 pb-10">
      <WithdrawalDetailsDrawer
        isOpen={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setSelected(null);
        }}
        item={selected}
        onStatusChange={handleStatusChange}
      />

      <div className="max-w-[1222px] mx-auto w-full">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-gray-12 tracking-tight text-2xl font-extrabold font-manrope leading-[1.1]">
            Repasses
          </h1>
          <p className="mt-1 text-gray-11 font-family-dm-sans leading-[1.3] text-sm">
            Gerencie as solicitações de repasse dos organizadores de eventos
            esportivos.
          </p>
        </div>

        {/* Stat cards */}
        <div className="flex flex-wrap gap-4 mb-6">
          <StatCard
            iconBg="bg-gray-4"
            icon={<Clock className="size-6 text-gray-11" />}
            label={`${stats.pending.count} repasse${stats.pending.count !== 1 ? "s" : ""} pendente${stats.pending.count !== 1 ? "s" : ""}`}
            value={formatCurrency(stats.pending.totalAmount)}
          />
          <StatCard
            iconBg="bg-[#d6f5e3]"
            icon={<CircleDollarSign className="size-6 text-[#21835d]" />}
            label={`${stats.completed.count} repasse${stats.completed.count !== 1 ? "s" : ""} concluído${stats.completed.count !== 1 ? "s" : ""}`}
            value={formatCurrency(stats.completed.totalNetAmount)}
          />
          <StatCard
            iconBg="bg-red-3"
            icon={<XCircle className="size-6 text-[#ce2c31]" />}
            label={`${stats.cancelled.count} repasse${stats.cancelled.count !== 1 ? "s" : ""} negado${stats.cancelled.count !== 1 ? "s" : ""}`}
            value={formatCurrency(stats.cancelled.totalNetAmount)}
          />
          <StatCard
            iconBg="bg-purple-3"
            icon={<Percent className="size-6 text-purple-11" />}
            label={`${stats.fees.effectiveFeePercent.toFixed(1)}% taxa efetiva`}
            value={formatCurrency(stats.fees.totalCollected)}
          />
        </div>

        {/* Filters */}
        <div className="rounded-xl border border-gray-6 bg-gray-1 p-3 md:p-4  mb-5">
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
            <div className="rounded-xl border border-gray-6 bg-gray-1 py-14 text-center text-sm text-gray-11 font-family-dm-sans ">
              Carregando repasses…
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-xl border border-gray-6 bg-gray-1 py-14 text-center text-sm text-gray-11 font-family-dm-sans  px-4">
              {filtersActive
                ? "Nenhum repasse encontrado com os filtros atuais."
                : "Nenhum repasse disponível."}
            </div>
          ) : (
            items.map((row) => {
              return (
                <div
                  key={row.id}
                  className="rounded-xl border border-gray-6 bg-gray-1 p-4  flex flex-col gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-lg border border-gray-6 overflow-hidden shrink-0 bg-gray-4 flex items-center justify-center text-xs font-bold text-gray-11">
                      {row.event.name.slice(0, 2).toUpperCase()}
                    </div>
                    <p className="text-sm font-semibold text-gray-12 font-family-dm-sans line-clamp-2">
                      {row.event.name}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="size-8 rounded-full bg-gray-5 shrink-0 flex items-center justify-center text-xs font-semibold text-gray-12 font-family-dm-sans">
                      {getInitials(fullName(row))}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-12 font-family-dm-sans truncate">
                        {fullName(row)}
                      </p>
                      <p className="text-xs text-gray-11 font-family-dm-sans truncate">
                        {row.requestedBy.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <p className="text-xs text-gray-11 font-family-dm-sans">Data</p>
                      <p className="text-sm font-semibold text-gray-12 font-family-dm-sans whitespace-nowrap">
                        {formatDateTime(row.createdAt)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-11 font-family-dm-sans">Valor</p>
                      <p className="text-sm font-semibold text-gray-12 font-family-dm-sans whitespace-nowrap">
                        {formatCurrency(row.amount)}
                      </p>
                    </div>
                    <StatusBadge status={row.status} />
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 w-full border-gray-6 text-gray-12 font-semibold font-family-dm-sans"
                    onClick={() => {
                      setSelected(row);
                      setDrawerOpen(true);
                    }}
                  >
                    Detalhes
                  </Button>
                </div>
              );
            })
          )}

          {!loading && (
            <Pagination currentPage={pagination.page} totalPages={pagination.totalPages} onPageChange={setPage} />
          )}
        </div>

        {/* Desktop table — colunas: Evento / Organizador / Data / Valor / Status / Ações */}
        <div className="hidden md:block rounded-xl border border-gray-6 bg-gray-1 overflow-hidden ">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="bg-gray-3 border-b border-gray-6">
                  {["Evento", "Organizador", "Data", "Valor", "Status"].map((col) => (
                    <th
                      key={col}
                      className={`${col === "Data" || col === "Valor" || col === "Status" ? "text-center" : "text-left"} py-3.5 px-4 text-xs font-semibold text-gray-11 font-family-dm-sans uppercase tracking-wide`}
                    >
                      {col}
                    </th>
                  ))}
                  <th className="text-right py-3.5 px-4 text-xs font-semibold text-gray-11 font-family-dm-sans uppercase tracking-wide">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-6">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-sm text-gray-11 font-family-dm-sans">
                      Carregando repasses…
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-sm text-gray-11 font-family-dm-sans">
                      {filtersActive
                        ? "Nenhum repasse encontrado com os filtros atuais."
                        : "Nenhum repasse disponível."}
                    </td>
                  </tr>
                ) : (
                  items.map((row) => {
                    const eventImg = row.event.bannerUrl;
                    const organizatoinImg = row.event.organization.logoUrl;
                    const d = new Date(row.createdAt);
                    if (Number.isNaN(d.getTime())) return "—";
                    const months = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
                    const date = `${String(d.getUTCDate()).padStart(2, "0")} ${months[d.getUTCMonth()]}, ${d.getUTCFullYear()}`;
                    const time = formatTimeBRT(row.createdAt, {
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                    return (
                      <tr key={row.id} className="hover:bg-gray-2/80 transition-colors">
                        {/* Evento */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="size-10 rounded-lg border border-gray-6 overflow-hidden shrink-0 relative bg-gray-4">
                              {eventImg ? (
                                <Image src={eventImg} alt={row.event.name} fill className="object-cover" />
                              ) : (
                                <div className="size-full flex items-center justify-center text-xs font-bold text-gray-11">
                                  {row.event.name.slice(0, 2).toUpperCase()}
                                </div>
                              )}
                            </div>
                            <span className="text-sm font-semibold text-gray-12 font-family-dm-sans line-clamp-2 max-w-[200px]">
                              {row.event.name}
                            </span>
                          </div>
                        </td>

                        {/* Organizador */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <div className="size-10 rounded-lg border border-gray-6 overflow-hidden shrink-0 relative bg-gray-4">
                              {organizatoinImg ? (
                                <Image src={organizatoinImg} alt={row.event.name} fill className="object-cover" />
                              ) : (
                                <div className="size-full flex items-center justify-center text-xs font-bold text-gray-11">
                                  {row.event.organization.name.slice(0, 2).toUpperCase()}
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-12 font-family-dm-sans truncate max-w-[160px]">
                                {row.event.organization.name}
                              </p>
                              <p className="text-xs text-gray-11 font-family-dm-sans truncate max-w-[160px]">
                                {row.event.organization.email}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Data */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-center flex flex-col">
                          <span className="text-sm font-semibold text-gray-12 font-family-dm-sans">
                            {date}
                          </span>
                          <span className="text-sm text-gray-11 font-family-dm-sans">
                            {time}
                          </span>
                        </td>

                        {/* Valor */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-center">
                          <span className="text-sm font-semibold text-gray-12 font-family-dm-sans">
                            {formatCurrency(row.amount)}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 text-center">
                          <StatusBadge status={row.status} />
                        </td>

                        {/* Ações */}
                        <td className="py-3 px-4 text-right">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-10 px-3 border-gray-6 text-gray-12"
                            onClick={() => {
                              setSelected(row);
                              setDrawerOpen(true);
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

          {!loading && (
            <Pagination currentPage={pagination.page} totalPages={pagination.totalPages} onPageChange={setPage} variant="table-footer" />
          )}
        </div>
      </div>
    </div>
  );
}
