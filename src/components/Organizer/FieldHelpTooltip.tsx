"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Tooltip } from "@/components/Tooltip";
import { InfoIcon } from "@/components/Icons/InfoIcon";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { cn } from "@/utils/cn";

const triggerButtonClass =
  "inline-flex items-center justify-center rounded-md text-gray-11 hover:text-gray-12 transition-colors p-0.5 -m-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-8 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-1";

interface FieldHelpTooltipProps {
  /** Título do cabeçalho do drawer (mobile) + base do aria-label. */
  label: string;
  /** Texto de ajuda exibido no hover (desktop) / bottom-sheet (mobile). */
  text: string;
}

/**
 * Ícone de "livro" ao lado do label de um campo que revela um texto de ajuda:
 * no HOVER (desktop, via `Tooltip`) ou no TOQUE (mobile, via bottom-sheet
 * `Drawer`). Genérico e só-texto — mesmo padrão de `ContactEmailHelpTooltip`/
 * `GoogleMapsUrlHelpTooltip`, sem duplicar a estrutura por campo.
 */
export function FieldHelpTooltip({ label, text }: FieldHelpTooltipProps) {
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const aria = `Saiba mais sobre ${label.toLowerCase()}`;

  return (
    <span className="inline-flex shrink-0 items-center">
      {/* Desktop: tooltip no hover */}
      <div className="hidden md:contents">
        <Tooltip
          open={tooltipOpen}
          onOpenChange={setTooltipOpen}
          trigger="hover"
          interactiveHover
          usePortal
          position="topRight"
          contentClassName="w-[min(100vw-2rem,320px)] items-stretch gap-0"
          content={
            <p className="text-sm font-normal font-family-dm-sans text-gray-12 leading-[1.3] text-left">
              {text}
            </p>
          }
        >
          <button
            type="button"
            className={triggerButtonClass}
            aria-label={aria}
            aria-expanded={tooltipOpen}
            aria-haspopup="true"
          >
            <InfoIcon className="size-5 shrink-0" />
          </button>
        </Tooltip>
      </div>

      {/* Mobile: bottom-sheet no toque */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen} direction="bottom">
        <DrawerTrigger asChild>
          <button
            type="button"
            className={cn(triggerButtonClass, "md:hidden")}
            aria-label={aria}
            aria-expanded={drawerOpen}
            aria-haspopup="dialog"
          >
            <InfoIcon className="size-5 shrink-0" />
          </button>
        </DrawerTrigger>
        <DrawerContent
          overlayClassName="bg-[rgba(32,32,32,0.9)] supports-backdrop-filter:backdrop-blur-none"
          className="bg-gray-1 border-0 border-t-0 rounded-t-xl p-0 max-h-[min(90dvh,600px)] gap-0 [&>div:first-child]:hidden"
        >
          <div className="flex items-center justify-between border-b border-gray-6 px-4 py-2 shrink-0">
            <DrawerTitle className="font-family-dm-sans font-semibold text-base leading-[1.3] text-gray-12 m-0">
              {label}
            </DrawerTitle>
            <DrawerClose asChild>
              <button
                type="button"
                className="flex size-7 items-center justify-center rounded-lg text-gray-12 hover:bg-gray-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-8 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-1"
                aria-label="Fechar"
              >
                <X className="size-5 shrink-0" strokeWidth={1.75} />
              </button>
            </DrawerClose>
          </div>
          <div className="flex flex-col gap-4 px-4 pt-4 pb-10 bg-gray-1">
            <p className="text-sm font-normal font-family-dm-sans text-gray-12 leading-[1.3]">
              {text}
            </p>
          </div>
        </DrawerContent>
      </Drawer>
    </span>
  );
}
