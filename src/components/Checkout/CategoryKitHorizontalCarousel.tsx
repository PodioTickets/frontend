"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ImageCarouselItem } from "@/utils/ticketProductVisuals";
import { ImageCarouselModal } from "./ImageCarouselModal";
import { cn } from "@/utils/cn";

type CategoryKitHorizontalCarouselProps = {
  items: ImageCarouselItem[];
};

type ItemWithImage = ImageCarouselItem & { src: string };

function hasUsableProductImage(item: ImageCarouselItem): item is ItemWithImage {
  const s = item.src;
  return typeof s === "string" && s.trim().length > 0;
}

const SIDE_PX = 88;
const CENTER_PX = 128;
const MAX_VISIBLE = 5;

/** Faixa horizontal ON_CATEGORIES: só produtos com URL de imagem; navegação e foco acessíveis. */
export function CategoryKitHorizontalCarousel({
  items,
}: CategoryKitHorizontalCarouselProps) {
  const [centerIdx, setCenterIdx] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalIdx, setModalIdx] = useState(0);
  const displayItems = useMemo(
    () => items.filter(hasUsableProductImage),
    [items]
  );

  const displayKey = useMemo(
    () => displayItems.map((i) => i.id).join(","),
    [displayItems]
  );

  useEffect(() => {
    if (displayItems.length === 0) return;
    setCenterIdx((i) => Math.min(i, displayItems.length - 1));
  }, [displayKey, displayItems.length]);

  const safeCenter = useMemo(() => {
    if (displayItems.length === 0) return 0;
    return Math.min(centerIdx, displayItems.length - 1);
  }, [centerIdx, displayItems.length]);

  const goPrev = useCallback(() => {
    if (displayItems.length === 0) return;
    setCenterIdx((i) => (i === 0 ? displayItems.length - 1 : i - 1));
  }, [displayItems.length]);

  const goNext = useCallback(() => {
    if (displayItems.length === 0) return;
    setCenterIdx((i) =>
      i === displayItems.length - 1 ? 0 : i + 1
    );
  }, [displayItems.length]);

  const visibleIndices = useMemo(() => {
    if (displayItems.length === 0) return [];
    const n = displayItems.length;
    const maxSlots = Math.min(MAX_VISIBLE, n);
    const half = Math.floor(maxSlots / 2);
    let start = safeCenter - half;
    if (start < 0) start = 0;
    if (start + maxSlots > n) start = Math.max(0, n - maxSlots);
    return Array.from({ length: maxSlots }, (_, i) => start + i);
  }, [displayItems.length, safeCenter]);

  if (displayItems.length === 0) return null;

  const single = displayItems.length === 1;
  const openModal = (idx: number) => {
    setModalIdx(idx);
    setModalOpen(true);
  };

  const navButtonClass =
    "flex size-10 shrink-0 items-center justify-center text-gray-12 transition-all active:scale-95 disabled:pointer-events-none disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-8 focus-visible:ring-offset-2";

  return (
    <>
      <div
        className="flex w-full flex-col gap-3"
        role="region"
        aria-roledescription="carrossel"
        aria-label="Imagens dos produtos do kit"
      >
        <div className="flex w-full items-center justify-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={goPrev}
            disabled={single}
            className={navButtonClass}
            aria-label="Imagem anterior"
          >
            <ChevronLeft className="size-5 shrink-0" aria-hidden />
          </button>

          <div
            role="list"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft") {
                e.preventDefault();
                goPrev();
              }
              if (e.key === "ArrowRight") {
                e.preventDefault();
                goNext();
              }
            }}
            className={cn(
              "flex min-h-[136px] min-w-0 flex-1 items-center justify-start gap-2 overflow-x-auto scroll-smooth py-1 max-sm:snap-x max-sm:snap-mandatory sm:justify-center sm:gap-3 sm:overflow-visible",
              "outline-none focus-visible:ring-2 focus-visible:ring-primary-8 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-1 rounded-xl"
            )}
          >
            {visibleIndices.map((idx) => {
              const item = displayItems[idx];
              const isCenter = idx === safeCenter;
              const size = isCenter ? CENTER_PX : SIDE_PX;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="listitem"
                  onClick={() => {
                    setCenterIdx(idx);
                    openModal(idx);
                  }}
                  className={cn(
                    "relative shrink-0 overflow-hidden rounded-lg border bg-gray-2 transition-all duration-300 ease-out max-sm:snap-center",
                    "hover:border-gray-7 hover:shadow-md",
                    isCenter
                      ? "z-10 border-primary-8 shadow-[0px_4px_12px_0px_rgba(17,17,17,0.12)] scale-[1.02]"
                      : "border-gray-6 opacity-95 hover:opacity-100 scale-100"
                  )}
                  style={{ width: size, height: size }}
                  aria-label={`${item.name}. ${isCenter ? "Selecionada." : ""} Ver em tamanho maior.`}
                  aria-current={isCenter ? "true" : undefined}
                >
                  <Image
                    src={item.src}
                    alt={item.name}
                    fill
                    sizes={`${size}px`}
                    className="object-cover"
                  />
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={goNext}
            disabled={single}
            className={navButtonClass}
            aria-label="Próxima imagem"
          >
            <ChevronRight className="size-5 shrink-0" aria-hidden />
          </button>
        </div>

        {!single && displayItems.length <= 12 ? (
          <div className="flex flex-wrap justify-center gap-1.5 px-2">
            {displayItems.map((item, i) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setCenterIdx(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i === safeCenter
                    ? "w-6 bg-primary-10"
                    : "w-1.5 bg-gray-6 hover:bg-gray-8"
                )}
                aria-label={`Ir para imagem ${i + 1}: ${item.name}`}
              />
            ))}
          </div>
        ) : !single ? (
          <p className="text-center text-xs text-gray-11 font-family-dm-sans">
            {safeCenter + 1} de {displayItems.length}
          </p>
        ) : null}
      </div>

      <ImageCarouselModal
        items={displayItems}
        initialIndex={modalIdx}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        ticketName="Kit"
      />
    </>
  );
}
