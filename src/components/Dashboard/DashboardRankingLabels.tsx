"use client";

import { useEffect, useState } from "react";
import { Tooltip } from "@/components/Tooltip";
import { cn } from "@/utils/cn";

/**
 * Rótulos truncados (com tooltip) das tabelas de ranking do dashboard.
 * Compartilhados entre admin e organizer. No mobile o tooltip abre por toque
 * (trigger "click"); no desktop por hover — sincronizado via matchMedia.
 */
export function DashboardRankingTruncatedLabel({
  text,
  emptyDisplay = "—",
  mobileTapAriaLabel,
  lineClassName,
}: {
  text: string;
  emptyDisplay?: string;
  mobileTapAriaLabel: string;
  lineClassName: string;
}) {
  const [hoverTrigger, setHoverTrigger] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const sync = () => setHoverTrigger(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const display = text.trim() || emptyDisplay;

  return (
    <Tooltip
      key={hoverTrigger ? "md" : "sm"}
      className="block w-full max-w-full min-w-0"
      trigger={hoverTrigger ? "hover" : "click"}
      position="topRight"
      content={
        <p className="font-family-dm-sans font-normal text-sm leading-[1.3] text-gray-12 text-left wrap-break-word">
          {display}
        </p>
      }
      contentClassName="max-w-[min(320px,calc(100vw-2rem))] w-max min-w-0 px-3 py-2 gap-0 !items-stretch"
    >
      {hoverTrigger ? (
        <span className={cn(lineClassName, "block cursor-help")}>{display}</span>
      ) : (
        <button
          type="button"
          className={cn(
            lineClassName,
            "text-left cursor-pointer rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-8"
          )}
          aria-label={mobileTapAriaLabel}
        >
          {display}
        </button>
      )}
    </Tooltip>
  );
}

export function DashboardRankingCategoryLabel({ category }: { category: string }) {
  return (
    <DashboardRankingTruncatedLabel
      text={category}
      mobileTapAriaLabel="Toque para ver o nome completo da categoria"
      lineClassName="font-family-dm-sans font-normal text-[14px] leading-[1.3] text-gray-11 overflow-hidden text-ellipsis whitespace-nowrap w-full max-w-full min-w-0"
    />
  );
}

export function DashboardRankingTicketNameLabel({
  name,
  size = "md",
}: {
  name: string;
  size?: "md" | "sm";
}) {
  const sizeClass = size === "sm" ? "text-sm" : "text-[14px]";
  return (
    <DashboardRankingTruncatedLabel
      text={name}
      mobileTapAriaLabel="Toque para ver o nome completo do ingresso"
      lineClassName={`font-family-dm-sans font-semibold ${sizeClass} leading-[1.3] text-gray-12 overflow-hidden text-ellipsis whitespace-nowrap w-full max-w-full min-w-0`}
    />
  );
}
