import type { OrderResponse } from "@/interfaces/order";

/**
 * Helpers para exibir valores da order ANTES da etapa de pagamento sem
 * interferência de cupons automáticos (`QUANTITY` / `AGE`). Cupons automáticos
 * são aplicados pelo backend já no `reserveOrder`, então os campos
 * `finalUnitPrice` e `pricing.total` já vêm descontados — o usuário veria
 * preços de ingressos cheios sem entender o motivo do desconto até chegar no
 * resumo da `PaymentStep`.
 *
 * `DISCOUNT` (cupom manual digitado pelo usuário) NÃO é considerado automático
 * — esse só aparece quando o próprio usuário aplicou, então faz sentido refletir
 * no total imediatamente.
 */

type OrderCoupon = NonNullable<OrderResponse["coupon"]>;

export function isAutoCoupon(coupon: OrderCoupon | null | undefined): boolean {
  if (!coupon) return false;
  return coupon.couponType === "QUANTITY" || coupon.couponType === "AGE";
}

/**
 * Preço unitário em centavos pra exibição pré-pagamento. Quando há cupom
 * automático aplicado, retorna `unitPrice` (cheio) em vez de `finalUnitPrice`
 * (descontado).
 */
export function ticketUnitPriceForPrePaymentCents(
  ticket: { unitPrice?: number; finalUnitPrice?: number },
  coupon: OrderCoupon | null | undefined,
): number {
  if (isAutoCoupon(coupon)) {
    return ticket.unitPrice ?? 0;
  }
  return ticket.finalUnitPrice ?? ticket.unitPrice ?? 0;
}

/**
 * Total da order em centavos pra exibição pré-pagamento. Adiciona de volta o
 * desconto do cupom automático ao `total` (que já vem descontado do backend).
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
