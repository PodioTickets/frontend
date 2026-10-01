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
): Array<{ coupon: QuantityAutoCoupon; discount: number }> {
  const out: Array<{ coupon: QuantityAutoCoupon; discount: number }> = [];
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
    out.push({ coupon, discount: Math.min(discountCents, subtotalCents) / 100 });
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
