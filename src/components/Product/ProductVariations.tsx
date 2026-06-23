"use client";

import { Fragment } from "react";
import { MoreVertical, Plus } from "lucide-react";
import { cn } from "@/utils/cn";
import { Input } from "@/components/Input";
import { Tooltip } from "@/components/Tooltip";
import { BookIcon } from "../Icons/BookIcon";
import { TrashIcon } from "../Icons/TrashIcon";
import { sanitizeVariationTypeLabelInput } from "@/lib/productValidation";
import type { ProductVariation } from "@/components/Product/CreateProductModal.types";

/**
 * Editor de variações do `CreateProductModal`: input do tipo de variação +
 * tabela (desktop, edição inline) / cards (mobile, edição via bottom-sheet) +
 * botão "Adicionar variação" + erro de nome duplicado. Estado/handlers vêm do
 * `useProductVariations` via props. Extraído no Bloco 3 (Fase 4/UI).
 */
export function ProductVariations({
  variationTypeName,
  setVariationTypeName,
  variations,
  isIncludedInTicket,
  productHoldsStock,
  showSoldColumn,
  duplicateVariationName,
  handleVariationChange,
  handlePriceChange,
  handleRemoveVariation,
  handleAddVariation,
  openMobileAddVariation,
  setMobileMoreMenuVariationId,
}: {
  variationTypeName: string;
  setVariationTypeName: (v: string) => void;
  variations: ProductVariation[];
  isIncludedInTicket: boolean;
  productHoldsStock: boolean;
  showSoldColumn: boolean;
  duplicateVariationName: string | null;
  handleVariationChange: (
    id: string,
    field: keyof ProductVariation,
    value: string,
  ) => void;
  handlePriceChange: (id: string, value: string) => void;
  handleRemoveVariation: (id: string) => void;
  handleAddVariation: () => void;
  openMobileAddVariation: () => void;
  setMobileMoreMenuVariationId: (v: string | null) => void;
}) {
  return (
    <>
      {/* Variation Name Input */}
      <div className="flex flex-col gap-2">
        <label className="text-gray-12 text-base font-normal font-family-dm-sans leading-[1.3]">
          Digite o nome da variação:
        </label>
        <Input
          type="text"
          value={variationTypeName}
          onChange={(e) =>
            setVariationTypeName(sanitizeVariationTypeLabelInput(e.target.value))
          }
          placeholder={`Ex: "Tamanho/cor/variação"`}
          className="h-12 px-3"
        />
      </div>

      {/* Variations: mobile = cards (Figma); desktop = tabela */}
      <div
        className={cn(
          "flex flex-col",
          "max-md:gap-3 max-md:border-0 max-md:bg-transparent",
          "md:rounded-lg md:border-[1.5px] md:border-gray-6 md:bg-gray-2",
        )}
      >
        {/* Table Header — desktop */}
        <div className="hidden h-11 items-center rounded-t-lg border-b border-gray-6 bg-gray-3 md:flex">
          <div className="flex-1 px-4">
            <span className="text-sm font-medium font-inter leading-[1.3] text-gray-12">
              {variationTypeName.trim() || "Variações"}
            </span>
          </div>
          <div className="flex w-[188px] items-center justify-center px-4 border-r h-full border-gray-6">
            <span className="flex items-center gap-1 text-sm font-medium font-inter leading-[1.3] text-gray-12">
              Preço específico{" "}
              <Tooltip
                content={
                  <div className="flex w-full flex-col gap-2 text-left font-family-dm-sans text-sm font-normal leading-[1.4] text-gray-12">
                    <p>
                      Defina um preço específico para esta variação, caso ela
                      tenha um valor diferente do produto principal.
                    </p>
                    <p>
                      Por exemplo: a camiseta custa R$50, mas a variação na cor
                      azul pode custar R$60.
                    </p>
                    <p>
                      Se este campo não for preenchido, o sistema utilizará
                      automaticamente o preço padrão do produto.
                    </p>
                  </div>
                }
                position="topLeft"
              >
                <button
                  type="button"
                  className="inline-flex cursor-help rounded text-gray-12 hover:text-gray-11 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-8"
                  aria-label="Informação: preço específico da variação"
                >
                  <BookIcon className="size-5 shrink-0" />
                </button>
              </Tooltip>
            </span>
          </div>
          {productHoldsStock && (
            <div className="flex w-[132px] items-center justify-center px-4">
              <span className="text-sm font-medium font-inter leading-[1.3] text-gray-12">
                Estoque
              </span>
            </div>
          )}
          {showSoldColumn && (
            <div className="flex w-[150px] items-center justify-center px-4">
              <span className="text-sm w-max font-medium font-inter leading-[1.3] text-gray-12">
                Total vendidos
              </span>
            </div>
          )}
          <div className="flex h-full w-[74px] items-center justify-center border-l border-gray-6 px-4">
            <span className="text-sm font-medium font-inter leading-[1.3] text-gray-12">
              Ações
            </span>
          </div>
        </div>

        {/* Variations List */}
        {variations.map((variation) => {
          return (
            <Fragment key={variation.id}>
              {/* Mobile — Figma 3428:160742 (cartão read-only, edição via bottom sheet) */}
              <div className="flex flex-col gap-4 rounded-lg border border-gray-6 bg-gray-1 px-3 py-4 md:hidden">
                <div className="flex w-full items-start justify-between gap-2">
                  <div className="flex min-w-0 flex-1 flex-col gap-3">
                    <p className="text-sm font-normal font-family-dm-sans leading-[1.3] text-gray-11">
                      Nome da variação
                    </p>
                    <p className="truncate text-sm font-semibold font-family-dm-sans leading-[1.3] text-gray-12">
                      {variation.name || "—"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobileMoreMenuVariationId(variation.id)}
                    className="flex size-8 shrink-0 items-center justify-center rounded-lg text-gray-11 transition-colors hover:bg-gray-3"
                    aria-label="Mais opções da variação"
                  >
                    <MoreVertical className="size-6" />
                  </button>
                </div>
                <div className="flex w-full items-start justify-between gap-4">
                  <div className="flex flex-col gap-3">
                    <p className="text-sm font-normal font-family-dm-sans leading-[1.3] text-gray-11">
                      Preço específico
                    </p>
                    <p className="text-sm font-semibold font-family-dm-sans leading-[1.3] text-gray-12">
                      {isIncludedInTicket ? "Incluso" : `R$ ${variation.price || "0,00"}`}
                    </p>
                  </div>
                  <div className="flex items-start gap-6">
                    {productHoldsStock && (
                      <div className="flex flex-col items-end gap-3">
                        <p className="text-right text-sm font-normal font-family-dm-sans leading-[1.3] text-gray-11">
                          Estoque
                        </p>
                        <p className="text-sm font-semibold font-family-dm-sans leading-[1.3] text-gray-12">
                          {`${variation.stock || "0"} Un`}
                        </p>
                      </div>
                    )}
                    {showSoldColumn && (
                      <div className="flex flex-col items-end gap-3">
                        <p className="text-right text-sm font-normal font-family-dm-sans leading-[1.3] text-gray-11">
                          Total vendidos
                        </p>
                        <p className="text-sm font-semibold font-family-dm-sans leading-[1.3] text-gray-11 tabular-nums">
                          {variation.soldCount ?? 0}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Desktop — linha da tabela */}
              <div className="hidden border-b border-gray-6 md:flex md:h-[52px] md:items-center">
                <div className="flex flex-1 px-4">
                  <input
                    type="text"
                    value={variation.name}
                    onChange={(e) =>
                      handleVariationChange(variation.id, "name", e.target.value)
                    }
                    placeholder="Ex: P, M, G"
                    className="h-auto w-full border-0 bg-transparent px-0 text-sm font-medium font-inter text-gray-12 focus:border-0 focus:outline-none focus:ring-0"
                  />
                </div>
                <div className="flex w-[188px] items-center justify-center px-4">
                  {isIncludedInTicket ? (
                    <span className="flex items-center gap-1 text-sm font-medium font-inter text-gray-11">
                      Incluso
                    </span>
                  ) : (
                    <div className="flex items-center gap-0.5 text-sm font-semibold font-inter text-gray-12">
                      <span>R$</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={variation.price || "0,00"}
                        onChange={(e) =>
                          handlePriceChange(variation.id, e.target.value)
                        }
                        className="w-16 border-0 bg-transparent px-0 focus:border-0 focus:outline-none focus:ring-0"
                        placeholder="0,00"
                      />
                    </div>
                  )}
                </div>
                {productHoldsStock && (
                  <div className="flex w-[132px] items-center justify-center px-4">
                    <input
                      type="number"
                      value={variation.stock}
                      onChange={(e) =>
                        handleVariationChange(
                          variation.id,
                          "stock",
                          e.target.value,
                        )
                      }
                      className="w-16 border-0 bg-transparent px-0 text-center text-sm font-semibold font-inter text-gray-12 tabular-nums focus:outline-none focus:ring-0 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      placeholder="0"
                    />
                  </div>
                )}
                {showSoldColumn && (
                  <div className="flex w-[150px] items-center justify-center px-4">
                    <span className="text-sm font-semibold font-inter text-gray-11 tabular-nums w-max">
                      {variation.soldCount ?? 0}
                    </span>
                  </div>
                )}
                <div className="flex w-[74px] items-center justify-center px-4">
                  <button
                    type="button"
                    title="Remover variação"
                    onClick={() => handleRemoveVariation(variation.id)}
                    className="flex size-9 items-center justify-center rounded-lg border-[1.5px] border-red-6 bg-red-2 transition-colors hover:bg-red-3"
                  >
                    <TrashIcon className="size-5 text-red-12" />
                  </button>
                </div>
              </div>
            </Fragment>
          );
        })}

        {/* Add Variation Button — desktop adiciona linha inline, mobile abre bottom sheet. */}
        <div className="flex justify-center p-4 max-md:pt-0 md:border-t md:border-gray-6">
          <button
            type="button"
            onClick={() => {
              if (
                typeof window !== "undefined" &&
                window.matchMedia("(max-width: 767px)").matches
              ) {
                openMobileAddVariation();
              } else {
                handleAddVariation();
              }
            }}
            className="flex h-11 items-center gap-1 px-6 text-base font-semibold font-family-dm-sans text-gray-11 transition-colors hover:text-gray-12 md:px-11"
          >
            <Plus className="size-6" />
            Adicionar variação
          </button>
        </div>
      </div>

      {/* Erro de validação: nome de variação duplicado — abaixo
          do componente de variações, acima da prévia. */}
      {duplicateVariationName && (
        <p className="font-family-dm-sans text-sm text-red-11">
          Já existe uma variação com o nome &quot;{duplicateVariationName}&quot;.
          Cada variação deve ter um nome único.
        </p>
      )}
    </>
  );
}
