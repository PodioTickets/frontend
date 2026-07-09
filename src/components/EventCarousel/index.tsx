"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { EventCard } from "@/components/Event/Card";
import { useEvents } from "@/hooks/useEvents";

interface EventCarouselProps {
  items?: number;
}

const GAP = 16;
/** Largura fixa do card (DESKTOP). Reduzida do Figma (308) para 243 px p/ caber 5
 *  cards INTEIROS no content box de 1280 (max-w 1376 − gutters 96): 5×243 + 4×16 ≈ 1280. */
const CARD_WIDTH = 243;
/** MOBILE: nº de cards VISÍVEIS por viewport (2.3 → o 3º card aparece "espiando").
 *  O slide vira responsivo (`basis` por calc) abaixo do breakpoint md. */
const MOBILE_PER_VIEW = 2.3;
/** Breakpoint md do Tailwind — abaixo, layout mobile (2.3 cards por tela). */
const MD_BREAKPOINT = 768;

export function EventCarousel({ items = 20 }: EventCarouselProps) {
  const { events } = useEvents({ page: 1, limit: items });

  // Scroll horizontal NATIVO (momentum, sempre alcança o último card).
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [perView, setPerView] = useState(5);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const [progress, setProgress] = useState(0); // 0..1 (posição no scroll)

  const recalc = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const w = el.clientWidth || 1;

    // perView = quantos cards cabem INTEIROS (só pra dots/paginação). Usa a largura
    // EFETIVA do card: no mobile o slide é responsivo (MOBILE_PER_VIEW por viewport,
    // casando com o `basis` calc do slide); no desktop é fixo (CARD_WIDTH). O +GAP
    // no numerador compensa o último card não ter gap à direita.
    const cardW =
      w < MD_BREAKPOINT ? (w - 2 * GAP) / MOBILE_PER_VIEW : CARD_WIDTH;
    setPerView(Math.max(1, Math.floor((w + GAP) / (cardW + GAP))));
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

  const arrowClass =
    "hidden md:flex absolute top-1/2 -translate-y-1/2 z-10 size-9 items-center justify-center rounded-full bg-gray-2 border border-gray-6 shadow-md hover:bg-gray-3 transition-all duration-200 disabled:opacity-0 disabled:pointer-events-none";

  return (
    // Área limitada e centralizada: 5 cards no tamanho normal, com respiro nas
    // laterais em telas grandes (a seção pai é full-bleed; aqui recentralizamos).
    // Padding lateral (desktop) cria a "gutter" onde as setas ficam — assim elas
    // NUNCA sobrepõem os cards (o scroller fica dentro do content box, inset). A
    // largura (1376) = 5 cards de 243 + 4 gaps (1279) + as gutters das setas (96).
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
          // Slide: MOBILE = 2.3 cards por viewport (basis `calc((100% − 2·gap)/2.3)`,
          // o 3º card "espia"); DESKTOP (md+) = 243px fixo. `shrink-0 grow-0` trava o
          // basis; `min-w-0` evita que o `min-width:auto` do flex item cresça o card
          // (senão a imagem aspect-ratio ficaria mais alta).
          <div
            key={event.id}
            data-slide
            className="min-w-0 shrink-0 grow-0 basis-[calc((100%-32px)/2.3)] md:basis-[243px]"
          >
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
