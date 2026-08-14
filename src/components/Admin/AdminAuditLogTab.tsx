"use client";

import { useEffect, useState } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  Building2,
  UserRound,
  ChevronDown,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/utils/cn";
import type { DateRange } from "react-day-picker";
import { LogDateRangeFilter, dateRangeToParams } from "@/components/LogDateRangeFilter";
import { Button } from "@/components/Button";
import { UserAvatar } from "@/components/UserAvatar";
import { adminService } from "@/services";
import { queryKeys } from "@/services/cache/QueryClient";
import type {
  AdminAuditLogItem,
  AdminAuditOrganization,
} from "@/services/admin/AdminService";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import toast from "react-hot-toast";
import { AdminAuditLogDetailsDrawer } from "./AdminAuditLogDetailsDrawer";
import type { AdminAuditChangeDetail } from "@/services/admin/AdminService";
import { Pagination } from "../Pagination";
import { formatDateBRT, formatTimeBRT } from "@/utils/datetimeBR";

const ITEMS_PER_PAGE = 20;
const ORG_PICKER_PAGE_SIZE = 20;

const UUID_PARAM_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUuidParam(value: string): boolean {
  return UUID_PARAM_RE.test(value.trim());
}

const KIND_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Todos os tipos" },
  { value: "ORGANIZATION_UPDATE", label: "ORGANIZATION_UPDATE" },
  { value: "EVENT_CREATE", label: "EVENT_CREATE" },
  { value: "EVENT_UPDATE", label: "EVENT_UPDATE" },
  { value: "TICKET_UPDATE", label: "TICKET_UPDATE" },
  { value: "PRODUCT_CREATE", label: "PRODUCT_CREATE" },
  { value: "PRODUCT_UPDATE", label: "PRODUCT_UPDATE" },
  { value: "PRODUCT_DELETE", label: "PRODUCT_DELETE" },
  { value: "PAGE_VIEW", label: "PAGE_VIEW" },
  { value: "MEMBER_ADD", label: "MEMBER_ADD" },
  { value: "MEMBER_REMOVE", label: "MEMBER_REMOVE" },
  { value: "MEMBER_ROLE", label: "MEMBER_ROLE" },
  { value: "MEMBER_PERMISSIONS", label: "MEMBER_PERMISSIONS" },
  { value: "MEMBER_EVENTS", label: "MEMBER_EVENTS" },
  { value: "MEMBER_SETTINGS", label: "MEMBER_SETTINGS" },
];

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

function auditLogContextLine(
  meta: Record<string, unknown> | undefined
): string | null {
  if (!meta) return null;
  const page = typeof meta.page === "string" ? meta.page : null;
  return page || null;
}

function formatChangeValueShort(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "object") {
    try {
      const s = JSON.stringify(value);
      return s.length > 48 ? `${s.slice(0, 45)}…` : s;
    } catch {
      return "…";
    }
  }
  const s = String(value);
  return s.length > 40 ? `${s.slice(0, 37)}…` : s;
}

function changeDetailsPreviewLine(
  details: AdminAuditChangeDetail[] | null | undefined,
  max = 2
): string | null {
  if (!details?.length) return null;
  const parts = details.slice(0, max).map((d) => {
    const label = d.fieldLabel || d.field;
    return `${label}: ${formatChangeValueShort(d.oldValue)} → ${formatChangeValueShort(d.newValue)}`;
  });
  const more =
    details.length > max ? ` (+${details.length - max} alteração(ões))` : "";
  return parts.join(" · ") + more;
}

function formatOrgPickerLabel(org: AdminAuditOrganization): string {
  const main = org.name?.trim() || org.tradeName?.trim();
  if (main && org.email) return `${main} · ${org.email}`;
  if (main) return main;
  if (org.email?.trim()) return org.email.trim();
  return org.id;
}

function orgListPrimaryLine(org: AdminAuditOrganization): string {
  return (
    org.name?.trim() ||
    org.tradeName?.trim() ||
    org.email?.trim() ||
    "(Sem nome)"
  );
}

export function AdminAuditLogTab() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<
    string | null
  >(null);
  const [selectedOrganizationLabel, setSelectedOrganizationLabel] =
    useState("");
  const [orgPopoverOpen, setOrgPopoverOpen] = useState(false);
  const [orgSearch, setOrgSearch] = useState("");
  const [debouncedOrgSearch, setDebouncedOrgSearch] = useState("");
  const [orgListPage, setOrgListPage] = useState(1);
  const [orgListItems, setOrgListItems] = useState<AdminAuditOrganization[]>(
    []
  );
  const [orgListTotalPages, setOrgListTotalPages] = useState(1);
  const [orgListLoading, setOrgListLoading] = useState(false);
  const [userFilter, setUserFilter] = useState("");
  const [debouncedUserFilter, setDebouncedUserFilter] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [kindFilter, setKindFilter] = useState("");
  const [page, setPage] = useState(1);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<AdminAuditLogItem | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedOrgSearch(orgSearch.trim()), 300);
    return () => clearTimeout(t);
  }, [orgSearch]);

  useEffect(() => {
    setOrgListPage(1);
  }, [debouncedOrgSearch]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedUserFilter(userFilter.trim()), 400);
    return () => clearTimeout(t);
  }, [userFilter]);

  useEffect(() => {
    setPage(1);
  }, [
    debouncedSearch,
    selectedOrganizationId,
    debouncedUserFilter,
    dateRange,
    kindFilter,
  ]);

  useEffect(() => {
    if (!orgPopoverOpen) return;
    let cancelled = false;
    (async () => {
      setOrgListLoading(true);
      try {
        const { items: next, pagination } =
          await adminService.getAdminOrganizations({
            page: orgListPage,
            limit: ORG_PICKER_PAGE_SIZE,
            search: debouncedOrgSearch || undefined,
          });
        if (cancelled) return;
        setOrgListItems(next);
        setOrgListTotalPages(Math.max(1, pagination.totalPages));
      } catch (e: any) {
        if (cancelled) return;
        toast.error(
          e?.response?.data?.message ||
          e?.message ||
          "Erro ao carregar organizações."
        );
        setOrgListItems([]);
        setOrgListTotalPages(1);
      } finally {
        if (!cancelled) setOrgListLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orgPopoverOpen, orgListPage, debouncedOrgSearch]);

  useEffect(() => {
    setOrgListPage((p) => Math.min(p, orgListTotalPages));
  }, [orgListTotalPages]);

  const dateParams = dateRangeToParams(dateRange);
  const dateKey = dateParams.from ? `${dateParams.from}_${dateParams.to}` : "";

  const auditLogsQuery = useQuery({
    queryKey: queryKeys.admin.auditLogs.list({
      page,
      search: debouncedSearch,
      organizationId: selectedOrganizationId ?? "",
      userFilter: debouncedUserFilter,
      dateFilter: dateKey,
      kindFilter,
    }),
    queryFn: async () => {
      const { from, to } = dateParams;
      const organizationId = selectedOrganizationId ?? undefined;
      const userId = isValidUuidParam(debouncedUserFilter)
        ? debouncedUserFilter.trim()
        : undefined;
      const userSearch =
        !userId && debouncedUserFilter.trim() ? debouncedUserFilter.trim() : undefined;
      const { items: nextItems, pagination } = await adminService.getAuditLogs({
        page,
        limit: ITEMS_PER_PAGE,
        q: debouncedSearch || undefined,
        from,
        to,
        kind: kindFilter.trim() || undefined,
        organizationId,
        userId,
        userSearch,
      });
      return {
        items: nextItems,
        total: pagination.total,
        totalPages: Math.max(1, pagination.totalPages),
      };
    },
    placeholderData: (prev) => prev,
  });

  useEffect(() => {
    if (!auditLogsQuery.error) return;
    const e = auditLogsQuery.error as any;
    if (e?.response?.status === 403) {
      toast.error(
        e?.response?.data?.message ||
          "Você não tem permissão para visualizar o log global.",
      );
    } else {
      toast.error(
        e?.response?.data?.message || e?.message || "Erro ao carregar o log do sistema.",
      );
    }
  }, [auditLogsQuery.error]);

  const items = auditLogsQuery.data?.items ?? [];
  const total = auditLogsQuery.data?.total ?? 0;
  const totalPages = auditLogsQuery.data?.totalPages ?? 1;
  const loading = auditLogsQuery.isLoading;

  const safePage = Math.min(page, totalPages);

  useEffect(() => {
    setPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  const countLabel =
    total === 1
      ? "1 Registro encontrado"
      : `${total} Registros encontrados`;

  const inputShell =
    "h-12 w-full rounded-lg border border-gray-6 bg-gray-1 px-3 text-sm text-gray-12 placeholder:text-gray-11 font-family-dm-sans outline-none focus-visible:border-gray-4 focus-visible:ring-[3px] focus-visible:ring-gray-4/50 ";

  const orgLabel = (row: AdminAuditLogItem) =>
    row.organizationName?.trim() ||
    row.organizationId ||
    "—";

  const orgTriggerLabel = selectedOrganizationId
    ? selectedOrganizationLabel || selectedOrganizationId
    : "Todas as organizações";

  const orgListSafePage = Math.min(orgListPage, orgListTotalPages);

  const filtersActiveForEmptyCopy =
    Boolean(debouncedSearch) ||
    Boolean(dateRange) ||
    Boolean(kindFilter) ||
    selectedOrganizationId != null ||
    Boolean(debouncedUserFilter);

  return (
    <div>
      <AdminAuditLogDetailsDrawer
        isOpen={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setSelected(null);
        }}
        item={selected}
      />

      <div className="rounded-xl border border-gray-6 bg-gray-1 p-3 md:p-4  mb-4 md:mb-5">
        <h2 className="text-base font-bold text-gray-12 font-manrope leading-[1.1] mb-3 md:hidden">
          Lista de registros
        </h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch sm:flex-wrap">
          <div className="relative flex-1 min-w-0 sm:min-w-[200px]">
            <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 size-5 text-gray-11 pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Busca no texto da ação (q)…"
              className={cn(
                inputShell,
                "pl-11 md:pl-12 text-base md:text-sm"
              )}
            />
          </div>
          <div className="w-full sm:w-[min(100%,220px)] shrink-0">
            <label className="sr-only">Filtrar por tipo (kind)</label>
            <select
              value={kindFilter}
              onChange={(e) => setKindFilter(e.target.value)}
              className={cn(
                inputShell,
                "text-base md:text-sm cursor-pointer appearance-none bg-[length:1rem] bg-[right_0.75rem_center] bg-no-repeat pr-10"
              )}
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23737373' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
              }}
            >
              {KIND_FILTER_OPTIONS.map((o) => (
                <option key={o.value || "all"} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex w-full sm:w-[220px] shrink-0 gap-1.5 items-stretch">
            <LogDateRangeFilter
              value={dateRange}
              onChange={setDateRange}
              className="flex-1 min-w-0"
            />
            {dateRange ? (
              <button
                type="button"
                onClick={() => setDateRange(undefined)}
                className="shrink-0 size-12 rounded-lg border border-gray-6 bg-gray-1 text-gray-11 hover:bg-gray-2 hover:text-gray-12  flex items-center justify-center transition-colors"
                aria-label="Limpar filtro de data"
              >
                <X className="size-4" />
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:flex-wrap">
          <div className="flex flex-1 min-w-0 sm:min-w-[260px] gap-1.5 items-stretch">
            <Popover open={orgPopoverOpen} onOpenChange={setOrgPopoverOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    inputShell,
                    "relative flex items-center justify-between gap-2 text-left pl-11 md:pl-12 text-base md:text-sm"
                  )}
                >
                  <Building2 className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 size-5 text-gray-11 pointer-events-none" />
                  <span className="truncate min-w-0 font-family-dm-sans">
                    {orgTriggerLabel}
                  </span>
                  <ChevronDown className="size-4 text-gray-11 shrink-0" />
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                className="w-[min(calc(100vw-2rem),400px)] p-0 border-gray-6 bg-gray-1 shadow-lg"
              >
                <div className="p-3 border-b border-gray-6 space-y-2">
                  <p className="text-xs font-semibold text-gray-12 font-family-dm-sans">
                    Organização
                  </p>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-gray-11 pointer-events-none" />
                    <input
                      type="search"
                      value={orgSearch}
                      onChange={(e) => setOrgSearch(e.target.value)}
                      placeholder="Nome, razão social, e-mail ou documento…"
                      className={cn(
                        inputShell,
                        "h-10 pl-9 text-sm py-0"
                      )}
                    />
                  </div>
                </div>
                <div className="max-h-64 overflow-y-auto p-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedOrganizationId(null);
                      setSelectedOrganizationLabel("");
                      setOrgPopoverOpen(false);
                    }}
                    className={cn(
                      "w-full text-left rounded-lg px-3 py-2.5 text-sm font-family-dm-sans transition-colors",
                      selectedOrganizationId === null
                        ? "bg-primary-3 text-primary-12 font-semibold"
                        : "text-gray-12 hover:bg-gray-2"
                    )}
                  >
                    Todas as organizações
                  </button>
                  {orgListLoading ? (
                    <p className="px-3 py-4 text-sm text-gray-11 font-family-dm-sans text-center">
                      Carregando…
                    </p>
                  ) : orgListItems.length === 0 ? (
                    <p className="px-3 py-4 text-sm text-gray-11 font-family-dm-sans text-center">
                      Nenhuma organização encontrada.
                    </p>
                  ) : (
                    orgListItems.map((org) => {
                      const primary = orgListPrimaryLine(org);
                      const nameT = org.name?.trim();
                      const tradeT = org.tradeName?.trim();
                      const showFantasia = Boolean(
                        nameT && tradeT && tradeT !== nameT
                      );
                      const counts =
                        org.memberCount != null || org.eventCount != null
                          ? [
                            org.memberCount != null
                              ? `${org.memberCount} membros`
                              : null,
                            org.eventCount != null
                              ? `${org.eventCount} eventos`
                              : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")
                          : null;
                      return (
                        <button
                          key={org.id}
                          type="button"
                          onClick={() => {
                            setSelectedOrganizationId(org.id);
                            setSelectedOrganizationLabel(
                              formatOrgPickerLabel(org)
                            );
                            setOrgPopoverOpen(false);
                          }}
                          className={cn(
                            "w-full text-left rounded-lg px-3 py-2.5 text-sm font-family-dm-sans transition-colors",
                            selectedOrganizationId === org.id
                              ? "bg-primary-3 text-primary-12"
                              : "text-gray-12 hover:bg-gray-2"
                          )}
                        >
                          <span className="font-semibold block truncate">
                            {primary}
                          </span>
                          {showFantasia ? (
                            <span className="text-xs text-gray-11 block truncate mt-0.5">
                              {org.tradeName}
                            </span>
                          ) : null}
                          {org.email ? (
                            <span className="text-xs text-gray-11 block truncate mt-0.5">
                              {org.email}
                            </span>
                          ) : null}
                          {org.document ? (
                            <span className="text-[11px] font-mono text-gray-11 block truncate mt-0.5">
                              {org.document}
                            </span>
                          ) : null}
                          {counts ? (
                            <span className="text-[11px] text-gray-11 block truncate mt-0.5">
                              {counts}
                            </span>
                          ) : null}
                          <span className="text-[11px] font-mono text-gray-11/80 block truncate mt-0.5">
                            {org.id}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
                {orgListTotalPages > 1 ? (
                  <div className="flex items-center justify-between gap-2 p-2 border-t border-gray-6">
                    <button
                      type="button"
                      onClick={() =>
                        setOrgListPage((p) => Math.max(1, p - 1))
                      }
                      disabled={orgListSafePage <= 1}
                      className="size-8 shrink-0 rounded-lg border border-gray-6 bg-gray-4/80 hover:bg-gray-4 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                      aria-label="Página anterior de organizações"
                    >
                      <ChevronLeft className="size-4 text-gray-12" />
                    </button>
                    <span className="text-xs text-gray-11 font-family-dm-sans tabular-nums">
                      {orgListSafePage} / {orgListTotalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setOrgListPage((p) =>
                          Math.min(orgListTotalPages, p + 1)
                        )
                      }
                      disabled={orgListSafePage >= orgListTotalPages}
                      className="size-8 shrink-0 rounded-lg border border-gray-6 bg-gray-4/80 hover:bg-gray-4 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                      aria-label="Próxima página de organizações"
                    >
                      <ChevronRight className="size-4 text-gray-12" />
                    </button>
                  </div>
                ) : null}
              </PopoverContent>
            </Popover>
            {selectedOrganizationId ? (
              <button
                type="button"
                onClick={() => {
                  setSelectedOrganizationId(null);
                  setSelectedOrganizationLabel("");
                }}
                className="shrink-0 size-12 rounded-lg border border-gray-6 bg-gray-1 text-gray-11 hover:bg-gray-2 hover:text-gray-12  flex items-center justify-center transition-colors"
                aria-label="Limpar filtro de organização"
              >
                <X className="size-4" />
              </button>
            ) : null}
          </div>
          <div className="relative flex-1 min-w-0 sm:min-w-[220px]">
            <label className="sr-only">Filtrar por usuário (UUID ou nome)</label>
            <UserRound className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 size-5 text-gray-11 pointer-events-none" />
            <input
              type="text"
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              placeholder="UUID ou nome do usuário"
              autoComplete="off"
              spellCheck={false}
              className={cn(
                inputShell,
                "pl-11 md:pl-12 text-base md:text-sm"
              )}
            />
          </div>
          <div className="flex w-full sm:w-auto shrink-0 gap-1.5 items-start">
            {userFilter ? (
              <button
                type="button"
                onClick={() => setUserFilter("")}
                className="shrink-0 size-12 rounded-lg border border-gray-6 bg-gray-1 text-gray-11 hover:bg-gray-2 hover:text-gray-12  flex items-center justify-center transition-colors"
                aria-label="Limpar filtro de usuário"
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
          items.map((row) => {
            const metaHint = auditLogContextLine(row.metadata);
            const changesPreview = changeDetailsPreviewLine(row.changeDetails);
            return (
              <div
                key={row.id}
                className="rounded-xl border border-gray-6 bg-gray-1 p-4 "
              >
                <p className="text-xs text-gray-11 font-family-dm-sans mb-2">
                  Organização:{" "}
                  <span className="font-semibold text-gray-12">
                    {orgLabel(row)}
                  </span>
                  {row.organizationEmail ? (
                    <span className="block mt-0.5 text-gray-11 font-normal">
                      {row.organizationEmail}
                    </span>
                  ) : null}
                </p>
                {row.kind ? (
                  <p className="text-xs text-gray-11 font-family-dm-sans mb-2">
                    Tipo:{" "}
                    <span className="font-semibold text-gray-12 font-mono">
                      {row.kind}
                    </span>
                  </p>
                ) : null}
                <p className="text-xs text-gray-11 font-family-dm-sans mb-2">
                  IP: {row.ip}
                </p>
                <div className="flex items-start gap-2.5">
                  <UserAvatar
                    avatarUrl={row.userAvatarUrl}
                    name={row.userName}
                    initials={getInitials(row.userName)}
                    shape="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-12 font-family-dm-sans leading-[1.3] wrap-break-word">
                      {row.userName}
                    </p>
                  </div>
                </div>

                <div className="mt-2.5">
                  <p className="text-xs text-gray-11 font-family-dm-sans">Ação:</p>
                  <p className="text-sm font-semibold text-gray-12 font-family-dm-sans leading-[1.3] wrap-break-word">
                    {row.action}
                  </p>
                  {row.editedFields ? (
                    <p className="mt-1 text-xs text-gray-11 font-family-dm-sans wrap-break-word">
                      <span className="font-semibold text-gray-12">
                        Campos:{" "}
                      </span>
                      {row.editedFields}
                    </p>
                  ) : null}
                  {changesPreview ? (
                    <p className="mt-1 text-xs text-gray-11 font-family-dm-sans wrap-break-word">
                      {changesPreview}
                    </p>
                  ) : null}
                  {metaHint ? (
                    <p className="mt-1 text-xs text-gray-11 font-family-dm-sans wrap-break-word">
                      {metaHint}
                    </p>
                  ) : null}
                </div>

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
            );
          })
        )}
      </div>

      <div className="hidden md:block rounded-xl border border-gray-6 bg-gray-1 overflow-hidden ">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px]">
            <thead>
              <tr className="bg-gray-3 border-b border-gray-6">
                <th className="text-left py-3.5 px-4 text-xs font-semibold text-gray-11 font-family-dm-sans uppercase tracking-wide">
                  IP
                </th>
                <th className="text-left py-3.5 px-4 text-xs font-semibold text-gray-11 font-family-dm-sans uppercase tracking-wide">
                  Usuário
                </th>
                <th className="text-left py-3.5 px-4 text-xs font-semibold text-gray-11 font-family-dm-sans uppercase tracking-wide">
                  Organização
                </th>
                <th className="text-left py-3.5 px-4 text-xs font-semibold text-gray-11 font-family-dm-sans uppercase tracking-wide">
                  Tipo
                </th>
                <th className="text-left py-3.5 px-4 text-xs font-semibold text-gray-11 font-family-dm-sans uppercase tracking-wide">
                  Ação / detalhes
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
                items.map((row) => {
                  const metaHint = auditLogContextLine(row.metadata);
                  const changesPreview = changeDetailsPreviewLine(
                    row.changeDetails
                  );
                  return (
                    <tr
                      key={row.id}
                      className="hover:bg-gray-2/80 transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <span className="text-sm font-semibold text-gray-12 font-family-dm-sans">
                          {row.ip}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-sm font-semibold text-gray-12 font-family-dm-sans">
                          {row.userName}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-sm font-semibold text-gray-12 font-family-dm-sans leading-snug block">
                          {orgLabel(row)}
                        </span>
                        {row.organizationEmail ? (
                          <span className="text-xs text-gray-11 font-family-dm-sans block mt-0.5 wrap-break-word">
                            {row.organizationEmail}
                          </span>
                        ) : null}
                      </td>
                      <td className="py-3.5 px-4 align-top">
                        <span className="text-xs font-mono text-gray-12 leading-snug block wrap-break-word max-w-[140px]">
                          {row.kind || "—"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 max-w-[min(100%,380px)]">
                        <span className="text-sm font-semibold text-gray-12 font-family-dm-sans leading-snug block wrap-break-word">
                          {row.action}
                        </span>
                        {row.editedFields ? (
                          <span className="text-xs text-gray-11 font-family-dm-sans block mt-1 wrap-break-word">
                            <span className="font-semibold text-gray-12">
                              Campos:{" "}
                            </span>
                            {row.editedFields}
                          </span>
                        ) : null}
                        {changesPreview ? (
                          <span className="text-xs text-gray-11 font-family-dm-sans block mt-1 wrap-break-word">
                            {changesPreview}
                          </span>
                        ) : null}
                        {metaHint ? (
                          <span className="text-xs text-gray-11 font-family-dm-sans block mt-0.5 wrap-break-word">
                            {metaHint}
                          </span>
                        ) : null}
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!loading && (
          <Pagination
            totalPages={totalPages}
            currentPage={page}
            onPageChange={setPage}
            totalItems={total}
            pageSize={ITEMS_PER_PAGE}
          />
        )}
      </div>

      {!loading && (
        <div className="md:hidden mt-3">
          <Pagination
            totalPages={totalPages}
            currentPage={page}
            onPageChange={setPage}
            totalItems={total}
            pageSize={ITEMS_PER_PAGE}
          />
        </div>
      )}
    </div>
  );
}
