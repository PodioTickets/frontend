"use client";

import { createContext, useContext, type ReactNode } from "react";
import { Checkbox } from "@/components/CheckBox";
import type { Ticket } from "@/hooks/useTickets";

/**
 * Modo "escolher UM ingresso" para os cards do checkout (`TicketCategoryCard`).
 * Quando presente, o card troca o seletor de quantidade por um checkbox de seleção
 * única e esconde o preço (Figma da troca de ingresso no admin). Sem provider o
 * checkout segue igual — mesmo padrão de `HidePricingContext`/`IgnoreAgeLimitContext`.
 */
export interface TicketPickValue {
  selectedTicketId: string | null;
  /** Ingresso que o participante já tem: mostra "Ingresso atual" e não é selecionável. */
  currentTicketId: string | null;
  onPick: (ticketId: string) => void;
  /** Motivo de bloqueio (ex.: idade/gênero do participante); null = pode escolher. */
  blockedReason?: (ticket: Ticket) => string | null;
}

const TicketPickContext = createContext<TicketPickValue | null>(null);

export function TicketPickProvider({ value, children }: { value: TicketPickValue; children: ReactNode }) {
  return <TicketPickContext.Provider value={value}>{children}</TicketPickContext.Provider>;
}

export function useTicketPick(): TicketPickValue | null {
  return useContext(TicketPickContext);
}

/** Controle do card no modo seleção: "Ingresso atual", "Lote esgotado", bloqueio ou checkbox. */
export function TicketPickControl({ ticket, soldOut }: { ticket: Ticket; soldOut: boolean }) {
  const pick = useTicketPick();
  if (!pick) return null;

  if (ticket.id === pick.currentTicketId) {
    return (
      <p className="text-lg font-medium text-gray-11 font-family-dm-sans leading-[1.3] whitespace-nowrap">
        Ingresso atual
      </p>
    );
  }
  if (soldOut) {
    return (
      <span className="shrink-0 inline-flex items-center h-7 rounded-full bg-gray-4 px-3 text-sm font-semibold text-gray-11 font-manrope leading-[1.1] whitespace-nowrap">
        Lote esgotado
      </span>
    );
  }

  const blocked = pick.blockedReason?.(ticket) ?? null;
  const checked = pick.selectedTicketId === ticket.id;
  return (
    <div className="flex items-center gap-3 min-w-0">
      {blocked && (
        <p className="text-xs font-medium text-red-11 font-family-dm-sans text-right">{blocked}</p>
      )}
      {/* Checkbox padrão do projeto (mesmo do checkout/cupons) — seleção única via onPick. */}
      <Checkbox
        checked={checked}
        disabled={!!blocked}
        onCheckedChange={() => pick.onPick(ticket.id)}
        aria-label={`Selecionar ${ticket.name}`}
      />
    </div>
  );
}
