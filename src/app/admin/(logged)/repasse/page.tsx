"use client";

import { useEffect, useState } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Clock,
  CircleDollarSign,
  XCircle,
  Percent,
  X,
} from "lucide-react";
import { cn } from "@/utils/cn";
import { Button } from "@/components/Button";
import { getApiClient } from "@/services/base/ApiClient";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import toast from "react-hot-toast";
import Image from "next/image";

// ─── Types ────────────────────────────────────────────────────────────────────

type WithdrawalStatus = "PENDING" | "COMPLETED" | "CANCELLED";

interface WithdrawalItem {
  id: string;
  eventId: string;
  amount: number;
  feeRate: number;
  feeAmount: number;
  netAmount: number;
  status: WithdrawalStatus;
  notes?: string | null;
  completedAt?: string | null;
  createdAt: string;
  event: {
    id: string;
    name: string;
    slug?: string;
    organization: {
      id: string;
      name: string;
    };
  };
  requestedBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

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
  const date = d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const time = d.toLocaleTimeString("pt-BR", {
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
  { label: string; bg: string; text: string; dot: string }
> = {
  COMPLETED: {
    label: "Concluído",
    bg: "bg-[#d6f5e3]",
    text: "text-[#21835d]",
    dot: "bg-[#21835d]",
  },
  CANCELLED: {
    label: "Negado",
    bg: "bg-red-3",
    text: "text-[#ce2c31]",
    dot: "bg-[#ce2c31]",
  },
  PENDING: {
    label: "Pendente",
    bg: "bg-gray-4",
    text: "text-gray-11",
    dot: "bg-gray-11",
  },
};

function StatusBadge({ status }: { status: WithdrawalStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold font-family-dm-sans whitespace-nowrap",
        cfg.bg,
        cfg.text
      )}
    >
      <span className={cn("size-1.5 rounded-full shrink-0", cfg.dot)} />
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
    <div className="flex-1 min-w-[200px] rounded-xl border border-gray-6 bg-gray-1 p-5 shadow-[0px_2px_6px_0px_rgba(17,17,17,0.08)] flex items-center gap-4">
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

// ─── Details drawer ───────────────────────────────────────────────────────────

function SectionRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between w-full gap-4">
      <p className="text-base font-normal leading-[1.3] text-gray-11 font-family-dm-sans shrink-0">
        {label}
      </p>
      <div className="text-base font-semibold leading-[1.3] text-gray-12 font-family-dm-sans text-right min-w-0 break-words">
        {value}
      </div>
    </div>
  );
}

function DrawerSeparator() {
  return <div className="w-full h-px bg-gray-6 shrink-0" />;
}

function WithdrawalDetailsDrawer({
  isOpen,
  onClose,
  item,
  onStatusChange,
}: {
  isOpen: boolean;
  onClose: () => void;
  item: WithdrawalItem | null;
  onStatusChange: (id: string, newStatus: WithdrawalStatus) => void;
}) {
  const [isApproving, setIsApproving] = useState(false);
  const [isDenying, setIsDenying] = useState(false);

  if (!item) return null;

  const handleApprove = async () => {
    if (isApproving || isDenying) return;
    setIsApproving(true);
    try {
      await getApiClient().patch(
        `/api/v1/events/${item.eventId}/repasse/withdrawals/${item.id}/complete`
      );
      toast.success("Repasse aprovado com sucesso!");
      onStatusChange(item.id, "COMPLETED");
      onClose();
    } catch (e: any) {
      toast.error(
        e?.response?.data?.message ?? e?.message ?? "Erro ao aprovar repasse."
      );
    } finally {
      setIsApproving(false);
    }
  };

  const handleDeny = async () => {
    if (isApproving || isDenying) return;
    setIsDenying(true);
    try {
      await getApiClient().patch(
        `/api/v1/events/${item.eventId}/repasse/withdrawals/${item.id}/cancel`
      );
      toast.success("Repasse negado.");
      onStatusChange(item.id, "CANCELLED");
      onClose();
    } catch (e: any) {
      toast.error(
        e?.response?.data?.message ?? e?.message ?? "Erro ao negar repasse."
      );
    } finally {
      setIsDenying(false);
    }
  };

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()} direction="right">
      <DrawerContent className="flex flex-col h-full bg-gray-1 sm:max-w-[720px]">
        {/* Header */}
        <DrawerHeader className="flex items-center justify-between shrink-0 border-b border-gray-6 px-5 py-3">
          <DrawerTitle className="text-xl font-semibold leading-[1.3] text-gray-12 font-family-dm-sans">
            Detalhes do Repasse
          </DrawerTitle>
          <DrawerClose asChild>
            <button
              type="button"
              className="size-9 rounded-lg hover:bg-gray-3 flex items-center justify-center transition-colors"
              aria-label="Fechar"
            >
              <X className="size-5 text-gray-11" />
            </button>
          </DrawerClose>
        </DrawerHeader>

        {/* Body */}
        <div className="overflow-y-auto flex-1 flex flex-col gap-7 px-4 pt-5 pb-13">

          {/* Solicitante */}
          <div className="flex flex-col gap-4 px-0">
            <p className="text-base font-semibold leading-[1.3] text-gray-11 font-family-dm-sans">
              Solicitante
            </p>
            <div className="flex items-center gap-2.5">
              <div className="size-12 rounded-lg bg-gray-4 shrink-0 flex items-center justify-center text-base font-semibold text-gray-12 font-manrope">
                {getInitials(fullName(item))}
              </div>
              <div className="flex flex-col gap-3 min-w-0">
                <p className="text-base font-semibold leading-[1.1] text-gray-12 font-manrope truncate">
                  {fullName(item)}
                </p>
                <p className="text-base font-normal leading-[1.3] text-gray-11 font-family-dm-sans truncate">
                  {item.requestedBy.email}
                </p>
              </div>
            </div>
          </div>

          <DrawerSeparator />

          {/* Solicitação */}
          <div className="flex flex-col gap-4 px-0">
            <p className="text-base font-semibold leading-[1.3] text-gray-11 font-family-dm-sans">
              Solicitação
            </p>
            <div className="flex flex-col gap-4">
              <SectionRow label="Evento:" value={item.event.name} />
              <SectionRow label="Organização:" value={item.event.organization.name} />
              <SectionRow label="Data do pedido:" value={formatDateTime(item.createdAt)} />
              {item.completedAt && (
                <SectionRow label="Concluído em:" value={formatDateTime(item.completedAt)} />
              )}
            </div>
          </div>

          <DrawerSeparator />

          {/* Financeiro */}
          <div className="flex flex-col gap-4 px-0">
            <p className="text-base font-semibold leading-[1.3] text-gray-11 font-family-dm-sans">
              Financeiro
            </p>
            <div className="flex flex-col gap-4">
              <SectionRow label="Valor solicitado:" value={formatCurrency(item.amount)} />
              <SectionRow
                label={`Taxa Podio (${(item.feeRate * 100).toFixed(0)}%):`}
                value={
                  <span className="text-[#ce2c31]">-{formatCurrency(item.feeAmount)}</span>
                }
              />
              <SectionRow
                label="Valor líquido:"
                value={
                  <span className="text-[#21835d] font-bold">{formatCurrency(item.netAmount)}</span>
                }
              />
            </div>
          </div>

          <DrawerSeparator />

          {/* Status */}
          <div className="flex flex-col gap-4 px-0">
            <p className="text-base font-semibold leading-[1.3] text-gray-11 font-family-dm-sans">
              Status
            </p>
            <div className="flex flex-col gap-4">
              <SectionRow label="Status:" value={<StatusBadge status={item.status} />} />
              {item.notes && (
                <SectionRow label="Observação:" value={item.notes} />
              )}
            </div>
          </div>
        </div>

        {/* Footer — only for PENDING */}
        {item.status === "PENDING" && (
          <div className="shrink-0 border-t border-gray-6 bg-gray-2 flex items-center justify-end gap-2 px-4 py-3">
            <button
              type="button"
              onClick={handleDeny}
              disabled={isApproving || isDenying}
              className="h-11 px-5 rounded-lg bg-[#ce2c31] text-[#fff7f7] font-bold text-base leading-[1.1] font-manrope whitespace-nowrap hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isDenying ? "Negando..." : "Negar repasse"}
            </button>
            <button
              type="button"
              onClick={handleApprove}
              disabled={isApproving || isDenying}
              className="h-11 px-5 rounded-lg bg-primary-11 text-primary-2 font-bold text-base leading-[1.1] font-manrope whitespace-nowrap hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isApproving ? "Aprovando..." : "Aprovar repasse"}
            </button>
          </div>
        )}
      </DrawerContent>
    </Drawer>
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
  { value: "PENDING", label: "Pendente" },
  { value: "COMPLETED", label: "Concluído" },
  { value: "CANCELLED", label: "Negado" },
];

const inputShell =
  "h-12 w-full rounded-lg border border-gray-6 bg-gray-1 px-3 text-sm text-gray-12 placeholder:text-gray-11 font-family-dm-sans outline-none focus-visible:border-gray-4 focus-visible:ring-[3px] focus-visible:ring-gray-4/50 shadow-[0px_2px_6px_0px_rgba(17,17,17,0.08)]";

const ITEMS_PER_PAGE = 20;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminRepassePage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);

  const [stats, setStats] = useState<WithdrawalStats>({
    pending: { count: 0, totalAmount: 0, totalNetAmount: 0 },
    completed: { count: 0, totalAmount: 0, totalNetAmount: 0 },
    cancelled: { count: 0, totalAmount: 0, totalNetAmount: 0 },
    fees: { totalCollected: 0, avgFeeRate: 0, effectiveFeePercent: 0 },
    overview: { totalEventsWithWithdrawals: 0, totalWithdrawals: 0, totalGrossRequested: 0 },
  });
  const [items, setItems] = useState<WithdrawalItem[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: ITEMS_PER_PAGE,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<WithdrawalItem | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
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
            `/api/v1/admin/withdrawals?${params.toString()}`
          ),
        ]);

        if (cancelled) return;
        setStats(statsRes.data.data);
        setItems(listRes.data.data.withdrawals ?? []);
        setPagination(
          listRes.data.data.pagination ?? {
            page,
            limit: ITEMS_PER_PAGE,
            total: 0,
            totalPages: 1,
          }
        );
      } catch (e: any) {
        if (cancelled) return;
        toast.error(
          e?.response?.data?.message ?? e?.message ?? "Erro ao carregar repasses."
        );
        setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page, debouncedSearch, statusFilter]);

  const handleStatusChange = (id: string, newStatus: WithdrawalStatus) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
    );
    if (selected?.id === id) {
      setSelected((prev) => (prev ? { ...prev, status: newStatus } : prev));
    }
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
              Carregando repasses…
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-xl border border-gray-6 bg-gray-1 py-14 text-center text-sm text-gray-11 font-family-dm-sans shadow-[0px_2px_6px_0px_rgba(17,17,17,0.08)] px-4">
              {filtersActive
                ? "Nenhum repasse encontrado com os filtros atuais."
                : "Nenhum repasse disponível."}
            </div>
          ) : (
            items.map((row) => {
              return (
                <div
                  key={row.id}
                  className="rounded-xl border border-gray-6 bg-gray-1 p-4 shadow-[0px_2px_6px_0px_rgba(17,17,17,0.08)] flex flex-col gap-3"
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
            <PaginationBar
              totalPages={pagination.totalPages}
              page={pagination.page}
              onPageChange={setPage}
              variant="mobile"
            />
          )}
        </div>

        {/* Desktop table — colunas: Evento / Organizador / Data / Valor / Status / Ações */}
        <div className="hidden md:block rounded-xl border border-gray-6 bg-gray-1 overflow-hidden shadow-[0px_2px_6px_0px_rgba(17,17,17,0.08)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="bg-gray-3 border-b border-gray-6">
                  {["Evento", "Organizador", "Data", "Valor", "Status"].map((col) => (
                    <th
                      key={col}
                      className="text-left py-3.5 px-4 text-xs font-semibold text-gray-11 font-family-dm-sans uppercase tracking-wide"
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
                    const eventImg = null;
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
                            <div className="size-8 rounded-full bg-gray-5 shrink-0 flex items-center justify-center text-xs font-semibold text-gray-12 font-family-dm-sans">
                              {getInitials(fullName(row))}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-12 font-family-dm-sans truncate max-w-[160px]">
                                {fullName(row)}
                              </p>
                              <p className="text-xs text-gray-11 font-family-dm-sans truncate max-w-[160px]">
                                {row.requestedBy.email}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Data */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="text-sm text-gray-11 font-family-dm-sans">
                            {formatDateTime(row.createdAt)}
                          </span>
                        </td>

                        {/* Valor */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="text-sm font-semibold text-gray-12 font-family-dm-sans">
                            {formatCurrency(row.amount)}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
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
