"use client";

import { useQuery } from "@tanstack/react-query";
import { userService } from "@/services";

/**
 * Preview de cupom para exibição em `/checkout/ingressos` (antes do
 * `reserveOrder`). Permite mostrar `(X% OFF)` ao lado do código capturado
 * via `?coupon=`, sem precisar criar a order. Falhas retornam `null` —
 * o componente cai pra render mínimo (só o código).
 *
 * Cache segue a política "menos cache" do projeto (staleTime 0 + refetchOnMount
 * "always"): o estado de elegibilidade do cupom/voucher MUDA no servidor (esgota
 * por `maxUsage`/uso do voucher). Com o cache antigo de 60s, ao voltar pro
 * /ingressos (navegação client-side mantém o QueryClient) o preview STALE de
 * quando o cupom era válido reaparecia e o card mostrava o preço cortado mesmo
 * com o cupom/voucher já esgotado. Revalidar a cada mount elimina isso.
 */
export function useCouponPreview(
  eventId: string | null | undefined,
  code: string | null | undefined,
) {
  return useQuery({
    queryKey: ["coupon-preview", eventId, code],
    queryFn: () =>
      eventId && code ? userService.previewCoupon(eventId, code) : null,
    enabled: !!eventId && !!code,
    staleTime: 0,
    gcTime: 5 * 60_000,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
    retry: false,
  });
}
