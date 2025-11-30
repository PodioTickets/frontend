"use client";

import { EventInfo } from "./EventInfo";
import { Button } from "../Button";
import type { Event } from "@/constants/events";

interface SubscriptionStepProps {
  event: Event;
  onNext: () => void;
  onBack: () => void;
}

export function SubscriptionStep({
  event,
  onNext,
  onBack,
}: SubscriptionStepProps) {
  return (
    <>
      <div className="w-full">
        <h1 className="text-2xl font-bold">Revise sua inscrição</h1>
        <p className="text-sm text-gray-11">
          Confira todas as informações antes de prosseguir para o pagamento.
        </p>
      </div>

      <div className="w-full flex items-start justify-between gap-11">
        <div className="max-w-2/3 w-full">
          <div className="flex flex-col gap-6">
            <div className="rounded-lg border border-gray-5 p-4">
              <h2 className="text-lg font-bold mb-4">Resumo da inscrição</h2>
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-11">Kit selecionado</span>
                  <span className="text-sm font-medium text-gray-12">
                    Kit inscrição
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-11">Prova</span>
                  <span className="text-sm font-medium text-gray-12">
                    3K - Caminhada
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-11">Quantidade</span>
                  <span className="text-sm font-medium text-gray-12">1</span>
                </div>
                <div className="w-full h-px bg-gray-6 my-2" />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-11">Valor unitário</span>
                  <span className="text-sm font-medium text-gray-12">
                    R$ 100,00
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-11">Taxa de serviço</span>
                  <span className="text-sm font-medium text-gray-12">
                    R$ 39,85
                  </span>
                </div>
                <div className="w-full h-px bg-gray-6 my-2" />
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-gray-12">Total</span>
                  <span className="text-lg font-bold text-gray-12">
                    R$ 139,85
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-gray-5 p-4">
              <h2 className="text-lg font-bold mb-4">Dados do participante</h2>
              <div className="flex flex-col gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-11">Nome:</span>
                  <span className="text-gray-12">João Silva</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-11">CPF:</span>
                  <span className="text-gray-12">000.000.000-00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-11">E-mail:</span>
                  <span className="text-gray-12">joao@email.com</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="max-w-1/3 w-full">
          <EventInfo event={event} onNext={onNext} />
        </div>
      </div>
    </>
  );
}

