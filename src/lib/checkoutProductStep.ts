import type { Ticket } from "@/hooks/useTickets";
import type { Product } from "@/components/Checkout/SubscriptionStep.utils";
import {
  autoSelectedVariationIds,
  getVariationGroups,
  isSelectionComplete,
} from "@/lib/productVariationGroups";

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
 * Um produto representa uma ESCOLHA real do usuário quando alguma variação tem
 * mais de uma opção, ou quando há o opt-out "Sem interesse" (recusar o kit).
 * Variações de opção única são auto-resolvidas e, portanto, não justificam
 * exibir a etapa de Produtos. Regra em `productVariationGroups`.
 */
export { productOffersChoice } from "@/lib/productVariationGroups";

/**
 * Opções auto-selecionadas para um produto (uma por variação de opção única),
 * espelhando EXATAMENTE o efeito de auto-seleção do `SubscriptionStep`: o
 * produto exige variação (`isRequired || !isIncludedInTicket`). Lista vazia =
 * nada a auto-selecionar. O fallback de id (`${id}-<índice>`) espelha o
 * componente (variação sem id explícito).
 */
export { autoSelectedVariationIds } from "@/lib/productVariationGroups";

export interface AutoSelectedProduct {
  productId: string;
  /** Todas as opções (uma por variação, na ordem dos grupos). */
  variationIds: string[];
  /** Legado = `variationIds[0]`. */
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
      const variationIds = autoSelectedVariationIds(product);
      // Só entra produto resolvido por inteiro (uma opção por variação) — o
      // backend rejeita kit com variação faltando.
      if (variationIds.length === 0 || !isSelectionComplete(product, variationIds)) continue;
      payload.push({
        productId: product.id,
        variationIds,
        variationId: variationIds[0],
        quantity: 1,
        participantEmail,
        participantIndex: slot.participantIndex,
      });
    }
  }

  return payload;
}

/** Item do `patchProducts` de produto SEM variação (nenhuma opção a enviar). */
export interface VariationlessProductItem {
  productId: string;
  variationIds: string[];
  quantity: number;
  participantEmail: string;
  participantIndex: number;
}

/**
 * Acrescenta os produtos SEM variação do ingresso de cada participante (kit obrigatório
 * sem variação, ou "Quer receber este item?" = Sim) com `variationIds: []`. O back só grava
 * na inscrição o que recebe aqui — sem isto esses kits não viravam RegistrationProduct
 * (PDF, export, inscrição). Quem respondeu "Não" já está em `chosen` (opt-out) e fica como está.
 */
export function withVariationlessProducts<T extends { productId: string; participantIndex?: number }>(
  chosen: T[],
  slots: ParticipantTicketSlot[],
  participants: Array<{ email?: string }>,
  getProductsForTicket: (ticketId: string) => Product[],
): Array<T | VariationlessProductItem> {
  const taken = new Set(chosen.map((p) => `${p.participantIndex}:${p.productId}`));
  const extra: VariationlessProductItem[] = [];
  for (const slot of slots) {
    const participantEmail = participants[slot.participantIndex]?.email;
    if (!participantEmail) continue;
    for (const product of getProductsForTicket(slot.ticketId)) {
      if (getVariationGroups(product).length > 0) continue;
      if (taken.has(`${slot.participantIndex}:${product.id}`)) continue;
      extra.push({
        productId: product.id,
        variationIds: [],
        quantity: 1,
        participantEmail,
        participantIndex: slot.participantIndex,
      });
    }
  }
  return [...chosen, ...extra];
}
