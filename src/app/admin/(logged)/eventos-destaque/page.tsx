"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronUp, ChevronDown, Plus, Search, Star, Trash2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { cn } from "@/utils/cn";
import { adminService } from "@/services";
import { queryKeys } from "@/services/cache/QueryClient";
import type {
  AdminFeaturedEvent,
  AdminPickerEvent,
} from "@/services/admin/AdminService";
import { ImageWithInitialFallback } from "@/components/ImageWithInitialFallback";
import { Pagination } from "@/components/Pagination";
import { eventWindowInstant } from "@/utils/datetimeBR";
import { Button } from "@/components/Button";

// ─── Helpers ────────────────────────────────────────────────────────────────

/** "Cidade, UF" (mesmo formato compacto dos cards do Figma). */
function locationLabel(
  e: Pick<AdminFeaturedEvent, "city" | "state">,
): string {
  return [e.city, e.state].filter((v) => v?.trim()).join(", ") || "—";
}

type RegistrationState = "open" | "soon" | "closed";

/** Estado da inscrição derivado das datas (BRT). Espelha o /search público. */
function registrationState(e: {
  eventDate: string | null;
  registrationStartDate: string | null;
  registrationEndDate: string | null;
}): RegistrationState {
  const now = Date.now();
  const reached = (iso: string | null) => {
    const at = eventWindowInstant(iso);
    return !!at && now >= at.getTime();
  };
  if (reached(e.eventDate)) return "closed";
  if (!reached(e.registrationStartDate)) return "soon";
  if (reached(e.registrationEndDate)) return "closed";
  return "open";
}

const REGISTRATION_LABEL: Record<RegistrationState, string> = {
  open: "Inscrições abertas",
  soon: "Em breve",
  closed: "Inscrições encerradas",
};

const inputShell =
  "h-12 w-full rounded-lg border border-gray-6 bg-gray-1 px-3 text-sm text-gray-12 placeholder:text-gray-11 font-family-dm-sans outline-none focus-visible:border-gray-8 ";

const cardShell =
  "rounded-xl border border-gray-6 bg-gray-1 ";

const countPill =
  "inline-flex items-center rounded-full bg-primary-3 px-3 py-1.5 text-sm font-bold text-primary-11 font-family-dm-sans whitespace-nowrap";

const ITEMS_PER_PAGE = 20;

// ─── Thumbnail ──────────────────────────────────────────────────────────────

function Thumb({ src, name }: { src: string | null; name: string }) {
  return (
    <div className="relative h-[52px] w-[93px] shrink-0 overflow-hidden rounded bg-gray-4">
      <ImageWithInitialFallback
        src={src}
        alt={name}
        name={name}
        fill
        sizes="93px"
        className="size-full"
        imgClassName="object-cover"
        letterClassName="text-sm font-semibold text-gray-11"
      />
    </div>
  );
}

// ─── Página ─────────────────────────────────────────────────────────────────

export default function AdminFeaturedEventsPage() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  // ── Lista de destaque (carrossel) ──
  const featuredQuery = useQuery({
    queryKey: queryKeys.admin.featured.list(),
    queryFn: () => adminService.getFeaturedEvents(),
  });
  const featured = useMemo(
    () => featuredQuery.data ?? [],
    [featuredQuery.data],
  );
  const featuredIds = useMemo(
    () => new Set(featured.map((e) => e.id)),
    [featured],
  );

  // ── Picker (adicionar evento) ──
  const pickerQuery = useQuery({
    queryKey: queryKeys.admin.featured.picker({ page, search: debouncedSearch }),
    queryFn: () =>
      adminService.getEventsForFeaturedPicker({
        page,
        limit: ITEMS_PER_PAGE,
        search: debouncedSearch || undefined,
      }),
    placeholderData: (prev) => prev,
  });
  const pickerItems = pickerQuery.data?.items ?? [];
  const pickerPagination =
    pickerQuery.data?.pagination ?? {
      page,
      limit: ITEMS_PER_PAGE,
      total: 0,
      totalPages: 1,
    };

  // ── Mutações: cada resposta traz a lista autoritativa já reordenada ──
  const applyList = (list: AdminFeaturedEvent[]) => {
    queryClient.setQueryData(queryKeys.admin.featured.list(), list);
    // Contrato público mudou → carrossel da home refaz na próxima montagem.
    queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
  };

  const runMutation = async (
    id: string,
    fn: () => Promise<AdminFeaturedEvent[]>,
    errorMsg: string,
  ) => {
    if (busyId) return;
    setBusyId(id);
    try {
      applyList(await fn());
    } catch {
      toast.error(errorMsg);
    } finally {
      setBusyId(null);
    }
  };

  const handleAdd = (e: AdminPickerEvent) =>
    runMutation(
      e.id,
      () => adminService.addFeaturedEvent(e.id),
      "Não foi possível adicionar ao destaque.",
    );

  const handleRemove = (id: string) =>
    runMutation(
      id,
      () => adminService.removeFeaturedEvent(id),
      "Não foi possível remover do destaque.",
    );

  const handleMove = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= featured.length) return;
    const ids = featured.map((e) => e.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    return runMutation(
      featured[index].id,
      () => adminService.reorderFeaturedEvents(ids),
      "Não foi possível reordenar.",
    );
  };

  const loadingFeatured = featuredQuery.isLoading;
  const loadingPicker = pickerQuery.isLoading;

  return (
    <div className="min-h-screen bg-gray-2 pb-10">
      <div className="mx-auto w-full max-w-[1222px]">
        {/* Header */}
        <div className="mb-6">
          <h1 className="font-manrope text-2xl font-extrabold leading-[1.1] tracking-tight text-gray-12">
            Eventos em destaque
          </h1>
          <p className="mt-1 font-family-dm-sans text-sm leading-[1.3] text-gray-11">
            Escolha e ordene os eventos que aparecem no carrossel da home pública
          </p>
        </div>

        {/* ── Card 1: Destaque na home ── */}
        <section className={cn(cardShell, "mb-6")}>
          <header className="flex items-center justify-between border-b border-gray-6 px-5 py-4">
            <div className="flex items-center gap-2">
              <Star className="size-5 text-gray-12" />
              <h2 className="font-manrope text-lg font-bold text-gray-12">
                Destaque na home
              </h2>
            </div>
            <span className={countPill}>{featured.length} em destaque</span>
          </header>

          <div className="flex flex-col gap-3 p-5">
            {loadingFeatured ? (
              <p className="py-10 text-center font-family-dm-sans text-sm text-gray-11">
                Carregando…
              </p>
            ) : featured.length === 0 ? (
              <p className="py-10 text-center font-family-dm-sans text-sm text-gray-11">
                Nenhum evento em destaque. Adicione eventos na seção abaixo.
              </p>
            ) : (
              featured.map((e, index) => {
                const rowBusy = busyId === e.id;
                return (
                  <div
                    key={e.id}
                    className={cn(
                      "flex items-center justify-between gap-3 rounded-lg border border-gray-6 p-3 transition-opacity",
                      rowBusy && "opacity-60",
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gray-4 font-family-dm-sans text-base font-medium text-gray-12">
                        {index + 1}
                      </span>
                      <Thumb src={e.bannerUrl} name={e.name} />
                      <div className="min-w-0">
                        <p className="truncate font-manrope text-sm font-bold text-gray-12">
                          {e.name}
                        </p>
                        <p className="truncate font-family-dm-sans text-xs text-gray-11">
                          {locationLabel(e)}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleMove(index, -1)}
                        disabled={index === 0 || !!busyId}
                        aria-label="Mover para cima"
                        className="flex size-9 items-center justify-center rounded-lg border border-gray-6 text-gray-12 transition-colors hover:bg-gray-3 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <ChevronUp className="size-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMove(index, 1)}
                        disabled={index === featured.length - 1 || !!busyId}
                        aria-label="Mover para baixo"
                        className="flex size-9 items-center justify-center rounded-lg border border-gray-6 text-gray-12 transition-colors hover:bg-gray-3 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <ChevronDown className="size-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemove(e.id)}
                        disabled={!!busyId}
                        aria-label="Remover do destaque"
                        className="flex size-9 items-center justify-center rounded-lg border border-red-6 bg-red-2 text-red-11 transition-colors hover:bg-red-3 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* ── Card 2: Adicionar evento de destaque ── */}
        <section className={cardShell}>
          <header className="flex items-center justify-between border-b border-gray-6 px-5 py-4">
            <div className="flex items-center gap-2">
              <Plus className="size-5 text-gray-12" />
              <h2 className="font-manrope text-lg font-bold text-gray-12">
                Adicionar evento de destaque
              </h2>
            </div>
            <span className={countPill}>
              {pickerPagination.total}{" "}
              {pickerPagination.total === 1 ? "evento" : "eventos"}
            </span>
          </header>

          <div className="p-5">
            {/* Busca */}
            <div className="relative mb-5">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-gray-11" />
              <input
                type="search"
                value={search}
                onChange={(ev) => setSearch(ev.target.value)}
                placeholder="Nome, cidade, organização…"
                className={cn(inputShell, "pl-11")}
              />
            </div>

            {/* Grid de eventos */}
            {loadingPicker ? (
              <p className="py-10 text-center font-family-dm-sans text-sm text-gray-11">
                Carregando eventos…
              </p>
            ) : pickerItems.length === 0 ? (
              <p className="py-10 text-center font-family-dm-sans text-sm text-gray-11">
                {debouncedSearch
                  ? "Nenhum evento encontrado para essa busca."
                  : "Nenhum evento publicado disponível."}
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {pickerItems.map((e) => {
                  const isFeatured = featuredIds.has(e.id);
                  const rowBusy = busyId === e.id;
                  return (
                    <div
                      key={e.id}
                      className="flex flex-col gap-4 rounded-lg border border-gray-6 p-3"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <Thumb src={e.bannerUrl} name={e.name} />
                        <div className="min-w-0">
                          <p className="truncate font-manrope text-sm font-bold text-gray-12">
                            {e.name}
                          </p>
                          <p className="truncate font-family-dm-sans text-xs text-gray-11">
                            {locationLabel(e)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        {isFeatured ? (
                          <span className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-gray-4 px-4 font-manrope text-sm font-bold text-gray-10">
                            <Plus className="size-4" />
                            Já em destaque
                          </span>
                        ) : (
                          <Button onClick={() => handleAdd(e)}
                            disabled={!!busyId}>
                            <Plus className="size-4" />
                            {rowBusy ? "Adicionando…" : "Destaque"}
                          </Button>
                        )}
                        <span className="shrink-0 font-family-dm-sans text-sm text-gray-11">
                          {REGISTRATION_LABEL[registrationState(e)]}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <Pagination
              currentPage={pickerPagination.page}
              totalPages={pickerPagination.totalPages}
              onPageChange={setPage}
              totalItems={pickerPagination.total}
              pageSize={ITEMS_PER_PAGE}
              className="pt-6"
            />
          </div>
        </section>
      </div>
    </div>
  );
}
