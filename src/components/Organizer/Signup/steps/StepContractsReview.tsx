"use client";

import { useRef, useState } from "react";
import { BookOpen } from "lucide-react";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { Button } from "@/components/Button";
import { Checkbox } from "@/components/CheckBox";
import {
  ORGANIZER_CONTRACTS,
  type OrganizerContract,
} from "@/data/organizerContracts";
import { ContractReaderModal } from "../ContractReaderModal";
import type { OrganizerSignupFlow } from "../useOrganizerSignupFlow";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

/**
 * Etapa 6 — revisão e aceite dos contratos. Cada linha abre o leitor
 * (`ContractReaderModal`) para leitura. O aceite é feito num único ponto: o
 * checkbox mestre "Li e aceito os quatro contratos" (marca/limpa os 4 de uma
 * vez). "Aceitar e continuar" (submit real) habilita com os 4 aceitos.
 */
export function StepContractsReview({ flow }: { flow: OrganizerSignupFlow }) {
  const {
    acceptContract,
    setAllContractsAccepted,
    allContractsAccepted,
    isSubmitting,
    turnstileToken,
    setTurnstileToken,
  } = flow;
  const [openContract, setOpenContract] = useState<OrganizerContract | null>(
    null,
  );
  const turnstileRef = useRef<TurnstileInstance>(null);

  // Só habilita o submit com os 4 contratos aceitos E (se houver captcha) o token.
  const canSubmit =
    allContractsAccepted && (!TURNSTILE_SITE_KEY || !!turnstileToken);

  return (
    <div className="flex flex-col gap-3">
      {ORGANIZER_CONTRACTS.map((contract) => {
        const Icon = contract.icon;
        return (
          <div
            key={contract.id}
            className="flex items-center gap-3 rounded-xl border border-gray-6 bg-gray-1 p-3"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gray-3 text-gray-12">
              <Icon className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold font-family-dm-sans text-gray-12 leading-[1.3]">
                {contract.title}
              </p>
              <p className="truncate text-xs font-normal font-family-dm-sans text-gray-11 leading-[1.3]">
                {contract.subtitle}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpenContract(contract)}
              className="flex shrink-0 items-center gap-1 text-sm font-semibold font-family-dm-sans text-[#2F6FED] transition-colors hover:text-[#2456bd]"
            >
              <BookOpen className="size-4" />
              Ler
            </button>
          </div>
        );
      })}

      {/* Captcha Turnstile — mesmo estilo dos logins/modais: interaction-only
          (invisível quando valida sozinho; só aparece se precisar interagir/erro)
          e wrapper sem altura fixa (não reserva espaço quando invisível). */}
      {TURNSTILE_SITE_KEY && (
        <div className="mt-1 flex w-full items-center justify-center empty:hidden">
          <div className="w-full">
            <Turnstile
              ref={turnstileRef}
              siteKey={TURNSTILE_SITE_KEY}
              onSuccess={setTurnstileToken}
              onError={() => setTurnstileToken(null)}
              onExpire={() => setTurnstileToken(null)}
              style={{ width: "100%", display: "block" }}
              options={{ theme: "light", size: "flexible", appearance: "interaction-only" }}
            />
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex cursor-pointer items-center gap-2 font-family-dm-sans text-sm text-gray-12">
          <Checkbox
            checked={allContractsAccepted}
            onCheckedChange={(v) => setAllContractsAccepted(v === true)}
          />
          Li e aceito os quatro contratos
        </label>
        <Button
          type="submit"
          isLoading={isSubmitting}
          disabled={!canSubmit}
          className="min-w-[180px]"
        >
          Aceitar e continuar
        </Button>
      </div>

      <ContractReaderModal
        contract={openContract}
        onClose={() => setOpenContract(null)}
        onAccept={acceptContract}
      />
    </div>
  );
}
