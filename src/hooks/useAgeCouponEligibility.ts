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
    // Server-driven, igual às demais queries do checkout: SEMPRE refaz no mount.
    // Sem isso, a query herda o default global (`refetchOnMount: false` +
    // `staleTime` alto) e, ao voltar pro /ingressos após alterar a idade da
    // conta, o React Query serve o cache stale (idade antiga) até dar refresh.
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
    retry: false,
  });
}
