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
 * Para cupons AUTOMÁTICOS, o resumo pré-pagamento esconde o desconto inteiro
 * (linha + reflexo no total) — o usuário só vê na PaymentStep. Para cupons
 * MANUAIS, o desconto aparece como linha e reflete no total imediatamente.
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
 * Total da order em centavos pra exibição pré-pagamento. Para cupom automático
 * (QUANTITY/AGE), adiciona de volta o desconto pra esconder ele do total. Pra
 * cupom manual (DISCOUNT) usa o `pricing.total` que já reflete o desconto —
 * exibido em linha separada no resumo.
 */
export function orderTotalForPrePaymentCents(
  pricing: OrderResponse["pricing"] | undefined,
  coupon: OrderCoupon | null | undefined,
): number | null {
  if (!pricing) return null;
  if (isAutoCoupon(coupon)) {
    return pricing.total + (pricing.couponDiscount ?? 0);
  }
  return pricing.total;
}
