"use client";

import { useRef, useCallback } from "react";
import { cn } from "@/utils/cn";
import { PixIcon } from "@/components/Icons/PixIcon";
import { CardIcon } from "@/components/Icons/CardIcon";
import { InfoIcon } from "@/components/Icons/InfoIcon";

const TOTAL_FEE = 6;
const BASE_SIMULATION = 100;

interface FinancialSectionProps {
  organizerPercent: number;
  maxInstallments: 1 | 2 | 3;
  onOrganizerPercentChange: (value: number) => void;
  onMaxInstallmentsChange: (value: 1 | 2 | 3) => void;
  /** When true, slider and installment buttons are read-only */
  readOnly?: boolean;
}

export function FinancialSection({
  organizerPercent,
  maxInstallments,
  onOrganizerPercentChange,
  onMaxInstallmentsChange,
  readOnly = false,
}: FinancialSectionProps) {
  const trackRef = useRef<HTMLDivElement>(null);

  const participantPercent = parseFloat((TOTAL_FEE - organizerPercent).toFixed(2));
  const participantPays = parseFloat((BASE_SIMULATION + participantPercent).toFixed(2));
  const organizerReceives = parseFloat((BASE_SIMULATION - organizerPercent).toFixed(2));
  const sliderPosition = (organizerPercent / TOTAL_FEE) * 100;

  const updateFromPointer = useCallback((clientX: number) => {
    if (!trackRef.current) return;
    const { left, width } = trackRef.current.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - left) / width));
    onOrganizerPercentChange(Math.round(ratio * TOTAL_FEE * 10) / 10);
  }, [onOrganizerPercentChange]);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (readOnly) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    updateFromPointer(e.clientX);
  }, [readOnly, updateFromPointer]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (readOnly || e.buttons === 0) return;
    updateFromPointer(e.clientX);
  }, [readOnly, updateFromPointer]);

  return (
    <>
      {/* Card 1 — Divisão da taxa */}
      <div className="flex flex-col gap-7 rounded-xl border border-gray-6 bg-gray-2 p-5">
        <div className="flex flex-col gap-4">
          <h2 className="font-manrope text-xl font-bold leading-[1.1] text-gray-12">
            Divisão da taxa da plataforma
          </h2>
          <p className="font-family-dm-sans text-base leading-[1.3] text-gray-11">
            {readOnly
              ? `A taxa total é de ${TOTAL_FEE}%. Confira como a taxa está dividida entre você e os participantes.`
              : `A taxa total é de ${TOTAL_FEE}%. Você decide quanto absorve e quanto repassa ao participante`}
          </p>
        </div>

        <div className="flex flex-col gap-6">
          {/* Slider section */}
          <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <span className="font-family-dm-sans text-base leading-[1.3] text-gray-11">Organizador absorve</span>
              <div className="rounded-lg bg-gray-3 px-4 py-2">
                <span className="font-family-dm-sans text-base font-medium leading-[1.3] text-gray-12">
                  Total: {TOTAL_FEE},0%
                </span>
              </div>
              <span className="font-family-dm-sans text-base leading-[1.3] text-gray-11">Participante paga</span>
            </div>

            <div className="flex items-center gap-20">
              <span className="font-manrope text-xl font-bold leading-[1.1] text-gray-12 w-14 shrink-0 text-left">
                {organizerPercent.toFixed(1)}%
              </span>
              <div
                ref={trackRef}
                className={cn(
                  "relative flex-1 h-8 select-none",
                  readOnly ? "pointer-events-none" : "cursor-pointer",
                )}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
              >
                <div className="absolute inset-y-0 left-0 right-0 overflow-hidden rounded-full">
                  <div
                    className="absolute inset-y-0 left-0 bg-[#6e56cf]"
                    style={{ width: `${sliderPosition}%` }}
                  />
                  <div
                    className="absolute inset-y-0 right-0 bg-[#30a476]"
                    style={{ width: `${100 - sliderPosition}%` }}
                  />
                </div>
                <div
                  className="pointer-events-none absolute top-0 flex size-8 -translate-x-1/2 items-center justify-center rounded-full border border-gray-12 bg-gray-2 shadow-md"
                  style={{ left: `${sliderPosition}%` }}
                >
                  <div className="flex flex-col gap-[3px]">
                    <div className="h-[2px] w-3 rounded-full bg-gray-12" />
                    <div className="h-[2px] w-3 rounded-full bg-gray-12" />
                    <div className="h-[2px] w-3 rounded-full bg-gray-12" />
                  </div>
                </div>
              </div>
              <span className="font-manrope text-xl font-bold leading-[1.1] text-gray-12 w-14 shrink-0 text-right">
                {participantPercent.toFixed(1)}%
              </span>
            </div>

            {!readOnly && (
              <p className="text-center font-family-dm-sans text-base leading-[1.3] text-gray-11">
                Arraste o controle ou digite os valores acima. Os campos se ajustam automaticamente para somar {TOTAL_FEE}%
              </p>
            )}
          </div>

          {/* Live simulation */}
          <div className="flex flex-col gap-6 rounded-lg border border-gray-6 bg-gray-1 p-5">
            <div className="flex flex-col items-start gap-2">
              <span className="font-manrope text-lg font-bold leading-[1.1] text-gray-12">
                {readOnly ? "Simulação" : "Simulação ao vivo"}
              </span>
              <span className="font-family-dm-sans text-base leading-[1.3] text-gray-11">
                Exemplo com um ingresso de R$ {BASE_SIMULATION},00 aplicando as regras acima.
              </span>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex flex-1 flex-col gap-5 rounded-lg border border-[#d4cafe] bg-[#fdfcfe] p-5">
                <span className="font-family-dm-sans text-base font-semibold leading-[1.3] text-[#6550b9]">
                  Você recebe
                </span>
                <span className="font-manrope text-2xl font-extrabold leading-[1.1] text-gray-12">
                  R$ {organizerReceives.toFixed(2).replace(".", ",")}
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-5 rounded-lg border border-[#9ddde7] bg-[#fafdfe] p-5">
                <span className="font-family-dm-sans text-base font-semibold leading-[1.3] text-[#107d98]">
                  Participante paga
                </span>
                <span className="font-manrope text-2xl font-extrabold leading-[1.1] text-gray-12">
                  R$ {participantPays.toFixed(2).replace(".", ",")}
                </span>
              </div>
            </div>
          </div>

          {/* Warning */}
          <div className="flex items-center gap-2">
            <InfoIcon className="size-6 shrink-0 text-yellow-11" />
            <span className="font-manrope text-base font-bold leading-[1.1] text-yellow-11">
              {readOnly
                ? "Atenção: a divisão não pode ser alterada após a publicação"
                : "Atenção: a divisão não poderá ser alterada após a publicação"}
            </span>
          </div>
        </div>
      </div>

      {/* Card 2 — Payment methods */}
      <div className="flex flex-col gap-8 rounded-xl border border-gray-6 bg-gray-2 p-5">
        <div className="flex flex-col gap-4">
          <h2 className="font-manrope text-xl font-bold leading-[1.1] text-gray-12">
            Formas de pagamento aceitas
          </h2>
          <p className="font-family-dm-sans text-base leading-[1.3] text-gray-11">
            {readOnly
              ? "Formas de pagamento configuradas para este evento."
              : "Escolha como os participantes poderão pagar pela inscrição."}
          </p>
        </div>

        <div className="flex flex-col gap-5">
          {/* PIX */}
          <div className="flex items-center gap-5 rounded-lg border border-gray-6 bg-gray-2 p-5">
            <PixIcon className="size-10 shrink-0" />
            <span className="font-manrope text-lg font-extrabold leading-[1.1] text-gray-12">
              PIX
            </span>
          </div>

          {/* Debit card */}
          <div className="flex flex-col overflow-hidden rounded-lg border border-gray-6 bg-gray-2">
            <div className="flex items-center gap-5 p-5">
              <CardIcon className="size-10 shrink-0 text-gray-12" />
              <div className="flex flex-col gap-2">
                <span className="font-manrope text-lg font-extrabold leading-[1.1] text-gray-12">
                  Cartão de débito
                </span>
                <span className="font-family-dm-sans text-base font-medium leading-[1.3] text-gray-11">
                  Aceita Visa, Mastercard, Elo, Hipercard e American Express
                </span>
              </div>
            </div>
          </div>

          {/* Credit card */}
          <div className="flex flex-col overflow-hidden rounded-lg border border-gray-6 bg-gray-2">
            <div className="flex items-center gap-5 border-b border-gray-6 p-5">
              <CardIcon className="size-10 shrink-0 text-gray-12" />
              <div className="flex flex-col gap-2">
                <span className="font-manrope text-lg font-extrabold leading-[1.1] text-gray-12">
                  Cartão de crédito
                </span>
                <span className="font-family-dm-sans text-base font-medium leading-[1.3] text-gray-11">
                  Aceita Visa, Mastercard, Elo, Hipercard e American Express
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-5 p-5">
              <div className="flex flex-col gap-4">
                <span className="font-manrope text-base font-semibold leading-[1.1] text-gray-12">
                  {readOnly ? "Parcelamento configurado" : "Em quantas vezes o participante pode parcelar?"}
                </span>
                {!readOnly && (
                  <span className="font-family-dm-sans text-base leading-[1.3] text-gray-11">
                    Você pode oferecer parcelamento em até 3 vezes sem juros. Por padrão, parcelamos em 1x
                  </span>
                )}
              </div>
              <div className={cn("flex gap-3", readOnly && "pointer-events-none")}>
                {([1, 2, 3] as const).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => !readOnly && onMaxInstallmentsChange(n)}
                    className={cn(
                      "flex flex-1 flex-col items-center justify-center gap-5 rounded-lg border px-8 py-7 transition-colors",
                      maxInstallments === n
                        ? "border-[#46a758] bg-[#daf1db] text-[#203c25]"
                        : readOnly
                          ? "border-gray-6 bg-gray-3 text-gray-11"
                          : "border-gray-6 bg-gray-2 text-gray-12",
                    )}
                  >
                    <span className="font-manrope text-2xl font-extrabold leading-[1.1]">
                      {n}X
                    </span>
                    <span
                      className={cn(
                        "font-family-dm-sans text-base font-medium leading-[1.3]",
                        maxInstallments === n ? "text-[#203c25]" : readOnly ? "text-gray-11" : "text-gray-11",
                      )}
                    >
                      {n === 1 ? "À vista" : "Sem juros"}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
