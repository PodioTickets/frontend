"use client";

import { useState } from "react";
import { cn } from "@/utils/cn";
import { Radio } from "@/components/Radio";
import { Button } from "@/components/Button";
import { ArrowButton } from "../ArrowButton";
import type { KitImagesLayoutApi } from "@/lib/eventKitSelectionDisplay";

type TicketAdvancedKitDisplayOptionsProps = {
  /** Abre o drawer lateral de posição das imagens (lista de ingressos). Tem prioridade sobre `onEditImagePositions`. */
  onOpenKitImagePositionDrawer?: () => void;
  /** Ajuste de posição das imagens do kit (ex.: abrir edição de um ingresso). */
  onEditImagePositions?: () => void;
  /** Controlado: exibir imagens do kit na escolha (persistido no evento). */
  showKitImagesOnSelection?: boolean;
  onShowKitImagesOnSelectionChange?: (value: boolean) => void;
  /** Controlado: layout salvo (badge “Configuração atual”). Default ON_TICKETS. */
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

  return (
    <div className="flex flex-col gap-7 w-full">
      <button
        type="button"
        onClick={() => setAdvancedOpen((v) => !v)}
        className="flex items-center gap-2 w-full text-left group"
      >
        <span className="font-medium text-base leading-[1.3] text-primary-11 font-family-dm-sans">
          Ver opções avançadas de visualização do ingresso
        </span>
        <ArrowButton
          isOpen={advancedOpen}
          className="size-3 text-primary-11"
        />
      </button>

      {advancedOpen ? (
        <div className="flex flex-col gap-7 w-full">
          <div className="flex flex-col gap-3 w-full">
            <p className="font-normal text-base leading-[1.3] text-gray-12 font-family-dm-sans">
              Deseja exibir as imagens do kit para os participantes na tela de
              escolha de ingressos?
            </p>
            <div className="flex flex-wrap gap-6 items-start">
              <label className="flex items-center gap-2 cursor-pointer">
                <Radio
                  name="showKitImagesOnSelection"
                  checked={showKitImagesOnSelection}
                  onChange={() => setShowKitImages(true)}
                />
                <span className="font-normal text-base leading-[1.3] text-gray-12 font-family-dm-sans">
                  Sim
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Radio
                  name="showKitImagesOnSelection"
                  checked={!showKitImagesOnSelection}
                  onChange={() => setShowKitImages(false)}
                />
                <span className="font-normal text-base leading-[1.3] text-gray-12 font-family-dm-sans">
                  Não
                </span>
              </label>
            </div>
          </div>
          {showKitImagesOnSelection && (
            <div className="flex flex-col gap-3 w-full">
              <div className="flex flex-wrap gap-3 items-center">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    onOpenKitImagePositionDrawer
                      ? onOpenKitImagePositionDrawer()
                      : onEditImagePositions?.()
                  }
                  className="h-11 px-5 border-gray-6 text-gray-12 font-bold font-manrope leading-[1.1] rounded-lg gap-1"
                >
                  Editar posição das imagens
                </Button>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-normal text-base leading-[1.3] text-gray-12 font-family-dm-sans whitespace-nowrap">
                    Configuração atual:
                  </span>
                  <span
                    className={cn(
                      "inline-flex items-center justify-center px-2 py-[11px] rounded text-sm font-medium leading-[1.3] font-family-dm-sans",
                      showKitImagesOnSelection
                        ? "bg-primary-3 text-primary-12"
                        : "bg-gray-3 text-gray-11"
                    )}
                  >
                    {configBadgeLabel}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
