"use client";

import Image from "next/image";
import { Tooltip } from "@/components/Tooltip";
import { cn } from "@/utils/cn";
import type { AutoCouponBadge } from "@/lib/autoCouponBadges";

/* Cores do Figma (617:35395): verde = semanticas/green/3 (sem token no projeto) + principal/6/12;
 * amarelo = os mesmos tokens da tag "Limite de idade". */
const STYLES = {
  QUANTITY: {
    pill: "bg-[#e6f6eb] border-primary-6 text-primary-12",
    icon: "/images/coupon-badge-quantity.svg",
    help: "/images/coupon-badge-help-green.svg",
  },
  AGE: {
    pill: "bg-yellow-3 border-yellow-6 text-yellow-12",
    icon: "/images/coupon-badge-age.svg",
    help: "/images/coupon-badge-help-yellow.svg",
  },
} as const;

/**
 * Selos "no canto" do card do ingresso (metade acima da borda superior, à direita).
 * 1 cupom → texto completo; 2+ → resumido + ajuda, com o texto completo no tooltip
 * (hover no desktop, toque no mobile). O pai precisa ser `relative`.
 * Mobile (`alwaysCompact`): a frase completa não cabe numa linha do card (~316px) e
 * cobria o título → sempre resumido + toque; com 2+ selos, o rótulo mínimo ("Idade 20%"),
 * porque dois "Cupom por …" lado a lado (~410px) eram cortados com reticências.
 */
export function AutoCouponBadges({
  badges,
  tooltipTrigger,
  alwaysCompact = false,
}: {
  badges: AutoCouponBadge[];
  tooltipTrigger: "hover" | "click";
  alwaysCompact?: boolean;
}) {
  if (badges.length === 0) return null;
  const compact = alwaysCompact || badges.length > 1;

  return (
    // Sem gap + `-mr-2` em todos menos o último: como no Figma, o selo seguinte cobre os 8px
    // finais do anterior (sobram ~4px entre o ícone de ajuda e a borda do próximo).
    <div className="absolute -top-3 left-4 right-4 flex justify-end pointer-events-none">
      {badges.map((b, i) => {
        const overlapNext = i < badges.length - 1 && "-mr-2";
        const s = STYLES[b.kind];
        const pill = (
          <div
            className={cn(
              // py 3px: o Figma (h 24) apara a entrelinha do texto; com leading 1.3 + py-1 dava 26.
              "pointer-events-auto min-w-0 flex items-center gap-1 pl-2 pr-3 py-[3px] rounded-full border",
              s.pill,
              compact && "cursor-help",
            )}
          >
            <Image src={s.icon} alt="" width={14} height={14} unoptimized className="shrink-0" />
            <p className="text-xs font-bold font-family-dm-sans leading-[1.3] whitespace-nowrap truncate">
              {!compact ? b.fullText : alwaysCompact && badges.length > 1 ? b.tinyText : b.shortText}
            </p>
            {compact && <Image src={s.help} alt="" width={12} height={12} unoptimized className="shrink-0" />}
          </div>
        );
        if (!compact) return <div key={b.id} className={cn("min-w-0 flex", overlapNext)}>{pill}</div>;
        return (
          // topLeft: painel alinhado à direita do selo, canto reto apontando pro ícone de ajuda
          // (o `top` centralizado deixava o canto reto à esquerda → parecia torto).
          <Tooltip
            key={b.id}
            trigger={tooltipTrigger}
            usePortal
            position="topLeft"
            className={cn("min-w-0 flex", overlapNext)}
            contentClassName="w-max max-w-[min(100vw-2rem,280px)] items-stretch gap-0"
            content={
              <p className="text-sm font-normal font-family-dm-sans text-gray-12 text-left">{b.fullText}</p>
            }
          >
            {pill}
          </Tooltip>
        );
      })}
    </div>
  );
}
