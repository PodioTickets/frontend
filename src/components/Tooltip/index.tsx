"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/utils/cn";
import Image from "next/image";

interface TooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  className?: string;
  /** Classes do painel interno (largura, padding, fundo, etc.) */
  contentClassName?: string;
  position?: "top" | "bottom" | "left" | "right" | "topRight" | "topLeft" | "bottomLeft" | "bottomRight";
  trigger?: "hover" | "click";
  /**
   * Hover com botões/links: atraso ao sair para dar tempo de mover o cursor até o painel.
   */
  interactiveHover?: boolean;
  leaveDelayMs?: number;
  /** Modo controlado (útil para fechar após “Concluir” em conteúdo interativo) */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Renderiza o painel via portal no body, escapando de overflow:hidden/auto dos pais */
  usePortal?: boolean;
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
  usePortal = false,
}: TooltipProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [portalStyle, setPortalStyle] = useState<React.CSSProperties>({});

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

  useEffect(() => {
    if (!usePortal || !isOpen || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;
    const style: React.CSSProperties = { position: "fixed", zIndex: 9999 };

    if (position === "top") {
      style.bottom = window.innerHeight - rect.top + 8;
      style.left = rect.left + rect.width / 2;
      style.transform = "translateX(-50%)";
    } else if (position === "topRight") {
      style.bottom = window.innerHeight - rect.top + 8;
      style.left = rect.left;
    } else if (position === "topLeft") {
      style.bottom = window.innerHeight - rect.top + 8;
      style.right = window.innerWidth - rect.right;
    } else if (position === "bottom") {
      style.top = rect.bottom + 8;
      style.left = rect.left + rect.width / 2;
      style.transform = "translateX(-50%)";
    } else if (position === "bottomLeft") {
      style.top = rect.bottom + 8;
      style.left = rect.left;
    } else if (position === "bottomRight") {
      style.top = rect.bottom + 8;
      style.right = window.innerWidth - rect.right;
    } else if (position === "left") {
      style.top = rect.top + rect.height / 2;
      style.right = window.innerWidth - rect.left + 8;
      style.transform = "translateY(-50%)";
    } else if (position === "right") {
      style.top = rect.top + rect.height / 2;
      style.left = rect.right + 8;
      style.transform = "translateY(-50%)";
    }

    setPortalStyle(style);
  }, [usePortal, isOpen, position]);

  // A ponta sem rounded aponta para o trigger; varia conforme a posição
  const sharpCornerClasses: Record<typeof position & string, string> = {
    top:          "rounded-tl-2xl rounded-tr-2xl rounded-br-2xl rounded-bl-[4px]",
    topRight:     "rounded-tl-2xl rounded-tr-2xl rounded-br-2xl rounded-bl-[4px]",
    topLeft:      "rounded-tl-2xl rounded-tr-2xl rounded-br-[4px] rounded-bl-2xl",
    bottom:       "rounded-tl-[4px] rounded-tr-2xl rounded-br-2xl rounded-bl-2xl",
    bottomLeft:   "rounded-tl-[4px] rounded-tr-2xl rounded-br-2xl rounded-bl-2xl",
    bottomRight:  "rounded-tl-2xl rounded-tr-[4px] rounded-br-2xl rounded-bl-2xl",
    left:         "rounded-tl-2xl rounded-tr-[4px] rounded-br-2xl rounded-bl-2xl",
    right:        "rounded-tl-[4px] rounded-tr-2xl rounded-br-2xl rounded-bl-2xl",
  };

  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    bottomLeft: "top-full left-0 mt-2",
    bottomRight: "top-full right-0 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
    topRight: "bottom-full left-0 mb-2",
    topLeft: "bottom-full right-0 mb-2",
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
      {isOpen && !usePortal && (
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
              `bg-gray-1 flex flex-col gap-6 items-center px-3 py-4 ${sharpCornerClasses[position]} shadow-[0px_2px_6px_0px_rgba(17,17,17,0.25)] w-[236px] pointer-events-auto`,
              contentClassName
            )}
          >
            {content}
          </div>
        </div>
      )}
      {isOpen && usePortal && typeof document !== "undefined" && createPortal(
        <div
          ref={tooltipRef}
          style={{ ...portalStyle, pointerEvents: "none" }}
        >
          <div
            className={cn(
              `bg-gray-1 flex flex-col gap-6 items-center px-3 py-4 ${sharpCornerClasses[position]} shadow-[0px_2px_6px_0px_rgba(17,17,17,0.25)] w-[236px] pointer-events-auto`,
              contentClassName
            )}
          >
            {content}
          </div>
        </div>,
        document.body
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
