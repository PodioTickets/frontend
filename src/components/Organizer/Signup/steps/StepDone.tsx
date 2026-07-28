"use client";

import { Check } from "lucide-react";
import { Button } from "@/components/Button";
import type { OrganizerSignupFlow } from "../useOrganizerSignupFlow";

/**
 * Etapa final — conta criada. Selo verde + mensagem + botão "Entrar na
 * plataforma" (vai para o painel do organizador, já logado). Sem cabeçalho nem
 * voltar (renderizada dentro do layout em modo "bare").
 */
export function StepDone({ flow }: { flow: OrganizerSignupFlow }) {
  return (
    <div className="flex flex-col items-center gap-6 py-4 text-center">
      <span className="relative flex size-24 items-center justify-center">
        <span className="absolute inset-0 rounded-full bg-primary-5 blur-lg" />
        <span className="relative flex size-16 items-center justify-center rounded-full bg-primary-11 text-gray-1 shadow-sm">
          <Check className="size-9" strokeWidth={3} />
        </span>
      </span>

      <div className="flex flex-col gap-2">
        <h1 className="text-lg font-bold font-family-dm-sans text-gray-12 leading-[1.3]">
          Conta criada!
        </h1>
        <p className="text-sm font-normal font-family-dm-sans text-gray-11 leading-[1.3]">
          Sua conta de organizador está pronta. Enviamos um e-mail de confirmação.
        </p>
      </div>

      <Button
        type="button"
        onClick={flow.goToPlatform}
        className="h-12 w-full"
      >
        Entrar na plataforma
      </Button>
    </div>
  );
}
