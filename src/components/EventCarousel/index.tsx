"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { EventCard } from "@/components/Event/Card";
import { useEvents } from "@/hooks/useEvents";

interface EventCarouselProps {
  items?: number;
  itemsPerView?: number;
  itemsPerViewMobile?: number;
  itemsPerViewTablet?: number;
}

const GAP = 16;

export function EventCarousel({
  items = 10,
  itemsPerView = 4,
  itemsPerViewMobile = 1,
  itemsPerViewTablet = 2,
}: EventCarouselProps) {
  const { events } = useEvents({ page: 1, limit: items });

  const [perView, setPerView] = useState(itemsPerView);
  // Scroll horizontal NATIVO (sem embla): momentum de fabrica e SEMPRE alcanca o
  // ultimo card (scrollLeft chega em scrollWidth - clientWidth). Sem snap pra nao
  // "puxar de volta" no fim. Setas/dots controlam o scroll nativo.
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth < 768) setPerView(itemsPerViewMobile);
      else if (window.innerWidth < 1024) setPerView(itemsPerViewTablet);
      else setPerView(itemsPerView);
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [itemsPerView, itemsPerViewMobile, itemsPerViewTablet]);

  const stepSize = useCallback(() => {
    const el = scrollerRef.current;
    const card = el?.querySelector<HTMLElement>("[data-slide]");
    return card ? card.offsetWidth + GAP : (el?.clientWidth ?? 0) * 0.8;
  }, []);

  const update = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setCanPrev(el.scrollLeft > 1);
    setCanNext(el.scrollLeft < max - 1);
    const step = stepSize();
    setActiveIndex(step > 0 ? Math.round(el.scrollLeft / step) : 0);
  }, [stepSize]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [update, events, perView]);

  const scrollByDir = (dir: number) => {
    scrollerRef.current?.scrollBy({ left: dir * stepSize(), behavior: "smooth" });
  };
  const scrollToIndex = (i: number) => {
    scrollerRef.current?.scrollTo({ left: i * stepSize(), behavior: "smooth" });
  };

  // Largura do slide pra mostrar ~perView itens, descontando os gaps.
  const slideStyle = {
    flex: `0 0 calc((100% - ${(perView - 1) * GAP}px) / ${perView})`,
    minWidth: 0,
  };

  return (
    <div className="relative w-full">
      <button
        onClick={() => scrollByDir(-1)}
        disabled={!canPrev}
        className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full z-10 size-10 rounded-full bg-gray-2 border border-gray-6 items-center justify-center hover:bg-gray-4 transition-all duration-200 shadow-lg disabled:opacity-0 disabled:pointer-events-none"
        aria-label="Slide anterior"
      >
        <ChevronLeft className="size-5 text-gray-12" />
      </button>

      <button
        onClick={() => scrollByDir(1)}
        disabled={!canNext}
        className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-full z-10 size-10 rounded-full bg-gray-2 border border-gray-6 items-center justify-center hover:bg-gray-4 transition-all duration-200 shadow-lg disabled:opacity-0 disabled:pointer-events-none"
        aria-label="Próximo slide"
      >
        <ChevronRight className="size-5 text-gray-12" />
      </button>

      <div
        ref={scrollerRef}
        className={`flex gap-4 overflow-x-auto overscroll-x-contain px-1 py-4 md:p-4 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
          !canPrev && !canNext ? "justify-center" : ""
        }`}
      >
        {events?.map((event) => (
          <div key={event.id} data-slide style={slideStyle}>
            <EventCard event={event} />
          </div>
        ))}
      </div>

      {events && events.length > perView && (
        <div className="hidden md:flex items-center justify-center gap-2 mt-6">
          {events.map((_, i) => (
            <button
              key={i}
              onClick={() => scrollToIndex(i)}
              className={`h-2 rounded-full transition-all duration-200 ${
                i === activeIndex ? "w-8 bg-primary-12" : "w-2 bg-gray-6 hover:bg-gray-8"
              }`}
              aria-label={`Ir para slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
