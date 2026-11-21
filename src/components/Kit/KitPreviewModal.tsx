"use client";

import { Button } from "@/components/Button";
import { ImageWithInitialFallback } from "@/components/ImageWithInitialFallback";
import { ArrowButton } from "../ArrowButton";
import { Dropdown } from "../Dropdown";
import { KitOverlayDialog } from "./KitOverlayDialog";
import type { KitVariationGroup } from "./kitVariationGroups";

/**
 * "Prévia do kit" (Figma tela 09): um card por variação, do jeito que o
 * participante vê na inscrição — foto e nome do kit, linha de preço e a pergunta
 * (nome da variação) com o seletor. O 1º card leva o preço do kit; os demais,
 * "Incluso no kit". Kit sem variação: um card só, sem seletor.
 */
export function KitPreviewModal({
  open,
  onClose,
  groups,
  productName,
  imageSrc,
  isIncludedInTicket,
  basePrice,
}: {
  open: boolean;
  onClose: () => void;
  groups: KitVariationGroup[];
  productName: string;
  imageSrc: string | null;
  isIncludedInTicket: boolean;
  /** Preço do kit já formatado ("205,75"). */
  basePrice: string;
}) {
  const name = productName.trim() || "Nome do kit";
  const firstPriceLabel = isIncludedInTicket ? "Incluso no ingresso" : `R$ ${basePrice.trim() || "0,00"}`;
  const cards: Array<KitVariationGroup | null> = groups.length > 0 ? groups : [null];

  return (
    <KitOverlayDialog
      open={open}
      idBase="kit-preview"
      title="Prévia do kit"
      onClose={onClose}
      onBack={onClose}
      widthClassName="max-w-[1000px]"
      footer={
        <Button type="button" variant="outline" onClick={onClose} className="border-gray-6 px-8 text-gray-12">
          Voltar para a edição
        </Button>
      }
    >
      <div className="flex flex-col gap-4 p-6">
        <div className="flex flex-col gap-2">
          <h3 className="font-manrope text-base font-bold leading-[1.1] text-gray-12">Como o participante vê</h3>
          <p className="font-family-dm-sans text-sm leading-[1.3] text-gray-11">
            Na inscrição, cada variação aparece como uma pergunta junto da foto do item.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {cards.map((group, i) => (
            <div key={group?.key ?? "kit"} className="flex flex-col rounded-xl border border-gray-6 bg-gray-2">
              <div className="flex items-center gap-3 p-4">
                <div className="relative size-[100px] shrink-0 overflow-hidden rounded border border-gray-6 bg-gray-3">
                  <ImageWithInitialFallback
                    src={imageSrc}
                    alt={name}
                    name={name}
                    fill
                    sizes="100px"
                    className="size-full border-0 border-transparent"
                    letterClassName="text-2xl font-semibold"
                  />
                </div>
                <div className="flex min-w-0 flex-1 flex-col justify-between gap-4 self-stretch py-1">
                  <p className="break-words font-manrope text-base font-semibold leading-[1.1] text-gray-12">{name}</p>
                  <p className="font-manrope text-base leading-[1.1] text-gray-11">
                    {i === 0 ? firstPriceLabel : "Incluso no kit"}
                  </p>
                </div>
              </div>
              {group && (
                <div className="flex flex-col gap-2 border-t border-gray-6 p-4">
                  <p className="font-family-dm-sans text-base leading-[1.3] text-gray-12">{group.name}</p>
                  <Dropdown
                    options={group.options.map((o) => ({ id: o.key, label: o.name }))}
                    menuInPortal
                    position="bottom"
                    align="start"
                    width="w-full"
                    maxHeight="max-h-[200px]"
                    trigger={(isOpen: boolean) => (
                      <div className="flex h-12 w-full cursor-pointer items-center justify-between rounded-lg border border-gray-6 px-3 transition-colors hover:border-gray-8">
                        <span className="font-family-dm-sans text-base text-gray-11">Selecione a opção</span>
                        <ArrowButton isOpen={isOpen} />
                      </div>
                    )}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </KitOverlayDialog>
  );
}
