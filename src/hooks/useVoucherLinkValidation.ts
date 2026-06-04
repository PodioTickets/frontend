"use client";

import { useQuery } from "@tanstack/react-query";
import { userService } from "@/services";

/**
 * Validação do voucher vindo por LINK (`?voucher=`) em `/checkout/ingressos`.
 * Usa o GET de produtos com `?voucher=` — único canal que devolve o MOTIVO
 * real (422 tipado: já utilizado / expirado / não encontrado); o preview
 * público devolve `null` sem distinguir. `validateVoucherLink` nunca lança
 * (rede/5xx → `usable: true`), então `data` é sempre conclusivo.
 */
export function useVoucherLinkValidation(
  eventId: string | null | undefined,
  code: string | null | undefined,
) {
  return useQuery({
    queryKey: ["voucher-link-validation", eventId, code],
    queryFn: () =>
      eventId && code ? userService.validateVoucherLink(eventId, code) : null,
    enabled: !!eventId && !!code,
    staleTime: 60_000,
    gcTime: 60_000,
    retry: false,
  });
}
