"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/utils/cn";

/**
 * Mobile: acordeão «Ingressos geral» (Figma). Desktop: repassa só o conteúdo, sem wrapper extra.
 * Deve envolver um único filho (ex.: TicketTable) para não duplicar IDs do @dnd-kit/sortable.
 */
export function MobileGeneralTicketsSection({
  ticketCount,
  children,
}: {
  ticketCount: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  const label = ticketCount === 1 ? "1 ingresso" : `${ticketCount} ingressos`;

  return (
    <div className="w-full overflow-hidden rounded-xl border border-gray-6 bg-gray-1 md:border-0 md:bg-transparent md:overflow-visible">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-start justify-between gap-3 border-b border-gray-6 bg-gray-1 px-4 py-5 text-left md:hidden"
      >
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <p className="font-manrope text-base font-bold leading-[1.1] text-gray-12">Ingressos geral</p>
          <p className="font-family-dm-sans text-sm font-normal leading-[1.3] text-gray-11">{label}</p>
        </div>
        <ChevronDown
          className={cn("size-8 shrink-0 text-gray-12 transition-transform", open ? "rotate-180" : "")}
          aria-hidden
        />
      </button>
      <div
        className={cn(
          "flex w-full flex-col gap-3 px-3 py-4 md:gap-0 md:p-0",
          !open && "hidden md:flex",
        )}
      >
        {children}
      </div>
    </div>
  );
}
