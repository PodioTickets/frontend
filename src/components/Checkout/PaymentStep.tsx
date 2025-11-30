"use client";

import { EventInfo } from "./EventInfo";
import { Button } from "../Button";
import { CardIcon } from "../Icons/CardIcon";
import type { Event } from "@/constants/events";

interface PaymentStepProps {
  event: Event;
  onBack: () => void;
}

export function PaymentStep({ event, onBack }: PaymentStepProps) {
  return (
    <>
      <div className="w-full">
        <h1 className="text-2xl font-bold">Pagamento</h1>
        <p className="text-sm text-gray-11">
          Escolha a forma de pagamento e finalize sua inscrição.
        </p>
      </div>

      <div className="w-full flex items-start justify-between gap-11">
        <div className="max-w-2/3 w-full">
          <div className="flex flex-col gap-4">
            <div className="rounded-lg border border-gray-5 p-4">
              <h2 className="text-lg font-bold mb-4">
                Métodos de pagamento
              </h2>
              <div className="flex flex-col gap-3">
                <button className="flex items-center justify-between p-4 rounded-lg border border-gray-5 hover:bg-gray-2 transition-colors">
                  <div className="flex items-center gap-3">
                    <CardIcon className="size-6" />
                    <span className="text-sm font-medium text-gray-12">
                      Cartão de crédito
                    </span>
                  </div>
                  <span className="text-xs text-gray-11">Em até 4x sem juros</span>
                </button>
                <button className="flex items-center justify-between p-4 rounded-lg border border-gray-5 hover:bg-gray-2 transition-colors">
                  <div className="flex items-center gap-3">
                    <CardIcon className="size-6" />
                    <span className="text-sm font-medium text-gray-12">
                      PIX
                    </span>
                  </div>
                  <span className="text-xs text-primary-10">5% de desconto</span>
                </button>
                <button className="flex items-center justify-between p-4 rounded-lg border border-gray-5 hover:bg-gray-2 transition-colors">
                  <div className="flex items-center gap-3">
                    <CardIcon className="size-6" />
                    <span className="text-sm font-medium text-gray-12">
                      Boleto bancário
                    </span>
                  </div>
                  <span className="text-xs text-gray-11">Vencimento em 3 dias</span>
                </button>
              </div>
            </div>

            <div className="rounded-lg border border-gray-5 p-4">
              <h2 className="text-lg font-bold mb-4">Dados do cartão</h2>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-gray-12">
                    Número do cartão
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 rounded-lg border border-gray-5 bg-gray-2 text-gray-12 focus:outline-none focus:border-primary-10 transition-colors"
                    placeholder="0000 0000 0000 0000"
                  />
                </div>
                <div className="flex gap-4">
                  <div className="flex flex-col gap-2 flex-1">
                    <label className="text-sm font-medium text-gray-12">
                      Validade
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 rounded-lg border border-gray-5 bg-gray-2 text-gray-12 focus:outline-none focus:border-primary-10 transition-colors"
                      placeholder="MM/AA"
                    />
                  </div>
                  <div className="flex flex-col gap-2 flex-1">
                    <label className="text-sm font-medium text-gray-12">CVV</label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 rounded-lg border border-gray-5 bg-gray-2 text-gray-12 focus:outline-none focus:border-primary-10 transition-colors"
                      placeholder="000"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-gray-12">
                    Nome no cartão
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 rounded-lg border border-gray-5 bg-gray-2 text-gray-12 focus:outline-none focus:border-primary-10 transition-colors"
                    placeholder="Nome completo"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="max-w-1/3 w-full">
          <EventInfo event={event} onNext={() => {}} />
        </div>
      </div>
    </>
  );
}

