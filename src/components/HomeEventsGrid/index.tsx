"use client";

import Link from "next/link";
import { EventCard } from "@/components/Event/Card";
import { useEventSearch } from "@/hooks/useEventSearch";
import { cn } from "@/utils/cn";
import { useT } from "@/i18n/client";

/** 2 linhas de 5 no desktop (Figma tinha 4; 5 a pedido do usuário). */
const HOME_EVENTS = 10;
/** Abaixo de `lg` (2 colunas): 8 = 4 linhas de 2 (Figma 7549:73556). Esconde por CSS, sem request extra. */
const MOBILE_MAX = 8;
const hideOnMobile = (i: number) => (i >= MOBILE_MAX ? "hidden lg:block" : undefined);

/**
 * "Explore os eventos" da home = os 10 PRIMEIROS do calendário (/search sem filtros):
 * mesma busca, e o backend já pagina na ordem do calendário (destaques, próximos por
 * data, concluídos no fim). "Ver mais eventos" leva ao calendário.
 */
export function HomeEventsGrid() {
  const { events, isLoading } = useEventSearch({ limit: HOME_EVENTS });
  const t = useT("home");

  if (!isLoading && events.length === 0) return null;

  return (
    <section className="flex w-full flex-col items-center gap-8">
      <div className="flex w-full flex-col gap-5 md:gap-8">
        <h2 className="[text-box-trim:trim-both] [text-box-edge:cap_alphabetic] font-family-dm-sans text-base font-semibold leading-[1.3] text-gray-12 md:text-[28px]">
          {t("exploreEvents")}
        </h2>

        <div className="grid w-full grid-cols-2 gap-x-[11px] gap-y-5 md:gap-x-4 md:gap-y-6 lg:grid-cols-5">
          {isLoading
            ? Array.from({ length: HOME_EVENTS }).map((_, i) => (
                <div key={i} className={cn("aspect-1660/930 w-full animate-pulse rounded-[8px] bg-gray-5", hideOnMobile(i))} />
              ))
            : events.slice(0, HOME_EVENTS).map((event, i) => (
                <div key={event.id} className={hideOnMobile(i)}>
                  <EventCard event={event} originalImage smallTextOnMobile />
                </div>
              ))}
        </div>
      </div>

      <Link
        href="/search"
        className="flex h-11 w-full items-center justify-center rounded-[8px] border border-gray-6 font-manrope text-base font-bold leading-[1.1] text-gray-12 transition-colors hover:bg-gray-3 md:h-12 md:w-auto md:px-[68px] md:text-lg"
      >
        {t("seeMoreEvents")}
      </Link>
    </section>
  );
}
