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
 * Todos os cupons são REVELADOS pré-pagamento: AGE desde 2026-05-26 e QUANTITY
 * desde 2026-09-30 (aparece já no /ingressos quando a seleção cai na faixa, então
 * esconder nas etapas seguintes faria o desconto sumir e voltar no pagamento).
 */

type OrderCoupon = NonNullable<OrderResponse["coupon"]>;

export function isAutoCoupon(coupon: OrderCoupon | null | undefined): boolean {
  if (!coupon) return false;
  return coupon.couponType === "QUANTITY" || coupon.couponType === "AGE";
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
 * Total da order em centavos pra exibição pré-pagamento: o `pricing.total`, que
 * já reflete o desconto de qualquer cupom (exibido em linha no resumo).
 */
export function orderTotalForPrePaymentCents(
  pricing: OrderResponse["pricing"] | undefined,
  _coupon: OrderCoupon | null | undefined,
): number | null {
  return pricing ? pricing.total : null;
}
