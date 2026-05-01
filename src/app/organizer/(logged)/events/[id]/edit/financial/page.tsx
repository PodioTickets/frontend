"use client";

import { useParams } from "next/navigation";
import { useOrganizerNavigate } from "@/hooks/useOrganizerNavigate";
import { ArrowButton } from "@/components/ArrowButton";
import { cn } from "@/utils/cn";
import { UsersIcon } from "@/components/Icons/Organizer/UsersIcon";
import { OrganizerTicketIcon } from "@/components/Icons/Organizer/TicketIcon";
import { PixIcon } from "@/components/Icons/PixIcon";
import { CardIcon } from "@/components/Icons/CardIcon";
import { InfoIcon } from "@/components/Icons/InfoIcon";

const TOTAL_FEE = 6;
const BASE_SIMULATION = 100;

const ORGANIZER_PERCENT = 0;
const MAX_INSTALLMENTS = 1;

const participantPercent = parseFloat((TOTAL_FEE - ORGANIZER_PERCENT).toFixed(2));
const sliderPosition = (ORGANIZER_PERCENT / TOTAL_FEE) * 100;
const participantPays = parseFloat((BASE_SIMULATION + participantPercent).toFixed(2));
const organizerReceives = parseFloat((BASE_SIMULATION - ORGANIZER_PERCENT).toFixed(2));

export default function EditFinancialPage() {
  const params = useParams();
  const eventId = params.id as string;
  const orgNav = useOrganizerNavigate();

  const handleBack = () => {
    orgNav.push(`/organizer/events/${eventId}/edit/questionnaire`);
  };

  return (
    <div className="flex-1 px-5 pb-[176px]">
      <div className="mx-auto flex max-w-7xl w-full flex-col gap-8 md:gap-9">

        {/* Mobile header */}
        <div
          className={cn(
            "flex h-[52px] items-center gap-2 border-b border-gray-6 bg-gray-2",
            "max-md:-mx-5 max-md:px-5 md:hidden",
          )}
        >
          <button
            type="button"
            onClick={handleBack}
            className="flex size-8 shrink-0 items-center justify-center rounded-[52px] border border-gray-6 transition-colors hover:bg-gray-3 rotate-180"
          >
            <ArrowButton isOpen={false} />
          </button>
          <h1 className="font-manrope text-base font-extrabold leading-[1.1] text-gray-12">
            Financeiro
          </h1>
        </div>

        {/* Title — desktop */}
        <div className="flex flex-col gap-4">
          <div className="hidden gap-3 md:flex md:items-center">
            <button
              type="button"
              onClick={handleBack}
              className="flex size-9 cursor-pointer items-center justify-center rounded-[52px] border border-gray-6 transition-colors hover:bg-gray-3 rotate-180"
            >
              <ArrowButton isOpen={false} />
            </button>
            <h1 className="font-manrope text-[28px] font-bold leading-[1.1] text-gray-12">
              Financeiro
            </h1>
          </div>
          <p className="font-family-dm-sans text-base leading-[1.3] text-gray-11">
            Configurações financeiras do evento. Estes dados ficam travados após a publicação.
          </p>
        </div>

        {/* Card 1 — Divisão da taxa */}
        <div className="flex flex-col gap-7 rounded-xl border border-gray-6 bg-gray-2 p-5">
          <div className="flex flex-col gap-4">
            <h2 className="font-manrope text-xl font-bold leading-[1.1] text-gray-12">
              Divisão da taxa da plataforma
            </h2>
            <p className="font-family-dm-sans text-base leading-[1.3] text-gray-11">
              A taxa total é de {TOTAL_FEE}%. Confira como a taxa está dividida entre você e os participantes.
            </p>
          </div>

          <div className="flex flex-col gap-6">
            {/* Display row — read-only */}
            <div className="flex items-end gap-4 md:gap-12">
              <div className="flex flex-1 flex-col gap-2">
                <span className="font-family-dm-sans text-lg leading-[1.3] text-gray-12">
                  Você (organizador) absorve
                </span>
                <div className="flex h-12 items-center gap-2 rounded-lg border border-gray-6 bg-gray-3 px-3 cursor-not-allowed select-none">
                  <UsersIcon className="size-6 shrink-0 text-gray-11" />
                  <span className="font-manrope text-lg font-semibold leading-[1.1] text-gray-11">
                    {ORGANIZER_PERCENT}%
                  </span>
                </div>
              </div>

              <div className="mb-1 flex shrink-0 items-center justify-center rounded-lg border border-gray-6 bg-gray-3 size-12">
                <span className="font-manrope text-xl font-bold text-gray-12">+</span>
              </div>

              <div className="flex flex-1 flex-col gap-2">
                <span className="font-family-dm-sans text-lg leading-[1.3] text-gray-12">
                  Participante absorve
                </span>
                <div className="flex h-12 items-center gap-2 rounded-lg border border-gray-6 bg-gray-3 px-3 cursor-not-allowed select-none">
                  <OrganizerTicketIcon className="size-5 shrink-0 text-gray-11" />
                  <span className="font-manrope text-lg font-semibold leading-[1.1] text-gray-11">
                    {participantPercent}%
                  </span>
                </div>
              </div>
            </div>

            {/* Slider — visual only */}
            <div className="flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <span className="font-family-dm-sans text-base leading-[1.3] text-gray-11">Você absorve</span>
                <div className="rounded-lg bg-gray-3 px-4 py-2">
                  <span className="font-family-dm-sans text-base font-medium leading-[1.3] text-gray-12">
                    Total: {TOTAL_FEE},0%
                  </span>
                </div>
                <span className="font-family-dm-sans text-base leading-[1.3] text-gray-11">Participante paga</span>
              </div>

              <div className="flex items-center gap-10">
                <span className="font-manrope text-xl font-bold leading-[1.1] text-gray-12 w-12 text-left">
                  {ORGANIZER_PERCENT.toFixed(2)}%
                </span>
                <div className="relative flex-1 pointer-events-none">
                  <div className="relative h-8 w-full rounded-full overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 bg-[#6e56cf] rounded-full"
                      style={{ width: `${sliderPosition}%` }}
                    />
                    <div
                      className="absolute inset-y-0 right-0 bg-[#30a476] rounded-full"
                      style={{ width: `${100 - sliderPosition}%` }}
                    />
                  </div>
                  <div
                    className="absolute top-0 flex size-8 -translate-x-1/2 items-center justify-center rounded-full border border-gray-12 bg-gray-2 shadow"
                    style={{ left: `${sliderPosition}%` }}
                  >
                    <div className="flex flex-col gap-[3px]">
                      <div className="h-[2px] w-3 bg-gray-12 rounded-full" />
                      <div className="h-[2px] w-3 bg-gray-12 rounded-full" />
                      <div className="h-[2px] w-3 bg-gray-12 rounded-full" />
                    </div>
                  </div>
                </div>
                <span className="font-manrope text-xl font-bold leading-[1.1] text-gray-12 w-12 text-right">
                  {participantPercent.toFixed(2)}%
                </span>
              </div>
            </div>

            {/* Live simulation */}
            <div className="flex flex-col gap-6 rounded-lg border border-gray-6 bg-gray-1 p-5">
              <div className="flex items-center justify-between">
                <span className="font-manrope text-lg font-bold leading-[1.1] text-gray-12">
                  Simulação
                </span>
                <span className="font-family-dm-sans text-base leading-[1.3] text-gray-11">
                  Em uma inscrição de R$ {BASE_SIMULATION},00
                </span>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="flex flex-1 flex-col gap-5 rounded-lg border border-[#9ddde7] bg-[#fafdfe] p-5">
                  <span className="font-family-dm-sans text-base font-semibold leading-[1.3] text-[#107d98]">
                    Participante paga
                  </span>
                  <span className="font-manrope text-2xl font-extrabold leading-[1.1] text-gray-12">
                    R$ {participantPays.toFixed(2).replace(".", ",")}
                  </span>
                  <span className="font-family-dm-sans text-base leading-[1.3] text-gray-11">
                    R$ {BASE_SIMULATION},00 (ingresso) + R$ {participantPercent.toFixed(2).replace(".", ",")} (taxa)
                  </span>
                </div>
                <div className="flex flex-1 flex-col gap-5 rounded-lg border border-[#d4cafe] bg-[#fdfcfe] p-5">
                  <span className="font-family-dm-sans text-base font-semibold leading-[1.3] text-[#6550b9]">
                    Você recebe
                  </span>
                  <span className="font-manrope text-2xl font-extrabold leading-[1.1] text-gray-12">
                    R$ {organizerReceives.toFixed(2).replace(".", ",")}
                  </span>
                  <span className="font-family-dm-sans text-base leading-[1.3] text-gray-11">
                    R$ {BASE_SIMULATION},00 (ingresso) − R$ {ORGANIZER_PERCENT.toFixed(2).replace(".", ",")} (sua taxa)
                  </span>
                </div>
              </div>
            </div>

            {/* Warning */}
            <div className="flex items-center gap-2">
              <InfoIcon className="size-6 shrink-0 text-yellow-11" />
              <span className="font-manrope text-base font-bold leading-[1.1] text-yellow-11">
                Atenção: a divisão não pode ser alterada após a publicação
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
              Formas de pagamento configuradas para este evento.
            </p>
          </div>

          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-5 rounded-lg border border-gray-6 bg-gray-2 p-5">
              <PixIcon className="size-10 shrink-0" />
              <span className="font-manrope text-lg font-extrabold leading-[1.1] text-gray-12">
                PIX
              </span>
            </div>

            <div className="flex flex-col overflow-hidden rounded-lg border border-gray-6 bg-gray-2">
              <div className="flex items-center gap-5 border-b border-gray-6 p-5">
                <CardIcon className="size-10 shrink-0 text-gray-12" />
                <div className="flex flex-col gap-4">
                  <span className="font-manrope text-lg font-extrabold leading-[1.1] text-gray-12">
                    Cartão de crédito
                  </span>
                  <span className="font-family-dm-sans text-base font-medium leading-[1.3] text-gray-11">
                    Aceita Visa, Mastercard, Elo, Hipercard e American Express
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-5 p-5">
                <span className="font-manrope text-base font-semibold leading-[1.1] text-gray-12">
                  Parcelamento configurado
                </span>
                <div className="flex gap-3 pointer-events-none">
                  {([1, 2, 3] as const).map((n) => (
                    <div
                      key={n}
                      className={cn(
                        "flex flex-1 flex-col items-center justify-center gap-5 rounded-lg border px-8 py-7",
                        MAX_INSTALLMENTS === n
                          ? "border-[#46a758] bg-[#daf1db] text-[#203c25]"
                          : "border-gray-6 bg-gray-3 text-gray-11",
                      )}
                    >
                      <span className="font-manrope text-2xl font-extrabold leading-[1.1]">
                        {n}X
                      </span>
                      <span className="font-family-dm-sans text-base font-medium leading-[1.3]">
                        {n === 1 ? "À vista" : "Sem juros"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
