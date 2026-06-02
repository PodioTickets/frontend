"use client";

import { useEffect, useState } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/utils/cn";
import { formatTimeBR } from "@/utils/datetimeBR";
import { Button } from "@/components/Button";
import { getApiClient } from "@/services/base/ApiClient";
import { queryKeys } from "@/services/cache/QueryClient";
import toast from "react-hot-toast";
import { ImageWithInitialFallback } from "@/components/ImageWithInitialFallback";
import { NotificationDetailDrawer } from "@/components/Admin/NotificationDetailDrawer";

// ─── Types ────────────────────────────────────────────────────────────────────

type NotificationStatus = "review" | "sent" | "denied";

interface NotificationOrg {
  id: string;
  name: string;
  tradeName?: string | null;
  logoUrl?: string | null;
}

interface NotificationEvent {
  id: string;
  name: string;
  slug?: string;
  organization: NotificationOrg;
}

interface NotificationCreatedBy {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface Notification {
  id: string;
  title: string;
  channels: string[];
  status: NotificationStatus;
  occurredAt: string;
  createdAt: string;
  event: NotificationEvent;
  createdBy: NotificationCreatedBy;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface NotificationListResponse {
  data: {
    items: unknown[];
    pagination: Pagination;
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso?: string | null): { date: string; time: string } {
  if (!iso) return { date: "—", time: "" };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: "—", time: "" };
  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return {
    date: `${String(d.getUTCDate()).padStart(2, "0")} ${months[d.getUTCMonth()]}, ${d.getUTCFullYear()}`,
    time: formatTimeBR(iso, { hour: "2-digit", minute: "2-digit" }),
  };
}

function normalizeOrg(raw: Record<string, unknown>): NotificationOrg {
  return {
    id: typeof raw.id === "string" ? raw.id : "",
    name: typeof raw.name === "string" ? raw.name : "—",
    tradeName: typeof raw.tradeName === "string" ? raw.tradeName : null,
    logoUrl: typeof raw.logoUrl === "string" ? raw.logoUrl : null,
  };
}

function normalizeNotification(raw: Record<string, unknown>): Notification | null {
  const id = typeof raw.id === "string" ? raw.id : "";
  if (!id) return null;

  const eventRaw = raw.event && typeof raw.event === "object" && !Array.isArray(raw.event)
    ? (raw.event as Record<string, unknown>)
    : null;
  if (!eventRaw) return null;

  const orgRaw = eventRaw.organization && typeof eventRaw.organization === "object" && !Array.isArray(eventRaw.organization)
    ? (eventRaw.organization as Record<string, unknown>)
    : {} as Record<string, unknown>;

  const createdByRaw = raw.createdBy && typeof raw.createdBy === "object" && !Array.isArray(raw.createdBy)
    ? (raw.createdBy as Record<string, unknown>)
    : {} as Record<string, unknown>;

  return {
    id,
    title: typeof raw.title === "string" ? raw.title : "—",
    channels: Array.isArray(raw.channels) ? (raw.channels as string[]) : [],
    status: (typeof raw.status === "string" ? raw.status : "review") as NotificationStatus,
    occurredAt: typeof raw.occurredAt === "string" ? raw.occurredAt : "",
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : "",
    event: {
      id: typeof eventRaw.id === "string" ? eventRaw.id : "",
      name: typeof eventRaw.name === "string" ? eventRaw.name : "—",
      slug: typeof eventRaw.slug === "string" ? eventRaw.slug : undefined,
      organization: normalizeOrg(orgRaw),
    },
    createdBy: {
      id: typeof createdByRaw.id === "string" ? createdByRaw.id : "",
      firstName: typeof createdByRaw.firstName === "string" ? createdByRaw.firstName : "",
      lastName: typeof createdByRaw.lastName === "string" ? createdByRaw.lastName : "",
      email: typeof createdByRaw.email === "string" ? createdByRaw.email : "",
    },
  };
}

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<NotificationStatus, { label: string; bg: string; text: string }> = {
  review: { label: "Em Análise", bg: "bg-yellow-11",  text: "text-yellow-1" },
  sent:   { label: "Enviado",            bg: "bg-primary-11", text: "text-primary-1" },
  denied: { label: "Recusado",           bg: "bg-red-11",     text: "text-red-1" },
};

function StatusBadge({ status }: { status: NotificationStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.review;
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

function StatCard({ icon, iconBg, label, value }: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex-1 min-w-[200px] rounded-xl border border-gray-6 bg-gray-1 px-4 py-4 shadow-[0px_2px_6px_0px_rgba(17,17,17,0.08)] flex flex-row items-center justify-between">
      <div className="flex flex-col gap-1 min-w-0">
        <p className="text-xs font-normal text-gray-11 font-family-dm-sans leading-[1.3] truncate">{label}</p>
        <p className="text-2xl font-extrabold text-gray-12 font-manrope leading-[1.1] truncate">{value}</p>
      </div>
      <div className={cn("size-[28px] rounded-lg flex items-center justify-center shrink-0 ml-4", iconBg)}>
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

  const pages: (number | "ellipsis")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (safePage > 3) pages.push("ellipsis");
    for (let i = Math.max(2, safePage - 1); i <= Math.min(totalPages - 1, safePage + 1); i++) pages.push(i);
    if (safePage < totalPages - 2) pages.push("ellipsis");
    pages.push(totalPages);
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2",
        isMobile ? "justify-center w-full py-4 flex-wrap" : "justify-end px-4 py-5 border-t border-gray-6"
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
      {pages.map((p, idx) =>
        p === "ellipsis" ? (
          <span key={`ellipsis-${idx}`} className="size-8 flex items-center justify-center text-sm text-gray-11">…</span>
        ) : (
          <button key={p} type="button" onClick={() => onPageChange(p)} className={pageBtn(safePage === p)}>{p}</button>
        )
      )}
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
  { value: "",       label: "Todos os status" },
  { value: "review", label: "Aguardando revisão" },
  { value: "sent",   label: "Enviado" },
  { value: "denied", label: "Recusado" },
];

const inputShell =
  "h-12 w-full rounded-lg border border-gray-6 bg-gray-1 px-3 text-sm text-gray-12 placeholder:text-gray-11 font-family-dm-sans outline-none focus-visible:border-gray-4 focus-visible:ring-[3px] focus-visible:ring-gray-4/50 shadow-[0px_2px_6px_0px_rgba(17,17,17,0.08)]";

const ITEMS_PER_PAGE = 20;

// ─── Page ─────────────────────────────────────────────────────────────────────

interface ListResult {
  items: Notification[];
  pagination: Pagination;
}

async function fetchNotificationsList(params: {
  page: number;
  search: string;
  status: string;
}): Promise<ListResult> {
  const api = getApiClient();
  const qs = new URLSearchParams({
    page: String(params.page),
    limit: String(ITEMS_PER_PAGE),
  });
  if (params.search) qs.set("search", params.search);
  if (params.status) qs.set("status", params.status);

  const res = await api.get<NotificationListResponse>(
    `/api/v1/admin/notifications?${qs.toString()}`,
  );
  const raw = res.data.data;
  const items = (Array.isArray(raw.items) ? raw.items : [])
    .map((a) => normalizeNotification(a as Record<string, unknown>))
    .filter((a): a is Notification => a !== null);
  return {
    items,
    pagination: raw.pagination ?? {
      page: params.page,
      limit: ITEMS_PER_PAGE,
      total: 0,
      totalPages: 1,
    },
  };
}

async function fetchNotificationCount(
  status: "review" | "sent" | "denied",
): Promise<number> {
  try {
    const api = getApiClient();
    const res = await api.get<NotificationListResponse>(
      `/api/v1/admin/notifications?status=${status}&limit=1&page=1`,
    );
    return res.data.data.pagination?.total ?? 0;
  } catch {
    return 0;
  }
}

export default function AdminAnunciosPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter]);

  // Stat counts: queries independentes, cache compartilhado entre navegações.
  const reviewCountQuery = useQuery({
    queryKey: queryKeys.admin.notifications.count("review"),
    queryFn: () => fetchNotificationCount("review"),
  });
  const sentCountQuery = useQuery({
    queryKey: queryKeys.admin.notifications.count("sent"),
    queryFn: () => fetchNotificationCount("sent"),
  });
  const deniedCountQuery = useQuery({
    queryKey: queryKeys.admin.notifications.count("denied"),
    queryFn: () => fetchNotificationCount("denied"),
  });
  const reviewCount = reviewCountQuery.data ?? 0;
  const sentCount = sentCountQuery.data ?? 0;
  const deniedCount = deniedCountQuery.data ?? 0;

  // Listagem paginada — voltar pra esta página dentro de staleTime usa cache.
  const listKey = queryKeys.admin.notifications.list({
    page,
    search: debouncedSearch,
    status: statusFilter,
  });
  const listQuery = useQuery({
    queryKey: listKey,
    queryFn: () => fetchNotificationsList({ page, search: debouncedSearch, status: statusFilter }),
    placeholderData: (prev) => prev,
  });

  useEffect(() => {
    if (listQuery.error) {
      const err = listQuery.error as any;
      toast.error(
        err?.response?.data?.message ?? err?.message ?? "Erro ao carregar anúncios.",
      );
    }
  }, [listQuery.error]);

  const items = listQuery.data?.items ?? [];
  const pagination =
    listQuery.data?.pagination ?? { page, limit: ITEMS_PER_PAGE, total: 0, totalPages: 1 };
  const loading = listQuery.isLoading;

  const openDrawer = (id: string) => {
    setSelectedId(id);
    setDrawerOpen(true);
  };

  const handleReviewed = (id: string, newStatus: NotificationStatus) => {
    // Atualiza apenas o cache da lista atual (key inclui page/search/status).
    queryClient.setQueryData<ListResult>(listKey, (old) =>
      old
        ? { ...old, items: old.items.map((n) => (n.id === id ? { ...n, status: newStatus } : n)) }
        : old,
    );
    // Stat counts: ajusta cache local (sem refetch).
    queryClient.setQueryData<number>(
      queryKeys.admin.notifications.count("review"),
      (c) => Math.max(0, (c ?? 0) - 1),
    );
    if (newStatus === "sent") {
      queryClient.setQueryData<number>(
        queryKeys.admin.notifications.count("sent"),
        (c) => (c ?? 0) + 1,
      );
    }
    if (newStatus === "denied") {
      queryClient.setQueryData<number>(
        queryKeys.admin.notifications.count("denied"),
        (c) => (c ?? 0) + 1,
      );
    }
  };

  const filtersActive = Boolean(debouncedSearch) || Boolean(statusFilter);

  return (
    <div className="min-h-screen bg-gray-2 pb-10">
      <NotificationDetailDrawer
        notificationId={selectedId}
        open={drawerOpen}
        onOpenChange={(open) => { setDrawerOpen(open); if (!open) setSelectedId(null); }}
        onReviewed={handleReviewed}
      />

      <div className="max-w-[1222px] mx-auto w-full">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-gray-12 tracking-tight text-2xl font-extrabold font-manrope leading-[1.1]">
            Anúncios
          </h1>
          <p className="mt-1 text-gray-11 font-family-dm-sans leading-[1.3] text-sm">
            Gerencie os anúncios e comunicados enviados pelos organizadores.
          </p>
        </div>

        {/* Stat cards */}
        <div className="flex flex-wrap gap-4 mb-6">
          <StatCard
            iconBg="bg-gray-4"
            icon={<Clock className="size-4 text-gray-11" />}
            label="Em Análise"
            value={String(reviewCount)}
          />
          <StatCard
            iconBg="bg-primary-3"
            icon={<CheckCircle className="size-4 text-primary-11" />}
            label="Enviados"
            value={String(sentCount)}
          />
          <StatCard
            iconBg="bg-red-3"
            icon={<XCircle className="size-4 text-red-11" />}
            label="Recusados"
            value={String(deniedCount)}
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
                placeholder="Buscar por título do anúncio…"
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
                  <option key={o.value || "all"} value={o.value}>{o.label}</option>
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
          ) : items.length === 0 ? (
            <div className="rounded-xl border border-gray-6 bg-gray-1 py-14 text-center text-sm text-gray-11 font-family-dm-sans shadow-[0px_2px_6px_0px_rgba(17,17,17,0.08)] px-4">
              {filtersActive ? "Nenhum resultado com os filtros atuais." : "Nenhum anúncio encontrado."}
            </div>
          ) : (
            items.map((row) => {
              const { date, time } = formatDate(row.occurredAt);
              const org = row.event.organization;
              return (
                <div
                  key={row.id}
                  className="rounded-xl border border-gray-6 bg-gray-1 p-4 shadow-[0px_2px_6px_0px_rgba(17,17,17,0.08)] flex flex-col gap-3"
                >
                  {/* Event */}
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-lg border border-gray-6 overflow-hidden shrink-0 bg-gray-4 relative">
                      <div className="size-full flex items-center justify-center text-xs font-bold text-gray-11">
                        {row.event.name.slice(0, 2).toUpperCase()}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-12 font-family-dm-sans line-clamp-1">
                        {row.event.name}
                      </p>
                      <p className="text-xs text-gray-11 font-family-dm-sans line-clamp-1">
                        {row.title}
                      </p>
                    </div>
                  </div>

                  {/* Org + status */}
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="size-6 rounded-full border border-gray-6 overflow-hidden shrink-0 bg-gray-4 relative">
                        <ImageWithInitialFallback
                          src={org.logoUrl ?? null}
                          alt={org.tradeName ?? org.name}
                          name={org.tradeName ?? org.name}
                          fill
                          sizes="24px"
                          className="size-full rounded-full"
                          imgClassName="object-cover rounded-full"
                          letterClassName="text-[9px] font-medium text-gray-11"
                        />
                      </div>
                      <p className="text-xs text-gray-12 font-family-dm-sans truncate max-w-[120px]">
                        {org.tradeName ?? org.name}
                      </p>
                    </div>
                    <StatusBadge status={row.status} />
                  </div>

                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <p className="text-xs text-gray-11 font-family-dm-sans">Data</p>
                      <p className="text-sm font-semibold text-gray-12 font-family-dm-sans whitespace-nowrap">
                        {date}
                        {time && <span className="text-gray-11 font-normal"> {time}</span>}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="text-gray-12 border border-gray-6 h-9 px-3 text-sm"
                      onClick={() => openDrawer(row.id)}
                    >
                      Ver detalhes
                    </Button>
                  </div>
                </div>
              );
            })
          )}

          {!loading && (
            <PaginationBar totalPages={pagination.totalPages} page={pagination.page} onPageChange={setPage} variant="mobile" />
          )}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block rounded-xl border border-gray-6 bg-gray-1 overflow-hidden shadow-[0px_2px_6px_0px_rgba(17,17,17,0.08)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead>
                <tr className="bg-gray-3 border-b border-gray-6">
                  <th className="text-left py-3.5 px-4 text-xs font-semibold text-gray-11 font-family-dm-sans uppercase tracking-wide">
                    Evento
                  </th>
                  <th className="text-left py-3.5 px-4 text-xs font-semibold text-gray-11 font-family-dm-sans uppercase tracking-wide">
                    Organizador
                  </th>
                  <th className="text-center py-3.5 px-4 text-xs font-semibold text-gray-11 font-family-dm-sans uppercase tracking-wide">
                    Data
                  </th>
                  <th className="text-center py-3.5 px-4 text-xs font-semibold text-gray-11 font-family-dm-sans uppercase tracking-wide">
                    Status
                  </th>
                  <th className="text-right py-3.5 px-4 text-xs font-semibold text-gray-11 font-family-dm-sans uppercase tracking-wide">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-6">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-16 text-center text-sm text-gray-11 font-family-dm-sans">Carregando…</td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-16 text-center text-sm text-gray-11 font-family-dm-sans">
                      {filtersActive ? "Nenhum resultado com os filtros atuais." : "Nenhum anúncio encontrado."}
                    </td>
                  </tr>
                ) : (
                  items.map((row) => {
                    const { date, time } = formatDate(row.occurredAt);
                    const org = row.event.organization;
                    return (
                      <tr key={row.id} className="hover:bg-gray-2/80 transition-colors">
                        {/* Evento */}
                        <td className="py-3.5 px-4">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-12 font-family-dm-sans line-clamp-1 max-w-[220px]">
                              {row.event.name}
                            </p>
                            <p className="text-xs text-gray-11 font-family-dm-sans line-clamp-1 max-w-[220px]">
                              {row.title}
                            </p>
                          </div>
                        </td>

                        {/* Organizador */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="size-8 rounded-full border border-gray-6 overflow-hidden shrink-0 bg-gray-4 relative">
                              <ImageWithInitialFallback
                                src={org.logoUrl ?? null}
                                alt={org.tradeName ?? org.name}
                                name={org.tradeName ?? org.name}
                                fill
                                sizes="32px"
                                className="size-full rounded-full"
                                imgClassName="object-cover rounded-full"
                                letterClassName="text-xs font-medium text-gray-11"
                              />
                            </div>
                            <p className="text-sm font-semibold text-gray-12 font-family-dm-sans truncate max-w-[180px]">
                              {org.tradeName ?? org.name}
                            </p>
                          </div>
                        </td>

                        {/* Data */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-center">
                          <p className="text-sm font-semibold text-gray-12 font-family-dm-sans">{date}</p>
                          {time && <p className="text-sm text-gray-11 font-family-dm-sans">{time}</p>}
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
                            className="text-gray-12 border border-gray-6 h-9 px-3 text-sm"
                            onClick={() => openDrawer(row.id)}
                          >
                            Ver detalhes
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
            <PaginationBar totalPages={pagination.totalPages} page={pagination.page} onPageChange={setPage} variant="desktop" />
          )}
        </div>
      </div>
    </div>
  );
}
