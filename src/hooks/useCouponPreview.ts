"use client";

import { useQuery } from "@tanstack/react-query";
import { userService } from "@/services";

/**
 * Preview de cupom para exibição em `/checkout/ingressos` (antes do
 * `reserveOrder`). Permite mostrar `(X% OFF)` ao lado do código capturado
 * via `?coupon=`, sem precisar criar a order. Falhas retornam `null` —
 * o componente cai pra render mínimo (só o código).
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
    staleTime: 60_000,
    gcTime: 60_000,
    retry: false,
  });
}
