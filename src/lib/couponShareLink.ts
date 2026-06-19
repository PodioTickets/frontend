import { publicSiteHref } from "@/lib/organizerHostNavigation";
import { couponParamName, type CouponParamKind } from "@/hooks/usePendingCoupon";

/**
 * Monta o LINK público de compartilhamento de um cupom/voucher: a página do
 * evento no DOMÍNIO PÚBLICO (não no subdomínio do painel admin/organizer) com o
 * código já pré-aplicado via query param canônico — `?cupom=` para cupom,
 * `?voucher=` para voucher (ver `couponParamName`). Esse param é capturado pelo
 * `CouponLinkCapture` em qualquer rota e aplicado no checkout (`/ingressos`).
 *
 * Resolução do host (delega ao `publicSiteHref`, que espelha o split do proxy):
 *  - split configurado (prod) → URL absoluta no `NEXT_PUBLIC_ROOT_SITE_URL`;
 *  - sem split (dev, host único) → caminho relativo, ao qual prefixamos o
 *    `window.location.origin` para sempre copiar uma URL absoluta clicável.
 *
 * Edge case: sem `eventSlug` (evento ainda não carregou) retornamos o código
 * cru como fallback — nunca copiamos uma URL quebrada (`/events/undefined?...`).
 *
 * @param eventSlug slug público do evento (`event.slug`).
 * @param code      código do cupom/voucher.
 * @param kind      `"coupon"` (default) ou `"voucher"` — decide o nome do param.
 */
export function buildCouponShareLink(
  eventSlug: string | null | undefined,
  code: string,
  kind: CouponParamKind = "coupon",
): string {
  if (!eventSlug) return code;

  const param = couponParamName(kind);
  const path = `/events/${encodeURIComponent(eventSlug)}?${param}=${encodeURIComponent(code)}`;
  const href = publicSiteHref(path);

  // Já absoluto (split de prod) → usa direto. Relativo (dev) → prefixa o origin.
  if (/^https?:\/\//i.test(href)) return href;
  if (typeof window !== "undefined") return `${window.location.origin}${href}`;
  return href;
}
