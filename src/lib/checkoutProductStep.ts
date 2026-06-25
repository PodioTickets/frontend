import type { Ticket } from "@/hooks/useTickets";
import type { Product } from "@/components/Checkout/SubscriptionStep.utils";

/**
 * Slot participante↔ingresso do checkout.
 *
 * A ORDEM é canônica e idêntica à usada por `InformationStep`
 * (`participantsWithRaces`) e `SubscriptionStep` (`participantsWithTickets`):
 * categorias na ordem retornada, tickets na ordem da categoria, cada ticket
 * repetido pela quantidade selecionada e, por fim, os avulsos. Manter essa ordem
 * é o que garante que o participante de índice N corresponda SEMPRE ao mesmo
 * ingresso em todas as etapas — daí a extração para um único helper.
 */
export interface ParticipantTicketSlot {
  ticketId: string;
  ticket: Ticket;
  participantIndex: number;
}

export function buildParticipantTicketSlots(
  categorizedTickets: Array<{ tickets: Ticket[] }>,
  uncategorizedTickets: Ticket[],
  raceQuantities: Record<string, number>,
): ParticipantTicketSlot[] {
  const slots: ParticipantTicketSlot[] = [];
  let participantIndex = 0;

  categorizedTickets.forEach((category) => {
    category.tickets.forEach((ticket) => {
      const quantity = raceQuantities[ticket.id] || 0;
      for (let i = 0; i < quantity; i++) {
        slots.push({ ticketId: ticket.id, ticket, participantIndex: participantIndex++ });
      }
    });
  });

  uncategorizedTickets.forEach((ticket) => {
    const quantity = raceQuantities[ticket.id] || 0;
    for (let i = 0; i < quantity; i++) {
      slots.push({ ticketId: ticket.id, ticket, participantIndex: participantIndex++ });
    }
  });

  return slots;
}

/**
 * Um produto representa uma ESCOLHA real do usuário quando tem mais de uma
 * variação (qual selecionar — ou recusar, via "sem interesse"). Produtos de
 * variação única são auto-resolvidos (incluído/auto-selecionado) e, portanto,
 * não justificam exibir a etapa de Produtos.
 */
export function productOffersChoice(product: Product): boolean {
  return (product.variations?.length ?? 0) > 1;
}

/**
 * Variação a ser auto-selecionada para um produto, espelhando EXATAMENTE o efeito
 * de auto-seleção do `SubscriptionStep`: o produto exige variação
 * (`isRequired || !isIncludedInTicket`) e tem variação única. Retorna `null`
 * quando não há auto-seleção. O fallback de id (`${id}-0`) também espelha o
 * componente (variação sem id explícito).
 */
export function autoSelectedVariationId(product: Product): string | null {
  const needsVariationChoice = product.isRequired || !product.isIncludedInTicket;
  if (!needsVariationChoice) return null;
  if ((product.variations?.length ?? 0) !== 1) return null;
  const variation = product.variations[0];
  return variation.id || `${product.id}-0`;
}

export interface AutoSelectedProduct {
  productId: string;
  variationId: string;
  quantity: number;
  participantEmail: string;
  /** Slot (participante↔ingresso) — ver `ProductPatchItem.participantIndex`. */
  participantIndex: number;
}

/**
 * Monta o payload de `patchProducts` para o caso "sem escolha do usuário": para
 * cada slot (participante↔ingresso), inclui as variações auto-selecionadas dos
 * produtos vinculados ao ingresso. Espelha o que o `SubscriptionStep` enviaria
 * após auto-selecionar — assim, pular a etapa NÃO perde produtos
 * inclusos/obrigatórios de variação única.
 */
export function buildAutoSelectedProductsPayload(
  slots: ParticipantTicketSlot[],
  participants: Array<{ email: string }>,
  getProductsForTicket: (ticketId: string) => Product[],
): AutoSelectedProduct[] {
  const payload: AutoSelectedProduct[] = [];

  for (const slot of slots) {
    const participantEmail = participants[slot.participantIndex]?.email;
    if (!participantEmail) continue;

    for (const product of getProductsForTicket(slot.ticketId)) {
      const variationId = autoSelectedVariationId(product);
      if (!variationId) continue;
      payload.push({
        productId: product.id,
        variationId,
        quantity: 1,
        participantEmail,
        participantIndex: slot.participantIndex,
      });
    }
  }

  return payload;
}
