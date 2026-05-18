"use client";

import { useMemo, useState } from "react";
import { ArrowButton } from "../ArrowButton";
import { ImageCarouselModal } from "./ImageCarouselModal";
import { ImageWithInitialFallback } from "@/components/ImageWithInitialFallback";

interface ProductCardGalleryProps {
  productId: string;
  productName: string;
  image?: string | null;
  images?: Array<string | null | undefined>;
  /** Tailwind size (default 100px square). Ex.: "w-[120px] h-[120px]". */
  containerClassName?: string;
  /** sizes hint pro next/image. Default: "100px". */
  sizes?: string;
}

/**
 * Galeria compacta de imagens do produto usada no resumo do participante
 * (desktop e mobile). Comportamento:
 * - 1 imagem: render simples, click abre modal de visualização.
 * - >1 imagem: carrossel manual (setas) + dots + click abre modal no índice atual.
 * - 0 imagens: cai pro placeholder com inicial do nome (ImageWithInitialFallback).
 */
export function ProductCardGallery({
  productId,
  productName,
  image,
  images,
  containerClassName = "w-[100px] h-[100px]",
  sizes = "100px",
}: ProductCardGalleryProps) {
  const allImages = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    const add = (src: string | null | undefined) => {
      if (src && !seen.has(src)) {
        seen.add(src);
        out.push(src);
      }
    };
    add(image);
    for (const img of images ?? []) add(img);
    return out;
  }, [image, images]);

  const modalItems = useMemo(
    () =>
      allImages.map((src, i) => ({
        id: `${productId}-${i}`,
        name: productName,
        src,
      })),
    [allImages, productId, productName],
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const safeIndex = Math.min(currentIndex, Math.max(0, allImages.length - 1));
  const currentSrc = allImages[safeIndex] ?? null;
  const hasMultiple = allImages.length > 1;

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((i) => (i === 0 ? allImages.length - 1 : i - 1));
  };
  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((i) => (i === allImages.length - 1 ? 0 : i + 1));
  };

  return (
    <>
      <div
        className={`${containerClassName} rounded border border-gray-6 relative overflow-hidden shrink-0 group cursor-pointer`}
        onClick={() => setIsModalOpen(true)}
      >
        <ImageWithInitialFallback
          src={currentSrc}
          alt={productName}
          name={productName}
          fallbackId={productId}
          fill
          sizes={sizes}
          className="size-full border-0"
          letterClassName="text-2xl font-semibold"
        />
        {hasMultiple && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              className="absolute left-0 top-0 h-full w-7 flex items-center justify-center"
              aria-label="Imagem anterior"
            >
              <div className="rotate-180 scale-75 size-6 bg-gray-4 hover:bg-gray-1 transition-all duration-300 ease-in-out flex items-center justify-center rounded-full">
                <ArrowButton isOpen={false} />
              </div>
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="absolute right-0 top-0 h-full w-7 flex items-center justify-center"
              aria-label="Próxima imagem"
            >
              <div className="scale-75 size-6 bg-gray-4 hover:bg-gray-1 transition-all duration-300 ease-in-out flex items-center justify-center rounded-full">
                <ArrowButton isOpen={false} />
              </div>
            </button>
            <div className="absolute bottom-1 left-0 right-0 flex justify-center gap-1">
              {allImages.map((_, idx) => (
                <span
                  key={idx}
                  className={`block rounded-full transition-all ${
                    idx === safeIndex
                      ? "w-3 h-1.5 bg-white"
                      : "w-1.5 h-1.5 bg-white/50"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {modalItems.length > 0 && (
        <ImageCarouselModal
          items={modalItems}
          initialIndex={safeIndex}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          ticketName={productName}
        />
      )}
    </>
  );
}
