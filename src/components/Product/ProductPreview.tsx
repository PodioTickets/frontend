"use client";

import { type ComponentProps } from "react";
import { cn } from "@/utils/cn";
import { Radio } from "@/components/Radio";
import { ImageWithInitialFallback } from "@/components/ImageWithInitialFallback";
import { ArrowButton } from "../ArrowButton";
import { Dropdown } from "../Dropdown";
import { CalendarIcon } from "../Icons/CalendarIcon";

/**
 * Coluna direita do `CreateProductModal`: configuração de edição da variação pelo
 * comprador (radios + prazo) e a prévia do card do produto (imagem/nome/preço +
 * dropdown de variações). Apresentacional — todo o estado vem por props.
 * Extraído no Bloco 3 (Fase 5).
 */
export function ProductPreview({
  isIncludedInTicket,
  buyerCanEditVariation,
  setBuyerCanEditVariation,
  variationChangeDeadlineDays,
  setVariationChangeDeadlineDays,
  variationDeadlineDateLabel,
  productPreviewDropdownOptions,
  productImages,
  primaryImageIndex,
  productName,
  basePrice,
  variationTypeName,
}: {
  isIncludedInTicket: boolean;
  buyerCanEditVariation: boolean;
  setBuyerCanEditVariation: (v: boolean) => void;
  variationChangeDeadlineDays: string;
  setVariationChangeDeadlineDays: (v: string) => void;
  variationDeadlineDateLabel: string | null;
  productPreviewDropdownOptions: NonNullable<
    ComponentProps<typeof Dropdown>["options"]
  >;
  productImages: string[];
  primaryImageIndex: number;
  productName: string;
  basePrice: string;
  variationTypeName: string;
}) {
  return (
    <div className="flex w-full shrink-0 flex-col gap-4 md:sticky md:top-5">
      <div className="flex w-full flex-col gap-3 md:gap-5">
        {isIncludedInTicket && (
          <div className="flex flex-col gap-3">
            <p className="text-gray-12 text-base font-normal font-family-dm-sans leading-[1.3]">
              Deseja liberar a edição da variação pelo comprador após a compra?
            </p>
            <div className="flex flex-wrap items-center gap-x-[10px] gap-y-2">
              <div className="flex items-center gap-2">
                <Radio
                  name="buyerVariationEdit"
                  checked={buyerCanEditVariation}
                  onChange={() => setBuyerCanEditVariation(true)}
                />
                <button
                  type="button"
                  className="cursor-pointer select-none border-none bg-transparent p-0 text-left text-base font-normal font-family-dm-sans leading-[1.3] text-gray-12 hover:text-gray-12 md:text-sm"
                  onClick={() => setBuyerCanEditVariation(true)}
                >
                  Sim
                </button>
              </div>
              <div className="flex items-center gap-2">
                <Radio
                  name="buyerVariationEdit"
                  checked={!buyerCanEditVariation}
                  onChange={() => setBuyerCanEditVariation(false)}
                />
                <button
                  type="button"
                  className="cursor-pointer select-none border-none bg-transparent p-0 text-left text-base font-normal font-family-dm-sans leading-[1.3] text-gray-12 hover:text-gray-12 md:text-sm"
                  onClick={() => setBuyerCanEditVariation(false)}
                >
                  Não
                </button>
              </div>
            </div>
          </div>
        )}
        {isIncludedInTicket && buyerCanEditVariation && (
          <div className="flex flex-col gap-4">
            <p className="text-gray-12 text-base font-normal font-family-dm-sans leading-[1.3]">
              Até quantos dias antes do evento o participante pode alterar a
              variação?
            </p>
            {/* Campo composto (número + sufixo acoplado) — Figma 4906:166308 */}
            <div className="flex h-12 w-fit items-stretch overflow-hidden rounded-lg border border-gray-6 focus-within:border-primary-8">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={variationChangeDeadlineDays}
                onChange={(e) =>
                  setVariationChangeDeadlineDays(
                    e.target.value.replace(/\D/g, "").slice(0, 4),
                  )
                }
                className="w-18 shrink-0 bg-transparent px-2 text-center font-manrope text-xl font-bold leading-[1.1] text-gray-11 placeholder:text-gray-11 outline-none"
                placeholder="30"
                aria-label="Dias antes do evento para alterar variação"
              />
              <div className="flex items-center border-l border-gray-6 bg-gray-3 px-3">
                <span className="text-base font-normal font-family-dm-sans leading-[1.3] text-gray-11">
                  Dias antes do evento
                </span>
              </div>
            </div>
            {/* Data-limite calculada (evento − N dias) — Figma 4895:156352 */}
            {variationDeadlineDateLabel && (
              <div className="flex flex-col gap-2.5 rounded-lg bg-primary-3 px-4 py-3">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="size-5 shrink-0 text-primary-12" />
                  <p className="text-base font-medium font-family-dm-sans leading-[1.3] text-primary-12">
                    Participantes podem alterar até dia {variationDeadlineDateLabel}
                  </p>
                </div>
                <p className="text-base font-normal font-family-dm-sans leading-[1.3] text-primary-12">
                  Após esta data, o participante não poderá mais editar a variação
                  do produto.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <h3 className="text-lg font-bold font-manrope leading-[1.1] text-gray-12 md:text-xl">
        Prévia
      </h3>
      <div className="flex w-full flex-col rounded-xl border border-gray-6 bg-gray-2 md:w-[406px]">
        <div
          className={cn(
            "flex items-center gap-3 p-4",
            productPreviewDropdownOptions.length > 0 && "border-b border-gray-6",
          )}
        >
          <div className="relative size-[100px] shrink-0 overflow-hidden rounded border border-gray-6 bg-gray-3">
            <ImageWithInitialFallback
              src={productImages[primaryImageIndex] ?? productImages[0] ?? null}
              alt="Product preview"
              name={productName || "Nome do produto"}
              fill
              sizes="100px"
              className="size-full border-transparent border-0"
              letterClassName="text-2xl font-semibold"
            />
          </div>
          <div className="flex flex-col justify-between flex-1 gap-4">
            <p className="text-gray-12 text-base font-semibold font-manrope leading-[1.1]">
              {productName || "Nome do produto"}
            </p>
            {isIncludedInTicket ? (
              <p className="text-gray-12 text-base font-manrope leading-[1.1]">
                Incluso no ingresso
              </p>
            ) : (
              <p className="text-gray-12 text-base font-manrope leading-[1.1]">
                R$ {basePrice.trim() ? basePrice : "0,00"}
              </p>
            )}
          </div>
        </div>
        {productPreviewDropdownOptions.length > 0 ? (
          <div className="p-4">
            <p className="mb-2 text-base text-gray-12">
              {/* Com nome: usa o texto do organizador como título
                  (ex.: "Escolha o tamanho da camisa"). Vazio: rótulo
                  padrão "Escolha a variação". */}
              {variationTypeName.trim() || "Escolha a variação"}
            </p>
            <Dropdown
              options={productPreviewDropdownOptions}
              menuInPortal
              position="bottom"
              align="start"
              width="w-full"
              maxHeight="max-h-[200px]"
              trigger={(isOpen: boolean) => (
                <div className="flex h-12 w-full cursor-pointer items-center justify-between rounded-lg border border-gray-6 px-3 py-4 transition-colors hover:border-gray-8">
                  <p className="text-base text-gray-11">
                    <span className="">Selecione a variação</span>
                  </p>
                  <ArrowButton isOpen={isOpen} />
                </div>
              )}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
