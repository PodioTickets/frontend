"use client";

import { useQuery } from "@tanstack/react-query";
import { userService } from "@/services";

/**
 * Elegibilidade do cupom automático de idade no `/checkout/ingressos`.
 *
 * Só dispara pra usuário logado (`enabled`): anônimo não tem idade pra avaliar
 * (badge de limite some e nenhum cupom de idade aplica). Dedupe por queryKey —
 * ModalitiesStep (mobile) e EventInfo (desktop) chamam o mesmo hook, 1 request.
 */
export function useAgeCouponEligibility(
  eventId: string | null | undefined,
  enabled: boolean,
) {
  return useQuery({
    queryKey: ["age-coupon-eligibility", eventId],
    queryFn: () =>
      eventId ? userService.getAgeCouponEligibility(eventId) : null,
    enabled: !!eventId && enabled,
    staleTime: 60_000,
    gcTime: 60_000,
    retry: false,
  });
}
