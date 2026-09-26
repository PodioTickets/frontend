"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ImageWithInitialFallback } from "@/components/ImageWithInitialFallback";
import { useHomeFeaturedEvents } from "@/hooks/useFeaturedEvents";
import { cn } from "@/utils/cn";

/** Nº de banners na hero (Figma: 5 páginas). */
const SLIDES = 5;
/** Mesmo `limit` do "Eventos em destaque" → reaproveita o cache (sem request extra). */
const HOME_EVENTS_LIMIT = 20;
/** Arraste mínimo (px) para trocar de slide no toque. */
const SWIPE_PX = 40;

/**
 * Posição de cada banner pela distância ao ativo (Figma, frame de 1280px):
 * centro 606px; vizinhos 524px a ±210px; extremos 436px a ±339px. Em % do
 * container para escalar abaixo de 1280. Os laterais só aparecem no desktop.
 */
const POSITIONS: Record<number, { card: string; overlay: string }> = {
  0: { card: "z-30 left-1/2 w-full md:w-[47.4%]", overlay: "opacity-0" },
  [-1]: { card: "z-20 left-[33.6%] w-[40.9%] skew-x-[2.54deg] hidden md:block", overlay: "opacity-60" },
  1: { card: "z-20 left-[66.4%] w-[40.9%] skew-x-[-2.54deg] hidden md:block", overlay: "opacity-60" },
  [-2]: { card: "z-10 left-[23.5%] w-[34.1%] skew-x-[2.54deg] hidden md:block", overlay: "opacity-67" },
  2: { card: "z-10 left-[76.5%] w-[34.1%] skew-x-[-2.54deg] hidden md:block", overlay: "opacity-67" },
};

/** Distância circular do slide `i` ao ativo, em [-n/2, n/2]. */
function offsetOf(i: number, active: number, n: number) {
  const d = (((i - active) % n) + n) % n;
  return d > n / 2 ? d - n : d;
}

/** Hero da home (Figma 6731:58998): banners dos eventos em destaque em leque. */
export function HomeHero() {
  const { events, isLoading } = useHomeFeaturedEvents(HOME_EVENTS_LIMIT);
  const slides = events.slice(0, SLIDES);
  const n = slides.length;
  const [active, setActive] = useState(0);
  const touchX = useRef<number | null>(null);

  if (isLoading) {
    // Mesma caixa da hero pronta (área + espaço das bolinhas) → sem salto de layout.
    return (
      <div className="flex w-full flex-col items-center gap-9">
        <div className="relative w-full aspect-1660/930 md:aspect-[1280/344]">
          <div className="absolute left-1/2 top-1/2 aspect-1660/930 w-full -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-xl bg-gray-5 md:w-[47.4%]" />
        </div>
        <div className="h-2" />
      </div>
    );
  }
  if (n === 0) return null;

  const go = (dir: number) => setActive((a) => (a + dir + n) % n);
  const arrowClass =
    "hidden md:flex absolute top-1/2 -translate-y-1/2 z-40 size-12 items-center justify-center rounded-full bg-gray-2 border-[1.5px] border-gray-6 hover:bg-gray-3 transition-colors";

  return (
    <div className="flex w-full flex-col items-center gap-9">
      <div
        className="relative w-full aspect-1660/930 md:aspect-[1280/344]"
        onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchX.current === null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          touchX.current = null;
          if (Math.abs(dx) > SWIPE_PX) go(dx < 0 ? 1 : -1);
        }}
      >
        {slides.map((event, i) => {
          const d = offsetOf(i, active, n);
          const pos = POSITIONS[d];
          const isActive = d === 0;
          return (
            <Link
              key={event.id}
              href={`/events/${event.slug}`}
              aria-hidden={!isActive}
              tabIndex={isActive ? 0 : -1}
              // Banner lateral: o clique traz para o centro em vez de navegar.
              onClick={(e) => {
                if (isActive) return;
                e.preventDefault();
                setActive(i);
              }}
              className={cn(
                "group absolute top-1/2 aspect-1660/930 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl transition-all duration-500 ease-out",
                pos ? pos.card : "z-0 left-1/2 w-[34.1%] opacity-0 pointer-events-none",
              )}
            >
              <ImageWithInitialFallback
                src={event.bannerUrl ?? null}
                alt={event.name}
                name={event.name}
                fallbackId={event.id}
                fill
                priority={i === 0}
                sizes="(max-width: 768px) 92vw, 607px"
                quality={90}
                // Fundo transparente e sem raio próprio: o recorte é SÓ do link. O
                // `bg-gray-3` padrão vazava como fio claro na borda inclinada/arredondada.
                className="size-full bg-transparent border-0 border-transparent object-cover"
                letterClassName="text-5xl"
              />
              <div
                className={cn(
                  "pointer-events-none absolute inset-0 bg-gray-12 transition-opacity duration-500",
                  pos ? pos.overlay : "opacity-0",
                )}
              />
            </Link>
          );
        })}

        {n > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} className={cn(arrowClass, "left-[20.9%]")} aria-label="Banner anterior">
              <ChevronLeft className="size-6 text-gray-12" />
            </button>
            <button type="button" onClick={() => go(1)} className={cn(arrowClass, "right-[20.9%]")} aria-label="Próximo banner">
              <ChevronRight className="size-6 text-gray-12" />
            </button>
          </>
        )}
      </div>

      {n > 1 && (
        <div className="flex items-center gap-2">
          {slides.map((event, i) => (
            <button
              key={event.id}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Ir para o banner ${i + 1}`}
              className={cn(
                "h-2 rounded-full transition-all duration-200",
                i === active ? "w-12 bg-primary-10" : "w-2 bg-gray-8 hover:bg-gray-9",
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
