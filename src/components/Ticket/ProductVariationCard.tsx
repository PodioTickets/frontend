"use client";

import { useState } from "react";
import Image from "next/image";
import { Check } from "lucide-react";
import { cn } from "@/utils/cn";
import { userService } from "@/services";
import { getApiClient } from "@/services/base/ApiClient";
import toast from "react-hot-toast";

interface ProductVariation {
  id: string;
  name: string;
  price: number;
  stock: number;
}

export interface IncludedProduct {
  id: string;
  name: string;
  image?: string;
  basePrice: number;
  variationType?: string;
  buyerVariationEditAllowed: boolean;
  variationEditDeadlineDays?: number;
  variationEdited: boolean;
  canEditVariation: boolean;
  selectedVariation?: { id: string; name: string; price: number };
  variations?: ProductVariation[];
}

interface Props {
  product: IncludedProduct;
  orderCreatedAt?: string;
  registrationId: string;
  onVariationUpdated?: (productId: string, variationId: string) => void;
}

function computeBanner(
  product: IncludedProduct,
  orderCreatedAt?: string
): { type: "ok" | "warning" | "expired"; text: string } | null {
  if (!product.buyerVariationEditAllowed) return null;

  if (!product.canEditVariation) {
    return { type: "expired", text: "Prazo de edição encerrado" };
  }

  if (!orderCreatedAt || !product.variationEditDeadlineDays) return null;

  const deadline = new Date(
    new Date(orderCreatedAt).getTime() +
      product.variationEditDeadlineDays * 24 * 60 * 60 * 1000
  );
  const deadlineStr = deadline.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const daysRemaining = Math.ceil(
    (deadline.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
  );

  if (daysRemaining <= 1) {
    return { type: "warning", text: `Último dia para editar: ${deadlineStr}` };
  }
  return { type: "ok", text: `Pode editar variações até ${deadlineStr}` };
}

function resolveImageSrc(image?: string): string | null {
  if (!image) return null;
  return image.startsWith("http")
    ? image
    : `${getApiClient().getBaseURL()}${image}`;
}

function formatPrice(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

export function ProductVariationCard({
  product,
  orderCreatedAt,
  registrationId,
  onVariationUpdated,
}: Props) {
  const [isSelecting, setIsSelecting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [localSelected, setLocalSelected] = useState(
    product.selectedVariation ?? null
  );
  const [localVariationEdited, setLocalVariationEdited] = useState(
    product.variationEdited
  );

  const banner = computeBanner(product, orderCreatedAt);
  const imageSrc = resolveImageSrc(product.image);
  const canAlter = product.canEditVariation && !localVariationEdited;

  const handleSelectVariation = async (variation: ProductVariation) => {
    if (isSaving || localSelected?.id === variation.id) {
      setIsSelecting(false);
      return;
    }
    setIsSaving(true);
    try {
      await userService.updateRegistrationProductVariation(
        registrationId,
        product.id,
        variation.id
      );
      setLocalSelected(variation);
      setLocalVariationEdited(true);
      onVariationUpdated?.(product.id, variation.id);
      toast.success("Variação atualizada com sucesso!");
      setIsSelecting(false);
    } catch (err: any) {
      toast.error(err?.message || "Erro ao atualizar variação");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-gray-2 border border-gray-6 rounded-xl flex flex-col flex-1 min-w-[314px] max-w-[466px]">
      {/* Top: image + name + price + banner */}
      <div className="border-b border-gray-6 flex flex-col gap-3 p-4">
        <div className="flex gap-3 h-[100px] items-center">
          <div className="size-[100px] rounded-lg border border-gray-6 overflow-hidden shrink-0 relative bg-gray-4">
            {imageSrc && (
              <Image
                src={imageSrc}
                alt={product.name}
                fill
                className="object-cover"
              />
            )}
          </div>
          <div className="flex flex-col justify-between flex-1 min-w-0 h-full py-2">
            <p className="text-sm font-semibold leading-[1.3] text-gray-12 font-family-dm-sans line-clamp-3">
              {product.name}
            </p>
            <p className="text-base font-semibold leading-[1.1] text-gray-12 font-manrope whitespace-nowrap">
              {formatPrice(product.basePrice)}
            </p>
          </div>
        </div>

        {banner && (
          <div
            className={cn(
              "flex items-center justify-center p-3 rounded-lg w-full",
              banner.type === "ok" && "bg-primary-3",
              banner.type === "warning" && "bg-yellow-3",
              banner.type === "expired" && "bg-red-3"
            )}
          >
            <p
              className={cn(
                "text-sm font-medium leading-[1.3] font-family-dm-sans text-center",
                banner.type === "ok" && "text-primary-12",
                banner.type === "warning" && "text-yellow-12",
                banner.type === "expired" && "text-red-12"
              )}
            >
              {banner.text}
            </p>
          </div>
        )}
      </div>

      {/* Footer: variation label + Alterar button */}
      <div className="flex items-center justify-between p-4">
        <div className="flex gap-1 items-center flex-1 min-w-0">
          {product.variationType && (
            <span className="text-base leading-[1.3] text-gray-12 font-family-dm-sans whitespace-nowrap">
              {product.variationType}:
            </span>
          )}
          {localSelected && (
            <span className="text-base font-semibold leading-[1.1] text-gray-12 font-manrope whitespace-nowrap ml-1">
              {localSelected.name}
            </span>
          )}
        </div>

        {product.buyerVariationEditAllowed && !localVariationEdited && (
          <button
            type="button"
            onClick={() => canAlter && setIsSelecting((v) => !v)}
            disabled={!canAlter || isSaving}
            className={cn(
              "border border-gray-6 flex items-center justify-center px-6 py-2 rounded-lg shrink-0 h-9 transition-colors",
              canAlter && !isSaving
                ? "hover:bg-gray-3 cursor-pointer"
                : "opacity-40 cursor-not-allowed"
            )}
          >
            <span className="text-sm font-bold leading-[1.1] text-gray-12 font-manrope whitespace-nowrap">
              {isSaving ? "Salvando..." : "Alterar"}
            </span>
          </button>
        )}
      </div>

      {/* Inline variation selector */}
      {isSelecting && (
        <div className="border-t border-gray-6 flex flex-col">
          {(product.variations ?? []).map((variation, i) => (
            <button
              key={variation.id}
              type="button"
              onClick={() => handleSelectVariation(variation)}
              disabled={isSaving}
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-gray-3",
                i < (product.variations!.length - 1) && "border-b border-gray-6",
                localSelected?.id === variation.id && "bg-gray-3"
              )}
            >
              <Check
                className={cn(
                  "size-4 shrink-0",
                  localSelected?.id === variation.id
                    ? "text-primary-11 opacity-100"
                    : "opacity-0"
                )}
              />
              <span className="text-base font-medium leading-[1.3] text-gray-12 font-family-dm-sans">
                {variation.name}
              </span>
              {variation.price > 0 && (
                <span className="text-sm text-gray-11 font-family-dm-sans ml-auto">
                  +{formatPrice(variation.price)}
                </span>
              )}
              {variation.stock === 0 && variation.name !== localSelected?.name && (
                <span className="text-xs text-gray-10 font-family-dm-sans ml-auto">
                  Esgotado
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
