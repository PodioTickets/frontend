/**
 * Regras puras da troca de ingresso no admin (tela /admin/registrations/[id]/swap).
 * O backend (registration-swap.util) revalida tudo; aqui é só para bloquear o card
 * antes do clique, com a mesma mensagem do checkout (InformationStep).
 */

import type { Product } from "@/components/Checkout/SubscriptionStep.utils";
import {
  autoSelectableOptions,
  getVariationGroups,
  groupSelection,
  isOptedOut,
  isSelectionComplete,
  normalizeSelection,
  selectionIds,
  setGroupSelection,
} from "@/lib/productVariationGroups";

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

/** Seleção da troca: productId → opções escolhidas (uma por variação) ou id único legado. */
export type SwapSelection = Record<string, readonly string[] | string | null | undefined>;

/**
 * Escolhas efetivas do produto: as do admin + as auto-selecionadas (variação de
 * opção única) nas variações que ele não escolheu. Opt-out não recebe auto-seleção.
 */
export function effectiveSwapSelection(product: Product, selected: SwapSelection): string[] {
  let ids = normalizeSelection(product, selectionIds(selected[product.id]));
  if (isOptedOut(product, ids)) return ids;
  const groups = getVariationGroups(product);
  for (const { groupId, option } of autoSelectableOptions(product)) {
    const group = groups.find((g) => g.id === groupId);
    if (group && !groupSelection(group, ids)) ids = setGroupSelection(product, ids, groupId, option.id);
  }
  return ids;
}

/**
 * Payload de produtos da troca — MESMA regra do checkout (`checkoutProductStep`): só entra
 * produto com variação (escolhida ou auto-selecionada quando há opção única) e com UMA
 * opção por variação; produto sem variação nunca vira item, como na compra.
 */
export function buildSwapProductsPayload(
  products: Product[],
  selected: SwapSelection,
): Array<{ productId: string; variationIds: string[]; variationId: string }> {
  const out: Array<{ productId: string; variationIds: string[]; variationId: string }> = [];
  for (const p of products) {
    const variationIds = effectiveSwapSelection(p, selected);
    if (variationIds.length > 0 && isSelectionComplete(p, variationIds)) {
      out.push({ productId: p.id, variationIds, variationId: variationIds[0] });
    }
  }
  return out;
}

/**
 * Gate do "Concluir": obrigatório com variação ainda incompleto, ou qualquer produto
 * com escolha começada mas faltando variação (o backend rejeitaria a troca).
 */
export function hasMissingRequiredVariation(products: Product[], selected: SwapSelection): boolean {
  return products.some((p) => {
    const ids = effectiveSwapSelection(p, selected);
    if (isSelectionComplete(p, ids)) return false;
    // Incluso no ingresso = obrigatório (regra do checkout); `isRequired` legado continua valendo.
    return p.isRequired || p.isIncludedInTicket || ids.length > 0;
  });
}
