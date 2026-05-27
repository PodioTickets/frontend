"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
} from "lucide-react";
import { cn } from "@/utils/cn";
import { getApiClient } from "@/services/base/ApiClient";
import { organizerService } from "@/services";
import toast from "react-hot-toast";
import { Button } from "@/components/Button";
import { PencilIcon } from "@/components/Icons/PencilIcon";
import { MoneyIcon } from "@/components/Icons/MoneyIcon";
import { DashboardIcon } from "@/components/Icons/Organizer/DashboardIcon";
import { UsersIcon } from "@/components/Icons/Organizer/UsersIcon";
import { ThreePointsIcon } from "@/components/Icons/Organizer/ThreePointsIcon";
import { OrganizerInfoIcon } from "@/components/Icons/Organizer/InfoIcon";
import { OrganizerTicketIcon } from "@/components/Icons/Organizer/TicketIcon";
import { BannerIcon } from "@/components/Icons/Organizer/BannerIcon";
import { TopicsIcon } from "@/components/Icons/TopicsIcon";
import { QuestionIcon } from "@/components/Icons/QuestionIcon";
import { FinancialStepIcon } from "@/components/Icons/Organizer/FinancialStepIcon";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { SuspendEventModal } from "@/components/Event/SuspendEventModal";
import { ResumeEventModal } from "@/components/Event/ResumeEventModal";

// ─── Types ────────────────────────────────────────────────────────────────────

type EventStatus = "DRAFT" | "PUBLISHED" | "SUSPENDED" | "CANCELLED" | "COMPLETED";
type SortBy = "eventDate" | "createdAt" | "name" | "registrations" | "revenue";
type SortOrder = "asc" | "desc";

interface AdminEvent {
  id: string;
  name: string;
  slug?: string;
  status: EventStatus;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  city?: string;
  state?: string;
  country?: string;
  eventDate?: string | null;
  createdAt: string;
  organization: {
    id: string;
    name: string;
    logoUrl?: string | null;
  };
  _count?: {
    registrations?: number;
  };
  totalSales?: number;
  totalRevenue?: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${String(d.getDate()).padStart(2, "0")} ${months[d.getMonth()]}, ${d.getFullYear()}`;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<EventStatus, { label: string; bg: string; text: string }> = {
  DRAFT: { label: "Rascunho", bg: "bg-gray-4", text: "text-gray-12" },
  PUBLISHED: { label: "Publicado", bg: "bg-primary-11", text: "text-primary-1" },
  SUSPENDED: { label: "Suspenso", bg: "bg-red-11", text: "text-red-1" },
  CANCELLED: { label: "Cancelado", bg: "bg-red-3", text: "text-red-11" },
  COMPLETED: { label: "Concluído", bg: "bg-gray-6", text: "text-gray-12" },
};

function StatusBadge({ status }: { status: EventStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.DRAFT;
  return (
    <span className={cn("inline-flex items-center rounded px-2.5 py-1 text-xs font-normal font-family-dm-sans whitespace-nowrap", cfg.bg, cfg.text)}>
      {cfg.label}
    </span>
  );
}

// ─── Action icon button ───────────────────────────────────────────────────────

function ActionIconLink({ href, title, children }: { href: string; title: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      title={title}
      className="size-8 rounded-lg bg-gray-2 border border-gray-6 hover:bg-gray-4 flex items-center justify-center transition-colors shrink-0"
    >
      {children}
    </Link>
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
    <div className={cn("flex items-center gap-2", isMobile ? "justify-center w-full py-4 flex-wrap" : "justify-end px-4 py-5 border-t border-gray-6")}>
      <button type="button" onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page <= 1} className={navBtn}>
        <ChevronLeft className={cn("size-4", isMobile ? "text-gray-12" : "text-gray-11")} />
      </button>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
        <button key={p} type="button" onClick={() => onPageChange(p)} className={pageBtn(page === p)}>{p}</button>
      ))}
      <button type="button" onClick={() => onPageChange(Math.min(totalPages, page + 1))} disabled={page >= totalPages} className={navBtn}>
        <ChevronRight className={cn("size-4", isMobile ? "text-gray-12" : "text-gray-11")} />
      </button>
    </div>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: "", label: "Todos os status" },
  { value: "PUBLISHED", label: "Publicado" },
  { value: "DRAFT", label: "Rascunho" },
  { value: "SUSPENDED", label: "Suspenso" },
  { value: "CANCELLED", label: "Cancelado" },
  { value: "COMPLETED", label: "Concluído" },
];

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "createdAt", label: "Data de criação" },
  { value: "eventDate", label: "Data do evento" },
  { value: "name", label: "Nome" },
  { value: "registrations", label: "Inscritos" },
  { value: "revenue", label: "Receita" },
];

const inputShell =
  "h-12 w-full rounded-lg border border-gray-6 bg-gray-1 px-3 text-sm text-gray-12 placeholder:text-gray-11 font-family-dm-sans outline-none focus-visible:border-gray-4 focus-visible:ring-[3px] focus-visible:ring-gray-4/50 shadow-[0px_2px_6px_0px_rgba(17,17,17,0.08)]";

const ITEMS_PER_PAGE = 20;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminEventsPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("createdAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [page, setPage] = useState(1);

  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: ITEMS_PER_PAGE, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [fetchKey, setFetchKey] = useState(0);

  const [suspendingId, setSuspendingId] = useState<string | null>(null);
  const [suspendModalEvent, setSuspendModalEvent] = useState<AdminEvent | null>(null);
  const [resumeModalEvent, setResumeModalEvent] = useState<AdminEvent | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(1); }, [debouncedSearch, statusFilter, sortBy, sortOrder]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(ITEMS_PER_PAGE),
          sortBy,
          sortOrder,
        });
        if (debouncedSearch) params.set("search", debouncedSearch);
        if (statusFilter) params.set("status", statusFilter);

        const res = await getApiClient().get<{
          data: { events: AdminEvent[]; pagination: Pagination };
        }>(`/api/v1/admin/events?${params.toString()}`);

        if (cancelled) return;
        const body = res.data.data;
        setEvents(body.events ?? []);
        setPagination(body.pagination ?? { page, limit: ITEMS_PER_PAGE, total: 0, totalPages: 1 });
      } catch (e: any) {
        if (cancelled) return;
        toast.error(e?.response?.data?.message ?? e?.message ?? "Erro ao carregar eventos.");
        setEvents([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [page, debouncedSearch, statusFilter, sortBy, sortOrder, fetchKey]);

  const openSuspendModal = (ev: AdminEvent) => {
    setSuspendModalEvent(ev);
  };

  const openResumeModal = (ev: AdminEvent) => {
    setResumeModalEvent(ev);
  };

  const handleSuspendConfirm = async () => {
    if (!suspendModalEvent) return;
    setSuspendingId(suspendModalEvent.id);
    try {
      const { message } = await organizerService.suspendEvent(suspendModalEvent.id);
      toast.success(message || "Evento suspenso com sucesso.");
      setFetchKey((k) => k + 1);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Não foi possível suspender o evento.");
    } finally {
      setSuspendingId(null);
      setSuspendModalEvent(null);
    }
  };

  const handleResumeConfirm = async () => {
    if (!resumeModalEvent) return;
    setSuspendingId(resumeModalEvent.id);
    try {
      const { message } = await organizerService.resumeEvent(resumeModalEvent.id);
      toast.success(message || "Evento reativado com sucesso.");
      setFetchKey((k) => k + 1);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Não foi possível reativar o evento.");
    } finally {
      setSuspendingId(null);
      setResumeModalEvent(null);
    }
  };

  const toggleSortOrder = () => setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
  const filtersActive = Boolean(debouncedSearch) || Boolean(statusFilter);

  // ─── Mobile actions ───────────────────────────────────────────────────────

  const renderMobileActions = (ev: AdminEvent) => {
    if (ev.status === "DRAFT") {
      return (
        <Link href={`/organizer/events/new?resume=${ev.id}`} className="block">
          <Button variant="outline" className="h-10 w-full border-gray-6 text-gray-12 font-semibold font-family-dm-sans">
            Continuar criação
          </Button>
        </Link>
      );
    }

    return (
      <div className="flex gap-2">
        <ActionIconLink href={`/admin/events/${ev.id}/dashboard`} title="Dashboard">
          <DashboardIcon className="size-4 text-gray-11" />
        </ActionIconLink>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              title="Editar"
              aria-label="Editar"
              className="size-8 rounded-lg bg-gray-2 border border-gray-6 hover:bg-gray-4 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
            >
              <PencilIcon className="size-4 text-gray-11 pointer-events-none" />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={6}
              className="z-50 w-52 rounded-md border border-gray-6 bg-gray-1 p-1 shadow-lg outline-none"
            >
              <DropdownMenu.Item asChild>
                <Link href={`/admin/events/${ev.id}/edit`} className="flex items-center gap-2 px-3 py-2.5 text-sm font-family-dm-sans rounded-md hover:bg-gray-3 text-gray-12 cursor-pointer outline-none">
                  <OrganizerInfoIcon className="size-4 text-gray-11" />
                  Informações
                </Link>
              </DropdownMenu.Item>
              <DropdownMenu.Item asChild>
                <Link href={`/admin/events/${ev.id}/edit/banner`} className="flex items-center gap-2 px-3 py-2.5 text-sm font-family-dm-sans rounded-md hover:bg-gray-3 text-gray-12 cursor-pointer outline-none">
                  <BannerIcon className="size-4 text-gray-11" />
                  Banner
                </Link>
              </DropdownMenu.Item>
              <DropdownMenu.Item asChild>
                <Link href={`/admin/events/${ev.id}/edit/tickets`} className="flex items-center gap-2 px-3 py-2.5 text-sm font-family-dm-sans rounded-md hover:bg-gray-3 text-gray-12 cursor-pointer outline-none">
                  <OrganizerTicketIcon className="size-4 text-gray-11" />
                  Ingressos
                </Link>
              </DropdownMenu.Item>
              <DropdownMenu.Item asChild>
                <Link href={`/admin/events/${ev.id}/edit/topics`} className="flex items-center gap-2 px-3 py-2.5 text-sm font-family-dm-sans rounded-md hover:bg-gray-3 text-gray-12 cursor-pointer outline-none">
                  <TopicsIcon className="size-4 text-gray-11" />
                  Tópicos
                </Link>
              </DropdownMenu.Item>
              <DropdownMenu.Item asChild>
                <Link href={`/admin/events/${ev.id}/edit/questionnaire`} className="flex items-center gap-2 px-3 py-2.5 text-sm font-family-dm-sans rounded-md hover:bg-gray-3 text-gray-12 cursor-pointer outline-none">
                  <QuestionIcon className="size-4 text-gray-11" />
                  Questionário
                </Link>
              </DropdownMenu.Item>
              <DropdownMenu.Item asChild>
                <Link href={`/admin/events/${ev.id}/edit/financial`} className="flex items-center gap-2 px-3 py-2.5 text-sm font-family-dm-sans rounded-md hover:bg-gray-3 text-gray-12 cursor-pointer outline-none">
                  <FinancialStepIcon className="size-4 text-gray-11" />
                  Pagamento
                </Link>
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
        <ActionIconLink href={`/admin/events/${ev.id}/financial`} title="Financeiro">
          <MoneyIcon className="size-5 text-gray-11" />
        </ActionIconLink>
        <ActionIconLink href={`/admin/events/${ev.id}/registrations`} title="Inscritos">
          <UsersIcon className="size-5 text-gray-11" />
        </ActionIconLink>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              className="size-8 rounded-lg bg-transparent hover:bg-gray-4 flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Menu"
            >
              <ThreePointsIcon className="size-5 text-gray-11 pointer-events-none" />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={6}
              className="z-50 w-52 rounded-md border border-gray-6 bg-gray-1 p-1 shadow-lg outline-none"
            >
              <DropdownMenu.Item asChild>
                <Link href={`/admin/events/${ev.id}/discount/cupom`} className="flex px-3 py-2.5 text-sm font-family-dm-sans rounded-md hover:bg-gray-3 text-gray-12 cursor-pointer outline-none">Cupom</Link>
              </DropdownMenu.Item>
              <DropdownMenu.Item asChild>
                <Link href={`/admin/events/${ev.id}/discount/voucher`} className="flex px-3 py-2.5 text-sm font-family-dm-sans rounded-md hover:bg-gray-3 text-gray-12 cursor-pointer outline-none">Voucher</Link>
              </DropdownMenu.Item>
              <DropdownMenu.Item asChild>
                <Link href={`/admin/events/${ev.id}/ads`} className="flex px-3 py-2.5 text-sm font-family-dm-sans rounded-md hover:bg-gray-3 text-gray-12 cursor-pointer outline-none">ADS</Link>
              </DropdownMenu.Item>
              {(ev.status === "PUBLISHED" || ev.status === "SUSPENDED") && (
                <DropdownMenu.Item
                  disabled={suspendingId === ev.id}
                  onSelect={() => ev.status === "SUSPENDED" ? openResumeModal(ev) : openSuspendModal(ev)}
                  className="px-3 py-2.5 text-sm font-family-dm-sans rounded-md hover:bg-gray-3 text-gray-12 cursor-pointer outline-none data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed"
                >
                  {ev.status === "SUSPENDED" ? "Reativar evento" : "Suspender evento"}
                </DropdownMenu.Item>
              )}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-2 pb-10">
      <SuspendEventModal
        open={!!suspendModalEvent}
        onClose={() => setSuspendModalEvent(null)}
        event={suspendModalEvent}
        onConfirm={handleSuspendConfirm}
        loading={suspendingId === suspendModalEvent?.id}
      />
      <ResumeEventModal
        open={!!resumeModalEvent}
        onClose={() => setResumeModalEvent(null)}
        event={resumeModalEvent}
        onConfirm={handleResumeConfirm}
        loading={suspendingId === resumeModalEvent?.id}
      />

      <div className="max-w-[1222px] mx-auto w-full">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-gray-12 tracking-tight text-2xl font-extrabold font-manrope leading-[1.1]">
            Eventos
          </h1>
          <p className="mt-1 text-gray-11 font-family-dm-sans leading-[1.3] text-sm">
            Gestão global de eventos na plataforma.
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
                placeholder="Buscar por nome, slug, cidade ou organização…"
                className={cn(inputShell, "pl-11")}
              />
            </div>
            <div className="w-full sm:w-[min(100%,200px)] shrink-0">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={cn(inputShell, "cursor-pointer appearance-none bg-[length:1rem] bg-[right_0.75rem_center] bg-no-repeat pr-10")}
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23737373' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")` }}
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value || "all"} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="w-full sm:w-[min(100%,190px)] shrink-0">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
                className={cn(inputShell, "cursor-pointer appearance-none bg-[length:1rem] bg-[right_0.75rem_center] bg-no-repeat pr-10")}
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23737373' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")` }}
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={toggleSortOrder}
              title={sortOrder === "asc" ? "Crescente" : "Decrescente"}
              className="h-12 w-12 shrink-0 rounded-lg border border-gray-6 bg-gray-1 hover:bg-gray-3 flex items-center justify-center transition-colors shadow-[0px_2px_6px_0px_rgba(17,17,17,0.08)]"
            >
              <ArrowUpDown className={cn("size-4 transition-transform", sortOrder === "asc" ? "rotate-0" : "rotate-180")} />
            </button>
          </div>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden flex flex-col gap-3">
          {loading ? (
            <div className="rounded-xl border border-gray-6 bg-gray-1 py-14 text-center text-sm text-gray-11 font-family-dm-sans shadow-[0px_2px_6px_0px_rgba(17,17,17,0.08)]">
              Carregando eventos…
            </div>
          ) : events.length === 0 ? (
            <div className="rounded-xl border border-gray-6 bg-gray-1 py-14 text-center text-sm text-gray-11 font-family-dm-sans shadow-[0px_2px_6px_0px_rgba(17,17,17,0.08)] px-4">
              {filtersActive ? "Nenhum evento encontrado com os filtros atuais." : "Nenhum evento cadastrado."}
            </div>
          ) : (
            events.map((ev) => {
              const img = ev.logoUrl ?? ev.bannerUrl;
              return (
                <div key={ev.id} className="rounded-xl border border-gray-6 bg-gray-1 p-4 shadow-[0px_2px_6px_0px_rgba(17,17,17,0.08)] flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-lg border border-gray-6 overflow-hidden shrink-0 bg-gray-4 relative flex items-center justify-center text-xs font-bold text-gray-11">
                      {img ? <Image src={img} alt={ev.name} fill className="object-cover" /> : getInitials(ev.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-12 font-family-dm-sans line-clamp-2">{ev.name}</p>
                      <p className="text-xs text-gray-11 font-family-dm-sans truncate">{ev.organization.name}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <p className="text-xs text-gray-11 font-family-dm-sans">Data do evento</p>
                      <p className="text-sm font-semibold text-gray-12 font-family-dm-sans">{formatDate(ev.eventDate)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-11 font-family-dm-sans">Inscritos</p>
                      <p className="text-sm font-semibold text-gray-12 font-family-dm-sans">{ev._count?.registrations ?? 0}</p>
                    </div>
                    <StatusBadge status={ev.status} />
                  </div>

                  {renderMobileActions(ev)}
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
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="bg-gray-3 border-b border-gray-6">
                  {["Evento", "Organização", "Data", "Inscritos", "Receita", "Status"].map((col) => (
                    <th
                      key={col}
                      className={cn(
                        "py-3.5 px-4 text-xs font-semibold text-gray-11 font-family-dm-sans uppercase tracking-wide",
                        col === "Evento" || col === "Organização" ? "text-left" : "text-center"
                      )}
                    >
                      {col}
                    </th>
                  ))}
                  <th className="text-right py-3.5 px-4 text-xs font-semibold text-gray-11 font-family-dm-sans uppercase tracking-wide">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-6">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-sm text-gray-11 font-family-dm-sans">
                      Carregando eventos…
                    </td>
                  </tr>
                ) : events.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-sm text-gray-11 font-family-dm-sans">
                      {filtersActive ? "Nenhum evento encontrado com os filtros atuais." : "Nenhum evento cadastrado."}
                    </td>
                  </tr>
                ) : (
                  events.map((event) => {
                    const eventImg = event.logoUrl ?? event.bannerUrl;
                    const orgImg = event.organization.logoUrl;
                    const isCreationDraft = event.status === "DRAFT";

                    return (
                      <tr key={event.id} className="hover:bg-gray-2/80 transition-colors">
                        {/* Evento */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="size-10 rounded-lg border border-gray-6 overflow-hidden shrink-0 relative bg-gray-4 flex items-center justify-center text-xs font-bold text-gray-11">
                              {eventImg ? <Image src={eventImg} alt={event.name} fill className="object-cover" /> : getInitials(event.name)}
                            </div>
                            <span className="text-sm font-semibold text-gray-12 font-family-dm-sans line-clamp-2 max-w-[200px]">
                              {event.name}
                            </span>
                          </div>
                        </td>

                        {/* Organização */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <div className="size-8 rounded-lg border border-gray-6 overflow-hidden shrink-0 relative bg-gray-4 flex items-center justify-center text-xs font-bold text-gray-11">
                              {orgImg ? <Image src={orgImg} alt={event.organization.name} fill className="object-cover" /> : getInitials(event.organization.name)}
                            </div>
                            <span className="text-sm font-semibold text-gray-12 font-family-dm-sans truncate max-w-[140px]">
                              {event.organization.name}
                            </span>
                          </div>
                        </td>

                        {/* Data */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span className="text-sm font-semibold text-gray-12 font-family-dm-sans">
                            {formatDate(event.eventDate)}
                          </span>
                        </td>

                        {/* Inscritos */}
                        <td className="py-3.5 px-4 text-center">
                          <span className="text-sm font-semibold text-gray-12 font-family-dm-sans">
                            {event._count?.registrations ?? 0}
                          </span>
                        </td>

                        {/* Receita */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span className="text-sm font-semibold text-gray-12 font-family-dm-sans">
                            {formatCurrency(event.totalSales ?? event.totalRevenue ?? 0)}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 text-center">
                          <StatusBadge status={event.status} />
                        </td>

                        {/* Ações */}
                        <td className="py-4 px-5 text-center max-w-[200px]">
                          {isCreationDraft ? (
                            <Link
                              href={`/events/new?resume=${event.id}`}
                            >
                              <Button variant="outline" size="default" className="border-gray-6 text-gray-12 font-semibold font-family-dm-sans h-10 w-full"> Continuar criação</Button>
                            </Link>
                          ) : (
                            <div className="flex items-center gap-1 justify-center">
                              <Link
                                href={`/admin/events/${event.id}/dashboard`}
                                className="size-8 rounded-lg bg-gray-2 border border-gray-6 hover:bg-gray-4 flex items-center justify-center transition-colors"
                                title="Dashboard"
                              >
                                <DashboardIcon className="size-4 text-gray-11 pointer-events-none" />
                              </Link>
                              <Link
                                href={`/admin/events/${event.id}/edit`}
                                className="size-8 rounded-lg bg-gray-2 border border-gray-6 hover:bg-gray-4 flex items-center justify-center transition-colors"
                                title="Editar"
                              >
                                <PencilIcon className="size-4 text-gray-11 pointer-events-none" />
                              </Link>
                              <Link
                                href={`/admin/events/${event.id}/financial`}
                                className="size-8 rounded-lg bg-gray-2 border border-gray-6 hover:bg-gray-4 flex items-center justify-center transition-colors"
                                title="Ver financeiro"
                              >
                                <MoneyIcon className="size-5 text-gray-11 pointer-events-none" />
                              </Link>
                              <Link
                                href={`/admin/events/${event.id}/registrations`}
                                className="size-8 rounded-lg bg-gray-2 border border-gray-6 hover:bg-gray-4 flex items-center justify-center transition-colors"
                                title="Ver inscritos"
                              >
                                <UsersIcon className="size-5 text-gray-11 pointer-events-none" />
                              </Link>

                              <DropdownMenu.Root>
                                <DropdownMenu.Trigger asChild>
                                  <button
                                    type="button"
                                    className="size-8 rounded-lg bg-transparent hover:bg-gray-4 flex items-center justify-center transition-colors cursor-pointer"
                                    title="Menu"
                                    aria-label="Menu"
                                  >
                                    <ThreePointsIcon className="size-5 text-gray-11 pointer-events-none" />
                                  </button>
                                </DropdownMenu.Trigger>
                                <DropdownMenu.Portal>
                                  <DropdownMenu.Content
                                    align="end"
                                    sideOffset={6}
                                    className="z-50 w-52 rounded-md border border-gray-6 bg-gray-1 p-1 shadow-lg outline-none"
                                  >
                                    <DropdownMenu.Item asChild>
                                      <Link
                                        href={`/admin/events/${event.id}/discount/cupom`}
                                        className="flex px-3 py-2.5 text-sm font-family-dm-sans rounded-md hover:bg-gray-3 text-gray-12 cursor-pointer outline-none"
                                      >
                                        Cupom
                                      </Link>
                                    </DropdownMenu.Item>
                                    <DropdownMenu.Item asChild>
                                      <Link
                                        href={`/admin/events/${event.id}/discount/voucher`}
                                        className="flex px-3 py-2.5 text-sm font-family-dm-sans rounded-md hover:bg-gray-3 text-gray-12 cursor-pointer outline-none"
                                      >
                                        Voucher
                                      </Link>
                                    </DropdownMenu.Item>
                                    <DropdownMenu.Item asChild>
                                      <Link
                                        href={`/admin/events/${event.id}/ads`}
                                        className="flex px-3 py-2.5 text-sm font-family-dm-sans rounded-md hover:bg-gray-3 text-gray-12 cursor-pointer outline-none"
                                      >
                                        ADS
                                      </Link>
                                    </DropdownMenu.Item>
                                    <DropdownMenu.Item asChild>
                                      <Link
                                        href={`/admin/events/${event.id}/notifications`}
                                        className="flex px-3 py-2.5 text-sm font-family-dm-sans rounded-md hover:bg-gray-3 text-gray-12 cursor-pointer outline-none"
                                      >
                                        Notificação
                                      </Link>
                                    </DropdownMenu.Item>

                                    {(event.status === "PUBLISHED" || event.status === "SUSPENDED") && (
                                      <DropdownMenu.Item
                                        disabled={suspendingId === event.id}
                                        onSelect={() =>
                                          event.status === "SUSPENDED"
                                            ? openResumeModal(event)
                                            : openSuspendModal(event)
                                        }
                                        className={cn(
                                          "px-3 py-2.5 text-sm font-family-dm-sans rounded-md cursor-pointer outline-none",
                                          "hover:bg-gray-3 text-gray-12",
                                          "data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed"
                                        )}
                                      >
                                        {event.status === "SUSPENDED"
                                          ? "Reativar evento"
                                          : "Suspender evento"}
                                      </DropdownMenu.Item>
                                    )}
                                  </DropdownMenu.Content>
                                </DropdownMenu.Portal>
                              </DropdownMenu.Root>
                            </div>
                          )}
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
