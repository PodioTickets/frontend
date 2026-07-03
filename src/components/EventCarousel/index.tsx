"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { EventCard } from "@/components/Event/Card";
import { useEvents } from "@/hooks/useEvents";

interface EventCarouselProps {
  items?: number;
}

const GAP = 16;
/** Largura fixa do card (Figma 222:5298 = 308×282). */
const CARD_WIDTH = 308;

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

    // Cards com LARGURA FIXA de 308px (Figma). perView = quantos cabem INTEIROS
    // (só pra dots/paginação; o slide tem basis fixa). O +GAP no numerador
    // compensa o último card não ter gap à direita.
    setPerView(Math.max(1, Math.floor((w + GAP) / (CARD_WIDTH + GAP))));
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

  // Slide com largura FIXA do card (308px). O scroller (overflow-x-auto) clipa no
  // mobile, então cards fixos não estouram a página em telas estreitas.
  const slideStyle = { flex: `0 0 ${CARD_WIDTH}px` };

  const arrowClass =
    "hidden md:flex absolute top-1/2 -translate-y-1/2 z-10 size-9 items-center justify-center rounded-full bg-gray-2 border border-gray-6 shadow-md hover:bg-gray-3 transition-all duration-200 disabled:opacity-0 disabled:pointer-events-none";

  return (
    // Área limitada e centralizada: 5 cards no tamanho normal, com respiro nas
    // laterais em telas grandes (a seção pai é full-bleed; aqui recentralizamos).
    // Padding lateral (desktop) cria a "gutter" onde as setas ficam — assim elas
    // NUNCA sobrepõem os cards (o scroller fica dentro do content box, inset). A
    // largura (1376) = 4 cards de 308 + 3 gaps (1280) + as gutters das setas (96).
    <div className="relative mx-auto w-full max-w-[1376px] md:px-12">
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
          // min-w-0: sem isso o slide (flex item) tem `min-width:auto` e pode
          // CRESCER além de 308px quando o conteúdo tem min-content maior → a
          // imagem (aspect-ratio) fica mais alta → card "maior". Trava em 308px.
          <div key={event.id} data-slide className="min-w-0" style={slideStyle}>
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
