"use client";

import { useEffect, useState } from "react";
import { Search, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/utils/cn";
import { DatePicker } from "@/components/DatePicker";
import { organizerService } from "@/services";
import type { OrganizationAuditLogItem } from "@/services/organizer/OrganizerService";
import toast from "react-hot-toast";

export type SystemLogEntry = OrganizationAuditLogItem;

const ITEMS_PER_PAGE = 8;

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

export function SystemAuditLogTab() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");
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
  }, [debouncedSearch, dateFilter]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setForbidden(false);
      try {
        const from = dateFilter || undefined;
        const { items: nextItems, pagination } =
          await organizerService.getOrganizationAuditLogs({
            page,
            limit: ITEMS_PER_PAGE,
            q: debouncedSearch || undefined,
            from,
            to: from,
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
  }, [page, debouncedSearch, dateFilter]);

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

  if (forbidden) {
    return (
      <div className="rounded-xl border border-gray-6 bg-gray-1 p-10 text-center shadow-[0px_2px_6px_0px_rgba(17,17,17,0.08)]">
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

      <div className="flex flex-col gap-3 rounded-xl border border-gray-6 bg-gray-1 p-3 sm:flex-row sm:items-stretch sm:p-4 shadow-[0px_2px_6px_0px_rgba(17,17,17,0.08)] mb-5">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-11 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título..."
            className={cn(inputShell, "pl-11 text-base md:text-sm")}
          />
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

      <p className="hidden md:block text-sm text-gray-11 font-medium font-family-dm-sans mb-3">
        {loading ? "Carregando…" : countLabel}
      </p>

      <div className="md:hidden flex flex-col gap-2.5">
        {loading ? (
          <div className="rounded-xl border border-gray-6 bg-gray-1 py-14 text-center text-sm text-gray-11 font-family-dm-sans shadow-[0px_2px_6px_0px_rgba(17,17,17,0.08)]">
            Carregando registros…
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-gray-6 bg-gray-1 py-14 text-center text-sm text-gray-11 font-family-dm-sans shadow-[0px_2px_6px_0px_rgba(17,17,17,0.08)] px-4">
            {debouncedSearch || dateFilter
              ? "Nenhum registro encontrado com os filtros atuais."
              : "Nenhum registro disponível."}
          </div>
        ) : (
          items.map((row) => {
            const metaHint = auditLogContextLine(row.metadata);
            return (
            <div
              key={row.id}
              className="rounded-xl border border-gray-6 bg-gray-1 p-3.5 shadow-[0px_2px_6px_0px_rgba(17,17,17,0.08)]"
            >
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
            </div>
          );
          })
        )}
      </div>

      <div className="hidden md:block rounded-xl border border-gray-6 bg-gray-1 overflow-hidden shadow-[0px_2px_6px_0px_rgba(17,17,17,0.08)]">
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
                    {debouncedSearch || dateFilter
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
                    <td className="py-3.5 px-4">
                      <span className="text-sm font-semibold text-gray-12 font-family-dm-sans leading-snug block">
                        {row.action}
                      </span>
                      {metaHint ? (
                        <span className="mt-1 block text-xs text-gray-11 font-family-dm-sans wrap-break-word max-w-md">
                          {metaHint}
                        </span>
                      ) : null}
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

        {!loading && totalPages > 1 && (
          <div className="hidden md:flex items-center justify-end gap-2 px-4 py-5 border-t border-gray-6">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className="size-8 rounded-lg border border-gray-6 bg-gray-4/80 hover:bg-gray-4 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
              aria-label="Página anterior"
            >
              <ChevronLeft className="size-4 text-gray-12" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPage(p)}
                className={cn(
                  "size-8 rounded-lg border text-sm font-medium font-family-dm-sans transition-colors",
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
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              className="size-8 rounded-lg border border-gray-6 bg-gray-4/80 hover:bg-gray-4 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
              aria-label="Próxima página"
            >
              <ChevronRight className="size-4 text-gray-12" />
            </button>
          </div>
        )}
      </div>

      {!loading && totalPages > 1 && (
        <div className="md:hidden flex items-center justify-center gap-2 px-0 py-4">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage <= 1}
            className="size-8 rounded-lg border border-gray-6 bg-gray-4/80 hover:bg-gray-4 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
            aria-label="Página anterior"
          >
            <ChevronLeft className="size-4 text-gray-12" />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPage(p)}
              className={cn(
                "size-8 rounded-lg border text-sm font-medium font-family-dm-sans transition-colors",
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
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage >= totalPages}
            className="size-8 rounded-lg border border-gray-6 bg-gray-4/80 hover:bg-gray-4 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
            aria-label="Próxima página"
          >
            <ChevronRight className="size-4 text-gray-12" />
          </button>
        </div>
      )}
    </div>
  );
}
