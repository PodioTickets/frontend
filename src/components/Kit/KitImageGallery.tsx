"use client";

import { Plus, Star, X } from "lucide-react";
import { ImageWithInitialFallback } from "@/components/ImageWithInitialFallback";
import { cn } from "@/utils/cn";

export const KIT_MAX_IMAGES = 10;

const actionButton =
  "flex size-6 shrink-0 cursor-pointer items-center justify-center rounded border border-gray-6 bg-gray-2 text-gray-12 hover:bg-gray-3";

/**
 * Galeria "Imagens do kit" (Figma kit/organismo/galeria-do-kit). Vazia: caixa
 * pontilhada com "+" e o convite para arrastar. Preenchida: miniaturas de 86px —
 * a principal tem borda verde e o selo "Imagem principal" (só ×); as outras têm
 * ☆ (tornar principal) e ×. A caixa inteira aceita arrastar e soltar.
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
  const openOnKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onAdd();
    }
  };

  if (images.length === 0) {
    return (
      <div
        role="button"
        tabIndex={0}
        aria-label="Adicionar foto do kit"
        onClick={onAdd}
        onKeyDown={openOnKey}
        onDrop={onDrop}
        onDragOver={onDragOver}
        className="flex w-full cursor-pointer items-center justify-center gap-6 rounded-xl border-2 border-dashed border-gray-6 p-6 transition-colors hover:border-primary-8 md:py-10"
      >
        <Plus className="size-10 shrink-0 text-gray-12" strokeWidth={1.5} />
        <div className="flex flex-col gap-2">
          <p className="font-family-dm-sans text-base font-bold leading-[1.3] text-primary-11">
            <span className="md:hidden">Toque para adicionar fotos</span>
            <span className="hidden md:inline">Arraste uma imagem para este campo ou clique aqui</span>
          </p>
          <p className="font-family-dm-sans text-base leading-[1.3] text-gray-12">Adicionar foto</p>
        </div>
      </div>
    );
  }

  return (
    <div
      onDrop={canAdd ? onDrop : undefined}
      onDragOver={onDragOver}
      className="flex w-full flex-col gap-6 rounded-xl border-2 border-dashed border-gray-6 p-6"
    >
      <div className="flex flex-wrap gap-4 pt-1 pr-2">
        {images.map((img, idx) => {
          const isPrimary = idx === primaryIndex;
          return (
            <div key={`${idx}-${img.slice(-24)}`} className="relative size-[86px] shrink-0">
              <div
                className={cn(
                  "absolute inset-0 overflow-hidden rounded-lg bg-gray-4",
                  isPrimary ? "border-2 border-primary-10" : "border border-gray-6",
                )}
              >
                <ImageWithInitialFallback
                  src={img}
                  alt={`Foto ${idx + 1} do kit`}
                  name={productName || "Kit"}
                  fill
                  sizes="86px"
                  className="size-full border-0 border-transparent object-cover"
                  letterClassName="text-2xl font-semibold"
                />
                {isPrimary && (
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-center border-t border-primary-8 bg-primary-3 pt-1 pb-1.5">
                    <span className="font-family-dm-sans text-[8px] leading-[1.3] text-primary-12">Imagem principal</span>
                  </div>
                )}
              </div>
              <div className="absolute -top-[11px] -right-[11px] flex gap-0.5">
                {!isPrimary && (
                  <button
                    type="button"
                    aria-label="Tornar principal"
                    title="Tornar principal"
                    onClick={() => onMakePrimary(idx)}
                    className={actionButton}
                  >
                    <Star className="size-4" strokeWidth={1.5} />
                  </button>
                )}
                <button
                  type="button"
                  aria-label="Remover foto"
                  title="Remover foto"
                  onClick={() => onRemove(idx)}
                  className={actionButton}
                >
                  <X className="size-4" strokeWidth={1.5} />
                </button>
              </div>
            </div>
          );
        })}
        {canAdd && (
          <div
            role="button"
            tabIndex={0}
            aria-label="Adicionar foto do kit"
            onClick={onAdd}
            onKeyDown={openOnKey}
            className="flex size-[86px] shrink-0 cursor-pointer items-center justify-center rounded-lg border border-gray-6 bg-gray-2 transition-colors hover:border-primary-8"
          >
            <Plus className="size-11 text-gray-12" strokeWidth={1.5} />
          </div>
        )}
      </div>
      <div className="flex flex-col gap-3">
        {canAdd && (
          <p
            role="button"
            tabIndex={0}
            onClick={onAdd}
            onKeyDown={openOnKey}
            className="w-fit cursor-pointer font-family-dm-sans text-base font-bold leading-[1.3] text-primary-11"
          >
            <span className="md:hidden">Toque para adicionar fotos</span>
            <span className="hidden md:inline">Arraste uma imagem para este campo ou clique aqui</span>
          </p>
        )}
        <p className="font-family-dm-sans text-base leading-[1.3] text-gray-11">
          Pode adicionar até {KIT_MAX_IMAGES} fotos do kit
        </p>
      </div>
    </div>
  );
}
