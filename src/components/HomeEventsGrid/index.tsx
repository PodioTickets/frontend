"use client";

import Link from "next/link";
import { EventCard } from "@/components/Event/Card";
import { useEventSearch } from "@/hooks/useEventSearch";

/** 2 linhas de 5 no desktop (Figma tinha 4; 5 a pedido do usuário). */
const HOME_EVENTS = 10;

/**
 * "Todos os eventos" da home = os 10 PRIMEIROS do calendário (/search sem filtros):
 * mesma busca, e o backend já pagina na ordem do calendário (destaques, próximos por
 * data, concluídos no fim). "Ver mais eventos" leva ao calendário.
 */
export function HomeEventsGrid() {
  const { events, isLoading } = useEventSearch({ limit: HOME_EVENTS });

  if (!isLoading && events.length === 0) return null;

  return (
    <section className="flex w-full flex-col items-center gap-8">
      <h2 className="font-manrope text-2xl font-extrabold leading-[1.1] text-gray-12 md:text-[28px]">
        Todos os eventos
      </h2>

      <div className="grid w-full grid-cols-2 gap-x-4 gap-y-5 lg:grid-cols-5">
        {isLoading
          ? Array.from({ length: HOME_EVENTS }).map((_, i) => (
              <div key={i} className="aspect-1660/930 w-full animate-pulse rounded-[8px] bg-gray-5" />
            ))
          : events.slice(0, HOME_EVENTS).map((event) => (
              <EventCard key={event.id} event={event} originalImage />
            ))}
      </div>

      <Link
        href="/search"
        className="flex h-12 items-center justify-center rounded-[8px] border border-gray-6 px-[68px] font-manrope text-lg font-bold leading-[1.1] text-gray-12 transition-colors hover:bg-gray-3"
      >
        Ver mais eventos
      </Link>
    </section>
  );
}
