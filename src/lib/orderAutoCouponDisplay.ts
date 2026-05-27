import type { OrderResponse } from "@/interfaces/order";

/**
 * Helpers para exibir valores da order ANTES da etapa de pagamento.
 *
 * Convenção: o preço unitário do ingresso é exibido SEMPRE em valor cheio
 * (`unitPrice`). Cupons — automáticos (`QUANTITY`/`AGE`) ou manuais (`DISCOUNT`,
 * incluindo o vindo de link `?coupon=`) — aparecem como linha de desconto
 * separada no resumo, nunca embutidos no preço do ingresso. Isso evita duplicar
 * visualmente o desconto (preço descontado + linha "-R$ X").
 *
 * Cupom AGE (idade) é REVELADO pré-pagamento — desde 2026-05-26 ele aparece como
 * linha de desconto e reflete no total já a partir do /informações (a order já o
 * tem aplicado). Só o cupom QUANTITY continua escondido pré-pagamento (condição
 * depende do carrinho final) — esse o usuário só vê na PaymentStep. Cupom MANUAL
 * (DISCOUNT) sempre aparece imediatamente.
 */

type OrderCoupon = NonNullable<OrderResponse["coupon"]>;

export function isAutoCoupon(coupon: OrderCoupon | null | undefined): boolean {
  if (!coupon) return false;
  return coupon.couponType === "QUANTITY" || coupon.couponType === "AGE";
}

/**
 * Cupom que CONTINUA escondido pré-pagamento (só QUANTITY). O AGE é revelado —
 * a condição de idade é conhecida desde o início, então mostramos como aplicado.
 */
export function isHiddenPrePaymentCoupon(
  coupon: OrderCoupon | null | undefined,
): boolean {
  return coupon?.couponType === "QUANTITY";
}

/**
 * Preço unitário em centavos pra exibição pré-pagamento. Retorna sempre o
 * `unitPrice` cheio — o desconto (quando existir) aparece em linha separada
 * no resumo, evitando duplicação visual.
 */
export function ticketUnitPriceForPrePaymentCents(
  ticket: { unitPrice?: number; finalUnitPrice?: number },
  _coupon: OrderCoupon | null | undefined,
): number {
  return ticket.unitPrice ?? ticket.finalUnitPrice ?? 0;
}

/**
 * Total da order em centavos pra exibição pré-pagamento. Só pro cupom QUANTITY
 * adiciona de volta o desconto (mantém escondido do total). Pra DISCOUNT e AGE
 * usa o `pricing.total` que já reflete o desconto — exibido em linha no resumo.
 */
export function orderTotalForPrePaymentCents(
  pricing: OrderResponse["pricing"] | undefined,
  coupon: OrderCoupon | null | undefined,
): number | null {
  if (!pricing) return null;
  if (isHiddenPrePaymentCoupon(coupon)) {
    return pricing.total + (pricing.couponDiscount ?? 0);
  }
  return pricing.total;
}
