"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  getPendingCoupon,
  getPendingCouponKind,
  getPendingCouponOwnerSlug,
  clearPendingCoupon,
  normalizeCouponCode,
  readCouponParamEntry,
  setPendingCoupon,
  couponParamName,
} from "@/hooks/usePendingCoupon";

/** Slug do evento se `pathname` for a página pública de um evento (`/events/[slug]`),
 *  senão `null`. O checkout (`/checkout/...`) não traz o slug na rota — é tratado à
 *  parte como "dentro do fluxo". */
function eventSlugFromPath(pathname: string): string | null {
  const parts = pathname.split("/").filter(Boolean);
  return parts[0] === "events" && parts[1] ? decodeURIComponent(parts[1]) : null;
}

/**
 * Captura `?cupom=CODIGO` (ou o legado `?coupon=`) na página de um evento e mantém
 * o cupom ATIVO apenas no fluxo DAQUELE evento — a própria página dele e o checkout.
 * Ao navegar pra home, busca ou OUTRO evento, o cupom é descartado (links são sempre
 * `/events/[slug]?cupom=`, então o cupom é event-scoped e não pode contaminar outro
 * evento). A URL é a fonte duradoura; o buffer volátil em memória
 * (`pendingCouponMemory`) só re-anexa o param em navegações SPA que destruiriam a
 * query string. No reload da página o buffer zera.
 *
 * Preserva o TIPO do param: `?voucher=` continua `?voucher=`; cupom é re-anexado
 * como `?cupom=` (migra links legados `?coupon=`).
 */
export function CouponLinkCapture() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const urlEntry = readCouponParamEntry(searchParams);
    const urlCode = normalizeCouponCode(urlEntry?.code);
    const slug = eventSlugFromPath(pathname);

    if (urlCode) {
      // URL é a fonte da verdade — sincroniza o buffer. Só (re)define o dono quando
      // estamos numa página de evento; em rotas de checkout (slug null, param
      // re-anexado) preserva o dono já capturado, senão ele seria perdido.
      const ownerSlug = slug ?? getPendingCouponOwnerSlug();
      if (urlCode !== getPendingCoupon() || ownerSlug !== getPendingCouponOwnerSlug()) {
        setPendingCoupon(urlCode, urlEntry!.kind, ownerSlug);
      }
      return;
    }

    // Sem código na URL: só temos algo a fazer se o buffer ainda tiver um cupom.
    const buffered = getPendingCoupon();
    if (!buffered) return;

    // O cupom vale só no fluxo do evento de ORIGEM: a página dele OU qualquer rota
    // de checkout (o pedido em checkout é de um único evento). Em home/busca/outro
    // evento, descarta — não reaplica o cupom do evento anterior.
    const isCheckout = pathname.startsWith("/checkout");
    const owner = getPendingCouponOwnerSlug();
    const belongsHere = isCheckout || (slug != null && slug === owner);
    if (!belongsHere) {
      clearPendingCoupon();
      return;
    }

    // Navegação SPA removeu a query dentro do fluxo válido → re-anexa via
    // router.replace com o nome canônico (`cupom`/`voucher`). A próxima execução
    // verá `urlCode === buffered` e retornará acima.
    const kind = getPendingCouponKind() ?? "coupon";
    const params = new URLSearchParams(searchParams.toString());
    params.set(couponParamName(kind), buffered);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [searchParams, pathname, router]);

  return null;
}
