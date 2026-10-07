"use client";

import { Fragment, type ReactNode } from "react";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/utils/cn";
import { Button } from "@/components/Button";
import { ArrowButton } from "@/components/ArrowButton";

/**
 * Peças compartilhadas dos wizards de página inteira fora do checkout público
 * (cortesia do organizador, troca de ingresso do admin): pílulas de etapa e a tela
 * de conclusão com o selo verde. Mesmo Figma nos dois fluxos.
 */

export interface WizardStepOption {
  id: number;
  label: string;
}

/** Pílulas "Etapa › Etapa › …" (desktop) + título central com voltar (mobile). */
export function WizardStepper({
  options,
  activeStep,
  currentLabel,
  onBack,
  showBack,
  mobileRight,
  desktopRight,
  className,
}: {
  options: WizardStepOption[];
  activeStep: number;
  currentLabel: string;
  onBack: () => void;
  showBack: boolean;
  /** Slot à direita do título no mobile (ex.: timer da reserva). */
  mobileRight?: ReactNode;
  /** Slot à direita das pílulas no desktop. */
  desktopRight?: ReactNode;
  /** Classes do contêiner desktop (largura/padding variam por layout). */
  className?: string;
}) {
  return (
    <>
      <div className="md:hidden w-full bg-gray-1 border-b border-gray-6">
        <div className="flex items-center justify-center px-4 py-4 relative">
          {showBack && (
            <button onClick={onBack} aria-label="Voltar" className="absolute left-4 flex items-center justify-center">
              <ArrowLeft className="size-5 text-gray-12" />
            </button>
          )}
          <h1 className="text-base font-bold text-gray-12">{currentLabel}</h1>
          {mobileRight && <div className="absolute right-4">{mobileRight}</div>}
        </div>
      </div>
      <div className={cn("hidden md:flex w-full items-center justify-between max-w-7xl mx-auto gap-3 px-4 py-6 border-b border-gray-6", className)}>
        <div className="flex items-center gap-3">
          {options.map((option, index) => (
            <Fragment key={option.id}>
              {index > 0 && <ArrowButton isOpen={false} />}
              <div className={cn("flex items-center gap-2 rounded-4xl px-4 py-2 transition-all", activeStep >= option.id ? "text-primary-2 bg-primary-11" : "text-gray-11 bg-gray-5")}>
                <span className="font-medium">{option.label}</span>
              </div>
            </Fragment>
          ))}
        </div>
        {desktopRight}
      </div>
    </>
  );
}

/** Conclusão (selo verde + título + texto + botão). Figma 6410:130364 / 6813:144454. */
export function WizardDoneStep({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="w-full flex flex-col items-center text-center">
      <div className="flex flex-col items-center gap-2">
        {/* Badge verde (selo + check) com shine suave atrás */}
        <div className="relative flex items-center justify-center p-6">
          <div className="absolute inset-2 rounded-full bg-primary-5/50 blur-2xl" aria-hidden />
          {/* SVG: serve direto (otimizador de raster retornaria 400 sem
              `dangerouslyAllowSVG`, mantido OFF por segurança). */}
          <Image src="/images/success-badge.svg" alt="" width={87} height={84} className="relative" priority unoptimized />
        </div>
        <div className="flex flex-col items-center gap-4">
          <h2 className="text-[32px] font-extrabold font-manrope text-gray-12 leading-[1.1]">{title}</h2>
          <p className="text-lg font-medium font-family-dm-sans text-gray-12 leading-[1.3]">{description}</p>
        </div>
      </div>
      <div className="pt-8">
        <Button type="button" onClick={onAction} className="h-[52px] px-16 text-xl font-bold font-manrope rounded-lg">
          {actionLabel}
        </Button>
      </div>
    </div>
  );
}
