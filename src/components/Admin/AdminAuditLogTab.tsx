"use client";

import { useEffect, useState } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  Building2,
  UserRound,
} from "lucide-react";
import { cn } from "@/utils/cn";
import { DatePicker } from "@/components/DatePicker";
import { Button } from "@/components/Button";
import { adminService } from "@/services";
import type { AdminAuditLogItem } from "@/services/admin/AdminService";
import toast from "react-hot-toast";
import { AdminAuditLogDetailsDrawer } from "./AdminAuditLogDetailsDrawer";
import type { AdminAuditChangeDetail } from "@/services/admin/AdminService";

const ITEMS_PER_PAGE = 20;

const UUID_PARAM_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUuidParam(value: string): boolean {
  return UUID_PARAM_RE.test(value.trim());
}

const KIND_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Todos os tipos" },
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

function AdminLogsPaginationBar({
  totalPages,
  safePage,
  onPageChange,
  variant,
}: {
  totalPages: number;
  safePage: number;
  onPageChange: (page: number) => void;
  variant: "mobile" | "desktop";
}) {
  if (totalPages <= 1) return null;

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
        "flex items-center gap-2 min-w-0",
        isMobile &&
          "justify-center w-full max-w-full overflow-x-auto py-4 [&::-webkit-scrollbar]:hidden",
        !isMobile && "justify-end px-4 py-5 border-t border-gray-6"
      )}
      style={
        isMobile
          ? { scrollbarWidth: "none", msOverflowStyle: "none" }
          : undefined
      }
    >
      <button
        type="button"
        onClick={() => onPageChange(Math.max(1, safePage - 1))}
        disabled={safePage <= 1}
        className={navBtn}
        aria-label="Página anterior"
      >
        <ChevronLeft
          className={cn("size-4", isMobile ? "text-gray-12" : "text-gray-11")}
        />
      </button>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onPageChange(p)}
          className={pageBtn(safePage === p)}
        >
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
        <ChevronRight
          className={cn("size-4", isMobile ? "text-gray-12" : "text-gray-11")}
        />
      </button>
    </div>
  );
}

function formatLogDateTime(iso: string) {
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

export function AdminAuditLogTab() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [organizationFilter, setOrganizationFilter] = useState("");
  const [debouncedOrganizationFilter, setDebouncedOrganizationFilter] =
    useState("");
  const [userFilter, setUserFilter] = useState("");
  const [debouncedUserFilter, setDebouncedUserFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [kindFilter, setKindFilter] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<AdminAuditLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<AdminAuditLogItem | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const t = setTimeout(
      () => setDebouncedOrganizationFilter(organizationFilter.trim()),
      400
    );
    return () => clearTimeout(t);
  }, [organizationFilter]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedUserFilter(userFilter.trim()), 400);
    return () => clearTimeout(t);
  }, [userFilter]);

  useEffect(() => {
    setPage(1);
  }, [
    debouncedSearch,
    debouncedOrganizationFilter,
    debouncedUserFilter,
    dateFilter,
    kindFilter,
  ]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const from = dateFilter || undefined;
        const organizationId = isValidUuidParam(debouncedOrganizationFilter)
          ? debouncedOrganizationFilter.trim()
          : undefined;
        const userId = isValidUuidParam(debouncedUserFilter)
          ? debouncedUserFilter.trim()
          : undefined;
        const { items: nextItems, pagination } =
          await adminService.getAuditLogs({
            page,
            limit: ITEMS_PER_PAGE,
            q: debouncedSearch || undefined,
            from,
            to: from,
            kind: kindFilter.trim() || undefined,
            organizationId,
            userId,
          });
        if (cancelled) return;
        setItems(nextItems);
        setTotal(pagination.total);
        setTotalPages(Math.max(1, pagination.totalPages));
      } catch (e: any) {
        if (cancelled) return;
        if (e?.response?.status === 403) {
          toast.error(
            e?.response?.data?.message ||
              "Você não tem permissão para visualizar o log global."
          );
          setItems([]);
          setTotal(0);
          setTotalPages(1);
        } else {
          toast.error(
            e?.response?.data?.message ||
              e?.message ||
              "Erro ao carregar o log do sistema."
          );
          setItems([]);
          setTotal(0);
          setTotalPages(1);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    page,
    debouncedSearch,
    debouncedOrganizationFilter,
    debouncedUserFilter,
    dateFilter,
    kindFilter,
  ]);

  const safePage = Math.min(page, totalPages);

  useEffect(() => {
    setPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  const countLabel =
    total === 1
      ? "1 Registro encontrado"
      : `${total} Registros encontrados`;

  const inputShell =
    "h-12 w-full rounded-lg border border-gray-6 bg-gray-1 px-3 text-sm text-gray-12 placeholder:text-gray-11 font-family-dm-sans outline-none focus-visible:border-gray-4 focus-visible:ring-[3px] focus-visible:ring-gray-4/50 shadow-[0px_2px_6px_0px_rgba(17,17,17,0.08)]";

  const orgLabel = (row: AdminAuditLogItem) =>
    row.organizationName?.trim() ||
    row.organizationId ||
    "—";

  const organizationFilterInvalid =
    organizationFilter.trim().length > 0 &&
    !isValidUuidParam(organizationFilter);
  const userFilterInvalid =
    userFilter.trim().length > 0 && !isValidUuidParam(userFilter);

  const filtersActiveForEmptyCopy =
    Boolean(debouncedSearch) ||
    Boolean(dateFilter) ||
    Boolean(kindFilter) ||
    Boolean(debouncedOrganizationFilter) ||
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

      <div className="rounded-xl border border-gray-6 bg-gray-1 p-3 md:p-4 shadow-[0px_2px_6px_0px_rgba(17,17,17,0.08)] mb-4 md:mb-5">
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
            <DatePicker
              value={dateFilter || null}
              onChange={(v) => setDateFilter(v?.trim() ?? "")}
              placeholder="Filtrar por data"
              className={cn(
                "flex-1 min-w-0 border-gray-6 bg-gray-1 shadow-[0px_2px_6px_0px_rgba(17,17,17,0.08)]",
                "focus-visible:ring-[3px] focus-visible:ring-gray-4/50 focus-visible:border-gray-4"
              )}
            />
            {dateFilter ? (
              <button
                type="button"
                onClick={() => setDateFilter("")}
                className="shrink-0 size-12 rounded-lg border border-gray-6 bg-gray-1 text-gray-11 hover:bg-gray-2 hover:text-gray-12 shadow-[0px_2px_6px_0px_rgba(17,17,17,0.08)] flex items-center justify-center transition-colors"
                aria-label="Limpar filtro de data"
              >
                <X className="size-4" />
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:flex-wrap">
          <div className="relative flex-1 min-w-0 sm:min-w-[220px]">
            <label className="sr-only">Filtrar por organização (UUID)</label>
            <Building2 className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 size-5 text-gray-11 pointer-events-none" />
            <input
              type="text"
              value={organizationFilter}
              onChange={(e) => setOrganizationFilter(e.target.value)}
              placeholder="ID da organização (UUID)"
              autoComplete="off"
              spellCheck={false}
              className={cn(
                inputShell,
                "pl-11 md:pl-12 text-base md:text-sm font-mono",
                organizationFilterInvalid &&
                  "border-yellow-8 focus-visible:border-yellow-8 focus-visible:ring-yellow-8/40"
              )}
            />
            {organizationFilterInvalid ? (
              <p className="mt-1 text-xs text-yellow-11 font-family-dm-sans">
                Informe um UUID válido para filtrar por organização.
              </p>
            ) : null}
          </div>
          <div className="relative flex-1 min-w-0 sm:min-w-[220px]">
            <label className="sr-only">Filtrar por usuário (UUID)</label>
            <UserRound className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 size-5 text-gray-11 pointer-events-none" />
            <input
              type="text"
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              placeholder="ID do usuário (UUID)"
              autoComplete="off"
              spellCheck={false}
              className={cn(
                inputShell,
                "pl-11 md:pl-12 text-base md:text-sm font-mono",
                userFilterInvalid &&
                  "border-yellow-8 focus-visible:border-yellow-8 focus-visible:ring-yellow-8/40"
              )}
            />
            {userFilterInvalid ? (
              <p className="mt-1 text-xs text-yellow-11 font-family-dm-sans">
                Informe um UUID válido para filtrar por usuário.
              </p>
            ) : null}
          </div>
          <div className="flex w-full sm:w-auto shrink-0 gap-1.5 items-start">
            {organizationFilter ? (
              <button
                type="button"
                onClick={() => setOrganizationFilter("")}
                className="shrink-0 size-12 rounded-lg border border-gray-6 bg-gray-1 text-gray-11 hover:bg-gray-2 hover:text-gray-12 shadow-[0px_2px_6px_0px_rgba(17,17,17,0.08)] flex items-center justify-center transition-colors"
                aria-label="Limpar filtro de organização"
              >
                <X className="size-4" />
              </button>
            ) : null}
            {userFilter ? (
              <button
                type="button"
                onClick={() => setUserFilter("")}
                className="shrink-0 size-12 rounded-lg border border-gray-6 bg-gray-1 text-gray-11 hover:bg-gray-2 hover:text-gray-12 shadow-[0px_2px_6px_0px_rgba(17,17,17,0.08)] flex items-center justify-center transition-colors"
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
          <div className="rounded-xl border border-gray-6 bg-gray-1 py-14 text-center text-sm text-gray-11 font-family-dm-sans shadow-[0px_2px_6px_0px_rgba(17,17,17,0.08)]">
            Carregando registros…
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-gray-6 bg-gray-1 py-14 text-center text-sm text-gray-11 font-family-dm-sans shadow-[0px_2px_6px_0px_rgba(17,17,17,0.08)] px-4">
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
                className="rounded-xl border border-gray-6 bg-gray-1 p-4 shadow-[0px_2px_6px_0px_rgba(17,17,17,0.08)]"
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
                  <div className="size-8 rounded-md bg-gray-5 text-xs font-semibold text-gray-12 font-family-dm-sans flex items-center justify-center shrink-0">
                    {getInitials(row.userName)}
                  </div>
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

      <AdminLogsPaginationBar
        totalPages={totalPages}
        safePage={safePage}
        onPageChange={setPage}
        variant="mobile"
      />

      <div className="hidden md:block rounded-xl border border-gray-6 bg-gray-1 overflow-hidden shadow-[0px_2px_6px_0px_rgba(17,17,17,0.08)]">
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
          <AdminLogsPaginationBar
            totalPages={totalPages}
            safePage={safePage}
            onPageChange={setPage}
            variant="desktop"
          />
        )}
      </div>
    </div>
  );
}
