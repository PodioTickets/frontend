import type { OrderCoupon } from "@/interfaces/order";

/**
 * Resultado normalizado do preview de `/coupons/.../preview`. O endpoint
 * discrimina por `kind`: cupom tradicional (percentual/fixo) ou voucher
 * (sempre 100% sobre uma lista de ingressos).
 */
export type CouponPreviewResult =
  | {
      kind: "coupon";
      code: string;
      value: number;
      type: "PERCENTAGE" | "FIXED";
      couponType?: string;
      applyToProducts?: boolean;
    }
  | {
      kind: "voucher";
      code: string;
      /** IDs dos ingressos que o voucher zera (100% OFF). */
      appliesTo: string[];
    };

/** Label inline do voucher pra linhas de resumo (paralelo a `formatCouponLineLabel`). */
export function formatVoucherLineLabel(code: string | null | undefined): string {
  return code ? `Voucher ${code}` : "Voucher aplicado";
}

/**
 * Desconto de um voucher (100% OFF) sobre os ingressos selecionados que ele
 * cobre. Soma `preço × quantidade` de cada ticket cujo `id` está em `appliesTo`.
 * Valores em REAIS.
 */
export function computeVoucherTicketsDiscount(
  appliesTo: string[] | null | undefined,
  selected: Array<{ id: string; price: number; quantity: number }>,
): number {
  if (!appliesTo?.length) return 0;
  const set = new Set(appliesTo);
  return selected.reduce(
    (acc, t) => acc + (set.has(t.id) ? Math.max(0, t.price) * Math.max(0, t.quantity) : 0),
    0,
  );
}

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

/**
 * Converte o shape do preview de cupom (`/coupons/.../preview`, usado em
 * `/checkout/ingressos` antes da reserva) para `OrderCoupon`, reaproveitando
 * `computeCouponDiscount` / `computeTicketPricingWithCoupon`. `null` quando não
 * há preview. Mantém a mesma convenção de unidade do backend (`value` cru).
 */
export function couponPreviewToOrderCoupon(
  preview:
    | {
        code?: string;
        value: number;
        type: "PERCENTAGE" | "FIXED";
        couponType?: string;
        applyToProducts?: boolean;
      }
    | null
    | undefined,
  fallbackCode?: string | null,
): OrderCoupon | null {
  if (!preview) return null;
  return {
    id: "preview",
    code: preview.code ?? fallbackCode ?? null,
    couponType: (preview.couponType as OrderCoupon["couponType"]) || "DISCOUNT",
    type: preview.type,
    value: preview.value,
    applyToProducts: preview.applyToProducts,
  };
}

export interface TicketPricingWithCoupon {
  /** Desconto efetivo do cupom sobre os ingressos (0 quando não aplicável). */
  couponDiscount: number;
  /** Subtotal de ingressos já descontado pelo cupom (clamp em 0). */
  subtotalAfterCoupon: number;
  /** Taxa de serviço incidente sobre o subtotal JÁ DESCONTADO. */
  serviceFee: number;
  /** Total final = subtotal descontado + taxa. */
  total: number;
  /** True quando há cupom DISCOUNT manual a exibir (auto QUANTITY/AGE → false). */
  showCouponDiscount: boolean;
}

/**
 * Pricing client-side de ingressos com cupom, espelhando a regra do backend e
 * do `SubscriptionStep` (`/produtos`): a **taxa de serviço incide sobre o
 * subtotal JÁ DESCONTADO** pelo cupom. Sem produtos nesta etapa — a base é só
 * ingressos.
 *
 * Escopo: só cupom DISCOUNT manual. Cupons automáticos (QUANTITY/AGE) são
 * ignorados aqui (desconto deles só é revelado no pagamento), então a taxa
 * recai sobre o subtotal cheio — comportamento idêntico ao atual.
 *
 * `feePercent` em pontos percentuais (ex.: `10` = 10%). Valores em REAIS.
 * Sem arredondamento intermediário (igual ao `SubscriptionStep`): o display
 * arredonda via `Intl.NumberFormat`.
 */
export function computeTicketPricingWithCoupon(
  coupon: OrderCoupon | null | undefined,
  ticketsSubtotal: number,
  feePercent: number,
): TicketPricingWithCoupon {
  const isAuto =
    coupon?.couponType === "QUANTITY" || coupon?.couponType === "AGE";
  const showCouponDiscount = !!coupon && !isAuto;
  const couponDiscount = showCouponDiscount
    ? computeCouponDiscount(coupon, ticketsSubtotal, 0).totalDiscount
    : 0;
  return computeTicketPricingWithDiscount(couponDiscount, ticketsSubtotal, feePercent);
}

/**
 * Mesma regra de `computeTicketPricingWithCoupon`, mas a partir de um desconto
 * de ingressos JÁ calculado (em REAIS). Usado pelo voucher (100% OFF sobre os
 * ingressos cobertos), onde o desconto é por-ticket e não cabe no modelo
 * percentual/fixo do `OrderCoupon`. A taxa de serviço incide sobre o subtotal
 * já descontado, idêntico ao fluxo de cupom.
 */
export function computeTicketPricingWithDiscount(
  ticketDiscount: number,
  ticketsSubtotal: number,
  feePercent: number,
): TicketPricingWithCoupon {
  const couponDiscount = Math.max(0, ticketDiscount);
  const subtotalAfterCoupon = Math.max(0, ticketsSubtotal - couponDiscount);
  const serviceFee = subtotalAfterCoupon * ((feePercent || 0) / 100);
  return {
    couponDiscount,
    subtotalAfterCoupon,
    serviceFee,
    total: subtotalAfterCoupon + serviceFee,
    showCouponDiscount: couponDiscount > 0,
  };
}
