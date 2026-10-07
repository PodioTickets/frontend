/**
 * Regras puras da troca de ingresso no admin (tela /admin/registrations/[id]/swap).
 * O backend (registration-swap.util) revalida tudo; aqui é só para bloquear o card
 * antes do clique, com a mesma mensagem do checkout (InformationStep).
 */

import type { Product } from "@/components/Checkout/SubscriptionStep.utils";
import { autoSelectedVariationId } from "@/lib/checkoutProductStep";

export interface SwapParticipantInfo {
  /** ISO "YYYY-MM-DD…" */
  birthDate: string | null;
  gender: string | null;
}

export interface SwapTicketRules {
  ageLimit?: { min?: number; max?: number };
  gender?: string;
}

function parseYmd(iso: string | null | undefined): { y: number; m: number; d: number } | null {
  const match = iso?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) } : null;
}

/** Idade no dia do evento (sem data do evento, hoje) — mesma conta do checkout. */
export function ageOnEventDay(birthDate: string, eventDate: string | null | undefined, now = new Date()): number | null {
  const birth = parseYmd(birthDate);
  if (!birth) return null;
  const ref = parseYmd(eventDate) ?? { y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() };
  let age = ref.y - birth.y;
  if (ref.m < birth.m || (ref.m === birth.m && ref.d < birth.d)) age--;
  return age;
}

/** Motivo pelo qual o participante não pode ir para o ingresso; null = pode. */
export function swapBlockedReason(
  participant: SwapParticipantInfo,
  ticket: SwapTicketRules,
  eventDate: string | null | undefined,
): string | null {
  const min = ticket.ageLimit?.min;
  const max = ticket.ageLimit?.max;
  if (min || max) {
    const age = participant.birthDate ? ageOnEventDay(participant.birthDate, eventDate) : null;
    if (age === null) return "Participante sem data de nascimento";
    if (min && age < min) return `Idade mínima: ${min} anos no dia do evento`;
    if (max && age > max) return `Idade máxima: ${max} anos no dia do evento`;
  }
  const tg = (ticket.gender ?? "").trim().toLowerCase();
  if (tg && tg !== "all") {
    const pg = (participant.gender ?? "").trim().toLowerCase();
    if (tg.startsWith("m") && !pg.startsWith("m")) return "Exclusivo para o sexo masculino";
    if (tg.startsWith("f") && !pg.startsWith("f")) return "Exclusivo para o sexo feminino";
  }
  return null;
}

/**
 * Payload de produtos da troca — MESMA regra do checkout (`checkoutProductStep`): só entra
 * produto com variação (escolhida ou auto-selecionada quando há opção única); produto
 * sem variação nunca vira item, como na compra.
 */
export function buildSwapProductsPayload(
  products: Product[],
  selected: Record<string, string | null | undefined>,
): Array<{ productId: string; variationId: string }> {
  const out: Array<{ productId: string; variationId: string }> = [];
  for (const p of products) {
    const variationId = selected[p.id] || autoSelectedVariationId(p);
    if (variationId) out.push({ productId: p.id, variationId });
  }
  return out;
}

/** Algum obrigatório com variação ainda sem escolha? (gate do "Concluir"). */
export function hasMissingRequiredVariation(
  products: Product[],
  selected: Record<string, string | null | undefined>,
): boolean {
  return products.some(
    (p) => p.isRequired && (p.variations?.length ?? 0) > 0 && !(selected[p.id] || autoSelectedVariationId(p)),
  );
}
