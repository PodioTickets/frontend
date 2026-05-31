"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { EventCard } from "@/components/Event/Card";
import { useEvents } from "@/hooks/useEvents";

interface EventCarouselProps {
  items?: number;
}

const GAP = 16;
const TARGET_CARD = 300; // largura-alvo do card (Figma ~308). Cards preenchem a largura.

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
    // Quantos cards de ~300px cabem na largura (preenche a tela). Mínimo 1.1 (peek no mobile).
    setPerView(Math.max(1.1, w / (TARGET_CARD + GAP)));
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

  const stepSize = () => {
    const el = scrollerRef.current;
    const card = el?.querySelector<HTMLElement>("[data-slide]");
    return card ? card.offsetWidth + GAP : (el?.clientWidth ?? 0) * 0.8;
  };
  const scrollByDir = (dir: number) => {
    scrollerRef.current?.scrollBy({ left: dir * stepSize(), behavior: "smooth" });
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
    <div className="relative w-full">
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
        className="flex items-start gap-4 overflow-x-auto overscroll-x-contain px-1 py-3 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
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
