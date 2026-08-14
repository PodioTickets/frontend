"use client";

import { useEffect, useState } from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/utils/cn";
import { getApiClient } from "@/services/base/ApiClient";
import { queryKeys } from "@/services/cache/QueryClient";
import { ImageWithInitialFallback } from "@/components/ImageWithInitialFallback";
import { formatTimeBRT } from "@/utils/datetimeBR";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuditEvent {
  id: string;
  name: string;
  slug?: string;
  status: string;
  bannerUrl?: string | null;
  city?: string | null;
  state?: string | null;
  eventDate?: string | null;
  updatedAt?: string;
  createdAt?: string;
  ticketCount?: number;
  organization: {
    id: string;
    name: string;
    tradeName?: string | null;
    email?: string | null;
    logoUrl?: string | null;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso?: string | null): { date: string; time: string } {
  if (!iso) return { date: "—", time: "" };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: "—", time: "" };
  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  // updatedAt/createdAt são INSTANTES reais → BRT (America/Sao_Paulo). BRT é UTC-3 fixo;
  // deslocar -3h e ler os componentes UTC dá os BRT, preservando o formato "DD Mon, AAAA".
  const brt = new Date(d.getTime() - 3 * 60 * 60 * 1000);
  return {
    date: `${String(brt.getUTCDate()).padStart(2, "0")} ${months[brt.getUTCMonth()]}, ${brt.getUTCFullYear()}`,
    time: formatTimeBRT(iso, { hour: "2-digit", minute: "2-digit" }),
  };
}

function normalizeEvent(raw: Record<string, unknown>): AuditEvent | null {
  const id = typeof raw.id === "string" ? raw.id : "";
  if (!id) return null;

  const org = raw.organization && typeof raw.organization === "object" && !Array.isArray(raw.organization)
    ? (raw.organization as Record<string, unknown>)
    : {} as Record<string, unknown>;

  const count = raw._count && typeof raw._count === "object" && !Array.isArray(raw._count)
    ? (raw._count as Record<string, unknown>)
    : {} as Record<string, unknown>;

  return {
    id,
    name: typeof raw.name === "string" ? raw.name : "—",
    slug: typeof raw.slug === "string" ? raw.slug : undefined,
    status: typeof raw.status === "string" ? raw.status : "REVISION",
    bannerUrl: typeof raw.bannerUrl === "string" ? raw.bannerUrl : null,
    city: typeof raw.city === "string" ? raw.city : null,
    state: typeof raw.state === "string" ? raw.state : null,
    eventDate: typeof raw.eventDate === "string" ? raw.eventDate : null,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : typeof raw.updated_at === "string" ? raw.updated_at : undefined,
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : undefined,
    ticketCount: typeof count.tickets === "number" ? count.tickets : undefined,
    organization: {
      id: typeof org.id === "string" ? org.id : "",
      name: typeof org.name === "string" ? org.name : "—",
      tradeName: typeof org.tradeName === "string" ? org.tradeName : null,
      email: typeof org.email === "string" ? org.email : null,
      logoUrl: typeof org.logoUrl === "string" ? org.logoUrl : null,
    },
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

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

  const pages = totalPages <= 7
    ? Array.from({ length: totalPages }, (_, i) => i + 1)
    : [
        1,
        ...(safePage > 3 ? ["…"] : []),
        ...Array.from({ length: 3 }, (_, i) => safePage - 1 + i).filter((p) => p > 1 && p < totalPages),
        ...(safePage < totalPages - 2 ? ["…"] : []),
        totalPages,
      ];

  return (
    <div className={cn("flex items-center gap-1.5", isMobile ? "justify-center w-full py-4 flex-wrap" : "justify-end px-4 py-5 border-t border-gray-6")}>
      <button type="button" onClick={() => onPageChange(Math.max(1, safePage - 1))} disabled={safePage <= 1} className={navBtn} aria-label="Página anterior">
        <ChevronLeft className={cn("size-4", isMobile ? "text-gray-12" : "text-gray-11")} />
      </button>
      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`ellipsis-${i}`} className="size-8 flex items-center justify-center text-sm text-gray-11">…</span>
        ) : (
          <button key={p} type="button" onClick={() => onPageChange(p as number)} className={pageBtn(safePage === p)}>
            {p}
          </button>
        )
      )}
      <button type="button" onClick={() => onPageChange(Math.min(totalPages, safePage + 1))} disabled={safePage >= totalPages} className={navBtn} aria-label="Próxima página">
        <ChevronRight className={cn("size-4", isMobile ? "text-gray-12" : "text-gray-11")} />
      </button>
    </div>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ITEMS_PER_PAGE = 20;

const inputShell =
  "h-12 w-full rounded-lg border border-gray-6 bg-gray-1 px-3 text-sm text-gray-12 placeholder:text-gray-11 font-family-dm-sans outline-none focus-visible:border-gray-8 ";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AuditoriaEventoPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const listQuery = useQuery({
    queryKey: queryKeys.admin.auditEvent.list({ page, search: debouncedSearch }),
    queryFn: async () => {
      const api = getApiClient();
      const res = await api.get<Record<string, unknown>>("/api/v1/admin/events/revision", {
        params: {
          page,
          limit: ITEMS_PER_PAGE,
          ...(debouncedSearch ? { search: debouncedSearch } : {}),
        },
      });
      const body = res.data as any;
      const source = body?.data ?? body;
      const rawItems: unknown[] = Array.isArray(source?.events)
        ? source.events
        : Array.isArray(source?.items)
          ? source.items
          : [];
      const p = source?.pagination ?? {};

      const parsed: AuditEvent[] = [];
      for (const raw of rawItems) {
        if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
        const norm = normalizeEvent(raw as Record<string, unknown>);
        if (norm) parsed.push(norm);
      }

      return {
        items: parsed,
        pagination: {
          page: typeof p.page === "number" ? p.page : page,
          limit: typeof p.limit === "number" ? p.limit : ITEMS_PER_PAGE,
          total: typeof p.total === "number" ? p.total : 0,
          totalPages: Math.max(1, typeof p.totalPages === "number" ? p.totalPages : 1),
        } as Pagination,
      };
    },
    placeholderData: (prev) => prev,
  });

  const items = listQuery.data?.items ?? [];
  const pagination =
    listQuery.data?.pagination ?? { page, limit: ITEMS_PER_PAGE, total: 0, totalPages: 1 };
  const loading = listQuery.isLoading;

  const filtersActive = Boolean(debouncedSearch);

  const emptyMessage = loading
    ? "Carregando eventos…"
    : filtersActive
      ? "Nenhum evento encontrado com os filtros atuais."
      : "Nenhum evento aguardando revisão.";

  return (
    <div className="min-h-screen bg-gray-2 pb-10">
      <div className="max-w-[1222px] mx-auto w-full">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-gray-12 tracking-tight text-2xl font-extrabold font-manrope leading-[1.1]">
            Auditoria de evento
          </h1>
          <p className="mt-1 text-gray-11 font-family-dm-sans leading-[1.3] text-sm">
            Eventos aguardando sua aprovação para serem publicados
          </p>
        </div>

        {/* Filters */}
        <div className="rounded-xl border border-gray-6 bg-gray-1 p-3 md:p-4  mb-5">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-11 pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, slug, cidade ou organização…"
              className={cn(inputShell, "pl-11")}
            />
          </div>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden flex flex-col gap-3">
          {loading || items.length === 0 ? (
            <div className="rounded-xl border border-gray-6 bg-gray-1 py-14 text-center text-sm text-gray-11 font-family-dm-sans  px-4">
              {emptyMessage}
            </div>
          ) : (
            items.map((event) => {
              const { date, time } = formatDate(event.updatedAt ?? event.createdAt);
              return (
                <div key={event.id} className="rounded-xl border border-gray-6 bg-gray-1 p-4  flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-gray-4">
                      <ImageWithInitialFallback
                        src={event.bannerUrl ?? null}
                        alt={event.name}
                        name={event.name}
                        fill
                        sizes="40px"
                        className="size-full rounded-lg"
                        imgClassName="object-cover rounded-lg"
                        letterClassName="text-xs font-semibold text-gray-11"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-12 font-family-dm-sans truncate">{event.name}</p>
                      <p className="text-xs text-gray-11 font-family-dm-sans truncate">{event.organization.name}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 text-xs font-family-dm-sans">
                    <div>
                      <p className="text-gray-11">Organização</p>
                      <p className="text-gray-12 font-medium truncate max-w-[140px]">{event.organization.email ?? "—"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-11">Submetido em</p>
                      <p className="text-gray-12 font-medium">{date}</p>
                      {time && <p className="text-gray-11">{time}</p>}
                    </div>
                  </div>

                  <Link
                    href={`/admin/events/${event.id}/review/information`}
                    className="flex h-11 w-full items-center justify-center rounded-lg border border-gray-6 text-sm font-bold font-family-dm-sans text-gray-12 hover:bg-gray-3 transition-colors"
                  >
                    Revisar
                  </Link>
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
        <div className="hidden md:block rounded-xl border border-gray-6 bg-gray-1  overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_1fr_1fr_120px] bg-gray-3 border-b border-gray-6">
            {(["Evento", "Organizador", "Data de submissão", "Ações"] as const).map((col, i) => (
              <div
                key={col}
                className={cn(
                  "px-4 py-3 text-sm font-medium font-family-dm-sans text-gray-12 leading-[1.3]",
                  i === 2 && "text-center",
                  i === 3 && "text-right",
                )}
              >
                {col}
              </div>
            ))}
          </div>

          {/* Rows */}
          {loading ? (
            <div className="py-16 text-center text-sm text-gray-11 font-family-dm-sans">
              Carregando eventos…
            </div>
          ) : items.length === 0 ? (
            <div className="py-16 text-center text-sm text-gray-11 font-family-dm-sans px-4">
              {filtersActive ? "Nenhum evento encontrado com os filtros atuais." : "Nenhum evento aguardando revisão."}
            </div>
          ) : (
            items.map((event) => {
              const { date, time } = formatDate(event.updatedAt ?? event.createdAt);
              return (
                <div key={event.id} className="grid grid-cols-[1fr_1fr_1fr_120px] border-b border-gray-6 last:border-b-0 hover:bg-gray-2 transition-colors">

                  {/* Evento */}
                  <div className="flex items-center gap-3 px-4 py-4">
                    <div className="relative size-9 shrink-0 overflow-hidden rounded-lg bg-gray-4">
                      <ImageWithInitialFallback
                        src={event.bannerUrl ?? null}
                        alt={event.name}
                        name={event.name}
                        fill
                        sizes="36px"
                        className="size-full rounded-lg"
                        imgClassName="object-cover rounded-lg"
                        letterClassName="text-xs font-semibold text-gray-11"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold font-family-dm-sans text-gray-12 truncate">{event.name}</p>
                      {(event.city || event.state) && (
                        <p className="text-xs font-normal font-family-dm-sans text-gray-11 truncate">
                          {[event.city, event.state].filter(Boolean).join(", ")}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Organizador */}
                  <div className="flex items-center gap-3 px-4 py-4">
                    <div className="relative size-9 shrink-0 overflow-hidden rounded-lg bg-gray-4">
                      <ImageWithInitialFallback
                        src={event.organization.logoUrl ?? null}
                        alt={event.organization.name}
                        name={event.organization.name}
                        fill
                        sizes="36px"
                        className="size-full rounded-lg"
                        imgClassName="object-cover rounded-lg"
                        letterClassName="text-xs font-semibold text-gray-11"
                      />
                    </div>
                    <div className="min-w-0 flex flex-col gap-0.5">
                      <p className="text-sm font-semibold font-family-dm-sans text-gray-12 truncate">
                        {event.organization.tradeName ?? event.organization.name}
                      </p>
                      <p className="text-sm font-normal font-family-dm-sans text-gray-11 truncate">
                        {event.organization.email ?? "—"}
                      </p>
                    </div>
                  </div>

                  {/* Data de submissão — usa updatedAt conforme API doc */}
                  <div className="flex flex-col items-center justify-center px-4 py-4">
                    <p className="text-sm font-semibold font-family-dm-sans text-gray-12">{date}</p>
                    {time && <p className="text-sm font-normal font-family-dm-sans text-gray-11">{time}</p>}
                  </div>

                  {/* Ações */}
                  <div className="flex items-center justify-end px-4 py-4">
                    <Link
                      href={`/admin/events/${event.id}/review/information`}
                      className="flex h-10 items-center justify-center rounded-lg border border-gray-6 px-5 text-sm font-bold font-family-dm-sans text-gray-12 hover:bg-gray-3 transition-colors whitespace-nowrap"
                    >
                      Revisar
                    </Link>
                  </div>
                </div>
              );
            })
          )}

          <PaginationBar
            totalPages={pagination.totalPages}
            page={pagination.page}
            onPageChange={setPage}
            variant="desktop"
          />
        </div>

      </div>
    </div>
  );
}
