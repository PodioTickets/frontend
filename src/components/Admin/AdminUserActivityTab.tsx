"use client";

import { useEffect, useState } from "react";
import { Search, X, UserRound, Network, Link2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/utils/cn";
import type { DateRange } from "react-day-picker";
import { LogDateRangeFilter, dateRangeToParams } from "@/components/LogDateRangeFilter";
import { Button } from "@/components/Button";
import { UserAvatar } from "@/components/UserAvatar";
import { adminService } from "@/services";
import { queryKeys } from "@/services/cache/QueryClient";
import {
  USER_ACTIVITY_CATEGORIES,
  USER_ACTIVITY_SOURCES,
  type AdminUserActivityItem,
} from "@/services/admin/AdminService";
import toast from "react-hot-toast";
import { AdminUserActivityDetailsDrawer } from "./AdminUserActivityDetailsDrawer";
import { Pagination } from "../Pagination";
import { formatDateBRT, formatTimeBRT } from "@/utils/datetimeBR";

const ITEMS_PER_PAGE = 20;

const UUID_PARAM_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUuidParam(value: string): boolean {
  return UUID_PARAM_RE.test(value.trim());
}

import {
  CATEGORY_LABELS,
  SOURCE_LABELS,
  CATEGORY_BADGE,
} from "./userActivityLabels";

function formatLogDateTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  // occurredAt é INSTANTE real → exibe no fuso de Brasília (BRT), não UTC.
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

function getInitials(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return "—";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function userDisplayName(row: AdminUserActivityItem): string {
  return row.user?.fullName?.trim() || "Anônimo";
}

export function AdminUserActivityTab() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [userFilter, setUserFilter] = useState("");
  const [debouncedUserFilter, setDebouncedUserFilter] = useState("");
  const [ipFilter, setIpFilter] = useState("");
  const [debouncedIpFilter, setDebouncedIpFilter] = useState("");
  const [sessionFilter, setSessionFilter] = useState("");
  const [debouncedSessionFilter, setDebouncedSessionFilter] = useState("");
  const [page, setPage] = useState(1);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<AdminUserActivityItem | null>(null);

  /* Debounce dos filtros de texto. O reset de página acontece DENTRO do
   * timeout (assíncrono) e nos handlers dos selects/date — evita o padrão
   * "setState síncrono em effect" que o React Compiler rejeita. */
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedUserFilter(userFilter.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [userFilter]);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedIpFilter(ipFilter.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [ipFilter]);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSessionFilter(sessionFilter.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [sessionFilter]);

  const dateParams = dateRangeToParams(dateRange);
  const dateKey = dateParams.from ? `${dateParams.from}_${dateParams.to}` : "";

  const activityQuery = useQuery({
    queryKey: queryKeys.admin.userActivity.list({
      page,
      search: debouncedSearch,
      category: categoryFilter,
      source: sourceFilter,
      dateFilter: dateKey,
      userFilter: debouncedUserFilter,
      ip: debouncedIpFilter,
      sessionId: debouncedSessionFilter,
    }),
    queryFn: async () => {
      // UUID exato → userId; texto livre → userSearch (nome/email)
      const userId = isValidUuidParam(debouncedUserFilter)
        ? debouncedUserFilter
        : undefined;
      const userSearch =
        !userId && debouncedUserFilter ? debouncedUserFilter : undefined;
      const { from, to } = dateParams;
      const { items, pagination } = await adminService.getUserActivityLogs({
        page,
        limit: ITEMS_PER_PAGE,
        q: debouncedSearch || undefined,
        category: categoryFilter || undefined,
        source: sourceFilter || undefined,
        userId,
        userSearch,
        ip: debouncedIpFilter || undefined,
        sessionId: debouncedSessionFilter || undefined,
        // Intervalo (ou dia único): `to` é inclusivo até o fim do dia BRT no backend.
        from,
        to,
      });
      return {
        items,
        total: pagination.total,
        totalPages: Math.max(1, pagination.totalPages),
      };
    },
    placeholderData: (prev) => prev,
  });

  useEffect(() => {
    if (!activityQuery.error) return;
    const e = activityQuery.error as {
      response?: { status?: number; data?: { message?: string } };
      message?: string;
    };
    if (e?.response?.status === 403) {
      toast.error(
        e?.response?.data?.message ||
          "Você não tem permissão para visualizar a atividade de usuários."
      );
    } else {
      toast.error(
        e?.response?.data?.message ||
          e?.message ||
          "Erro ao carregar a atividade dos usuários."
      );
    }
  }, [activityQuery.error]);

  const items = activityQuery.data?.items ?? [];
  const total = activityQuery.data?.total ?? 0;
  const totalPages = activityQuery.data?.totalPages ?? 1;
  const loading = activityQuery.isLoading;

  /* Sem clamp por effect (React Compiler rejeita setState síncrono em
   * effect): todo filtro alterado já reseta pra página 1 nos handlers, o
   * que cobre o caso de o total encolher entre buscas. */

  const countLabel =
    total === 1 ? "1 Registro encontrado" : `${total} Registros encontrados`;

  const inputShell =
    "h-12 w-full rounded-lg border border-gray-6 bg-gray-1 px-3 text-sm text-gray-12 placeholder:text-gray-11 font-family-dm-sans outline-none focus-visible:border-gray-4 focus-visible:ring-[3px] focus-visible:ring-gray-4/50 ";

  const selectShell = cn(
    inputShell,
    "text-base md:text-sm cursor-pointer appearance-none bg-[length:1rem] bg-[right_0.75rem_center] bg-no-repeat pr-10"
  );
  const selectChevron = {
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23737373' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
  };

  const filtersActiveForEmptyCopy =
    Boolean(debouncedSearch) ||
    Boolean(categoryFilter) ||
    Boolean(sourceFilter) ||
    Boolean(dateRange) ||
    Boolean(debouncedUserFilter) ||
    Boolean(debouncedIpFilter) ||
    Boolean(debouncedSessionFilter);

  const categoryBadge = (category: string) => (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold font-family-dm-sans whitespace-nowrap",
        CATEGORY_BADGE[category] ?? "bg-gray-4 text-gray-12"
      )}
    >
      {CATEGORY_LABELS[category] ?? category}
    </span>
  );

  return (
    <div>
      <AdminUserActivityDetailsDrawer
        isOpen={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setSelected(null);
        }}
        item={selected}
      />

      <div className="rounded-xl border border-gray-6 bg-gray-1 p-3 md:p-4  mb-4 md:mb-5">
        <h2 className="text-base font-bold text-gray-12 font-manrope leading-[1.1] mb-3 md:hidden">
          Lista de atividades
        </h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch sm:flex-wrap">
          <div className="relative flex-1 min-w-0 sm:min-w-[200px]">
            <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 size-5 text-gray-11 pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Busca no texto da ação (ex.: login, pay)…"
              className={cn(inputShell, "pl-11 md:pl-12 text-base md:text-sm")}
            />
          </div>
          <div className="w-full sm:w-[min(100%,220px)] shrink-0">
            <label className="sr-only">Filtrar por categoria</label>
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className={selectShell}
              style={selectChevron}
            >
              <option value="">Todas as categorias</option>
              {USER_ACTIVITY_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c] ?? c}
                </option>
              ))}
            </select>
          </div>
          <div className="w-full sm:w-[min(100%,180px)] shrink-0">
            <label className="sr-only">Filtrar por origem</label>
            <select
              value={sourceFilter}
              onChange={(e) => {
                setSourceFilter(e.target.value);
                setPage(1);
              }}
              className={selectShell}
              style={selectChevron}
            >
              <option value="">Todas as origens</option>
              {USER_ACTIVITY_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {SOURCE_LABELS[s] ?? s}
                </option>
              ))}
            </select>
          </div>
          <div className="flex w-full sm:w-[220px] shrink-0 gap-1.5 items-stretch">
            <LogDateRangeFilter
              value={dateRange}
              onChange={(range) => {
                setDateRange(range);
                setPage(1);
              }}
              className="flex-1 min-w-0"
            />
            {dateRange ? (
              <button
                type="button"
                onClick={() => {
                  setDateRange(undefined);
                  setPage(1);
                }}
                className="shrink-0 size-12 rounded-lg border border-gray-6 bg-gray-1 text-gray-11 hover:bg-gray-2 hover:text-gray-12  flex items-center justify-center transition-colors"
                aria-label="Limpar filtro de data"
              >
                <X className="size-4" />
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:flex-wrap">
          <div className="relative flex-1 min-w-0 sm:min-w-[220px]">
            <label className="sr-only">Filtrar por usuário (UUID, nome ou e-mail)</label>
            <UserRound className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 size-5 text-gray-11 pointer-events-none" />
            <input
              type="text"
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              placeholder="UUID, nome ou e-mail do usuário"
              autoComplete="off"
              spellCheck={false}
              className={cn(inputShell, "pl-11 md:pl-12 text-base md:text-sm")}
            />
            {userFilter ? (
              <button
                type="button"
                onClick={() => setUserFilter("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 size-8 rounded-lg text-gray-11 hover:bg-gray-2 hover:text-gray-12 flex items-center justify-center transition-colors"
                aria-label="Limpar filtro de usuário"
              >
                <X className="size-4" />
              </button>
            ) : null}
          </div>
          <div className="relative w-full sm:w-[200px] shrink-0">
            <label className="sr-only">Filtrar por IP exato</label>
            <Network className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 size-5 text-gray-11 pointer-events-none" />
            <input
              type="text"
              value={ipFilter}
              onChange={(e) => setIpFilter(e.target.value)}
              placeholder="IP exato"
              autoComplete="off"
              spellCheck={false}
              className={cn(inputShell, "pl-11 md:pl-12 text-base md:text-sm")}
            />
            {ipFilter ? (
              <button
                type="button"
                onClick={() => setIpFilter("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 size-8 rounded-lg text-gray-11 hover:bg-gray-2 hover:text-gray-12 flex items-center justify-center transition-colors"
                aria-label="Limpar filtro de IP"
              >
                <X className="size-4" />
              </button>
            ) : null}
          </div>
          <div className="relative flex-1 min-w-0 sm:min-w-[220px]">
            <label className="sr-only">
              Filtrar por sessão (costura jornada anônimo → logado)
            </label>
            <Link2 className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 size-5 text-gray-11 pointer-events-none" />
            <input
              type="text"
              value={sessionFilter}
              onChange={(e) => setSessionFilter(e.target.value)}
              placeholder="ID da sessão (jornada anônimo → logado)"
              autoComplete="off"
              spellCheck={false}
              className={cn(inputShell, "pl-11 md:pl-12 text-base md:text-sm")}
            />
            {sessionFilter ? (
              <button
                type="button"
                onClick={() => setSessionFilter("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 size-8 rounded-lg text-gray-11 hover:bg-gray-2 hover:text-gray-12 flex items-center justify-center transition-colors"
                aria-label="Limpar filtro de sessão"
              >
                <X className="size-4" />
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <p className="text-sm text-gray-11 font-medium font-family-dm-sans mb-3 md:mb-4">
        {loading ? "Carregando…" : countLabel}
      </p>

      {/* Cards (mobile) */}
      <div className="md:hidden flex flex-col gap-3">
        {loading ? (
          <div className="rounded-xl border border-gray-6 bg-gray-1 py-14 text-center text-sm text-gray-11 font-family-dm-sans ">
            Carregando registros…
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-gray-6 bg-gray-1 py-14 text-center text-sm text-gray-11 font-family-dm-sans  px-4">
            {filtersActiveForEmptyCopy
              ? "Nenhum registro encontrado com os filtros atuais."
              : "Nenhum registro disponível."}
          </div>
        ) : (
          items.map((row) => (
            <div
              key={row.id}
              className="rounded-xl border border-gray-6 bg-gray-1 p-4 "
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                {categoryBadge(row.category)}
                <span className="text-xs text-gray-11 font-family-dm-sans">
                  {SOURCE_LABELS[row.source] ?? row.source}
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <UserAvatar
                  avatarUrl={row.user?.avatarUrl}
                  name={userDisplayName(row)}
                  initials={getInitials(userDisplayName(row))}
                  shape="sm"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-12 font-family-dm-sans leading-[1.3] wrap-break-word">
                    {userDisplayName(row)}
                  </p>
                  {row.user?.email ? (
                    <p className="text-xs text-gray-11 font-family-dm-sans wrap-break-word">
                      {row.user.email}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="mt-2.5">
                <p className="text-xs text-gray-11 font-family-dm-sans">Ação:</p>
                <p className="text-sm font-semibold text-gray-12 font-family-dm-sans leading-[1.3] wrap-break-word">
                  {row.action}
                </p>
                {row.path ? (
                  <p className="mt-1 text-xs text-gray-11 font-mono wrap-break-word">
                    {row.path}
                  </p>
                ) : null}
              </div>

              {row.ip ? (
                <p className="mt-2 text-xs text-gray-11 font-family-dm-sans">
                  IP: {row.ip}
                </p>
              ) : null}

              <div className="mt-3 rounded-lg border border-gray-6 bg-gray-2 px-3 py-2 flex items-center justify-between gap-2">
                <span className="text-xs text-gray-11 font-family-dm-sans">
                  Data/Hora:
                </span>
                <span className="text-sm font-semibold text-gray-12 font-family-dm-sans whitespace-nowrap">
                  {formatLogDateTime(row.occurredAt)}
                </span>
              </div>

              <Button
                type="button"
                variant="outline"
                className="mt-3 h-11 w-full border-gray-6 text-gray-12 font-semibold font-family-dm-sans"
                onClick={() => {
                  setSelected(row);
                  setDrawerOpen(true);
                }}
              >
                Detalhes
              </Button>
            </div>
          ))
        )}
      </div>

      {/* Tabela (desktop) */}
      <div className="hidden md:block rounded-xl border border-gray-6 bg-gray-1 overflow-hidden ">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px]">
            <thead>
              <tr className="bg-gray-3 border-b border-gray-6">
                <th className="text-left py-3.5 px-4 text-xs font-semibold text-gray-11 font-family-dm-sans uppercase tracking-wide">
                  Usuário
                </th>
                <th className="text-left py-3.5 px-4 text-xs font-semibold text-gray-11 font-family-dm-sans uppercase tracking-wide">
                  Categoria
                </th>
                <th className="text-left py-3.5 px-4 text-xs font-semibold text-gray-11 font-family-dm-sans uppercase tracking-wide">
                  Origem
                </th>
                <th className="text-left py-3.5 px-4 text-xs font-semibold text-gray-11 font-family-dm-sans uppercase tracking-wide">
                  Ação / contexto
                </th>
                <th className="text-left py-3.5 px-4 text-xs font-semibold text-gray-11 font-family-dm-sans uppercase tracking-wide">
                  IP
                </th>
                <th className="text-left py-3.5 px-4 text-xs font-semibold text-gray-11 font-family-dm-sans uppercase tracking-wide">
                  Data/Hora
                </th>
                <th className="text-right py-3.5 px-4 text-xs font-semibold text-gray-11 font-family-dm-sans uppercase tracking-wide">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-6">
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-16 text-center text-sm text-gray-11 font-family-dm-sans"
                  >
                    Carregando registros…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-16 text-center text-sm text-gray-11 font-family-dm-sans"
                  >
                    {filtersActiveForEmptyCopy
                      ? "Nenhum registro encontrado com os filtros atuais."
                      : "Nenhum registro disponível."}
                  </td>
                </tr>
              ) : (
                items.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-2/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <span
                        className={cn(
                          "text-sm font-semibold font-family-dm-sans leading-snug block",
                          row.user ? "text-gray-12" : "text-gray-11 italic"
                        )}
                      >
                        {userDisplayName(row)}
                      </span>
                      {row.user?.email ? (
                        <span className="text-xs text-gray-11 font-family-dm-sans block mt-0.5 wrap-break-word">
                          {row.user.email}
                        </span>
                      ) : null}
                    </td>
                    <td className="py-3.5 px-4">{categoryBadge(row.category)}</td>
                    <td className="py-3.5 px-4">
                      <span className="text-sm font-normal text-gray-11 font-family-dm-sans">
                        {SOURCE_LABELS[row.source] ?? row.source}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 max-w-[min(100%,380px)]">
                      <span className="text-sm font-semibold text-gray-12 font-family-dm-sans leading-snug block wrap-break-word">
                        {row.action}
                      </span>
                      {row.path ? (
                        <span className="text-xs text-gray-11 font-mono block mt-1 wrap-break-word">
                          {row.path}
                        </span>
                      ) : null}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-sm font-normal text-gray-11 font-family-dm-sans whitespace-nowrap">
                        {row.ip ?? "—"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-sm font-normal text-gray-11 font-family-dm-sans whitespace-nowrap">
                        {formatLogDateTime(row.occurredAt)}
                      </span>
                    </td>
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
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && (
          <Pagination
            totalPages={totalPages}
            currentPage={page}
            onPageChange={setPage}
          />
        )}
      </div>

      {!loading && (
        <div className="md:hidden mt-3">
          <Pagination
            totalPages={totalPages}
            currentPage={page}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}
