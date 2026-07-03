"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/utils/cn";
import { adminService } from "@/services";
import { queryKeys } from "@/services/cache/QueryClient";
import type { AdminUser } from "@/services/admin/AdminService";
import { UserAvatar } from "@/components/UserAvatar";
import { SearchableSelect } from "@/components/SearchableSelect";
import { formatTimeBRT } from "@/utils/datetimeBR";
import {
  documentLabel,
  formatDocumentDisplay,
  formatPersonPhone,
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

/** Lista de páginas com elipses: [1, …, 4,5,6, …, 20]. */
function pageItems(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const items: (number | "ellipsis")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) items.push("ellipsis");
  for (let p = start; p <= end; p++) items.push(p);
  if (end < total - 1) items.push("ellipsis");
  items.push(total);
  return items;
}

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
      {pageItems(safePage, totalPages).map((it, i) =>
        it === "ellipsis" ? (
          <span
            key={`e${i}`}
            className="size-8 shrink-0 flex items-center justify-center text-sm text-gray-11 font-family-dm-sans"
          >
            …
          </span>
        ) : (
          <button key={it} type="button" onClick={() => onPageChange(it)} className={pageBtn(safePage === it)}>
            {it}
          </button>
        ),
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

// ─── Details drawer (read-only) ─────────────────────────────────────────────────

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 border-b border-gray-4 py-3 last:border-0">
      <span className="text-xs text-gray-11 font-family-dm-sans">{label}</span>
      <span className="text-sm text-gray-12 font-family-dm-sans break-words">{value || "—"}</span>
    </div>
  );
}

function UserDetailsDrawer({ user, onClose }: { user: AdminUser | null; onClose: () => void }) {
  // Fecha com ESC + trava o scroll do body enquanto aberto.
  useEffect(() => {
    if (!user) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [user, onClose]);

  if (!user) return null;
  const isBr = isPersonBr({
    country: user.country,
    documentType: user.documentType ?? undefined,
    document: user.documentNumber ?? undefined,
  });
  const { date, time } = formatDate(user.createdAt);

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative h-full w-full max-w-md bg-gray-1 shadow-xl overflow-y-auto animate-in slide-in-from-right">
        <div className="flex items-center justify-between border-b border-gray-6 px-6 py-4">
          <h2 className="text-lg font-bold text-gray-12 font-manrope">Detalhes do usuário</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex size-9 items-center justify-center rounded-lg border border-gray-6 text-gray-12 hover:bg-gray-3 transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="px-6 py-5">
          <div className="flex items-center gap-3">
            <UserAvatar avatarUrl={user.avatarUrl} name={fullName(user)} initials={initialsOf(user)} shape="lg" />
            <div className="min-w-0">
              <p className="text-base font-semibold text-gray-12 font-family-dm-sans truncate">{fullName(user)}</p>
              <p className="text-sm text-gray-11 font-family-dm-sans truncate">{user.email || "—"}</p>
            </div>
          </div>

          <div className="mt-4 flex flex-col">
            <DetailRow label={documentLabel(isBr)} value={docDisplay(user)} />
            <DetailRow label="Telefone" value={formatPersonPhone(user.phone, user.country)} />
            <DetailRow label="País" value={user.country ?? "—"} />
            <DetailRow label="Ingressos" value={String(user.ticketsCount ?? 0)} />
            <DetailRow label="Cadastro" value={`${date}${time ? ` · ${time}` : ""}`} />
            <div className="flex flex-col gap-1 py-3">
              <span className="text-xs text-gray-11 font-family-dm-sans">Status</span>
              <div><StatusBadge active={user.isActive !== false} /></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { id: "", label: "Todos os status" },
  { id: "ativo", label: "Ativo" },
  { id: "inativo", label: "Inativo" },
];

const inputShell =
  "h-12 w-full rounded-lg border border-gray-6 bg-gray-1 px-3 text-sm text-gray-12 placeholder:text-gray-11 font-family-dm-sans outline-none focus-visible:border-gray-8 shadow-[0px_2px_6px_0px_rgba(17,17,17,0.08)]";

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
      <UserDetailsDrawer user={selected} onClose={() => setSelected(null)} />

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
        <div className="rounded-xl border border-gray-6 bg-gray-1 p-3 md:p-4 shadow-[0px_2px_6px_0px_rgba(17,17,17,0.08)] mb-5">
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
              <SearchableSelect
                options={STATUS_OPTIONS}
                value={statusFilter}
                onChange={setStatusFilter}
                placeholder="Status: Todos"
                searchPlaceholder="Buscar status..."
                emptyText="Nenhum status"
              />
            </div>
          </div>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden flex flex-col gap-3">
          {loading ? (
            <div className="rounded-xl border border-gray-6 bg-gray-1 py-14 text-center text-sm text-gray-11 font-family-dm-sans shadow-[0px_2px_6px_0px_rgba(17,17,17,0.08)]">
              Carregando usuários…
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-xl border border-gray-6 bg-gray-1 py-14 text-center text-sm text-gray-11 font-family-dm-sans shadow-[0px_2px_6px_0px_rgba(17,17,17,0.08)] px-4">
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
                  className="rounded-xl border border-gray-6 bg-gray-1 p-4 shadow-[0px_2px_6px_0px_rgba(17,17,17,0.08)] flex flex-col gap-3"
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
