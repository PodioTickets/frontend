"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Tooltip } from "@/components/Tooltip";
import { BookIcon } from "@/components/Icons/BookIcon";
import { InstagramIcon } from "@/components/Icons/InstagramIcon";
import { FacebookIcon } from "@/components/Icons/FacebookIcon";
import { YoutubeIcon } from "@/components/Icons/YoutubeIcon";
import { Globe } from "lucide-react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { cn } from "@/utils/cn";
import Image from "next/image";

function PreviewCard() {
  return (
    <div className="flex flex-col gap-3 relative">
      <Image draggable={false} src={"/images/email-help-tooltip.png"} alt="email-help-tooltip" className="w-full h-full" unoptimized height={100000} width={100000} />
    </div>
  );
}

function TooltipContent() {
  return (
    <div className="bg-gray-2 flex flex-col gap-3 p-4 rounded-tl-xl rounded-tr-xl rounded-br-xl shadow-[0px_2px_6px_0px_rgba(17,17,17,0.25)]">
      <PreviewCard />
      <p className="text-sm font-normal font-family-dm-sans text-gray-12 leading-[1.3]">
        Este e-mail receberá as dúvidas dos participantes
      </p>
    </div>
  );
}

function DrawerContent_({ onClose }: { onClose: () => void }) {
  return (
    <>
      <div className="flex items-center justify-between border-b border-gray-6 px-4 py-2 shrink-0">
        <DrawerTitle className="font-family-dm-sans font-semibold text-base leading-[1.3] text-gray-12 m-0">
          Email de atendimento
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
        <PreviewCard />
        <p className="text-sm font-normal font-family-dm-sans text-gray-12 leading-[1.3]">
          Este e-mail receberá as dúvidas dos participantes
        </p>
      </div>
    </>
  );
}

const triggerButtonClass =
  "inline-flex items-center justify-center rounded-md text-gray-11 hover:text-gray-12 transition-colors p-0.5 -m-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-8 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-1";

export function ContactEmailHelpTooltip() {
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <span className="inline-flex shrink-0 items-center">
      <div className="hidden md:contents">
        <Tooltip
          open={tooltipOpen}
          onOpenChange={setTooltipOpen}
          trigger="hover"
          interactiveHover
          position="topRight"
          contentClassName="w-[min(100vw-2rem,340px)] max-w-[340px] p-0 bg-transparent shadow-none rounded-none gap-0 items-stretch px-0 py-0"
          content={<TooltipContent />}
        >
          <button
            type="button"
            className={triggerButtonClass}
            aria-label="Saiba mais sobre o email de atendimento"
            aria-expanded={tooltipOpen}
            aria-haspopup="true"
          >
            <BookIcon className="size-5 shrink-0" />
          </button>
        </Tooltip>
      </div>

      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen} direction="bottom">
        <DrawerTrigger asChild>
          <button
            type="button"
            className={cn(triggerButtonClass, "md:hidden")}
            aria-label="Saiba mais sobre o email de atendimento"
            aria-expanded={drawerOpen}
            aria-haspopup="dialog"
          >
            <BookIcon className="size-5 shrink-0" />
          </button>
        </DrawerTrigger>
        <DrawerContent
          overlayClassName="bg-[rgba(32,32,32,0.9)] supports-backdrop-filter:backdrop-blur-none"
          className="bg-gray-1 border-0 border-t-0 rounded-t-xl p-0 max-h-[min(90dvh,600px)] gap-0 [&>div:first-child]:hidden"
        >
          <DrawerContent_ onClose={() => setDrawerOpen(false)} />
        </DrawerContent>
      </Drawer>
    </span>
  );
}
