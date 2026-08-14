"use client";

import Link from "next/link";
import { Button } from "@/components/Button";
import { cn } from "@/utils/cn";
import { trackPlatformMetaPixel } from "@/lib/metaPixel";

/**
 * CTA "Criar meu evento" da landing. É client para disparar o evento `Lead` do
 * Meta Pixel no clique (funil de captação de organizadores) ANTES de navegar
 * para o app. O destino é um host diferente (app), então o Lead precisa sair
 * ainda aqui — o pixel consolida no mesmo id do outro domínio.
 */
export function SpecialistButton({
  href,
  className = "",
}: {
  href: string;
  className?: string;
}) {
  return (
    <Button
      asChild
      className={cn(
        "h-[52px] w-full gap-3 px-8 has-[>svg]:px-8 text-[16px] font-bold md:h-14 md:w-auto md:text-[20px]",
        className,
      )}
    >
      <Link href={href} onClick={() => trackPlatformMetaPixel("Lead")}>
        Criar meu evento
      </Link>
    </Button>
  );
}
