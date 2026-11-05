"use client";

import Image from "next/image";
import { Tooltip } from "@/components/Tooltip";
import { useHidePricing } from "@/contexts/HidePricingContext";
import { useTicketPick } from "@/contexts/TicketPickContext";
import { useT } from "@/i18n/client";
import type { AutoCouponOffer } from "@/lib/autoCouponBadges";

type TooltipTrigger = "hover" | "click";

/** Link do anúncio: o tooltip diz como ativar o cupom (hover no desktop, toque no mobile). */
function HowToActivate({
  howTo,
  tooltipTrigger,
  children,
}: {
  howTo: string;
  tooltipTrigger: TooltipTrigger;
  children: React.ReactNode;
}) {
  return (
    // topLeft: painel alinhado à direita do gatilho, que fica sempre no canto direito.
    <Tooltip
      trigger={tooltipTrigger}
      usePortal
      position="topLeft"
      className="shrink-0 flex"
      contentClassName="w-max max-w-[min(100vw-2rem,280px)] items-stretch gap-0"
      content={<p className="text-sm font-normal font-family-dm-sans text-gray-12 text-left">{howTo}</p>}
    >
      <button
        type="button"
        className="flex items-center gap-[3px] cursor-pointer text-xs font-medium font-family-dm-sans leading-[1.3] text-blue-12 underline whitespace-nowrap"
      >
        {children}
      </button>
    </Tooltip>
  );
}

/** Selo no canto do card (Figma `desconto/molécula/selo`). O pai precisa ser `relative`. */
export function AutoCouponSeal({ offer, tooltipTrigger }: { offer: AutoCouponOffer; tooltipTrigger: TooltipTrigger }) {
  const t = useT("checkout");
  return (
    <div className="absolute -top-[13px] left-[11px] right-[11px] h-6 flex items-center justify-end pointer-events-none">
      <div className="pointer-events-auto min-w-0 flex items-center gap-1 h-6 pl-2 pr-1.5 rounded-full border border-blue-6 bg-blue-3">
        <Image src="/images/coupon-seal-tag.svg" alt="" width={14} height={14} unoptimized className="shrink-0" />
        <p className="text-xs font-bold font-family-dm-sans leading-[1.3] text-blue-12 whitespace-nowrap truncate">
          {t("couponSealText", { d: offer.discount })}
        </p>
        <HowToActivate howTo={offer.howTo} tooltipTrigger={tooltipTrigger}>
          {t("couponLearnMore")}
        </HowToActivate>
      </div>
    </div>
  );
}

/** Anúncio do cupom geral embaixo da lista (Figma `desconto/molécula/anúncio-geral`). */
export function AutoCouponBanner({
  offer,
  tooltipTrigger,
  desktop = false,
}: {
  offer: AutoCouponOffer;
  tooltipTrigger: TooltipTrigger;
  desktop?: boolean;
}) {
  const t = useT("checkout");
  const hidePricing = useHidePricing();
  const pick = useTicketPick();
  if (hidePricing || pick) return null;

  const howTo = (
    <HowToActivate howTo={offer.howTo} tooltipTrigger={tooltipTrigger}>
      {desktop ? t("couponSeeMore") : t("couponLearnMore")}
      {desktop && <Image src="/images/coupon-info.svg" alt="" width={12} height={12} unoptimized className="shrink-0" />}
    </HowToActivate>
  );
  const tag = <Image src={`/images/coupon-banner-tag${desktop ? "-desktop" : ""}.svg`} alt="" width={20} height={20} unoptimized className="shrink-0" />;
  const line1 = t("couponBannerLine1", { d: offer.discount });
  const line2 = t("couponBannerLine2");

  if (desktop) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-blue-6 bg-blue-3">
        {tag}
        <p className="flex-1 min-w-0 text-sm font-bold font-family-dm-sans leading-[1.3] text-blue-12">
          {line1} {line2}
        </p>
        {howTo}
      </div>
    );
  }
  return (
    // py 8.4px: o Figma (h 50) apara a entrelinha do texto; com leading 1.3 + p-3 dava 57.
    <div className="mt-2 flex items-center gap-3 px-3 py-[8.4px] rounded-xl border border-blue-6 bg-blue-3">
      <div className="flex-1 min-w-0 flex items-center gap-2">
        {tag}
        <p className="flex-1 min-w-0 text-xs font-bold font-family-dm-sans leading-[1.3] text-blue-12">
          {line1}
          <br />
          {line2}
        </p>
      </div>
      {howTo}
    </div>
  );
}
