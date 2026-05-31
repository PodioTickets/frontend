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
  // Scroll horizontal NATIVO: momentum de fabrica, sempre alcanca o ultimo card.
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const [activePage, setActivePage] = useState(0);

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

  const total = events?.length ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / Math.max(1, Math.round(perView))));

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
    const pageW = el.clientWidth || 1;
    setActivePage(Math.round(el.scrollLeft / pageW));
  }, []);

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
  const scrollToPage = (i: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };

  // Largura do slide pra mostrar ~perView itens, descontando os gaps.
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
        className={`${arrowClass} left-0 -translate-x-1/2`}
        aria-label="Slide anterior"
      >
        <ChevronLeft className="size-5 text-gray-12" />
      </button>
      <button
        onClick={() => scrollByDir(1)}
        disabled={!canNext}
        className={`${arrowClass} right-0 translate-x-1/2`}
        aria-label="Próximo slide"
      >
        <ChevronRight className="size-5 text-gray-12" />
      </button>

      <div
        ref={scrollerRef}
        className="flex items-stretch gap-4 overflow-x-auto overscroll-x-contain px-1 py-3 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {events?.map((event) => (
          <div key={event.id} data-slide style={slideStyle} className="flex">
            <EventCard event={event} />
          </div>
        ))}
      </div>

      {pageCount > 1 && (
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
