/**
 * Cupom AUTOMÁTICO por quantidade (QUANTITY) no `/checkout/ingressos`.
 *
 * As regras vêm do backend junto da elegibilidade de idade (`quantityCoupons`), já
 * sem os esgotados e em `createdAt` asc. Aqui só espelhamos o backend pra mostrar o
 * desconto ANTES da reserva — o valor cobrado continua vindo do servidor.
 */
import type { CouponPreviewResult } from "./orderCouponDiscount";

export interface QuantityAutoCoupon {
  id: string;
  type: "PERCENTAGE" | "FIXED";
  /** % inteiro (PERCENTAGE) ou CENTAVOS por ingresso (FIXED). */
  value: number;
  /** "all"/null = todos; senão JSON array de ticketIds. */
  appliesTo: string | null;
  minCartValue: number | null;
  minQuantity: number | null;
  maxQuantity: number | null;
  /** ISO — desempate "1º criado" com o cupom de idade. */
  createdAt: string | null;
  /** "Acumular descontos": vale junto de cupom de código. Sem ela o manual tira este cupom. */
  allowStacking: boolean;
}

/**
 * Com cupom de código (link ou pedido), só os automáticos que acumulam OU que não dividem
 * ingresso com ele (2026-11-10) — espelha o `stacksWithManualCoupon` do back.
 * `manual` = escopo do cupom de código (`appliesTo` normalizado: null = todos); null = sem cupom.
 */
export function stackableQuantityCoupons(
  coupons: QuantityAutoCoupon[] | null | undefined,
  manual: { appliesTo: string[] | null } | null,
): QuantityAutoCoupon[] | undefined {
  if (!manual) return coupons ?? undefined;
  return coupons?.filter((c) => c.allowStacking || !sharesTicket(parseAppliesToIds(c.appliesTo), manual.appliesTo));
}

/** null = todos os ingressos. */
function sharesTicket(a: string[] | null, b: string[] | null): boolean {
  if (!a?.length || !b?.length) return true;
  return a.some((id) => b.includes(id));
}

/**
 * Parte do desconto dos automáticos que cai nos ingressos do cupom manual (`manualAppliesTo`,
 * null = todos), em REAIS — base do rebase do manual: automático em OUTRO ingresso não reduz o manual.
 * Mesma conta do `quantityCouponCandidates`, só sobre os ingressos em comum.
 */
export function autoDiscountOnTickets(
  selectedCoupons: QuantityCouponCandidate[],
  selected: Array<{ id: string; price: number; quantity: number }>,
  manualAppliesTo: string[] | null,
): number {
  let cents = 0;
  for (const { coupon, discount, coveredTicketIds } of selectedCoupons) {
    const overlap = selected.filter(
      (t) => t.quantity > 0 && coveredTicketIds.includes(t.id) && (!manualAppliesTo || manualAppliesTo.includes(t.id)),
    );
    if (overlap.length === coveredTicketIds.length) {
      cents += Math.round(discount * 100);
      continue;
    }
    const subtotal = overlap.reduce((s, t) => s + Math.round(Math.max(0, t.price) * 100) * t.quantity, 0);
    const units = overlap.reduce((s, t) => s + t.quantity, 0);
    const part = coupon.type === "PERCENTAGE" ? Math.floor(subtotal * (coupon.value / 100)) : units * coupon.value;
    cents += Math.min(part, subtotal);
  }
  return cents / 100;
}

/** Cupom que casou com a seleção. `coveredTicketIds` = ingressos selecionados que ele cobre. */
export interface QuantityCouponCandidate {
  coupon: QuantityAutoCoupon;
  discount: number;
  coveredTicketIds: string[];
}

export function parseAppliesToIds(appliesTo: string | null | undefined): string[] | null {
  if (!appliesTo || appliesTo === "all") return null;
  try {
    const parsed = JSON.parse(appliesTo);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : null;
  } catch {
    return null;
  }
}

/**
 * TODOS os cupons QUANTITY que casam com a seleção, com o desconto de cada um (em REAIS),
 * na ordem recebida. Espelha o backend (`evaluateAutoCouponCandidate`):
 *  - faixa [min, max] conta só as unidades dos ingressos do `appliesTo` (fora dela não aplica);
 *  - `minCartValue` compara com o subtotal do carrinho;
 *  - PERCENTAGE sobre o subtotal coberto; FIXED = valor × unidades cobertas, capado no subtotal.
 * `selected.price` e `cartSubtotal` em REAIS.
 */
export function quantityCouponCandidates(
  coupons: QuantityAutoCoupon[] | null | undefined,
  selected: Array<{ id: string; price: number; quantity: number }>,
  cartSubtotal: number,
): QuantityCouponCandidate[] {
  const out: QuantityCouponCandidate[] = [];
  for (const coupon of coupons ?? []) {
    if (coupon.value <= 0) continue;
    const allowed = parseAppliesToIds(coupon.appliesTo);
    const covered = allowed ? selected.filter((t) => allowed.includes(t.id)) : selected;
    const qty = covered.reduce((s, t) => s + Math.max(0, t.quantity), 0);
    if (qty <= 0) continue;
    if (coupon.minQuantity != null && qty < coupon.minQuantity) continue;
    if (coupon.maxQuantity != null && qty > coupon.maxQuantity) continue;
    if (coupon.minCartValue != null && cartSubtotal < coupon.minCartValue / 100) continue;

    // Em centavos, como o backend (floor no percentual).
    const subtotalCents = covered.reduce(
      (s, t) => s + Math.round(Math.max(0, t.price) * 100) * Math.max(0, t.quantity),
      0,
    );
    const discountCents =
      coupon.type === "PERCENTAGE"
        ? Math.floor(subtotalCents * (coupon.value / 100))
        : qty * coupon.value;
    out.push({
      coupon,
      discount: Math.min(discountCents, subtotalCents) / 100,
      coveredTicketIds: covered.filter((t) => t.quantity > 0).map((t) => t.id),
    });
  }
  return out;
}

/**
 * Escolha entre cupons automáticos elegíveis — MESMA regra do backend
 * (`rankAutoCouponCandidates`): o que MAIS desconta; empate → o já aplicado no pedido
 * (`currentCouponId`); persistindo, o 1º criado (`createdAt` asc).
 */
export function pickBestAutoCoupon<T extends { id: string; discount: number; createdAt?: string | null }>(
  candidates: T[],
  currentCouponId?: string | null,
): T | null {
  let best: T | null = null;
  for (const c of candidates) {
    if (c.discount <= 0) continue;
    if (!best) { best = c; continue; }
    if (c.discount !== best.discount) {
      if (c.discount > best.discount) best = c;
      continue;
    }
    const cCur = c.id === currentCouponId;
    const bestCur = best.id === currentCouponId;
    if (cCur !== bestCur) {
      if (cCur) best = c;
      continue;
    }
    if ((c.createdAt ?? "") < (best.createdAt ?? "")) best = c;
  }
  return best;
}

/**
 * Cupons que valem JUNTOS — mesma regra do backend (`selectAutoCoupons`): só competem os que
 * cobrem o mesmo ingresso. O melhor fica com os ingressos dele e o resto segue disputando
 * os demais.
 */
export function selectQuantityCoupons(
  candidates: QuantityCouponCandidate[],
  currentCouponId?: string | null,
): QuantityCouponCandidate[] {
  const selected: QuantityCouponCandidate[] = [];
  let rest = candidates;
  for (;;) {
    const best = pickBestAutoCoupon(
      rest.map((c) => ({ id: c.coupon.id, discount: c.discount, createdAt: c.coupon.createdAt, candidate: c })),
      currentCouponId,
    );
    if (!best) return selected;
    selected.push(best.candidate);
    const taken = new Set(best.candidate.coveredTicketIds);
    rest = rest.filter((c) => !c.coveredTicketIds.some((id) => taken.has(id)));
  }
}

/** Total e cupons da prévia; `coupon` = o principal (rótulo quando há um só). */
export function combineQuantityCoupons(selected: QuantityCouponCandidate[]) {
  if (selected.length === 0) return null;
  return {
    coupon: selected[0].coupon,
    discount: selected.reduce((s, c) => s + c.discount, 0),
    coupons: selected,
  };
}

/** Cupom que risca o preço do card: o que cobre aquele ingresso. */
export function quantityCouponForTicket(
  selected: QuantityCouponCandidate[],
  ticketId: string,
): QuantityAutoCoupon | null {
  const match = selected.find(({ coupon }) => {
    const allowed = parseAppliesToIds(coupon.appliesTo);
    return !allowed || allowed.includes(ticketId);
  });
  return match?.coupon ?? null;
}

/**
 * Preview pros cards (strike-through do preço) do cupom de quantidade ESCOLHIDO — só
 * nos ingressos do `appliesTo`. FIXED é por ingresso, igual ao desconto do resumo.
 */
export function quantityCouponCardPreview(coupon: QuantityAutoCoupon): CouponPreviewResult {
  return {
    kind: "coupon",
    code: "",
    value: coupon.value,
    type: coupon.type,
    couponType: "QUANTITY",
    appliesTo: parseAppliesToIds(coupon.appliesTo),
  };
}
