"use client";

import { useQuery } from "@tanstack/react-query";
import { userService } from "@/services";

/**
 * Elegibilidade do cupom automático de idade no `/checkout/ingressos` + os cupons
 * automáticos por QUANTIDADE do evento (mesma resposta, zero request extra).
 *
 * Dispara também pra anônimo: o cupom de quantidade não depende de login (o de
 * idade volta `applicable: false`). `isAuthenticated` entra na queryKey pra refazer
 * a busca ao logar pelo modal (sem remontar a tela). Dedupe por queryKey —
 * ModalitiesStep (mobile) e EventInfo (desktop) chamam o mesmo hook, 1 request.
 */
export function useAgeCouponEligibility(
  eventId: string | null | undefined,
  isAuthenticated: boolean,
) {
  return useQuery({
    queryKey: ["age-coupon-eligibility", eventId, isAuthenticated],
    queryFn: () =>
      eventId ? userService.getAgeCouponEligibility(eventId) : null,
    enabled: !!eventId,
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
