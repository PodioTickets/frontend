"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { EventCard } from "@/components/Event/Card";
import { useEvents } from "@/hooks/useEvents";

interface EventCarouselProps {
  items?: number;
}

const GAP = 16;

export function EventCarousel({ items = 20 }: EventCarouselProps) {
  const { events } = useEvents({ page: 1, limit: items });

  // Scroll horizontal NATIVO (momentum, sempre alcança o último card).
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [perView, setPerView] = useState(4);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const [progress, setProgress] = useState(0); // 0..1 (posição no scroll)

  const recalc = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const w = el.clientWidth || 1;

    // Largura-alvo do card = tamanho do Figma (~300px).
    if (w < 768) {
      // Mobile: um card no tamanho do Figma + peek do próximo.
      setPerView(Math.max(1.15, w / (300 + GAP)));
    } else {
      // Desktop: 4 por vez (3 em 768–1023, pra não espremer). Área limitada a
      // ~1216px centralizada (ver root) → cards ~292px (≈ card do Figma) com
      // respiro nas laterais. A seta avança uma página inteira.
      setPerView(w >= 1024 ? 4 : 3);
    }
    const max = el.scrollWidth - el.clientWidth;
    setCanPrev(el.scrollLeft > 1);
    setCanNext(el.scrollLeft < max - 1);
    setProgress(max > 0 ? el.scrollLeft / max : 0);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    recalc();
    el.addEventListener("scroll", recalc, { passive: true });
    window.addEventListener("resize", recalc);
    const ro = new ResizeObserver(recalc);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", recalc);
      window.removeEventListener("resize", recalc);
      ro.disconnect();
    };
  }, [recalc, events]);

  const total = events?.length ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / Math.max(1, Math.floor(perView))));
  const activePage = Math.round(progress * (pageCount - 1));
  const scrollable = canPrev || canNext;

  // "Passar" avança uma PÁGINA inteira (os 5 visíveis), não um card por vez.
  const scrollByDir = (dir: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth, behavior: "smooth" });
  };
  const scrollToPage = (i: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    el.scrollTo({ left: pageCount > 1 ? (i / (pageCount - 1)) * max : 0, behavior: "smooth" });
  };

  const slideStyle = {
    flex: `0 0 calc((100% - ${(perView - 1) * GAP}px) / ${perView})`,
    minWidth: 0,
  };

  const arrowClass =
    "hidden md:flex absolute top-1/2 -translate-y-1/2 z-10 size-9 items-center justify-center rounded-full bg-gray-2 border border-gray-6 shadow-md hover:bg-gray-3 transition-all duration-200 disabled:opacity-0 disabled:pointer-events-none";

  return (
    // Área limitada e centralizada: 5 cards no tamanho normal, com respiro nas
    // laterais em telas grandes (a seção pai é full-bleed; aqui recentralizamos).
    <div className="relative mx-auto w-full max-w-[1216px]">
      <button
        onClick={() => scrollByDir(-1)}
        disabled={!canPrev}
        className={`${arrowClass} left-2`}
        aria-label="Slide anterior"
      >
        <ChevronLeft className="size-5 text-gray-12" />
      </button>
      <button
        onClick={() => scrollByDir(1)}
        disabled={!canNext}
        className={`${arrowClass} right-2`}
        aria-label="Próximo slide"
      >
        <ChevronRight className="size-5 text-gray-12" />
      </button>

      <div
        ref={scrollerRef}
        className={`flex items-start gap-4 overflow-x-auto overscroll-x-contain py-3 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
          scrollable ? "" : "justify-center"
        }`}
      >
        {/* Sem spacers de borda: eles somavam largura + gaps extras e faziam o 5º
            card estourar (cortado à direita). Com `flex-basis` de perView cards +
            (perView-1) gaps = 100%, os 5 cabem INTEIROS; o overflow dos demais
            mantém a seta de scroll visível. */}
        {events?.map((event) => (
          <div key={event.id} data-slide style={slideStyle}>
            <EventCard event={event} />
          </div>
        ))}
      </div>

      {scrollable && pageCount > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6 md:mt-8">
          {Array.from({ length: pageCount }).map((_, i) => (
            <button
              key={i}
              onClick={() => scrollToPage(i)}
              aria-label={`Ir para página ${i + 1}`}
              className={
                i === activePage
                  ? "h-2 w-12 rounded-full bg-[#3e9b4f] transition-all duration-200"
                  : "size-2 rounded-full bg-[#e0e0e0] transition-all duration-200 hover:bg-gray-8"
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
