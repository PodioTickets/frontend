/**
 * Selos dos cupons AUTOMÁTICOS (quantidade / idade) nos cards de `/checkout/ingressos`
 * (Figma 617:35395, "selos no canto"). Só EXIBIÇÃO: qual cupom aplica continua sendo
 * decidido pelo backend (o mais vantajoso), igual ao resto do checkout.
 *
 * 1 cupom no ingresso → texto completo; 2+ → texto resumido, com o completo no tooltip.
 */
import { formatBRLFromCents } from "./money";
import { parseAppliesToIds, type QuantityAutoCoupon } from "./quantityCoupon";

/** Regras públicas de um cupom AGE (`ageCoupons` do age-eligibility). */
export interface AgeDisplayCoupon {
  id: string;
  type: "PERCENTAGE" | "FIXED";
  /** % inteiro (PERCENTAGE) ou CENTAVOS (FIXED). */
  value: number;
  appliesTo: string | null;
  minAge: number | null;
  maxAge: number | null;
}

export interface AutoCouponBadge {
  id: string;
  kind: "QUANTITY" | "AGE";
  /** Ex.: "Cupom por quantidade 20%". */
  shortText: string;
  /** Ex.: "Quantidade 20%" — mobile com 2+ selos (os resumidos não cabem lado a lado). */
  tinyText: string;
  /** Ex.: "Compre 3 ou mais ingressos e ganhe 20% de desconto!". */
  fullText: string;
}

function discountLabel(c: { type: "PERCENTAGE" | "FIXED"; value: number }): string {
  return c.type === "PERCENTAGE" ? `${c.value}%` : formatBRLFromCents(c.value);
}

function coversTicket(appliesTo: string | null, ticketId: string): boolean {
  const ids = parseAppliesToIds(appliesTo);
  return !ids || ids.includes(ticketId);
}

function quantityFullText(c: QuantityAutoCoupon, d: string): string {
  const min = c.minQuantity && c.minQuantity > 0 ? c.minQuantity : 1;
  const max = c.maxQuantity && c.maxQuantity > 0 ? c.maxQuantity : null;
  if (max == null) return `Compre ${min} ou mais ingressos e ganhe ${d} de desconto!`;
  if (max === min) return `Compre ${min} ingressos e ganhe ${d} de desconto!`;
  return `Compre de ${min} a ${max} ingressos e ganhe ${d} de desconto!`;
}

function ageFullText(c: AgeDisplayCoupon, d: string): string | null {
  const min = c.minAge && c.minAge > 0 ? c.minAge : null;
  const max = c.maxAge != null ? c.maxAge : null;
  if (min != null && max != null) return `${d} de desconto para idades de ${min} a ${max} anos.`;
  if (max != null) return `${d} de desconto até ${max} anos de idade.`;
  if (min != null) return `${d} de desconto a partir dos ${min} anos de idade.`;
  return null;
}

/** Faixa do cupom cruza o limite de idade do ingresso (senão ninguém daquele ingresso ganharia). */
function ageRangeFitsTicket(c: AgeDisplayCoupon, ageLimit?: { min?: number; max?: number }): boolean {
  const cMin = c.minAge ?? 0;
  const cMax = c.maxAge ?? Infinity;
  const tMin = ageLimit?.min || 0;
  const tMax = ageLimit?.max || Infinity;
  return cMin <= tMax && tMin <= cMax;
}

/** Selos do ingresso: quantidade primeiro, depois idade (ordem do Figma). */
export function ticketAutoCouponBadges(
  ticket: { id: string; ageLimit?: { min?: number; max?: number } },
  quantityCoupons: QuantityAutoCoupon[] | null | undefined,
  ageCoupons: AgeDisplayCoupon[] | null | undefined,
): AutoCouponBadge[] {
  const out: AutoCouponBadge[] = [];
  for (const c of quantityCoupons ?? []) {
    if (c.value <= 0 || !coversTicket(c.appliesTo, ticket.id)) continue;
    const d = discountLabel(c);
    out.push({
      id: c.id,
      kind: "QUANTITY",
      shortText: `Cupom por quantidade ${d}`,
      tinyText: `Quantidade ${d}`,
      fullText: quantityFullText(c, d),
    });
  }
  for (const c of ageCoupons ?? []) {
    if (c.value <= 0 || !coversTicket(c.appliesTo, ticket.id) || !ageRangeFitsTicket(c, ticket.ageLimit)) continue;
    const d = discountLabel(c);
    const fullText = ageFullText(c, d);
    if (fullText) out.push({ id: c.id, kind: "AGE", shortText: `Cupom por idade ${d}`, tinyText: `Idade ${d}`, fullText });
  }
  return out;
}
