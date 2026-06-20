import type { OrderResponse } from "@/interfaces/order";

/**
 * Normaliza a resposta do backend para o shape esperado pelo frontend.
 * O backend retorna `id` (não `orderId`) e usa `reservedTickets`/campos de
 * pricing separados em vez do objeto `pricing` aninhado.
 *
 * Extraído de `useCheckoutReservation.ts` (refactor/testes Bloco 5, 2026-06-18)
 * para virar lógica pura testável — comportamento idêntico ao anterior.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toOrderResponse(data: any): OrderResponse {
  // Voucher e cupom são mutuamente exclusivos. Quando a order tem voucher (e não
  // cupom), o `discount` da raiz é o desconto do VOUCHER — sem isso ele cairia em
  // `couponDiscount` e a linha do voucher não apareceria no resumo (o backend
  // deste shape não manda `appliedDiscount` nem `pricing.voucherDiscount`).
  const rawDiscount = data.discount ?? 0;
  const isVoucherOrder = !!data.voucher && !data.coupon;
  return {
    orderId: data.orderId ?? data.id,
    status: data.status,
    eventId: data.eventId,
    reservedAt: data.reservedAt ?? "",
    expiresAt: data.expiresAt ?? "",
    serverTime: data.serverTime ?? new Date().toISOString(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tickets: (data.tickets ?? data.reservedTickets ?? []).map((t: any) => ({
      id: t.id,
      ticketId: t.ticketId,
      batchId: t.batchId,
      batchName: t.ticketName ?? t.batchName,
      quantity: t.quantity,
      unitPrice: t.unitPrice ?? 0,
      unitDiscount: t.unitDiscount ?? 0,
      totalDiscount: t.totalDiscount ?? 0,
      finalUnitPrice: t.finalUnitPrice ?? t.unitPrice ?? 0,
      finalTotalPrice: t.finalTotalPrice ?? 0,
      couponApplied: t.couponApplied ?? false,
    })),
    pricing: {
      subtotal: data.pricing?.subtotal ?? data.totalAmount ?? 0,
      // Subtotais por categoria (server-driven). `undefined` se o backend não os
      // expõe — o front usa o `subtotal` agregado nesse caso.
      ticketsSubtotal: data.pricing?.ticketsSubtotal,
      productsSubtotal: data.pricing?.productsSubtotal,
      serviceFee: data.pricing?.serviceFee ?? data.serviceFee ?? 0,
      couponDiscount:
        data.pricing?.couponDiscount ??
        (isVoucherOrder
          ? 0
          : data.appliedDiscount?.type === "coupon"
            ? data.appliedDiscount.discount
            : rawDiscount),
      voucherDiscount:
        data.pricing?.voucherDiscount ??
        (isVoucherOrder
          ? rawDiscount
          : data.appliedDiscount?.type === "voucher"
            ? data.appliedDiscount.discount
            : 0),
      // Sempre usa finalAmount da raiz — pricing.total pode ser o bruto sem desconto
      total: data.finalAmount ?? data.pricing?.total ?? data.totalAmount ?? 0,
      currency: "BRL" as const,
    },
    coupon: data.coupon ?? null,
    voucher: data.voucher ?? null,
    payment: data.payment,
    registrations: data.registrations,
    cancelledAt: data.cancelledAt,
    cancelledReason: data.cancelledReason,
    couponAutoRemoved: data.couponAutoRemoved ?? false,
    couponRejected: data.couponRejected ?? null,
  };
}
