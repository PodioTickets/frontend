"use client";

import { useState, useEffect, useCallback } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { EventCard } from "@/components/Event/Card";
import { useEvents } from "@/hooks/useEvents";

interface EventCarouselProps {
  items?: number;
  itemsPerView?: number;
  itemsPerViewMobile?: number;
  itemsPerViewTablet?: number;
}

export function EventCarousel({
  items = 10,
  itemsPerView = 4,
  itemsPerViewMobile = 1,
  itemsPerViewTablet = 2,
}: EventCarouselProps) {
  const { events } = useEvents({ page: 1, limit: items });

  const [currentItemsPerView, setCurrentItemsPerView] = useState(itemsPerView);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setCurrentItemsPerView(itemsPerViewMobile);
      } else if (window.innerWidth < 1024) {
        setCurrentItemsPerView(itemsPerViewTablet);
      } else {
        setCurrentItemsPerView(itemsPerView);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [itemsPerView, itemsPerViewMobile, itemsPerViewTablet]);

  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    loop: false,
    containScroll: "trimSnaps",
    // Sem dragFree: com snap o ultimo card sempre assenta (flush-right). dragFree +
    // trimSnaps nao alcancava o ultimo (puxava de volta pro penultimo). Snap e suave.
  });

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);
  const [prevDisabled, setPrevDisabled] = useState(true);
  const [nextDisabled, setNextDisabled] = useState(false);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => {
      setSelectedIndex(emblaApi.selectedScrollSnap());
      setPrevDisabled(!emblaApi.canScrollPrev());
      setNextDisabled(!emblaApi.canScrollNext());
    };
    const onInit = () => setScrollSnaps(emblaApi.scrollSnapList());
    emblaApi.on("init", onInit);
    emblaApi.on("reInit", () => { onInit(); onSelect(); });
    emblaApi.on("select", onSelect);
    onInit();
    onSelect();
    return () => {
      emblaApi.off("init", onInit);
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi]);

  useEffect(() => {
    emblaApi?.reInit();
  }, [emblaApi, currentItemsPerView]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const scrollTo = useCallback((i: number) => emblaApi?.scrollTo(i), [emblaApi]);

  // Gap entre slides via padding-left (box-border) + margin-left negativa no
  // container. Embla mede o slide outer corretamente e ALCANCA o ultimo card.
  // (O modelo antigo subtraia o gap do basis E usava flex gap-4 = gap dobrado,
  // empurrando o ultimo card pra fora do alcance -> puxava pro penultimo.)
  const SLIDE_GAP = 16;
  const slideStyle = {
    flex: `0 0 ${100 / currentItemsPerView}%`,
    minWidth: 0,
    paddingLeft: `${SLIDE_GAP}px`,
  };

  return (
    <div className="relative w-full">
      <button
        onClick={scrollPrev}
        disabled={prevDisabled}
        className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-6 z-10 size-10 rounded-full bg-gray-2 border border-gray-6 items-center justify-center hover:bg-gray-4 transition-all duration-200 shadow-lg disabled:opacity-0 disabled:pointer-events-none"
        aria-label="Slide anterior"
      >
        <ChevronLeft className="size-5 text-gray-12" />
      </button>

      <button
        onClick={scrollNext}
        disabled={nextDisabled}
        className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-6 z-10 size-10 rounded-full bg-gray-2 border border-gray-6 items-center justify-center hover:bg-gray-4 transition-all duration-200 shadow-lg disabled:opacity-0 disabled:pointer-events-none"
        aria-label="Próximo slide"
      >
        <ChevronRight className="size-5 text-gray-12" />
      </button>

      <div ref={emblaRef} className="overflow-hidden px-1 py-4 md:p-4">
        {/* Sem scroll (poucos eventos) -> centraliza pra nao sobrar espaco so de um lado.
            marginLeft negativa compensa o padding-left do primeiro slide (gap pattern). */}
        <div className={`flex ${prevDisabled && nextDisabled ? "justify-center" : ""}`} style={{ marginLeft: `-${SLIDE_GAP}px` }}>
          {events?.map((event) => (
            <div key={event.id} style={slideStyle}>
              <EventCard event={event} />
            </div>
          ))}
        </div>
      </div>

      {scrollSnaps.length > 1 && (
        <div className="hidden md:flex items-center justify-center gap-2 mt-6">
          {scrollSnaps.map((_, i) => (
            <button
              key={i}
              onClick={() => scrollTo(i)}
              className={`h-2 rounded-full transition-all duration-200 ${
                i === selectedIndex
                  ? "w-8 bg-primary-12"
                  : "w-2 bg-gray-6 hover:bg-gray-8"
              }`}
              aria-label={`Ir para slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
