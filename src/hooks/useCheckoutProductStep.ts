"use client";

import { useSubscriptionData } from "@/hooks/useSubscriptionData";
import { useCheckout } from "@/contexts/CheckoutContext";
import {
  buildParticipantTicketSlots,
  buildAutoSelectedProductsPayload,
  productOffersChoice,
  type AutoSelectedProduct,
} from "@/lib/checkoutProductStep";

export interface CheckoutProductStep {
  /**
   * `true`  = há ao menos um produto com escolha real (>1 variação);
   * `false` = nenhum produto exige escolha → a etapa de Produtos pode ser pulada;
   * `null`  = indeterminado (dados carregando ou seleção desconhecida, ex.: após
   *           refresh sem `raceQuantities`). Consumidores devem tratar `null`
   *           como "ainda não decidir" (default seguro = manter o fluxo padrão).
   */
  hasSelectableProducts: boolean | null;
  /** Variações auto-selecionadas a persistir via `patchProducts` ao pular a etapa. */
  autoSelectedProducts: AutoSelectedProduct[];
  loading: boolean;
}

/**
 * Fonte única de verdade para "o checkout precisa da etapa de Produtos?".
 *
 * Reusa `useSubscriptionData` (mesmos dados/queries que a própria etapa) para não
 * divergir do que o `SubscriptionStep` renderiza. Usado pelo header (esconder a
 * tab), pela navegação de Informações/Pagamento (pular/voltar) e pela própria
 * página de Produtos (backstop de auto-skip).
 *
 * Sem `useMemo` manual de propósito: `getProductsForTicket` é uma função local
 * não-memoizada de `useSubscriptionData` e o React Compiler já memoiza as
 * derivações — `useMemo` aqui quebraria o lint de memoization manual.
 */
export function useCheckoutProductStep(
  eventId: string | null | undefined,
): CheckoutProductStep {
  const { raceQuantities, participants } = useCheckout();
  const { loading, categorizedTickets, uncategorizedTickets, getProductsForTicket } =
    useSubscriptionData(eventId ?? undefined);

  const slots = buildParticipantTicketSlots(
    categorizedTickets,
    uncategorizedTickets,
    raceQuantities,
  );

  let hasSelectableProducts: boolean | null;
  if (loading) {
    hasSelectableProducts = null;
  } else if (slots.length === 0) {
    // Seleção desconhecida (ex.: refresh esvaziou o contexto) → não decidir.
    hasSelectableProducts = null;
  } else {
    hasSelectableProducts = slots.some((slot) =>
      getProductsForTicket(slot.ticketId).some(productOffersChoice),
    );
  }

  const autoSelectedProducts =
    hasSelectableProducts === false
      ? buildAutoSelectedProductsPayload(slots, participants, getProductsForTicket)
      : [];

  return { hasSelectableProducts, autoSelectedProducts, loading };
}
