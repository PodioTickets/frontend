"use client";

import { useEffect, useState } from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { cn } from "@/utils/cn";
import { adminService } from "@/services";
import { queryKeys } from "@/services/cache/QueryClient";
import type { AdminAuditOrganization } from "@/services/admin/AdminService";
import { ImageWithInitialFallback } from "@/components/ImageWithInitialFallback";
import { OrganizerEditDrawer } from "@/components/Admin/OrganizerEditDrawer";
import { Button } from "@/components/Button";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso?: string): { date: string; time: string } {
  if (!iso) return { date: "—", time: "" };
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
          : "bg-gray-1 border-gray-6 text-gray-12 hover:bg-gray-2",
    );

  return (
    <div
      className={cn(
        "flex items-center gap-2",
        isMobile
          ? "justify-center w-full py-4 flex-wrap"
          : "justify-end px-4 py-5 border-t border-gray-6",
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
  { value: "ativo", label: "Ativo" },
  { value: "inativo", label: "Inativo" },
];

const inputShell =
  "h-12 w-full rounded-lg border border-gray-6 bg-gray-1 px-3 text-sm text-gray-12 placeholder:text-gray-11 font-family-dm-sans outline-none focus-visible:border-gray-8 shadow-[0px_2px_6px_0px_rgba(17,17,17,0.08)]";

const ITEMS_PER_PAGE = 20;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminOrganizersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<AdminAuditOrganization | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter]);

  const isActive =
    statusFilter === "ativo" ? true :
      statusFilter === "inativo" ? false :
        undefined;

  const listQuery = useQuery({
    queryKey: queryKeys.admin.organizations.list({
      page,
      search: debouncedSearch,
      status: statusFilter,
    }),
    queryFn: async () => {
      const result = await adminService.getAdminOrganizations({
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
    placeholderData: (prev) => prev,
  });

  const items = listQuery.data?.items ?? [];
  const pagination =
    listQuery.data?.pagination ?? { page, limit: ITEMS_PER_PAGE, total: 0, totalPages: 1 };
  const loading = listQuery.isLoading;

  const filtered = items;
  const filtersActive = Boolean(debouncedSearch) || Boolean(statusFilter);

  const openDrawer = (org: AdminAuditOrganization) => {
    setSelectedOrg(org);
    setDrawerOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-2 pb-10">
      <OrganizerEditDrawer
        isOpen={drawerOpen}
        onClose={() => { setDrawerOpen(false); setSelectedOrg(null); }}
        org={selectedOrg}
        onUpdated={() =>
          queryClient.invalidateQueries({ queryKey: queryKeys.admin.organizations.all() })
        }
      />
      <div className="max-w-[1222px] mx-auto w-full">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-gray-12 tracking-tight text-2xl font-extrabold font-manrope leading-[1.1]">
            Organizadores
          </h1>
          <p className="mt-1 text-gray-11 font-family-dm-sans leading-[1.3] text-sm">
            Gerencie as organizações cadastradas na plataforma
          </p>
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
                placeholder="Buscar por nome, email, ID…"
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
            <div className="rounded-xl border border-gray-6 bg-gray-1 py-14 text-center text-sm text-gray-11 font-family-dm-sans shadow-[0px_2px_6px_0px_rgba(17,17,17,0.08)]">
              Carregando organizadores…
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-gray-6 bg-gray-1 py-14 text-center text-sm text-gray-11 font-family-dm-sans shadow-[0px_2px_6px_0px_rgba(17,17,17,0.08)] px-4">
              {filtersActive
                ? "Nenhum organizador encontrado com os filtros atuais."
                : "Nenhum organizador cadastrado."}
            </div>
          ) : (
            filtered.map((org) => {
              const active = org.isActive !== false;
              const { date, time } = formatDate(org.createdAt);
              return (
                <div
                  key={org.id}
                  className="rounded-xl border border-gray-6 bg-gray-1 p-4 shadow-[0px_2px_6px_0px_rgba(17,17,17,0.08)] flex flex-col gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-gray-4">
                      <ImageWithInitialFallback
                        src={org.logoUrl ?? null}
                        alt={org.name ?? "Org"}
                        name={org.name ?? "Org"}
                        fill
                        sizes="40px"
                        className="size-full rounded-lg"
                        imgClassName="object-cover rounded-lg"
                        letterClassName="text-xs font-semibold text-gray-11"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-12 font-family-dm-sans truncate">
                        {org.name ?? org.tradeName ?? "—"}
                      </p>
                      <p className="text-xs text-gray-11 font-family-dm-sans truncate">
                        {org.email ?? "—"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <p className="text-xs text-gray-11 font-family-dm-sans">Eventos</p>
                      <p className="text-sm font-semibold text-gray-12 font-family-dm-sans">{org.eventCount ?? 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-11 font-family-dm-sans">Criação</p>
                      <p className="text-sm font-semibold text-gray-12 font-family-dm-sans whitespace-nowrap">{date}</p>
                      <p className="text-xs text-gray-11 font-family-dm-sans">{time}</p>
                    </div>
                    <StatusBadge active={active} />
                  </div>

                  <div className="flex gap-2">
                    <Link
                      href={`/admin/organizers/${org.id}/members`}
                      className="flex h-11"
                    >
                      <Button variant="outline" className="border-gray-6 text-gray-12">
                        Ver membros
                      </Button>
                    </Link>
                    <button
                      type="button"
                      onClick={() => openDrawer(org)}
                      className="flex h-11 flex-1 items-center justify-center rounded-lg border border-gray-6 text-sm font-semibold font-family-dm-sans text-gray-12 hover:bg-gray-3 transition-colors"
                    >
                      Editar
                    </button>
                  </div>
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
                <tr className="bg-gray-3 border-b border-t border-gray-6">
                  <th className="text-left py-3.5 px-4 text-xs font-semibold text-gray-11 font-family-dm-sans uppercase tracking-wide w-[287px]">
                    Organizador
                  </th>
                  <th className="text-center py-3.5 px-4 text-xs font-semibold text-gray-11 font-family-dm-sans uppercase tracking-wide w-[100px]">
                    Eventos
                  </th>
                  <th className="text-center py-3.5 px-4 text-xs font-semibold text-gray-11 font-family-dm-sans uppercase tracking-wide">
                    Status
                  </th>
                  <th className="text-center py-3.5 px-4 text-xs font-semibold text-gray-11 font-family-dm-sans uppercase tracking-wide">
                    Criação
                  </th>
                  <th className="text-right py-3.5 px-4 text-xs font-semibold text-gray-11 font-family-dm-sans uppercase tracking-wide w-[114px]">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-6">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-16 text-center text-sm text-gray-11 font-family-dm-sans">
                      Carregando organizadores…
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-16 text-center text-sm text-gray-11 font-family-dm-sans">
                      {filtersActive
                        ? "Nenhum organizador encontrado com os filtros atuais."
                        : "Nenhum organizador cadastrado."}
                    </td>
                  </tr>
                ) : (
                  filtered.map((org) => {
                    const active = org.isActive !== false;
                    const { date, time } = formatDate(org.createdAt);
                    return (
                      <tr key={org.id} className="hover:bg-gray-2/80 transition-colors">
                        {/* Organizador */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="relative size-9 shrink-0 overflow-hidden rounded-lg bg-gray-4">
                              <ImageWithInitialFallback
                                src={org.logoUrl ?? null}
                                alt={org.name ?? "Org"}
                                name={org.name ?? "Org"}
                                fill
                                sizes="36px"
                                className="size-full rounded-lg"
                                imgClassName="object-cover rounded-lg"
                                letterClassName="text-xs font-semibold text-gray-11"
                              />
                            </div>
                            <div className="min-w-0 flex flex-col gap-1">
                              <p className="text-sm font-semibold text-gray-12 font-family-dm-sans truncate">
                                {org.name ?? org.tradeName ?? "—"}
                              </p>
                              <p className="text-xs text-gray-11 font-family-dm-sans truncate">
                                {org.email ?? "—"}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Eventos */}
                        <td className="py-3 px-4 text-center">
                          <span className="text-sm font-semibold text-gray-12 font-family-dm-sans">
                            {org.eventCount ?? 0}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4 text-center">
                          <StatusBadge active={active} />
                        </td>

                        {/* Criação */}
                        <td className="py-3 px-4 text-center">
                          <p className="text-sm font-semibold text-gray-12 font-family-dm-sans whitespace-nowrap">{date}</p>
                          <p className="text-sm text-gray-11 font-family-dm-sans whitespace-nowrap">{time}</p>
                        </td>

                        {/* Ações */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/admin/organizers/${org.id}/members`}
                            >
                              <Button variant="outline" className="border-gray-6 text-gray-12 h-10">
                                Ver membros
                              </Button>
                            </Link>
                            <button
                              type="button"
                              onClick={() => openDrawer(org)}
                              className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-6 px-3 text-sm font-semibold font-family-dm-sans text-gray-12 hover:bg-gray-3 transition-colors"
                            >
                              Editar
                            </button>
                          </div>
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
