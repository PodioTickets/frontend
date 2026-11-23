"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { ImageWithInitialFallback } from "@/components/ImageWithInitialFallback";
import { cn } from "@/utils/cn";
import { userService } from "@/services";
import { getApiClient } from "@/services/base/ApiClient";
import toast from "react-hot-toast";
import { formatDateBR } from "@/utils/datetimeBR";
import {
  type ChosenVariation,
  getVariationGroups,
  groupSelection,
  isSelectionComplete,
  resolveSelection,
  setGroupSelection,
} from "@/lib/productVariationGroups";

interface ProductVariation {
  id: string;
  name: string;
  price: number;
  groupId?: string | null;
  /** Limite configurado pelo organizador. `0` = ILIMITADO (sentinela do backend). */
  stock: number;
  /** Restante disponível; só significativo quando `stock > 0`. Pode faltar em respostas legadas. */
  availableStock?: number;
}

/**
 * Variação esgotada para SELEÇÃO pós-compra. Espelha o `isVariationSoldOut` do
 * checkout: só esgota quando o estoque é LIMITADO (`stock > 0`) e não resta
 * disponível (`availableStock <= 0`). `stock === 0` é ILIMITADO → nunca esgota.
 * O backend é a fonte autoritativa (valida no PATCH); aqui é prevenção de UX.
 */
function isVariationSoldOut(v: ProductVariation): boolean {
  const stock = v.stock ?? 0;
  if (stock <= 0) return false; // ilimitado
  // Sem dado de disponível (respostas que não trazem o campo) → não bloqueia,
  // pra não exibir "Esgotado" falso. O backend valida no PATCH de qualquer forma.
  if (v.availableStock == null) return false;
  return v.availableStock <= 0;
}

export interface IncludedProduct {
  id: string;
  name: string;
  image?: string;
  basePrice: number;
  variationType?: string;
  buyerVariationEditAllowed: boolean;
  /** Dias de prazo a partir da criação da order (contrato antigo). */
  variationEditDeadlineDays?: number;
  /** Data-limite absoluta de edição em ISO (contrato novo). Tem prioridade. */
  variationEditDeadline?: string;
  variationEdited: boolean;
  canEditVariation: boolean;
  selectedVariation?: { id: string; name: string; price: number };
  /** Opções vivas do produto (lista plana; cada uma pode trazer `groupId`). */
  variations?: ProductVariation[];
  /** Variações do kit (grupos) com suas opções. Ausente → 1 grupo com `variationType`. */
  variationGroups?: Array<{
    id: string;
    name: string;
    sortOrder?: number;
    variations?: ProductVariation[];
  }>;
  /** Todas as opções escolhidas (uma por variação). Ausente → `[selectedVariation.id]`. */
  selectedVariationIds?: string[];
  /** Escolhas com o nome da variação (contrato `variations[]` da inscrição). */
  chosenVariations?: ChosenVariation[];
  /** Rótulo pronto: "M" ou "Tamanho da camisa: M · Tamanho do short: G". */
  variationLabel?: string | null;
}

interface Props {
  product: IncludedProduct;
  orderCreatedAt?: string;
  registrationId: string;
  /** Produto incluso no ingresso (brinde): exibe "Incluso" no lugar do preço. */
  isIncluded?: boolean;
  /** `variationIds` = todas as escolhas (uma por variação), na ordem dos grupos. */
  onVariationUpdated?: (productId: string, variationIds: string[]) => void;
}

function computeBanner(
  product: IncludedProduct,
  orderCreatedAt: string | undefined,
  isEdited: boolean
): { type: "ok" | "warning" | "expired" | "edited"; text: string } | null {
  if (!product.buyerVariationEditAllowed) return null;

  // Já editou: estado final ("Variação editada"), independe do prazo. Tem
  // prioridade sobre "Prazo encerrado" — `canEditVariation` vem false tanto
  // após editar quanto quando o prazo acaba, então checamos o editado antes.
  if (isEdited) {
    return { type: "edited", text: "Variação editada" };
  }

  // Prazo: o contrato novo manda a data absoluta (`variationEditDeadline`); o
  // antigo mandava só os dias (`variationEditDeadlineDays`) a partir da criação
  // da order. Damos prioridade à data absoluta.
  let deadline: Date | null = null;
  if (product.variationEditDeadline) {
    const d = new Date(product.variationEditDeadline);
    if (!Number.isNaN(d.getTime())) deadline = d;
  } else if (orderCreatedAt && product.variationEditDeadlineDays) {
    deadline = new Date(
      new Date(orderCreatedAt).getTime() +
        product.variationEditDeadlineDays * 24 * 60 * 60 * 1000
    );
  }

  // "Prazo encerrado" SÓ quando a data-limite realmente passou.
  if (deadline && deadline.getTime() <= Date.now()) {
    return { type: "expired", text: "Prazo de edição encerrado" };
  }

  // Sem data conhecida: se o backend já travou a edição (`canEditVariation`
  // false) e não foi editada, tratamos como prazo encerrado; senão sem banner.
  if (!deadline) {
    return product.canEditVariation
      ? null
      : { type: "expired", text: "Prazo de edição encerrado" };
  }

  const deadlineStr = formatDateBR(deadline, {
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
  isIncluded = false,
  onVariationUpdated,
}: Props) {
  const [isSelecting, setIsSelecting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  // Escolhas atuais (uma por variação). Legado: só a variação única.
  const initialIds =
    product.selectedVariationIds && product.selectedVariationIds.length > 0
      ? product.selectedVariationIds
      : product.selectedVariation
        ? [product.selectedVariation.id]
        : [];
  const [localIds, setLocalIds] = useState<string[]>(initialIds);
  // Rascunho da edição com várias variações (salva tudo de uma vez).
  const [draftIds, setDraftIds] = useState<string[]>(initialIds);
  const [localVariationEdited, setLocalVariationEdited] = useState(
    product.variationEdited
  );

  const banner = computeBanner(product, orderCreatedAt, localVariationEdited);
  const imageSrc = resolveImageSrc(product.image);
  const isEditExpired = banner?.type === "expired";
  const canAlter =
    product.canEditVariation && !localVariationEdited && !isEditExpired;

  const groups = getVariationGroups(product);
  const isMultiVariation = groups.length > 1;

  /* Exibição: com as opções em mãos monta "Variação: Opção" por variação; senão
   * cai nas escolhas/rótulo que vieram na inscrição. */
  const resolved = resolveSelection(product, localIds);
  const displayRows: Array<{ key: string; title: string | null; value: string }> =
    resolved.length > 0
      ? resolved.map(({ group, option }) => ({
          key: option.id,
          title: group?.name ?? product.variationType ?? null,
          value: option.variation.name,
        }))
      : product.chosenVariations && product.chosenVariations.length > 0
        ? product.chosenVariations.map((c) => ({
            key: c.id,
            title: c.groupName ?? product.variationType ?? null,
            value: c.name,
          }))
        : product.selectedVariation || product.variationLabel
          ? [{
              key: "single",
              title: product.variationType ?? null,
              value: product.selectedVariation?.name ?? product.variationLabel ?? "",
            }]
          : [];

  const saveVariationIds = async (ids: string[]) => {
    setIsSaving(true);
    try {
      await userService.updateRegistrationProductVariation(
        registrationId,
        product.id,
        ids
      );
      setLocalIds(ids);
      setDraftIds(ids);
      setLocalVariationEdited(true);
      onVariationUpdated?.(product.id, ids);
      toast.success("Variação atualizada com sucesso!");
      setIsSelecting(false);
    } catch (err: any) {
      toast.error(err?.message || "Erro ao atualizar variação");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectVariation = async (groupId: string, variation: ProductVariation, optionId: string) => {
    // Defesa: não seleciona variação esgotada (o botão já é `disabled`, mas o
    // PATCH /products seria rejeitado pelo backend de qualquer forma).
    if (isSaving || isVariationSoldOut(variation)) return;
    if (isMultiVariation) {
      // Várias variações: monta o rascunho; "Salvar" manda todas juntas (a troca
      // é única — depois de salva, `variationEdited` trava novas edições).
      setDraftIds((prev) => setGroupSelection(product, prev, groupId, optionId));
      return;
    }
    if (localIds.includes(optionId)) {
      setIsSelecting(false);
      return;
    }
    await saveVariationIds(setGroupSelection(product, localIds, groupId, optionId));
  };

  const draftChanged =
    draftIds.length !== localIds.length || draftIds.some((id, i) => id !== localIds[i]);
  const canSaveDraft = draftChanged && isSelectionComplete(product, draftIds) && !isSaving;

  return (
    <div className="bg-gray-2 border border-gray-6 rounded-xl flex flex-col w-full">
      {/* Top: image + name + price + banner */}
      <div className="border-b border-gray-6 flex flex-col gap-3 p-4">
        <div className="flex gap-3 h-[100px] items-center">
          <div className="size-[100px] rounded-lg border border-gray-6 overflow-hidden shrink-0 relative bg-gray-4">
            <ImageWithInitialFallback
              src={imageSrc}
              alt={product.name}
              name={product.name}
              fallbackId={product.id}
              fill
              sizes="100px"
              className="size-full border-0"
              imgClassName="object-cover"
              letterClassName="text-2xl font-semibold"
            />
          </div>
          <div className="flex flex-col justify-between flex-1 min-w-0 h-full py-2">
            <p className="text-sm font-semibold leading-[1.3] text-gray-12 font-family-dm-sans line-clamp-3">
              {product.name}
            </p>
            <p className="text-base font-semibold leading-[1.1] text-gray-12 font-manrope whitespace-nowrap">
              {isIncluded ? "Incluso" : formatPrice(product.basePrice)}
            </p>
          </div>
        </div>

        {banner && (
          <div
            className={cn(
              "flex items-center justify-center p-3 rounded-lg w-full",
              banner.type === "ok" && "bg-primary-3",
              banner.type === "warning" && "bg-yellow-3",
              banner.type === "expired" && "bg-red-3",
              banner.type === "edited" && "bg-gray-4"
            )}
          >
            <p
              className={cn(
                "text-sm font-medium leading-[1.3] font-family-dm-sans text-center",
                banner.type === "ok" && "text-primary-12",
                banner.type === "warning" && "text-yellow-12",
                banner.type === "expired" && "text-red-12",
                banner.type === "edited" && "text-gray-12"
              )}
            >
              {banner.text}
            </p>
          </div>
        )}
      </div>

      {/* Footer: variation label + Alterar button */}
      <div className="flex items-center justify-between p-4">
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          {displayRows.length === 0 && product.variationType && (
            <span className="text-base leading-[1.3] text-gray-12 font-family-dm-sans whitespace-nowrap">
              {product.variationType}:
            </span>
          )}
          {displayRows.map((row) => (
            <div key={row.key} className="flex gap-1 items-center min-w-0">
              {row.title && (
                <span className="text-base leading-[1.3] text-gray-12 font-family-dm-sans whitespace-nowrap shrink-0">
                  {row.title}:
                </span>
              )}
              <span className="text-base font-semibold leading-[1.1] text-gray-12 font-manrope truncate ml-1 min-w-0">
                {row.value}
              </span>
            </div>
          ))}
        </div>

        {product.buyerVariationEditAllowed && !localVariationEdited && (
          <button
            type="button"
            onClick={() => {
              if (!canAlter) return;
              setDraftIds(localIds);
              setIsSelecting((v) => !v);
            }}
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
      {/* Seletor inline — um bloco por variação (título = nome da variação quando há várias). */}
      {isSelecting && groups.map((group, groupIndex) => (
        <div key={group.id} className="border-t border-gray-6 flex flex-col">
          {isMultiVariation && (
            <p className="px-4 pt-3 pb-1 text-sm font-semibold leading-[1.3] text-gray-12 font-family-dm-sans">
              {group.name ?? product.variationType ?? `Variação ${groupIndex + 1}`}
            </p>
          )}
          {group.options.map(({ id: optionId, variation }, i) => {
            const activeIds = isMultiVariation ? draftIds : localIds;
            const isCurrent = groupSelection(group, activeIds)?.id === optionId;
            // Esgotado só bloqueia OUTRAS variações — a já selecionada continua marcada.
            const soldOut = !isCurrent && isVariationSoldOut(variation);
            return (
              <button
                key={optionId}
                type="button"
                onClick={() => handleSelectVariation(group.id, variation, optionId)}
                disabled={isSaving || soldOut}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 text-left transition-colors",
                  soldOut ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-3",
                  i < group.options.length - 1 && "border-b border-gray-6",
                  isCurrent && "bg-gray-3"
                )}
              >
                <Check
                  className={cn(
                    "size-4 shrink-0",
                    isCurrent ? "text-primary-11 opacity-100" : "opacity-0"
                  )}
                />
                <span className="text-base font-medium leading-[1.3] text-gray-12 font-family-dm-sans">
                  {variation.name}
                </span>
                {soldOut && (
                  <span className="text-xs text-gray-10 font-family-dm-sans ml-auto">
                    Esgotado
                  </span>
                )}
              </button>
            );
          })}
        </div>
      ))}

      {isSelecting && isMultiVariation && (
        <div className="border-t border-gray-6 flex justify-end p-4">
          <button
            type="button"
            onClick={() => canSaveDraft && saveVariationIds(draftIds)}
            disabled={!canSaveDraft}
            className={cn(
              "border border-gray-6 flex items-center justify-center px-6 py-2 rounded-lg shrink-0 h-9 transition-colors",
              canSaveDraft ? "hover:bg-gray-3 cursor-pointer" : "opacity-40 cursor-not-allowed"
            )}
          >
            <span className="text-sm font-bold leading-[1.1] text-gray-12 font-manrope whitespace-nowrap">
              {isSaving ? "Salvando..." : "Salvar"}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
