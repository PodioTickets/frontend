/**
 * Cupons AUTOMÁTICOS (quantidade / idade) anunciados em `/checkout/ingressos`
 * (Figma 7589:71877 e 7589:72061). Só EXIBIÇÃO: qual cupom aplica no pedido continua
 * sendo decidido pelo backend.
 *
 * Cupom automático não soma com outro automático, então cada ingresso anuncia 1 só:
 * entre os gerais, o mais vantajoso vira o anúncio embaixo da lista; o específico só
 * vira selo no card se descontar MAIS que o geral naquele ingresso.
 */
import { formatBRLFromCents } from "./money";
import { parseAppliesToIds, type QuantityAutoCoupon } from "./quantityCoupon";
import { ptBR } from "@/i18n/messages/pt-BR";
import { createTranslator, type Translator } from "@/i18n/translate";

/** Default pt-BR (testes / chamadas sem idioma); o step passa o `t` do idioma ativo. */
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

/** Ingresso à venda, com o preço em REAIS (base da comparação entre cupons). */
export interface AutoCouponTicket {
  id: string;
  price: number;
  ageLimit?: { min?: number; max?: number };
}

export interface AutoCouponOffer {
  id: string;
  /** Desconto já formatado: "20%" / "R$ 20,00". */
  discount: string;
  /** Como ativar (tooltip do "Saiba mais"). Ex.: "Ganhe 20% de desconto por ingresso ao comprar 3 ou mais!". */
  howTo: string;
}

export interface AutoCouponDisplay {
  /** Anúncio embaixo da lista: cupom que cobre todos os ingressos à venda. */
  general: AutoCouponOffer | null;
  /** Selo do card, por ingresso. */
  byTicket: Record<string, AutoCouponOffer>;
}

type Candidate = AutoCouponOffer & {
  type: "PERCENTAGE" | "FIXED";
  value: number;
  covers: (ticket: AutoCouponTicket) => boolean;
};

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

/** Quanto o cupom desconta de 1 ingresso, em reais (nunca mais que o preço). */
function savings(c: Candidate, price: number): number {
  return c.type === "PERCENTAGE" ? (price * c.value) / 100 : Math.min(price, c.value / 100);
}

/** Maior pontuação positiva; no empate fica o 1º (a API manda do mais antigo, regra do backend). */
function pickBest(candidates: Candidate[], score: (c: Candidate) => number): Candidate | null {
  let best: Candidate | null = null;
  let bestScore = 0;
  for (const c of candidates) {
    const s = score(c);
    if (s > bestScore) {
      best = c;
      bestScore = s;
    }
  }
  return best;
}

function toOffer({ id, discount, howTo }: Candidate): AutoCouponOffer {
  return { id, discount, howTo };
}

export function autoCouponDisplay(
  tickets: AutoCouponTicket[],
  quantityCoupons: QuantityAutoCoupon[] | null | undefined,
  ageCoupons: AgeDisplayCoupon[] | null | undefined,
  t: Translator<"checkout"> = ptT,
): AutoCouponDisplay {
  const candidates: Candidate[] = [];
  for (const c of quantityCoupons ?? []) {
    if (c.value <= 0) continue;
    const discount = discountLabel(c);
    candidates.push({
      id: c.id,
      type: c.type,
      value: c.value,
      discount,
      howTo: quantityFullText(c, discount, t),
      covers: (ticket) => coversTicket(c.appliesTo, ticket.id),
    });
  }
  for (const c of ageCoupons ?? []) {
    const discount = discountLabel(c);
    const howTo = ageFullText(c, discount, t);
    if (c.value <= 0 || !howTo) continue;
    candidates.push({
      id: c.id,
      type: c.type,
      value: c.value,
      discount,
      howTo,
      covers: (ticket) => coversTicket(c.appliesTo, ticket.id) && ageRangeFitsTicket(c, ticket.ageLimit),
    });
  }

  const isGeneral = (c: Candidate) => tickets.length > 0 && tickets.every(c.covers);
  const general = pickBest(candidates.filter(isGeneral), (c) =>
    tickets.reduce((sum, ticket) => sum + savings(c, ticket.price), 0),
  );

  const specific = candidates.filter((c) => !isGeneral(c));
  const byTicket: Record<string, AutoCouponOffer> = {};
  for (const ticket of tickets) {
    const best = pickBest(specific.filter((c) => c.covers(ticket)), (c) => savings(c, ticket.price));
    if (best && (!general || savings(best, ticket.price) > savings(general, ticket.price))) {
      byTicket[ticket.id] = toOffer(best);
    }
  }
  return { general: general && toOffer(general), byTicket };
}
