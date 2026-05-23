import type { OrderCoupon } from "@/interfaces/order";

/**
 * Label inline do cupom aplicado pra uso em linhas de resumo (mesmo padrão do
 * `OrderSummary` desktop). Sem dois-pontos final — quem chama compõe.
 *
 * Exemplos:
 * - `Cupom PODIO500 (12% OFF)`
 * - `Cupom automático (10% OFF)`
 * - `Cupom PODIO500`
 */
export function formatCouponLineLabel(coupon: OrderCoupon): string {
  const isAutomatic =
    coupon.couponType === "QUANTITY" || coupon.couponType === "AGE";
  const base = isAutomatic
    ? "Cupom automático"
    : coupon.code
      ? `Cupom ${coupon.code}`
      : "Cupom aplicado";
  if (coupon.type === "PERCENTAGE" && coupon.value > 0) {
    return `${base} (${coupon.value}% OFF)`;
  }
  return base;
}

/**
 * Cálculo client-side do desconto efetivo de um cupom sobre tickets e produtos.
 *
 * O backend é a fonte da verdade do desconto final no `pricing.couponDiscount` —
 * essa função existe pra exibir a quebra (tickets vs produtos) e simular o total
 * em telas anteriores ao pagamento onde o `patchProducts` ainda não rodou.
 *
 * Regras (espelham o backend):
 * - `type: "PERCENTAGE"`: aplica `value%` sobre a base. Base = tickets (sempre) +
 *   produtos quando `applyToProducts` é true.
 * - `type: "FIXED"`: subtrai `value` (em reais) da base, sem partir em dois;
 *   prioriza tickets e só "transborda" pra produtos quando o subtotal de tickets
 *   é menor que o valor fixo E `applyToProducts` é true.
 *
 * Todos os valores em REAIS (não centavos).
 */
export interface CouponDiscountBreakdown {
  /** Desconto incidente sobre o subtotal dos ingressos. */
  ticketDiscount: number;
  /** Desconto incidente sobre o subtotal dos produtos. */
  productDiscount: number;
  /** Soma de `ticketDiscount + productDiscount`. */
  totalDiscount: number;
  /** True quando o cupom incide também sobre produtos. */
  appliesToProducts: boolean;
}

export function computeCouponDiscount(
  coupon: OrderCoupon | null | undefined,
  ticketsSubtotal: number,
  productsSubtotal: number,
): CouponDiscountBreakdown {
  const appliesToProducts = !!coupon?.applyToProducts;
  const empty: CouponDiscountBreakdown = {
    ticketDiscount: 0,
    productDiscount: 0,
    totalDiscount: 0,
    appliesToProducts,
  };

  if (!coupon) return empty;
  const value = Number(coupon.value) || 0;
  if (value <= 0) return empty;

  const safeTickets = Math.max(0, ticketsSubtotal);
  const safeProducts = Math.max(0, productsSubtotal);

  if (coupon.type === "PERCENTAGE") {
    const pct = value / 100;
    const ticketDiscount = round2(safeTickets * pct);
    const productDiscount = appliesToProducts ? round2(safeProducts * pct) : 0;
    return {
      ticketDiscount,
      productDiscount,
      totalDiscount: round2(ticketDiscount + productDiscount),
      appliesToProducts,
    };
  }

  // FIXED — consome tickets primeiro, transborda pra produtos só se o cupom
  // permitir. Evita produzir desconto > base (clamp).
  const ticketDiscount = Math.min(value, safeTickets);
  const remaining = value - ticketDiscount;
  const productDiscount = appliesToProducts ? Math.min(remaining, safeProducts) : 0;
  return {
    ticketDiscount: round2(ticketDiscount),
    productDiscount: round2(productDiscount),
    totalDiscount: round2(ticketDiscount + productDiscount),
    appliesToProducts,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
