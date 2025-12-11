"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/utils/cn";
import Image from "next/image";

interface TooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  className?: string;
  position?: "top" | "bottom" | "left" | "right" | "topRight";
  trigger?: "hover" | "click";
}

export function Tooltip({
  children,
  content,
  className,
  position = "topRight",
  trigger = "hover",
}: TooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen && trigger === "click") {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, trigger]);

  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
    topRight: "bottom-full left-0 ml-4",
  };

  const handleMouseEnter = () => {
    if (trigger === "hover") {
      setIsOpen(true);
    }
  };

  const handleMouseLeave = () => {
    if (trigger === "hover") {
      setIsOpen(false);
    }
  };

  const handleClick = () => {
    if (trigger === "click") {
      setIsOpen(!isOpen);
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
          className={cn("absolute z-50", positionClasses[position])}
          style={{ pointerEvents: "none" }}
        >
          <div className="bg-gray-1 flex flex-col gap-6 items-center px-3 py-4 rounded-bl-[4px] rounded-br-2xl rounded-tl-2xl rounded-tr-2xl shadow-[0px_2px_6px_0px_rgba(17,17,17,0.25)] w-[236px] pointer-events-auto">
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
      <p className="font-dm-sans font-normal text-sm leading-[1.3] text-gray-12 text-center shrink-0">
        Este é um número especial de 3 ou 4 dígitos que fica no verso do seu
        cartão de débito ou crédito, próximo à área de assinatura
      </p>
    </div>
  );
}
