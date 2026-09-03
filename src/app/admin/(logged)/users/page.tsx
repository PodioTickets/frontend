"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/utils/cn";
import { adminService } from "@/services";
import { queryKeys } from "@/services/cache/QueryClient";
import type { AdminUser } from "@/services/admin/AdminService";
import { UserAvatar } from "@/components/UserAvatar";
import { Pagination } from "@/components/Pagination";
import { AdminUserDetailsDrawer } from "@/components/Admin/AdminUserDetailsDrawer";
import { formatTimeBRT } from "@/utils/datetimeBR";
import {
  formatDocumentDisplay,
  isPersonBr,
} from "@/utils/documentDisplay";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** createdAt é INSTANTE real → BRT (UTC-3 fixo). "DD Mon, AAAA" + hora. */
function formatDate(iso?: string): { date: string; time: string } {
  if (!iso) return { date: "—", time: "" };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: "—", time: "" };
  const months = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez",
  ];
  const brt = new Date(d.getTime() - 3 * 60 * 60 * 1000);
  return {
    date: `${String(brt.getUTCDate()).padStart(2, "0")} ${months[brt.getUTCMonth()]}, ${brt.getUTCFullYear()}`,
    time: formatTimeBRT(iso, { hour: "2-digit", minute: "2-digit" }),
  };
}

function fullName(u: AdminUser): string {
  const name = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();
  return name || u.email || "—";
}

function initialsOf(u: AdminUser): string {
  const a = (u.firstName ?? "").trim();
  const b = (u.lastName ?? "").trim();
  const init = `${a[0] ?? ""}${b[0] ?? ""}`.toUpperCase();
  return init || (u.email?.[0] ?? "U").toUpperCase();
}

/** Documento formatado (CPF mascarado quando BR) — reusa o util canônico. */
function docDisplay(u: AdminUser): string {
  const isBr = isPersonBr({
    country: u.country,
    documentType: u.documentType ?? undefined,
    document: u.documentNumber ?? undefined,
  });
  return formatDocumentDisplay(u.documentNumber, isBr) || "—";
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-2.5 py-1 text-xs font-normal font-family-dm-sans whitespace-nowrap",
        active ? "bg-primary-11 text-primary-1" : "bg-gray-4 text-gray-12",
      )}
    >
      {active ? "Ativo" : "Inativo"}
    </span>
  );
}

// ─── Pagination (com elipse, p/ muitas páginas) ─────────────────────────────────

// ─── Constants ────────────────────────────────────────────────────────────────

// `value` (não `id`): mesmo shape do filtro da tela de organizadores, que usa
// um <select> nativo em vez do SearchableSelect.
const STATUS_OPTIONS = [
  { value: "", label: "Todos os status" },
  { value: "ativo", label: "Ativo" },
  { value: "inativo", label: "Inativo" },
];

const inputShell =
  "h-12 w-full rounded-lg border border-gray-6 bg-gray-1 px-3 text-sm text-gray-12 placeholder:text-gray-11 font-family-dm-sans outline-none focus-visible:border-gray-8 ";

const ITEMS_PER_PAGE = 20;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AdminUser | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  // Volta pra página 1 quando busca/status mudam (server-side pagination).
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter]);

  const isActive =
    statusFilter === "ativo" ? true : statusFilter === "inativo" ? false : undefined;

  const listQuery = useQuery({
    queryKey: queryKeys.admin.users.list({ page, search: debouncedSearch, status: statusFilter }),
    queryFn: async () => {
      const result = await adminService.getAdminUsers({
        page,
        limit: ITEMS_PER_PAGE,
        search: debouncedSearch || undefined,
        isActive,
      });
      return {
        items: result.items,
        pagination: {
          page: result.pagination.page,
          limit: result.pagination.limit,
          total: result.pagination.total,
          totalPages: result.pagination.totalPages,
        } as Pagination,
      };
    },
    // keepPreviousData (v5): não pisca a lista ao paginar/filtrar.
    placeholderData: (prev) => prev,
  });

  const items = useMemo(() => listQuery.data?.items ?? [], [listQuery.data]);
  const pagination =
    listQuery.data?.pagination ?? { page, limit: ITEMS_PER_PAGE, total: 0, totalPages: 1 };
  const loading = listQuery.isLoading;
  const filtersActive = Boolean(debouncedSearch) || Boolean(statusFilter);

  return (
    <div className="min-h-screen bg-gray-2 pb-10">
      <AdminUserDetailsDrawer
        userId={selected?.id ?? null}
        fallback={selected}
        onClose={() => setSelected(null)}
      />

      <div className="max-w-[1222px] mx-auto w-full">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-gray-12 tracking-tight text-2xl font-extrabold font-manrope leading-[1.1]">
            Usuários
          </h1>
          <p className="mt-1 text-gray-11 font-family-dm-sans leading-[1.3] text-sm">
            Busque, visualize e gerencie os participantes cadastrados na plataforma
          </p>
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
                placeholder="Nome, CPF, IDs…"
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
                  "cursor-pointer appearance-none bg-[length:1rem] bg-[right_0.75rem_center] bg-no-repeat pr-10",
                )}
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23737373' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C%2Fsvg%3E")`,
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
              Carregando usuários…
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-xl border border-gray-6 bg-gray-1 py-14 text-center text-sm text-gray-11 font-family-dm-sans  px-4">
              {filtersActive
                ? "Nenhum usuário encontrado com os filtros atuais."
                : "Nenhum usuário cadastrado."}
            </div>
          ) : (
            items.map((u) => {
              const { date, time } = formatDate(u.createdAt);
              return (
                <div
                  key={u.id}
                  className="rounded-xl border border-gray-6 bg-gray-1 p-4  flex flex-col gap-3"
                >
                  <div className="flex items-center gap-3">
                    <UserAvatar avatarUrl={u.avatarUrl} name={fullName(u)} initials={initialsOf(u)} shape="lg" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-12 font-family-dm-sans truncate">{fullName(u)}</p>
                      <p className="text-xs text-gray-11 font-family-dm-sans truncate">{u.email || "—"}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <p className="text-xs text-gray-11 font-family-dm-sans">Documento</p>
                      <p className="text-sm font-semibold text-gray-12 font-family-dm-sans">{docDisplay(u)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-11 font-family-dm-sans">Ingressos</p>
                      <p className="text-sm font-semibold text-gray-12 font-family-dm-sans">{u.ticketsCount ?? 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-11 font-family-dm-sans">Cadastro</p>
                      <p className="text-sm font-semibold text-gray-12 font-family-dm-sans whitespace-nowrap">{date}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelected(u)}
                    className="flex h-11 items-center justify-center rounded-lg border border-gray-6 text-sm font-semibold font-family-dm-sans text-gray-12 hover:bg-gray-3 transition-colors"
                  >
                    Detalhes
                  </button>
                </div>
              );
            })
          )}

          {!loading && (
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={setPage}
              totalItems={pagination.total}
              pageSize={pagination.limit}
              className="py-4"
            />
          )}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block rounded-xl border border-gray-6 bg-gray-1 overflow-hidden ">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead>
                <tr className="bg-gray-3 border-b border-t border-gray-6">
                  <th className="text-left py-3.5 px-4 text-xs font-semibold text-gray-11 font-family-dm-sans uppercase tracking-wide w-[300px]">
                    Usuário
                  </th>
                  <th className="text-left py-3.5 px-4 text-xs font-semibold text-gray-11 font-family-dm-sans uppercase tracking-wide">
                    Documento
                  </th>
                  <th className="text-left py-3.5 px-4 text-xs font-semibold text-gray-11 font-family-dm-sans uppercase tracking-wide w-[120px]">
                    Ingressos
                  </th>
                  <th className="text-left py-3.5 px-4 text-xs font-semibold text-gray-11 font-family-dm-sans uppercase tracking-wide">
                    Cadastro
                  </th>
                  <th className="text-right py-3.5 px-4 text-xs font-semibold text-gray-11 font-family-dm-sans uppercase tracking-wide w-[130px]">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-6">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-16 text-center text-sm text-gray-11 font-family-dm-sans">
                      Carregando usuários…
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-16 text-center text-sm text-gray-11 font-family-dm-sans">
                      {filtersActive
                        ? "Nenhum usuário encontrado com os filtros atuais."
                        : "Nenhum usuário cadastrado."}
                    </td>
                  </tr>
                ) : (
                  items.map((u) => {
                    const { date, time } = formatDate(u.createdAt);
                    return (
                      <tr key={u.id} className="hover:bg-gray-2/80 transition-colors">
                        {/* Usuário */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <UserAvatar avatarUrl={u.avatarUrl} name={fullName(u)} initials={initialsOf(u)} shape="full" />
                            <div className="min-w-0 flex flex-col gap-1">
                              <p className="text-sm font-semibold text-gray-12 font-family-dm-sans truncate">{fullName(u)}</p>
                              <p className="text-xs text-gray-11 font-family-dm-sans truncate">{u.email || "—"}</p>
                            </div>
                          </div>
                        </td>

                        {/* Documento */}
                        <td className="py-3 px-4">
                          <span className="text-sm text-gray-12 font-family-dm-sans whitespace-nowrap">{docDisplay(u)}</span>
                        </td>

                        {/* Ingressos */}
                        <td className="py-3 px-4">
                          <span className="text-sm font-semibold text-gray-12 font-family-dm-sans">{u.ticketsCount ?? 0}</span>
                        </td>

                        {/* Cadastro */}
                        <td className="py-3 px-4">
                          <p className="text-sm font-semibold text-gray-12 font-family-dm-sans whitespace-nowrap">{date}</p>
                          <p className="text-sm text-gray-11 font-family-dm-sans whitespace-nowrap">{time}</p>
                        </td>

                        {/* Ações */}
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => setSelected(u)}
                            className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-6 px-4 text-sm font-semibold font-family-dm-sans text-gray-12 hover:bg-gray-3 transition-colors"
                          >
                            Detalhes
                          </button>
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
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={setPage}
              totalItems={pagination.total}
              pageSize={pagination.limit}
              className="border-t border-gray-6 px-4 py-4"
            />
          )}
        </div>
      </div>
    </div>
  );
}
