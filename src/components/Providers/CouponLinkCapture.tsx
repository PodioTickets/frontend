"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  getPendingCoupon,
  getPendingCouponKind,
  normalizeCouponCode,
  readCouponParamEntry,
  setPendingCoupon,
  couponParamName,
} from "@/hooks/usePendingCoupon";

/**
 * Captura `?cupom=CODIGO` (ou o legado `?coupon=`) em qualquer rota e mantém na
 * URL. A URL é a ÚNICA fonte duradoura: recarregar uma rota sem o param descarta
 * o cupom. Não usa sessionStorage nem localStorage — só um buffer volátil em
 * memória JS (`pendingCouponMemory` em `usePendingCoupon.ts`) pra propagar o
 * param em navegações SPA que destruiriam a query string (router.push / <Link>
 * sem o cupom). No reload da página o buffer zera.
 *
 * Quando o usuário avança no checkout o cupom/voucher é aplicado
 * automaticamente (silencioso em caso de erro).
 *
 * Preserva o TIPO do param: um `?voucher=` continua `?voucher=` ao re-anexar;
 * cupom é re-anexado como `?cupom=` (migra links legados `?coupon=`).
 */
export function CouponLinkCapture() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const urlEntry = readCouponParamEntry(searchParams);
    const urlCode = normalizeCouponCode(urlEntry?.code);

    if (urlCode) {
      // URL é a fonte da verdade — sincroniza o buffer em memória com ela.
      if (urlCode !== getPendingCoupon()) {
        setPendingCoupon(urlCode, urlEntry!.kind);
      }
      return;
    }

    // Sem código na URL: se o buffer ainda tem (navegação SPA acabou de remover
    // a query), re-anexa via router.replace usando o MESMO param de origem.
    // Próxima execução do effect verá `urlCode === buffered` e retornará acima.
    const buffered = getPendingCoupon();
    if (!buffered) return;

    const kind = getPendingCouponKind() ?? "coupon";
    const params = new URLSearchParams(searchParams.toString());
    // Re-anexa com o nome canônico (`cupom`/`voucher`) — migra links legados
    // (`?coupon=`) pro `?cupom=` na primeira navegação interna.
    params.set(couponParamName(kind), buffered);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [searchParams, pathname, router]);

  return null;
}
