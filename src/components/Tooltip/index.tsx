"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/utils/cn";
import Image from "next/image";

interface TooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  className?: string;
  /** Classes do painel interno (largura, padding, fundo, etc.) */
  contentClassName?: string;
  position?: "top" | "bottom" | "left" | "right" | "topRight" | "bottomLeft";
  trigger?: "hover" | "click";
  /**
   * Hover com botões/links: atraso ao sair para dar tempo de mover o cursor até o painel.
   */
  interactiveHover?: boolean;
  leaveDelayMs?: number;
  /** Modo controlado (útil para fechar após “Concluir” em conteúdo interativo) */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function Tooltip({
  children,
  content,
  className,
  contentClassName,
  position = "topRight",
  trigger = "hover",
  interactiveHover = false,
  leaveDelayMs = 200,
  open: openControlled,
  onOpenChange,
}: TooltipProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isControlled = openControlled !== undefined;
  const isOpen = isControlled ? openControlled : internalOpen;

  const setOpen = useCallback(
    (next: boolean) => {
      if (!isControlled) {
        setInternalOpen(next);
      }
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange]
  );

  useEffect(() => {
    return () => {
      if (leaveTimerRef.current) {
        clearTimeout(leaveTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    if (isOpen && trigger === "click") {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, trigger, setOpen]);

  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    bottomLeft: "top-full left-0",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
    topRight: "bottom-full left-0 ml-4",
  };

  const clearLeaveTimer = () => {
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
  };

  const handleMouseEnter = () => {
    clearLeaveTimer();
    if (trigger === "hover") {
      setOpen(true);
    }
  };

  const handleMouseLeave = () => {
    if (trigger !== "hover") return;
    if (interactiveHover) {
      leaveTimerRef.current = setTimeout(() => {
        setOpen(false);
        leaveTimerRef.current = null;
      }, leaveDelayMs);
    } else {
      setOpen(false);
    }
  };

  const handleClick = () => {
    if (trigger === "click") {
      setOpen(!isOpen);
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn("relative inline-block", className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {children}
      {isOpen && (
        <div
          ref={tooltipRef}
          className={cn(
            "absolute z-50",
            positionClasses[position],
            interactiveHover &&
              (position === "bottomLeft" || position === "bottom"
                ? "pt-2 -mt-2"
                : position === "topRight" || position === "top"
                  ? "pb-2 -mb-2"
                  : "")
          )}
          style={{ pointerEvents: "none" }}
        >
          <div
            className={cn(
              "bg-gray-1 flex flex-col gap-6 items-center px-3 py-4 rounded-bl-[4px] rounded-br-2xl rounded-tl-2xl rounded-tr-2xl shadow-[0px_2px_6px_0px_rgba(17,17,17,0.25)] w-[236px] pointer-events-auto",
              contentClassName
            )}
          >
            {content}
          </div>
        </div>
      )}
    </div>
  );
}

interface CVVTooltipProps {
  cardImageUrl?: string;
}

export function CVVTooltip({
  cardImageUrl = "/images/card_tooltip.png",
}: CVVTooltipProps) {
  return (
    <div className="flex flex-col gap-4 items-center w-full">
      <div className="relative w-full h-[137px] flex items-center justify-center shrink-0">
        <Image
          src={cardImageUrl}
          alt="Cartão de crédito"
          width={100000}
          height={100000}
          className="object-contain rounded-[22px] w-full h-full"
        />
      </div>

      {/* Explanation text */}
      <p className="font-family-dm-sans font-normal text-sm leading-[1.3] text-gray-12 text-center shrink-0">
        Este é um número especial de 3 ou 4 dígitos que fica no verso do seu
        cartão de débito ou crédito, próximo à área de assinatura
      </p>
    </div>
  );
}
