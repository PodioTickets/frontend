"use client";

import { Plus, X } from "lucide-react";
import { ImageWithInitialFallback } from "@/components/ImageWithInitialFallback";
import { cn } from "@/utils/cn";

/** Mesmo limite do modal de produto. */
export const KIT_MAX_IMAGES = 7;

/**
 * Galeria "Imagens do kit" — mesmo card do modal de produto (`CreateProductModal`):
 * miniaturas 80/100px, clique na foto = principal (selo "Principal"), × para remover,
 * slot "+" para adicionar. O card inteiro aceita arrastar e soltar.
 */
export function KitImageGallery({
  images,
  primaryIndex,
  productName,
  onAdd,
  onRemove,
  onMakePrimary,
  onDrop,
  onDragOver,
}: {
  images: string[];
  primaryIndex: number;
  productName: string;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onMakePrimary: (index: number) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
}) {
  const canAdd = images.length < KIT_MAX_IMAGES;

  return (
    <div
      onDrop={onDrop}
      onDragOver={onDragOver}
      className="flex w-full flex-col gap-3 rounded-xl border-2 border-dashed border-gray-6 p-3 md:w-max md:p-4"
    >
      <div className="flex flex-wrap gap-2 md:gap-3">
        {images.map((img, idx) => {
          const isPrimary = idx === primaryIndex;
          return (
            <div key={`${idx}-${img.slice(-24)}`} className="relative">
              <button
                type="button"
                onClick={() => onMakePrimary(idx)}
                className={cn(
                  "relative size-[80px] shrink-0 overflow-hidden rounded-xl border-2 transition-colors md:size-[100px]",
                  isPrimary ? "border-primary-8" : "border-gray-6 hover:border-gray-9",
                )}
                aria-label={isPrimary ? "Imagem principal" : "Definir como principal"}
              >
                <ImageWithInitialFallback
                  src={img}
                  alt={`Foto ${idx + 1} do kit`}
                  name={productName || "Kit"}
                  fill
                  sizes="(max-width: 768px) 80px, 100px"
                  className="size-full border-0 border-transparent object-cover"
                  letterClassName="text-2xl font-semibold"
                />
                {isPrimary && (
                  <div className="absolute right-0 bottom-0 left-0 flex items-center justify-center bg-primary-4 py-0.5 text-center md:py-1">
                    <span className="font-manrope text-[9px] leading-none font-semibold text-primary-11 md:text-[10px]">
                      Principal
                    </span>
                  </div>
                )}
              </button>
              <div className="absolute -top-1.5 -right-1.5 flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => onRemove(idx)}
                  className="flex size-6 items-center justify-center rounded border border-gray-6 bg-gray-1 text-gray-11 shadow-sm hover:border-red-200 hover:bg-red-50 hover:text-red-500"
                  aria-label="Remover foto"
                  title="Remover foto"
                >
                  <X className="size-3" />
                </button>
              </div>
            </div>
          );
        })}

        {canAdd && (
          <div
            role="button"
            tabIndex={0}
            aria-label="Adicionar foto"
            onClick={onAdd}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onAdd();
              }
            }}
            className="flex size-[80px] shrink-0 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-gray-6 transition-colors hover:border-primary-8 md:size-[100px]"
          >
            <Plus className="size-7 text-gray-12 md:size-8" />
          </div>
        )}
      </div>
      <p className="font-family-dm-sans text-sm font-bold text-primary-11 md:text-base">
        <span className="md:hidden">Toque para adicionar fotos</span>
        <span className="hidden md:inline">Arraste uma imagem para este campo ou clique aqui</span>
      </p>
      <p className="font-family-dm-sans text-xs text-gray-11 md:text-base">
        Envie até {KIT_MAX_IMAGES} fotos - Dimensão recomendada 1:1
      </p>
    </div>
  );
}
