"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/utils/cn";

interface PersonTypeCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
}

/**
 * Cartão selecionável PJ/PF da etapa de tipo. Não existia componente de card
 * selecionável no projeto — markup novo reusando o `Checkbox` (24×24) como o
 * "button-checkbox" do Figma. Selecionado = borda + fundo verdes.
 */
export function PersonTypeCard({
  icon,
  title,
  description,
  selected,
  onSelect,
}: PersonTypeCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "flex flex-1 flex-col items-center gap-4 rounded-xl border p-5 text-center transition-colors",
        selected
          ? "border-primary-11 bg-primary-3"
          : "border-gray-6 bg-gray-1 hover:border-gray-8",
      )}
    >
      <span
        className={cn(
          "flex size-12 items-center justify-center border border-transparent rounded-xl transition-colors",
          selected
            ? "bg-primary-9 border-primary-11 text-gray-1"
            : "bg-gray-3 text-gray-11 border-gray-6",
        )}
      >
        {icon}
      </span>
      <span className="flex flex-col gap-1">
        <span className="text-base font-semibold font-family-dm-sans text-gray-12 leading-[1.3]">
          {title}
        </span>
        <span className="text-sm font-normal font-family-dm-sans text-gray-11 leading-[1.3]">
          {description}
        </span>
      </span>
      {/* Indicador visual (NÃO interativo) — o card inteiro é o alvo de clique.
          Evita <button> aninhado (o Checkbox do Radix é um button), que quebrava
          a seleção via mismatch de hidratação (SSR fecha o button externo). */}
      <span
        aria-hidden
        className={cn(
          "flex size-6 items-center justify-center rounded-md border transition-colors",
          selected
            ? "border-primary-11 bg-primary-5"
            : "border-gray-6 bg-transparent",
        )}
      >
        {selected ? (
          <Check className="size-4 text-[#308737]" strokeWidth={3} />
        ) : null}
      </span>
    </button>
  );
}
