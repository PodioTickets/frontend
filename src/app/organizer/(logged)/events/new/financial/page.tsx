"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useOrganizerNavigate } from "@/hooks/useOrganizerNavigate";
import { userService } from "@/services";
import { useCreateEvent } from "@/contexts/CreateEventContext";
import { ensureCreateEventSyncedFromDraft } from "@/lib/createEventDraftSync";
import { Button } from "@/components/Button";
import { ArrowButton } from "@/components/ArrowButton";
import { usePublishEventModal } from "@/stores/modalStore";
import toast from "react-hot-toast";
import { cn } from "@/utils/cn";
import { UsersIcon } from "@/components/Icons/Organizer/UsersIcon";
import { OrganizerTicketIcon } from "@/components/Icons/Organizer/TicketIcon";
import { PixIcon } from "@/components/Icons/PixIcon";
import { CardIcon } from "@/components/Icons/CardIcon";
import { InfoIcon } from "@/components/Icons/InfoIcon";

const TOTAL_FEE = 6;
const BASE_SIMULATION = 100;

export default function FinancialPage() {
  const orgNav = useOrganizerNavigate();
  const { formData, updateFormData } = useCreateEvent();
  const { openPublishEventModal } = usePublishEventModal();
  const [authChecked, setAuthChecked] = useState(false);
  const [organizerPercent, setOrganizerPercent] = useState(0);
  const [maxInstallments, setMaxInstallments] = useState(1);

  const participantPercent = parseFloat((TOTAL_FEE - organizerPercent).toFixed(2));

  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const hasToken = userService.isAuthenticated();
    if (!hasToken) {
      orgNav.push("/organizer/login");
      return;
    }
    const timer = setTimeout(() => setAuthChecked(true), 300);
    return () => clearTimeout(timer);
  }, []);

  const handleOrganizerInput = (value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return;
    const clamped = Math.min(TOTAL_FEE, Math.max(0, parseFloat(num.toFixed(2))));
    setOrganizerPercent(clamped);
  };

  const handleParticipantInput = (value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return;
    const clamped = Math.min(TOTAL_FEE, Math.max(0, parseFloat(num.toFixed(2))));
    setOrganizerPercent(parseFloat((TOTAL_FEE - clamped).toFixed(2)));
  };

  const updateFromPointer = useCallback((clientX: number) => {
    if (!trackRef.current) return;
    const { left, width } = trackRef.current.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - left) / width));
    setOrganizerPercent(Math.round(ratio * TOTAL_FEE * 10) / 10);
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    updateFromPointer(e.clientX);
  }, [updateFromPointer]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.buttons === 0) return;
    updateFromPointer(e.clientX);
  }, [updateFromPointer]);


  const participantPays = parseFloat((BASE_SIMULATION + participantPercent).toFixed(2));
  const organizerReceives = parseFloat((BASE_SIMULATION - organizerPercent).toFixed(2));
  const sliderPosition = (organizerPercent / TOTAL_FEE) * 100;

  const handleBack = () => {
    orgNav.push("/organizer/events/new/questionnaire");
  };

  const handleSaveDraft = async () => {
    await ensureCreateEventSyncedFromDraft({ formData, updateFormData });
    toast.success("Evento salvo como rascunho com sucesso!");
  };

  const handlePublish = () => {
    if (!formData.createdEventId) {
      toast.error("Evento não encontrado");
      return;
    }
    openPublishEventModal({ eventId: formData.createdEventId });
  };

  if (!authChecked) return null;

  return (
    <div className="flex-1 px-5 pt-[52px] pb-[176px]">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 md:gap-9">

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
            Configure a divisão da taxa da plataforma e as formas de pagamento aceitas. Estes dados ficam travados após a publicação.
          </p>
        </div>

        {/* Card 1 — Divisão da taxa */}
        <div className="flex flex-col gap-7 rounded-xl border border-gray-6 bg-gray-2 p-5">
          {/* Title */}
          <div className="flex flex-col gap-4">
            <h2 className="font-manrope text-xl font-bold leading-[1.1] text-gray-12">
              Divisão da taxa da plataforma
            </h2>
            <p className="font-family-dm-sans text-base leading-[1.3] text-gray-11">
              A taxa total é de {TOTAL_FEE}%. Você decide quanto absorve e quanto repassa ao participante
            </p>
          </div>

          <div className="flex flex-col gap-6">
            {/* Inputs row */}
            <div className="flex items-end gap-4 md:gap-12">
              {/* Organizer input */}
              <div className="flex flex-1 flex-col gap-2">
                <label className="font-family-dm-sans text-lg leading-[1.3] text-gray-12">
                  Você (organizador) absorve
                </label>
                <div className="flex h-12 items-center gap-2 rounded-lg border border-gray-6 px-3">
                  <UsersIcon className="size-6 shrink-0 text-gray-11" />
                  <input
                    type="number"
                    min={0}
                    max={TOTAL_FEE}
                    step={0.01}
                    value={organizerPercent}
                    onChange={(e) => handleOrganizerInput(e.target.value)}
                    className="w-full bg-transparent font-manrope text-lg font-semibold leading-[1.1] text-gray-12 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                  <span className="font-manrope text-lg font-semibold leading-[1.1] text-gray-11">%</span>
                </div>
              </div>

              {/* Plus separator */}
              <div className="mb-1 flex shrink-0 items-center justify-center rounded-lg border border-gray-6 bg-gray-3 size-12">
                <span className="font-manrope text-xl font-bold text-gray-12">+</span>
              </div>

              {/* Participant input */}
              <div className="flex flex-1 flex-col gap-2">
                <label className="font-family-dm-sans text-lg leading-[1.3] text-gray-12">
                  Participante absorve
                </label>
                <div className="flex h-12 items-center gap-2 rounded-lg border border-gray-6 px-3">
                  <OrganizerTicketIcon className="size-5 shrink-0 text-gray-11" />
                  <input
                    type="number"
                    min={0}
                    max={TOTAL_FEE}
                    step={0.01}
                    value={participantPercent}
                    onChange={(e) => handleParticipantInput(e.target.value)}
                    className="w-full bg-transparent font-manrope text-lg font-semibold leading-[1.1] text-gray-12 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                  <span className="font-manrope text-lg font-semibold leading-[1.1] text-gray-11">%</span>
                </div>
              </div>
            </div>

            {/* Slider section */}
            <div className="flex flex-col gap-5">
              {/* Labels row */}
              <div className="flex items-center justify-between">
                <span className="font-family-dm-sans text-base leading-[1.3] text-gray-11">Você absorve</span>
                <div className="rounded-lg bg-gray-3 px-4 py-2">
                  <span className="font-family-dm-sans text-base font-medium leading-[1.3] text-gray-12">
                    Total: {TOTAL_FEE},0%
                  </span>
                </div>
                <span className="font-family-dm-sans text-base leading-[1.3] text-gray-11">Participante paga</span>
              </div>

              {/* Percentages + slider */}
              <div className="flex items-center gap-20">
                <span className="font-manrope text-xl font-bold leading-[1.1] text-gray-12 w-14 shrink-0 text-left">
                  {organizerPercent.toFixed(1)}%
                </span>
                {/* Track — pointer events aqui */}
                <div
                  ref={trackRef}
                  className="relative flex-1 h-8 cursor-pointer select-none"
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}

                >
                  {/* Track fill */}
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
                  {/* Handle */}
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

              <p className="text-center font-family-dm-sans text-base leading-[1.3] text-gray-11">
                Arraste o controle ou digite os valores acima. Os campos se ajustam automaticamente para somar {TOTAL_FEE}%
              </p>
            </div>

            {/* Live simulation */}
            <div className="flex flex-col gap-6 rounded-lg border border-gray-6 bg-gray-1 p-5">
              <div className="flex items-center justify-between">
                <span className="font-manrope text-lg font-bold leading-[1.1] text-gray-12">
                  Simulação ao vivo
                </span>
                <span className="font-family-dm-sans text-base leading-[1.3] text-gray-11">
                  Em uma inscrição de R$ {BASE_SIMULATION},00
                </span>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                {/* Participant card */}
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
                {/* Organizer card */}
                <div className="flex flex-1 flex-col gap-5 rounded-lg border border-[#d4cafe] bg-[#fdfcfe] p-5">
                  <span className="font-family-dm-sans text-base font-semibold leading-[1.3] text-[#6550b9]">
                    Você recebe
                  </span>
                  <span className="font-manrope text-2xl font-extrabold leading-[1.1] text-gray-12">
                    R$ {organizerReceives.toFixed(2).replace(".", ",")}
                  </span>
                  <span className="font-family-dm-sans text-base leading-[1.3] text-gray-11">
                    R$ {BASE_SIMULATION},00 (ingresso) − R$ {organizerPercent.toFixed(2).replace(".", ",")} (sua taxa)
                  </span>
                </div>
              </div>
            </div>

            {/* Warning */}
            <div className="flex items-center gap-2">
              <InfoIcon className="size-6 shrink-0 text-yellow-11" />
              <span className="font-manrope text-base font-bold leading-[1.1] text-yellow-11">
                Atenção: a divisão não poderá ser alterada após a publicação
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
              Escolha como os participantes poderão pagar pela inscrição.
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

            {/* Credit card */}
            <div className="flex flex-col overflow-hidden rounded-lg border border-gray-6 bg-gray-2">
              {/* Header */}
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

              {/* Installments */}
              <div className="flex flex-col gap-5 p-5">
                <div className="flex flex-col gap-4">
                  <span className="font-manrope text-base font-semibold leading-[1.1] text-gray-12">
                    Em quantas vezes o participante pode parcelar?
                  </span>
                  <span className="font-family-dm-sans text-base leading-[1.3] text-gray-11">
                    Você pode oferecer parcelamento em até 3 vezes sem juros. Por padrão, parcelamos em 1x
                  </span>
                </div>
                <div className="flex gap-3">
                  {([1, 2, 3] as const).map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setMaxInstallments(n)}
                      className={cn(
                        "flex flex-1 flex-col items-center justify-center gap-5 rounded-lg border px-8 py-7 transition-colors",
                        maxInstallments === n
                          ? "border-[#46a758] bg-[#daf1db] text-[#203c25]"
                          : "border-gray-6 bg-gray-2 text-gray-12",
                      )}
                    >
                      <span className="font-manrope text-2xl font-extrabold leading-[1.1]">
                        {n}X
                      </span>
                      <span
                        className={cn(
                          "font-family-dm-sans text-base font-medium leading-[1.3]",
                          maxInstallments === n ? "text-[#203c25]" : "text-gray-11",
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

        {/* Bottom buttons */}
        <div
          className={cn(
            "flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end sm:gap-2",
            "max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:z-30 max-md:border-t max-md:border-gray-6 max-md:bg-gray-1 max-md:p-4",
            "max-md:pb-[max(1rem,env(safe-area-inset-bottom))]",
          )}
        >
          <Button
            type="button"
            onClick={handleSaveDraft}
            variant="default"
            className={cn(
              "h-[52px] px-11 font-manrope text-lg font-bold text-gray-12 bg-yellow-3 border border-yellow-6 hover:bg-yellow-4 hover:border-yellow-6 active:bg-yellow-5 active:border-yellow-6",
              "max-md:h-12 max-md:w-full max-md:px-4",
            )}
          >
            Salvar rascunho
          </Button>
          <Button
            type="button"
            onClick={handlePublish}
            variant="default"
            className={cn(
              "h-[52px] px-11 font-manrope text-lg font-bold text-gray-12",
              "max-md:h-12 max-md:w-full max-md:px-4",
            )}
          >
            Publicar evento
          </Button>
        </div>
      </div>
    </div>
  );
}
