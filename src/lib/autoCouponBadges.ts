/**
 * Selos dos cupons AUTOMÁTICOS (quantidade / idade) nos cards de `/checkout/ingressos`
 * (Figma 617:35395, "selos no canto"). Só EXIBIÇÃO: qual cupom aplica continua sendo
 * decidido pelo backend (o mais vantajoso), igual ao resto do checkout.
 *
 * 1 cupom no ingresso → texto completo; 2+ → texto resumido, com o completo no tooltip.
 */
import { formatBRLFromCents } from "./money";
import { parseAppliesToIds, type QuantityAutoCoupon } from "./quantityCoupon";
import { ptBR } from "@/i18n/messages/pt-BR";
import { createTranslator, type Translator } from "@/i18n/translate";

/** Default pt-BR (testes / chamadas sem idioma); o card passa o `t` do idioma ativo. */
const ptT = createTranslator(ptBR, "checkout");

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
  /** Quando 2+ cupons do mesmo tipo são agrupados, cada condição individual. */
  fullTexts?: string[];
}

function discountLabel(c: { type: "PERCENTAGE" | "FIXED"; value: number }): string {
  return c.type === "PERCENTAGE" ? `${c.value}%` : formatBRLFromCents(c.value);
}

function coversTicket(appliesTo: string | null, ticketId: string): boolean {
  const ids = parseAppliesToIds(appliesTo);
  return !ids || ids.includes(ticketId);
}

function quantityFullText(c: QuantityAutoCoupon, d: string, t: Translator<"checkout">): string {
  const min = c.minQuantity && c.minQuantity > 0 ? c.minQuantity : 1;
  const max = c.maxQuantity && c.maxQuantity > 0 ? c.maxQuantity : null;
  if (max == null) return t("couponQtyFullMin", { min, d });
  if (max === min) return t("couponQtyFullExact", { min, d });
  return t("couponQtyFullRange", { min, max, d });
}

function ageFullText(c: AgeDisplayCoupon, d: string, t: Translator<"checkout">): string | null {
  const min = c.minAge && c.minAge > 0 ? c.minAge : null;
  const max = c.maxAge != null ? c.maxAge : null;
  if (min != null && max != null) return t("couponAgeFullRange", { min, max, d });
  if (max != null) return t("couponAgeFullMax", { max, d });
  if (min != null) return t("couponAgeFullMin", { min, d });
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
  t: Translator<"checkout"> = ptT,
): AutoCouponBadge[] {
  const out: AutoCouponBadge[] = [];
  for (const c of quantityCoupons ?? []) {
    if (c.value <= 0 || !coversTicket(c.appliesTo, ticket.id)) continue;
    const d = discountLabel(c);
    out.push({
      id: c.id,
      kind: "QUANTITY",
      shortText: t("couponQtyShort", { d }),
      tinyText: t("couponQtyTiny", { d }),
      fullText: quantityFullText(c, d, t),
    });
  }
  for (const c of ageCoupons ?? []) {
    if (c.value <= 0 || !coversTicket(c.appliesTo, ticket.id) || !ageRangeFitsTicket(c, ticket.ageLimit)) continue;
    const d = discountLabel(c);
    const fullText = ageFullText(c, d, t);
    if (fullText) out.push({ id: c.id, kind: "AGE", shortText: t("couponAgeShort", { d }), tinyText: t("couponAgeTiny", { d }), fullText });
  }

  // Agrupa badges do mesmo tipo: 1 selo por kind, com todas as condições no tooltip.
  const grouped = new Map<"QUANTITY" | "AGE", AutoCouponBadge[]>();
  for (const b of out) {
    let list = grouped.get(b.kind);
    if (!list) { list = []; grouped.set(b.kind, list); }
    list.push(b);
  }
  const merged: AutoCouponBadge[] = [];
  for (const [kind, badges] of grouped) {
    if (badges.length === 1) { merged.push(badges[0]); continue; }
    const isQty = kind === "QUANTITY";
    // Mesmo desconto em todos → o selo mantém o valor; senão, rótulo sem valor.
    const sameDiscount = badges.every((b) => b.shortText === badges[0].shortText);
    merged.push({
      id: badges.map((b) => b.id).join("+"),
      kind,
      shortText: sameDiscount ? badges[0].shortText : isQty ? t("couponQtyGroupShort") : t("couponAgeGroupShort"),
      tinyText: sameDiscount ? badges[0].tinyText : isQty ? t("couponQtyGroupTiny") : t("couponAgeGroupTiny"),
      fullText: badges[0].fullText,
      fullTexts: badges.map((b) => b.fullText),
    });
  }
  return merged;
}
