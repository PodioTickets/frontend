"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { ImageWithInitialFallback } from "@/components/ImageWithInitialFallback";
import type { ImageCarouselItem } from "@/utils/ticketProductVisuals";

export type { ImageCarouselItem } from "@/utils/ticketProductVisuals";

interface ImageCarouselModalProps {
  items: ImageCarouselItem[];
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
  ticketName: string;
}

export function ImageCarouselModal({
  items,
  initialIndex,
  isOpen,
  onClose,
  ticketName,
}: ImageCarouselModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex, isOpen]);

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

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? items.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === items.length - 1 ? 0 : prev + 1));
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        setCurrentIndex((prev) => (prev === 0 ? items.length - 1 : prev - 1));
      }
      if (e.key === "ArrowRight") {
        setCurrentIndex((prev) => (prev === items.length - 1 ? 0 : prev + 1));
      }
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, items.length]);

  if (!isOpen || items.length === 0) return null;

  const current = items[currentIndex];

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

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={onClose}
          >
            <div
              className="relative w-full max-w-6xl max-h-[60vh] flex flex-col"
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

              {/* Image Container */}
              <div className="relative w-full h-[80vh] flex items-center justify-center">
                {/* Previous Button */}
                {items.length > 1 && (
                  <button
                    onClick={handlePrevious}
                    className="absolute left-4 z-10 size-12 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
                    aria-label="Imagem anterior"
                  >
                    <ChevronLeft className="size-6" />
                  </button>
                )}

                <div className="relative w-full h-full flex items-center justify-center">
                  <motion.div
                    key={current.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="relative w-full h-full max-w-5xl"
                  >
                    <ImageWithInitialFallback
                      src={current.src}
                      alt={`${ticketName} — ${current.name}`}
                      name={current.name}
                      fallbackId={current.id}
                      fill
                      sizes="(max-width: 768px) 100vw, min(90vw, 896px)"
                      className="w-full h-full bg-gray-4"
                      imgClassName="object-contain"
                      letterClassName="text-7xl md:text-8xl"
                    />
                  </motion.div>
                </div>

                {/* Next Button */}
                {items.length > 1 && (
                  <button
                    onClick={handleNext}
                    className="absolute right-4 z-10 size-12 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
                    aria-label="Próxima imagem"
                  >
                    <ChevronRight className="size-6" />
                  </button>
                )}
              </div>

              {/* Thumbnails */}
              {items.length > 1 && (
                <div className="pt-10 flex items-center justify-center gap-2 px-4 pb-6">
                  {items.map((item, index) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setCurrentIndex(index)}
                      className={`relative size-20 rounded-lg border-2 overflow-hidden shrink-0 transition-all ${index === currentIndex
                          ? "border-primary-11 scale-110"
                          : "border-gray-6 hover:border-gray-7"
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
                        className="size-full bg-gray-4"
                        letterClassName="text-lg"
                      />
                    </button>
                  ))}
                </div>
              )}

              {/* Image Counter */}
              {items.length > 1 && (
                <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-black/50 text-white px-4 py-2 rounded-full text-sm">
                  {currentIndex + 1} / {items.length}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
