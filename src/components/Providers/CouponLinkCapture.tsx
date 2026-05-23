"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  getPendingCoupon,
  normalizeCouponCode,
  setPendingCoupon,
} from "@/hooks/usePendingCoupon";

/**
 * Captura `?coupon=CODIGO` em qualquer rota e persiste em sessionStorage.
 * Além disso, propaga o cupom na URL: se há código pendente em storage mas a
 * rota atual não tem `?coupon=`, anexa via `router.replace` (sem entrar no
 * histórico). Isso garante que o cupom sobreviva mesmo se o sessionStorage
 * for limpo (modo privado, outra aba) — o link sempre carrega o estado.
 *
 * Quando o usuário chegar ao PaymentStep, o cupom é aplicado automaticamente
 * (silencioso em caso de erro).
 */
const COUPON_QUERY_PARAM = "coupon";

export function CouponLinkCapture() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const urlCode = normalizeCouponCode(searchParams.get(COUPON_QUERY_PARAM));

    if (urlCode) {
      // URL é a fonte da verdade — sincroniza storage com ela.
      const stored = getPendingCoupon();
      if (urlCode !== stored) {
        setPendingCoupon(urlCode);
      }
      return;
    }

    // Sem cupom na URL: se houver em storage, propaga pra rota atual.
    // Próxima execução do effect verá `urlCode === stored` e cairá no return acima.
    const stored = getPendingCoupon();
    if (!stored) return;

    const params = new URLSearchParams(searchParams.toString());
    params.set(COUPON_QUERY_PARAM, stored);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [searchParams, pathname, router]);

  return null;
}
