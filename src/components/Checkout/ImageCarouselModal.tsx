"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { ImageWithInitialFallback } from "@/components/ImageWithInitialFallback";
import { itemInitialLetter } from "@/utils/itemInitial";
import {
  orderCarouselItemsWithPreferredInCenter,
  type ImageCarouselItem,
} from "@/utils/ticketProductVisuals";

export type { ImageCarouselItem } from "@/utils/ticketProductVisuals";

/**
 * Imagem principal do lightbox — exibida no TAMANHO NATURAL, apenas encolhida
 * (`max-h-full`/`max-w-full`, `w/h-auto`) para caber na área livre já dimensionada
 * por flexbox. NÃO usa `fill`/`object-contain` (que AMPLIAM imagens pequenas até
 * preencher a caixa quase-tela-cheia → "grande demais"/borrada) nem unidades `vh`
 * (que no iOS Safari resolvem pra viewport inteira, ignorando os insets do Header/
 * MobileSummaryBar, e a imagem estouraria atrás das barras). Fallback = inicial.
 */
function LightboxImage({
  src,
  alt,
  name,
  fallbackId,
}: {
  src: string | null | undefined;
  alt: string;
  name: string;
  fallbackId?: string;
}) {
  const trimmed = src?.trim() ?? "";
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [trimmed]);
  const onError = useCallback(() => setFailed(true), []);

  if (!trimmed || failed) {
    return (
      <span className="select-none font-family-dm-sans text-7xl font-semibold text-gray-11 md:text-8xl">
        {itemInitialLetter(name, fallbackId)}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={trimmed}
      alt={alt}
      onError={onError}
      className="h-auto max-h-full w-auto max-w-full select-none object-contain"
    />
  );
}

interface ImageCarouselModalProps {
  items: ImageCarouselItem[];
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
  ticketName: string;
  /** Produto principal do kit; se omitido, usa o primeiro item da lista (já ordenado com primário primeiro). */
  preferredProductId?: string | null;
}

function indexInOrderedItems(
  ordered: ImageCarouselItem[],
  sourceItems: ImageCarouselItem[],
  indexInSource: number,
): number {
  if (ordered.length === 0) return 0;
  const id = sourceItems[indexInSource]?.id;
  if (!id) return 0;
  const i = ordered.findIndex((x) => x.id === id);
  return i >= 0 ? i : 0;
}

export function ImageCarouselModal({
  items,
  initialIndex,
  isOpen,
  onClose,
  ticketName,
  preferredProductId,
}: ImageCarouselModalProps) {
  const preferredIndex = useMemo(() => {
    if (preferredProductId) {
      const i = items.findIndex((x) => x.id === preferredProductId);
      if (i >= 0) return i;
    }
    return 0;
  }, [items, preferredProductId]);

  const orderedItems = useMemo(
    () => orderCarouselItemsWithPreferredInCenter(items, preferredIndex),
    [items, preferredIndex],
  );

  const [currentIndex, setCurrentIndex] = useState(() =>
    indexInOrderedItems(orderedItems, items, initialIndex),
  );

  useEffect(() => {
    setCurrentIndex(indexInOrderedItems(orderedItems, items, initialIndex));
  }, [initialIndex, isOpen, orderedItems, items]);

  useEffect(() => {
    setCurrentIndex((i) =>
      orderedItems.length === 0
        ? 0
        : Math.min(i, orderedItems.length - 1),
    );
  }, [orderedItems.length]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  /* Insets: o Header (fixo, `z-999` — ACIMA do modal em TODOS os breakpoints) e a
   * MobileSummaryBar (fixa na base, só no mobile) cobrem o modal. Sem descontar o
   * header, o topo do modal (inclusive o botão FECHAR) fica ESCONDIDO atrás da
   * navbar. Medimos as duas alturas (robusto a mudanças) e confinamos o modal à
   * ÁREA LIVRE entre elas — em desktop E mobile. A barra não existe no desktop
   * (`querySelector` → null → 0), então o inset inferior se ajusta sozinho. */
  const [viewportInsets, setViewportInsets] = useState({ top: 0, bottom: 0 });
  useEffect(() => {
    if (!isOpen || typeof window === "undefined") return;
    const compute = () => {
      const header = document.querySelector("header");
      const bar = document.querySelector('[data-mobile-summary-bar="true"]');
      setViewportInsets({
        top: header?.getBoundingClientRect().height ?? 0,
        bottom: bar?.getBoundingClientRect().height ?? 0,
      });
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, [isOpen]);

  const handlePrevious = () => {
    setCurrentIndex((prev) =>
      prev === 0 ? orderedItems.length - 1 : prev - 1,
    );
  };

  const handleNext = () => {
    setCurrentIndex((prev) =>
      prev === orderedItems.length - 1 ? 0 : prev + 1,
    );
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        setCurrentIndex((prev) =>
          prev === 0 ? orderedItems.length - 1 : prev - 1,
        );
      }
      if (e.key === "ArrowRight") {
        setCurrentIndex((prev) =>
          prev === orderedItems.length - 1 ? 0 : prev + 1,
        );
      }
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, orderedItems.length]);

  if (!isOpen || orderedItems.length === 0) return null;

  const current = orderedItems[currentIndex];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/90 z-50"
            onClick={onClose}
          />

          {/* Modal — confinado à área livre entre Header (fixo, z-999) e a
              MobileSummaryBar. Descontar o header em TODOS os breakpoints mantém o
              botão FECHAR e o topo da imagem SEMPRE visíveis (fora da navbar). */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ top: viewportInsets.top, bottom: viewportInsets.bottom }}
            onClick={onClose}
          >
            <div
              className="relative flex h-full w-full max-w-6xl flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 z-10 size-10 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
                aria-label="Fechar"
              >
                <X className="size-6" />
              </button>

              {/* Image Container — `flex-1 min-h-0` faz a imagem ocupar APENAS o
                  espaço livre da caixa (que no mobile é restrita pelos insets do
                  Header/MobileSummaryBar). Sem unidades `vh`: no iOS Safari o `vh`
                  resolve pra viewport cheia, ignorando os insets, e a imagem
                  estourava/era cortada. `min-h-0` é obrigatório para o filho flex
                  poder encolher abaixo do seu tamanho intrínseco. */}
              <div className="relative flex min-h-0 w-full flex-1 items-center justify-center">
                {/* Previous Button */}
                {orderedItems.length > 1 && (
                  <button
                    onClick={handlePrevious}
                    className="absolute left-4 z-10 size-12 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
                    aria-label="Imagem anterior"
                  >
                    <ChevronLeft className="size-6" />
                  </button>
                )}

                <div className="relative flex h-full w-full items-center justify-center">
                  <motion.div
                    key={current.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="flex h-full w-full max-w-3xl items-center justify-center"
                  >
                    <LightboxImage
                      src={current.src}
                      alt={`${ticketName} — ${current.name}`}
                      name={current.name}
                      fallbackId={current.id}
                    />
                  </motion.div>
                </div>

                {/* Next Button */}
                {orderedItems.length > 1 && (
                  <button
                    onClick={handleNext}
                    className="absolute right-4 z-10 size-12 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
                    aria-label="Próxima imagem"
                  >
                    <ChevronRight className="size-6" />
                  </button>
                )}
              </div>

              {/* Thumbnails — `shrink-0` para não roubar altura da imagem; tamanho
                  menor no mobile, onde a caixa é mais baixa. */}
              {orderedItems.length > 1 && (
                <div className="flex shrink-0 items-center justify-center gap-2 px-4 pt-4 pb-1">
                  {orderedItems.map((item, index) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setCurrentIndex(index)}
                      className={`relative size-14 md:size-20 rounded-lg border-2 overflow-hidden shrink-0 transition-all ${index === currentIndex
                        ? "border-primary-11 scale-110"
                        : "border-gray-6 hover:border-gray-6"
                        }`}
                      aria-label={`Ver imagem ${index + 1}`}
                    >
                      <ImageWithInitialFallback
                        src={item.src}
                        alt={`${ticketName} — ${item.name}`}
                        name={item.name}
                        fallbackId={item.id}
                        fill
                        sizes="80px"
                        className="size-full bg-gray-4 border-0 bg-transparent"
                        letterClassName="text-lg"
                      />
                    </button>
                  ))}
                </div>
              )}

              {/* Image Counter — em fluxo (não mais `-bottom-10` absoluto, que no
                  mobile sumia atrás da MobileSummaryBar). */}
              {orderedItems.length > 1 && (
                <div className="mx-auto mt-2 shrink-0 rounded-full bg-black/50 px-4 py-1.5 text-sm text-white">
                  {currentIndex + 1} / {orderedItems.length}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
