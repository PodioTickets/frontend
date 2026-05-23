"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  getPendingCoupon,
  normalizeCouponCode,
  setPendingCoupon,
} from "@/hooks/usePendingCoupon";

/**
 * Captura `?coupon=CODIGO` em qualquer rota e mantém na URL.
 * A URL é a ÚNICA fonte duradoura: recarregar uma rota sem `?coupon=`
 * descarta o cupom. Não usa sessionStorage nem localStorage — só um buffer
 * volátil em memória JS (`pendingCouponMemory` em `usePendingCoupon.ts`)
 * pra propagar o param em navegações SPA que destruiriam a query string
 * (router.push / <Link> sem o coupon). No reload da página o buffer zera.
 *
 * Quando o usuário avança no checkout o cupom é aplicado automaticamente
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
      // URL é a fonte da verdade — sincroniza o buffer em memória com ela.
      const buffered = getPendingCoupon();
      if (urlCode !== buffered) {
        setPendingCoupon(urlCode);
      }
      return;
    }

    // Sem cupom na URL: se o buffer ainda tem (navegação SPA acabou de remover
    // a query), re-anexa via router.replace. Próxima execução do effect verá
    // `urlCode === buffered` e cairá no return acima.
    const buffered = getPendingCoupon();
    if (!buffered) return;

    const params = new URLSearchParams(searchParams.toString());
    params.set(COUPON_QUERY_PARAM, buffered);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [searchParams, pathname, router]);

  return null;
}
