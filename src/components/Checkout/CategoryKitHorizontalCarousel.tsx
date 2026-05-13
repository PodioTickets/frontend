 "use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import {
  orderCarouselItemsWithPreferredInCenter,
  type ImageCarouselItem,
} from "@/utils/ticketProductVisuals";
import { ImageCarouselModal } from "./ImageCarouselModal";
import { cn } from "@/utils/cn";
import { ImageWithInitialFallback } from "../ImageWithInitialFallback";

type CategoryKitHorizontalCarouselProps = {
  items: ImageCarouselItem[];
  primaryProductId?: string | null;
};

type ItemWithImage = ImageCarouselItem & { src: string };

function hasUsableProductImage(item: ImageCarouselItem): item is ItemWithImage {
  const s = item.src;
  return typeof s === "string" && s.trim().length > 0;
}

export function CategoryKitHorizontalCarousel({
  items,
  primaryProductId,
}: CategoryKitHorizontalCarouselProps) {
  const displayItems = useMemo(
    () => items.filter(hasUsableProductImage),
    [items]
  );

  const preferredIndex = useMemo(() => {
    if (primaryProductId) {
      // primaryProductId is an image URL from primaryKitProductByCategoryId
      const i = displayItems.findIndex((x) => x.src === primaryProductId);
      if (i >= 0) return i;
    }
    return 0;
  }, [displayItems, primaryProductId]);

  // Reordena para o primário ficar no índice central (Math.floor(n/2))
  const orderedItems = useMemo(
    () => orderCarouselItemsWithPreferredInCenter(displayItems, preferredIndex),
    [displayItems, preferredIndex]
  );

  const n = orderedItems.length;
  const startIndex = Math.floor(n / 2);

  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "center",
    loop: false,
    startIndex,
    containScroll: false,
  });

  const [selectedIndex, setSelectedIndex] = useState(startIndex);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalIdx, setModalIdx] = useState(0);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    onSelect();
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi]);

  useEffect(() => {
    emblaApi?.reInit({ startIndex });
    setSelectedIndex(startIndex);
  }, [emblaApi, startIndex]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  const openModal = useCallback(
    (orderedIndex: number) => {
      const id = orderedItems[orderedIndex]?.id;
      const sourceIdx = id ? displayItems.findIndex((x) => x.id === id) : 0;
      setModalIdx(sourceIdx >= 0 ? sourceIdx : 0);
      setModalOpen(true);
    },
    [orderedItems, displayItems]
  );

  if (n === 0) return null;

  const single = n === 1;

  const navButtonClass =
    "flex size-10 shrink-0 items-center justify-center text-gray-12 transition-all active:scale-95 disabled:pointer-events-none disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-8 focus-visible:ring-offset-2";

  return (
    <>
      <div
        className="flex w-full flex-col gap-3 overflow-hidden"
        role="region"
        aria-roledescription="carrossel"
        aria-label="Imagens dos produtos do kit"
      >
        <div className="flex w-full items-center justify-center gap-2">
          <button
            type="button"
            onClick={scrollPrev}
            disabled={single}
            className={navButtonClass}
            aria-label="Imagem anterior"
          >
            <ChevronLeft className="size-5 shrink-0" aria-hidden />
          </button>

          <div ref={emblaRef} className="min-w-0 flex-1 overflow-hidden py-3 max-w-[592px]">
            <div className="flex items-center gap-2">
              {orderedItems.map((item, index) => {
                const isCenter = index === selectedIndex;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      if (isCenter) {
                        openModal(index);
                      } else {
                        emblaApi?.scrollTo(index);
                      }
                    }}
                    className={cn(
                      "relative shrink-0 overflow-hidden rounded-lg border bg-gray-2 transition-all duration-300 ease-out",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-8",
                      // Mobile: 60×60 pra caber 5 itens visíveis (343-32 gaps = 311 ÷ 5 ≈ 62).
                      // Desktop: 112×112 original.
                      "size-[60px] md:size-[112px]",
                      isCenter
                        ? "z-10 border-primary-8 scale-110"
                        : "border-gray-5 scale-90 hover:border-gray-7"
                    )}
                    aria-label={`${item.name}.${isCenter ? " Selecionada. Ver em tamanho maior." : ""}`}
                    aria-current={isCenter ? "true" : undefined}
                  >
                    <ImageWithInitialFallback
                      src={item.src}
                      alt={item.name}
                      name={item.name}
                      fill
                      sizes="(max-width: 768px) 60px, 112px"
                      className="object-cover size-full border-0 rounded-lg"
                    />
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={scrollNext}
            disabled={single}
            className={navButtonClass}
            aria-label="Próxima imagem"
          >
            <ChevronRight className="size-5 shrink-0" aria-hidden />
          </button>
        </div>

        {!single && (
          <div className="flex flex-wrap justify-center gap-1.5 px-2">
            {orderedItems.map((item, i) => (
              <button
                key={item.id}
                type="button"
                onClick={() => emblaApi?.scrollTo(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i === selectedIndex
                    ? "w-6 bg-primary-10"
                    : "w-1.5 bg-gray-6 hover:bg-gray-8"
                )}
                aria-label={`Ir para imagem ${i + 1}: ${item.name}`}
              />
            ))}
          </div>
        )}
      </div>

      <ImageCarouselModal
        items={displayItems}
        initialIndex={modalIdx}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        ticketName="Kit"
        preferredProductId={primaryProductId}
      />
    </>
  );
}
