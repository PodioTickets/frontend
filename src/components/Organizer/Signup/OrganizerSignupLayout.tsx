"use client";

import * as React from "react";
import Image from "next/image";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/utils/cn";

interface OrganizerSignupLayoutProps {
  title?: string;
  subtitle?: string;
  /** Botão voltar (topo-esquerdo). Omitido = sem botão (ex.: tela de sucesso). */
  onBack?: () => void;
  /** Submit do form (Enter no campo ou botão type=submit). Omitido = sem form. */
  onSubmit?: () => void;
  children: React.ReactNode;
  /** Ações do rodapé do card (ex.: botão "Continuar"), alinhadas à direita. */
  actions?: React.ReactNode;
  /** Classe extra do card (ex.: largura da tela de sucesso). */
  cardClassName?: string;
}

/**
 * Moldura das telas do auto-cadastro de organizador (card central), fiel ao
 * Figma: botão voltar no topo-esquerdo, logo "PódioTicket / Organizadores"
 * centralizado, card branco com título/subtítulo/divisor + conteúdo, e footer
 * "© 2026 PódioTicket". Título/voltar/ações/form são opcionais (a tela de
 * sucesso não tem cabeçalho nem voltar).
 */
export function OrganizerSignupLayout({
  title,
  subtitle,
  onBack,
  onSubmit,
  children,
  actions,
  cardClassName,
}: OrganizerSignupLayoutProps) {
  const hasHeader = !!title || !!subtitle;
  const Card = onSubmit ? "form" : "div";
  const cardProps = onSubmit
    ? {
      onSubmit: (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit();
      },
    }
    : {};

  return (
    <div className="relative flex min-h-dvh flex-col bg-gray-2 px-4 py-6">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          aria-label="Voltar"
          className="absolute left-4 top-4 md:left-12 md:top-12 flex size-9 items-center justify-center rounded-lg border border-gray-6 bg-gray-1 text-gray-12 shadow-xs transition-colors hover:bg-gray-3"
        >
          <ChevronLeft className="size-5" />
        </button>
      ) : null}

      <div className="md:mt-2 flex justify-center">
        <Image
          src="/images/org-login-dark.svg"
          alt="PódioTicket Organizadores"
          width={196}
          height={52}
          priority
          className="h-13 w-auto"
        />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center">


        <Card
          {...cardProps}
          className={cn(
            "w-full max-w-[710px] rounded-2xl border border-gray-6 bg-gray-1 p-6 shadow-sm",
            cardClassName,
          )}
        >
          {hasHeader ? (
            <>
              <div className="flex flex-col items-center gap-1 text-center">
                {title ? (
                  <h1 className="text-xl font-bold font-family-dm-sans text-gray-12 leading-[1.3]">
                    {title}
                  </h1>
                ) : null}
                {subtitle ? (
                  <p className="text font-normal font-family-dm-sans text-gray-11 leading-[1.3]">
                    {subtitle}
                  </p>
                ) : null}
              </div>
              <div className="my-5 h-px w-full bg-gray-6" />
            </>
          ) : null}

          {children}

          {actions ? (
            <div className="mt-6 flex justify-end">{actions}</div>
          ) : null}
        </Card>
      </div>

      <footer className="mt-8 text-center text font-normal font-family-dm-sans text-gray-11">
        © 2026 PódioTicket
      </footer>
    </div>
  );
}
