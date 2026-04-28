"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/utils/cn";
import { Radio } from "@/components/Radio";
import { Button } from "@/components/Button";
import { ArrowButton } from "../ArrowButton";
import type { KitImagesLayoutApi } from "@/lib/eventKitSelectionDisplay";
import { KitImagesLayoutHelpModal } from "./KitImagesLayoutHelpModal";

type TicketAdvancedKitDisplayOptionsProps = {
  /** Abre o drawer lateral de posição das imagens (lista de ingressos). Tem prioridade sobre `onEditImagePositions`. */
  onOpenKitImagePositionDrawer?: () => void;
  /** Ajuste de posição das imagens do kit (ex.: abrir edição de um ingresso). */
  onEditImagePositions?: () => void;
  /** Controlado: exibir imagens do kit na escolha (persistido no evento). */
  showKitImagesOnSelection?: boolean;
  onShowKitImagesOnSelectionChange?: (value: boolean) => void;
  /** Controlado: layout salvo (badge "Configuração atual"). Default ON_TICKETS. */
  kitImagesLayout?: KitImagesLayoutApi;
};

export function TicketAdvancedKitDisplayOptions({
  onOpenKitImagePositionDrawer,
  onEditImagePositions,
  showKitImagesOnSelection: controlledShow,
  onShowKitImagesOnSelectionChange,
  kitImagesLayout = "ON_TICKETS",
}: TicketAdvancedKitDisplayOptionsProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [internalShow, setInternalShow] = useState(true);
  const showKitImagesOnSelection =
    controlledShow !== undefined ? controlledShow : internalShow;

  const setShowKitImages = (value: boolean) => {
    onShowKitImagesOnSelectionChange?.(value);
    if (controlledShow === undefined) {
      setInternalShow(value);
    }
  };

  const configBadgeLabel = !showKitImagesOnSelection
    ? "Imagens ocultas na escolha"
    : kitImagesLayout === "ON_CATEGORIES"
      ? "Imagens nas categorias"
      : "Imagens nos ingressos";

  const openPositionEditor = () => {
    if (onOpenKitImagePositionDrawer) {
      onOpenKitImagePositionDrawer();
    } else {
      onEditImagePositions?.();
    }
  };

  return (
    <div
      className={cn(
        "w-full overflow-hidden rounded-xl border border-gray-6 bg-gray-1",
        "md:overflow-visible md:rounded-none md:border-0 md:bg-transparent",
      )}
    >
      <button
        type="button"
        onClick={() => setAdvancedOpen((v) => !v)}
        className={cn(
          "flex w-full items-center gap-x-4 border-b border-gray-6 px-4 py-5 text-left",
          "md:border-b-0 md:px-0 md:py-0 md:gap-2",
        )}
      >
        <span className="min-w-0 max-md:flex-1 font-family-dm-sans text-sm font-medium leading-[1.3] text-primary-11 md:text-base">
          Ver opções avançadas de visualização do ingresso
        </span>
        <ArrowButton
          isOpen={advancedOpen}
          className="size-4 shrink-0 text-primary-11 md:size-3"
        />
      </button>

      {advancedOpen ? (
        <div className="flex flex-col md:gap-7">
          <div
            className={cn(
              "flex flex-col gap-4 px-4 pb-6 pt-4",
              "md:px-0 md:pb-0 md:gap-3",
            )}
          >
            <div className="flex w-full items-center gap-3 md:gap-1">
              <p className="min-w-0 max-md:flex-1 font-family-dm-sans text-base font-normal leading-[1.3] text-gray-12">
                Deseja exibir as imagens do kit para os participantes na tela de
                escolha de ingressos?
              </p>
              <KitImagesLayoutHelpModal />
            </div>
            <div className="flex flex-wrap items-center gap-6 md:gap-6">
              <div className="flex items-center gap-2">
                <Radio
                  name="showKitImagesOnSelection"
                  checked={showKitImagesOnSelection}
                  onChange={() => setShowKitImages(true)}
                  className="size-6 shrink-0 md:size-6"
                />
                <button
                  type="button"
                  className="font-family-dm-sans text-base font-normal leading-[1.3] text-gray-12"
                  onClick={() => setShowKitImages(true)}
                >
                  Sim
                </button>
              </div>
              <div className="flex items-center gap-2">
                <Radio
                  name="showKitImagesOnSelection"
                  checked={!showKitImagesOnSelection}
                  onChange={() => setShowKitImages(false)}
                  className="size-6 shrink-0 md:size-6"
                />
                <button
                  type="button"
                  className="font-family-dm-sans text-base font-normal leading-[1.3] text-gray-12"
                  onClick={() => setShowKitImages(false)}
                >
                  Não
                </button>
              </div>
            </div>
          </div>

          {showKitImagesOnSelection ? (
            <div
              className={cn(
                "flex flex-col gap-4 px-4 pb-5",
                "md:flex-row md:flex-wrap md:items-center md:gap-3 md:px-0 md:pb-0",
              )}
            >
              <p className="w-full font-family-dm-sans text-base font-normal leading-[1.3] text-gray-12">
                Na tela em que os participantes escolhem o ingresso, em qual posição as
                imagens dos produtos do kit devem aparecer?
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={openPositionEditor}
                className={cn(
                  "h-12 w-full shrink-0 gap-1 rounded-lg border-gray-6 px-5 font-manrope text-base font-bold leading-[1.1] text-gray-12",
                  "md:h-11 md:w-auto",
                )}
              >
                <Plus className="size-5 shrink-0" strokeWidth={2} aria-hidden />
                Editar posição das imagens
              </Button>
              <div
                className={cn(
                  "flex w-full flex-col gap-3",
                  "md:w-auto md:flex-row md:flex-wrap md:items-center md:gap-2",
                )}
              >
                <p className="font-family-dm-sans text-sm font-normal leading-[1.3] text-gray-12 md:text-base">
                  Configuração atual:
                </p>
                <span
                  className={cn(
                    "inline-flex w-fit items-center justify-center rounded px-3 py-[11px] font-family-dm-sans text-sm font-medium leading-[1.3]",
                    showKitImagesOnSelection
                      ? "bg-primary-3 text-primary-12"
                      : "bg-gray-3 text-gray-11",
                  )}
                >
                  {configBadgeLabel}
                </span>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

    </div>
  );
}
