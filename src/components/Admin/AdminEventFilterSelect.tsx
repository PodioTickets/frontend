"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
import { cn } from "@/utils/cn";
import { eventService } from "@/services";
import { formatDateBR } from "@/utils/datetimeBR";

/** Evento selecionado no filtro — só o que as telas de atividade precisam. */
export interface EventFilterOption {
  id: string;
  name: string;
}

interface AdminEventFilterSelectProps {
  value: EventFilterOption | null;
  onChange: (event: EventFilterOption | null) => void;
  className?: string;
}

/**
 * Combobox de evento esportivo pros filtros do /admin/atividade (visão geral
 * e funil de compra). Busca server-side via `GET /events/search` (mesmo
 * endpoint da busca do Header) com debounce de 350ms — `includePast: true`
 * porque métricas históricas são justamente de eventos que já aconteceram.
 */
export function AdminEventFilterSelect({
  value,
  onChange,
  className,
}: AdminEventFilterSelectProps) {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  // Debounce do termo — evita 1 request por tecla.
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  // Fecha o dropdown em clique fora (padrão dos selects custom do projeto).
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const searchQuery = useQuery({
    queryKey: ["admin", "eventFilterSearch", debounced],
    queryFn: () =>
      eventService.searchEvents({
        q: debounced || undefined,
        includePast: true,
        limit: 15,
      }),
    enabled: open,
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });

  const events = searchQuery.data?.events ?? [];

  const inputShell =
    "h-12 w-full rounded-lg border border-gray-6 bg-gray-1 px-3 text-sm text-gray-12 placeholder:text-gray-11 font-family-dm-sans outline-none focus-visible:border-gray-4 focus-visible:ring-[3px] focus-visible:ring-gray-4/50 ";

  // Estado "selecionado": mostra chip com o nome + botão limpar.
  if (value) {
    return (
      <div
        className={cn(
          inputShell,
          "flex items-center justify-between gap-2 cursor-default",
          className
        )}
      >
        <span className="truncate font-semibold" title={value.name}>
          {value.name}
        </span>
        <button
          type="button"
          aria-label="Remover filtro de evento"
          onClick={() => onChange(null)}
          className="shrink-0 rounded-full p-1 text-gray-11 hover:bg-gray-3 hover:text-gray-12 transition-colors cursor-pointer"
        >
          <X className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-11" />
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Filtrar por evento…"
          className={cn(inputShell, "pl-9")}
        />
      </div>

      {open ? (
        <div className="absolute z-20 mt-1 max-h-[280px] w-full overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] [touch-action:pan-y] rounded-lg border border-gray-6 bg-gray-1 py-1 shadow-lg">
          {searchQuery.isLoading ? (
            <p className="px-3 py-2.5 text-sm text-gray-11 font-family-dm-sans">
              Buscando eventos…
            </p>
          ) : events.length === 0 ? (
            <p className="px-3 py-2.5 text-sm text-gray-11 font-family-dm-sans">
              Nenhum evento encontrado.
            </p>
          ) : (
            events.map((event) => (
              <button
                key={event.id}
                type="button"
                onClick={() => {
                  onChange({ id: event.id, name: event.name });
                  setSearch("");
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-gray-3 transition-colors cursor-pointer"
              >
                <span className="min-w-0 truncate text-sm text-gray-12 font-family-dm-sans">
                  {event.name}
                </span>
                {event.eventDate ? (
                  <span className="shrink-0 text-xs text-gray-11 font-family-dm-sans tabular-nums">
                    {formatDateBR(event.eventDate)}
                  </span>
                ) : null}
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
