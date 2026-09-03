"use client";

import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/utils/cn";
import type { DateRange } from "react-day-picker";
import { LogDateRangeFilter, dateRangeToParams } from "@/components/LogDateRangeFilter";
import { organizerService } from "@/services";
import type { OrganizationAuditLogItem } from "@/services/organizer/OrganizerService";
import toast from "react-hot-toast";
import { formatDateBRT, formatTimeBRT } from "@/utils/datetimeBR";
import { UserAvatar } from "@/components/UserAvatar";
import { Pagination } from "@/components/Pagination";

export type SystemLogEntry = OrganizationAuditLogItem;

const ITEMS_PER_PAGE = 8;

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

/** Resumo de `metadata` para linha auxiliar (kind, page). */
function auditLogContextLine(
  meta: Record<string, unknown> | undefined
): string | null {
  if (!meta) return null;
  const kind = typeof meta.kind === "string" ? meta.kind : null;
  const page = typeof meta.page === "string" ? meta.page : null;
  const parts: string[] = [];
  if (kind) parts.push(kind);
  if (page) parts.push(page);
  return parts.length > 0 ? parts.join(" · ") : null;
}

const AUDIT_FIELD_LABELS: Record<string, string> = {
  name: "Nome",
  eventDate: "Data do evento",
  slug: "Slug",
  title: "Título",
  description: "Descrição",
  startDate: "Data de início",
  endDate: "Data de término",
  location: "Local",
  address: "Endereço",
  city: "Cidade",
  state: "Estado",
  zipCode: "CEP",
  capacity: "Capacidade",
  status: "Status",
  visibility: "Visibilidade",
  image: "Imagem",
  banner: "Banner",
};

function formatAuditFieldLabel(field: string): string {
  const key = field.trim();
  return AUDIT_FIELD_LABELS[key] || key;
}

function stringifyAuditValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

type AuditChangeEntry = { field: string; oldVal: string; newVal: string };

function parseAuditEditDetails(meta: Record<string, unknown> | undefined): {
  summaryLine: string | null;
  changes: AuditChangeEntry[];
} | null {
  if (!meta || typeof meta !== "object") return null;

  const kind = meta.kind;
  const hasChanges = Array.isArray(meta.changes);
  const hasEditedFieldsStr = typeof meta.editedFields === "string";
  const hasFieldsEdited = Array.isArray(meta.fieldsEdited);

  const isEditLike =
    kind === "EVENT_UPDATE" ||
    hasChanges ||
    hasEditedFieldsStr ||
    hasFieldsEdited;

  if (!isEditLike) return null;

  const changes: AuditChangeEntry[] = [];
  if (hasChanges) {
    for (const item of meta.changes as unknown[]) {
      if (!item || typeof item !== "object") continue;
      const o = item as Record<string, unknown>;
      const field = typeof o.field === "string" ? o.field : "";
      if (!field) continue;
      const oldVal =
        o.old ?? o.oldValue ?? o.valorAntigo ?? o.previous ?? o.from;
      const newVal =
        o.new ?? o.newValue ?? o.valorNovo ?? o.current ?? o.to;
      changes.push({
        field,
        oldVal: stringifyAuditValue(oldVal),
        newVal: stringifyAuditValue(newVal),
      });
    }
  }

  const editedFieldsStr =
    hasEditedFieldsStr ? (meta.editedFields as string).trim() : "";

  const fieldsEdited = hasFieldsEdited
    ? (meta.fieldsEdited as unknown[]).filter(
      (x): x is string => typeof x === "string" && x.trim() !== ""
    )
    : [];

  let summaryLine: string | null = null;
  if (editedFieldsStr) {
    summaryLine = editedFieldsStr;
  } else if (fieldsEdited.length > 0) {
    summaryLine = fieldsEdited.map(formatAuditFieldLabel).join(", ");
  } else if (changes.length > 0) {
    summaryLine = changes.map((c) => formatAuditFieldLabel(c.field)).join(", ");
  }

  if (!summaryLine && changes.length === 0) return null;

  return { summaryLine, changes };
}

function AuditLogEditDetailsBlock({
  meta,
}: {
  meta: Record<string, unknown> | undefined;
}) {
  const parsed = parseAuditEditDetails(meta);
  if (!parsed) return null;

  const { summaryLine, changes } = parsed;

  return (
    <div className="space-y-1.5">
      {summaryLine ? (
        <p className="text-xs text-gray-11 font-family-dm-sans wrap-break-word">
          <span className="font-semibold text-gray-12">Campos alterados: </span>
          {summaryLine}
        </p>
      ) : null}
    </div>
  );
}

export function SystemAuditLogTab() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<OrganizationAuditLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, dateRange]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setForbidden(false);
      try {
        const { from, to } = dateRangeToParams(dateRange);
        const { items: nextItems, pagination } =
          await organizerService.getOrganizationAuditLogs({
            page,
            limit: ITEMS_PER_PAGE,
            q: debouncedSearch || undefined,
            from,
            to,
          });
        if (cancelled) return;
        setItems(nextItems);
        setTotal(pagination.total);
        setTotalPages(Math.max(1, pagination.totalPages));
      } catch (e: any) {
        if (cancelled) return;
        if (e?.response?.status === 403) {
          setForbidden(true);
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
  }, [page, debouncedSearch, dateRange]);

  const safePage = Math.min(page, totalPages);

  useEffect(() => {
    setPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  const countLabel =
    total === 1
      ? "1 Registro encontrado"
      : `${total} Registros encontrados`;

  const inputShell =
    "h-12 w-full rounded-lg border border-gray-6 bg-gray-1 px-3 text-sm text-gray-12 placeholder:text-gray-11 font-family-dm-sans outline-none focus-visible:border-gray-4 focus-visible:ring-[3px] focus-visible:ring-gray-4/50";

  if (forbidden) {
    return (
      <div className="rounded-xl border border-gray-6 bg-gray-1 p-10 text-center">
        <p className="text-gray-11 font-family-dm-sans text-sm max-w-md mx-auto leading-relaxed">
          Apenas o <strong className="text-gray-12">proprietário</strong> da
          organização pode visualizar o log de atividades do sistema.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="md:hidden text-2xl font-extrabold text-gray-12 font-manrope leading-[1.1] mb-1">
        Lista de Logs
      </h2>
      <p className="md:hidden text-sm text-gray-11 font-family-dm-sans mb-3">
        {loading ? "Carregando…" : countLabel}
      </p>

      <div className="flex flex-col gap-3 rounded-xl border border-gray-6 bg-gray-1 p-3 sm:flex-row sm:items-stretch sm:p-4 mb-5">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-gray-11 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título..."
            className="w-full h-12 pl-11 md:pl-12 pr-4 rounded-lg border border-gray-6 bg-gray-1 text-base md:text-sm text-gray-12 placeholder:text-gray-11 font-family-dm-sans outline-none focus-visible:border-gray-4 focus-visible:ring-[3px] focus-visible:ring-gray-4/50"
          />
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
              className="shrink-0 size-12 rounded-lg border border-gray-6 bg-gray-1 text-gray-11 hover:bg-gray-2 hover:text-gray-12 flex items-center justify-center transition-colors"
              aria-label="Limpar filtro de data"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>
      </div>

      <p className="hidden md:block text-sm text-gray-11 font-medium font-family-dm-sans mb-3">
        {loading ? "Carregando…" : countLabel}
      </p>

      <div className="md:hidden flex flex-col gap-2.5">
        {loading ? (
          <div className="rounded-xl border border-gray-6 bg-gray-1 py-14 text-center text-sm text-gray-11 font-family-dm-sans">
            Carregando registros…
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-gray-6 bg-gray-1 py-14 text-center text-sm text-gray-11 font-family-dm-sans px-4">
            {debouncedSearch || dateRange
              ? "Nenhum registro encontrado com os filtros atuais."
              : "Nenhum registro disponível."}
          </div>
        ) : (
          items.map((row) => {
            const metaHint = auditLogContextLine(row.metadata);
            return (
              <div
                key={row.id}
                className="rounded-xl border border-gray-6 bg-gray-1 p-3.5"
              >
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
                  {metaHint ? (
                    <p className="mt-1 text-xs text-gray-11 font-family-dm-sans wrap-break-word">
                      {metaHint}
                    </p>
                  ) : null}
                  <AuditLogEditDetailsBlock meta={row.metadata} />
                </div>

                <div className="mt-3 rounded-lg border border-gray-6 bg-gray-2 px-3 py-2 flex items-center justify-between gap-2">
                  <span className="text-xs text-gray-11 font-family-dm-sans">
                    Data/Hora:
                  </span>
                  <span className="text-sm font-semibold text-gray-12 font-family-dm-sans whitespace-nowrap">
                    {formatLogDateTime(row.occurredAt)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="hidden md:block rounded-xl border border-gray-6 bg-gray-1 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead>
              <tr className="bg-gray-3 border-b border-gray-6">
                <th className="text-left py-3.5 px-4 text-xs font-semibold text-gray-11 font-family-dm-sans uppercase tracking-wide">
                  IP
                </th>
                <th className="text-left py-3.5 px-4 text-xs font-semibold text-gray-11 font-family-dm-sans uppercase tracking-wide">
                  Usuário
                </th>
                <th className="text-left py-3.5 px-4 text-xs font-semibold text-gray-11 font-family-dm-sans uppercase tracking-wide">
                  Ação
                </th>
                <th className="text-left py-3.5 px-4 text-xs font-semibold text-gray-11 font-family-dm-sans uppercase tracking-wide">
                  Data/Hora
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-6">
              {loading ? (
                <tr>
                  <td
                    colSpan={4}
                    className="py-16 text-center text-sm text-gray-11 font-family-dm-sans"
                  >
                    Carregando registros…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="py-16 text-center text-sm text-gray-11 font-family-dm-sans"
                  >
                    {debouncedSearch || dateRange
                      ? "Nenhum registro encontrado com os filtros atuais."
                      : "Nenhum registro disponível."}
                  </td>
                </tr>
              ) : (
                items.map((row, idx) => {
                  const metaHint = auditLogContextLine(row.metadata);
                  return (
                    <tr
                      key={row.id}
                      className={cn(
                        "transition-colors hover:bg-gray-2/60",
                        idx % 2 === 1 ? "bg-gray-2/35" : "bg-gray-1"
                      )}
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
                      <td className="py-3.5 px-4 max-w-[min(100%,420px)]">
                        <span className="text-sm font-semibold text-gray-12 font-family-dm-sans leading-snug block wrap-break-word">
                          {row.action}
                        </span>
                        <AuditLogEditDetailsBlock meta={row.metadata} />
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-sm font-normal text-gray-11 font-family-dm-sans whitespace-nowrap">
                          {formatLogDateTime(row.occurredAt)}
                        </span>
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
            currentPage={safePage}
            totalPages={totalPages}
            onPageChange={setPage}
            variant="table-footer"
            className="hidden md:flex"
          />
        )}
      </div>

      {!loading && (
        <Pagination
          currentPage={safePage}
          totalPages={totalPages}
          onPageChange={setPage}
          className="md:hidden py-4"
        />
      )}
    </div>
  );
}
