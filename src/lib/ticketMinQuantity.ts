/**
 * Quantidade mínima/máxima por pedido de um ingresso (`Ticket.min/maxPurchaseQuantity`).
 *
 * Mínimo (`minPurchaseQuantity`):
 * Quem leva o ingresso leva ao menos N; não é obrigatório levá-lo. Então a
 * quantidade só vale 0 ou ≥ N — o backend recusa 1..N−1 na reserva.
 */

function effectiveMin(min: number | null | undefined): number {
  return min && min > 1 ? min : 1;
}

/** Próxima quantidade ao clicar em + (`delta` 1) ou − (`delta` −1): pula de 0 a N e volta de N a 0. */
export function stepTicketQuantity(
  current: number,
  delta: 1 | -1,
  min: number | null | undefined,
): number {
  const m = effectiveMin(min);
  if (delta === 1) return current <= 0 ? m : current + 1;
  const next = current - 1;
  return next < m ? 0 : next;
}

/** Removendo UM participante desse ingresso, a quantidade restante fica fora do mínimo? */
export function removalBreaksMinQuantity(
  current: number,
  min: number | null | undefined,
): boolean {
  const remaining = current - 1;
  return remaining > 0 && remaining < effectiveMin(min);
}

/**
 * Teto do "+" de um ingresso: o menor entre as vagas do lote e o máximo por pedido
 * (`Ticket.maxPurchaseQuantity`; null/0 = sem máximo). O backend recusa acima disso.
 */
export function ticketQuantityCap(
  availableQuantity: number | null | undefined,
  maxPurchaseQuantity: number | null | undefined,
): number {
  const available = availableQuantity ?? Infinity;
  const max = maxPurchaseQuantity && maxPurchaseQuantity > 0 ? maxPurchaseQuantity : Infinity;
  return Math.min(available, max);
}
