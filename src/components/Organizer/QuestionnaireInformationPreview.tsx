"use client";

import { useCallback, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import {
  CheckoutPreviewProvider,
  useCheckout,
} from "@/contexts/CheckoutContext";
import { InformationStep } from "@/components/Checkout/InformationStep";
import type { Event } from "@/interfaces/event";
import type { Question } from "@/interfaces/event";
import { Button } from "@/components/Button";
import { ArrowButton } from "@/components/ArrowButton";
import { Loading } from "@/components/Loading";
import { useTickets } from "@/hooks/useTickets";
import { useOrganizerNavigate } from "@/hooks/useOrganizerNavigate";

function SeedFirstTicketQuantity({ eventId }: { eventId: string }) {
  const { tickets, loading } = useTickets(eventId, !!eventId);
  const { raceQuantities, updateRaceQuantity } = useCheckout();
  const done = useRef(false);

  useEffect(() => {
    if (loading || done.current) return;
    const valid = tickets.filter((t) => {
      try {
        const p = parseFloat(t.price.replace(/[^\d,]/g, "").replace(",", "."));
        return !isNaN(p) && p > 0;
      } catch {
        return false;
      }
    });
    const first = valid[0] ?? tickets[0];
    if (first) {
      if ((raceQuantities[first.id] || 0) < 1) {
        updateRaceQuantity(first.id, 1);
      }
      done.current = true;
    }
  }, [loading, tickets, raceQuantities, updateRaceQuantity]);

  return null;
}

export function QuestionnaireInformationPreview({
  event,
  eventId,
  previewQuestions,
  onBack,
}: {
  event: Event;
  eventId: string;
  /** `undefined` = carregar perguntas pela API (sem rascunho). */
  previewQuestions: Question[] | undefined;
  onBack: () => void;
}) {
  const { tickets, loading: ticketsLoading } = useTickets(eventId, !!eventId);
  const orgNav = useOrganizerNavigate();
  const handleBack = useCallback(() => {
    orgNav.push(`/organizer/events/${eventId}/edit/questionnaire`);
  }, [orgNav, eventId]);

  if (ticketsLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loading />
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="flex flex-col gap-4 py-8">
        <p className="text-gray-11">
          Não há ingressos cadastrados neste evento. Cadastre ao menos um
          ingresso com preço para pré-visualizar a etapa de informações como no
          checkout.
        </p>
        <Button type="button" variant="outline" onClick={onBack}>
          Voltar
        </Button>
      </div>
    );
  }

  return (
    <CheckoutPreviewProvider>
      <SeedFirstTicketQuantity eventId={eventId} />
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-14 w-full">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="flex size-9 rotate-180 cursor-pointer items-center justify-center rounded-[52px] border border-gray-6 transition-colors hover:bg-gray-3"
          >
            <ArrowButton isOpen={false} />
          </button>
          <div>
            <h1 className="font-manrope text-xl font-bold text-gray-12 md:text-2xl">
              Pré-visualização — questionário
            </h1>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-11 shrink-0 border-gray-6 font-manrope font-semibold text-gray-12"
          onClick={handleBack}
        >
          Voltar para edição
        </Button>
      </div>

      <div className="pb-8 pt-4">
        <InformationStep
          event={event}
          previewQuestions={previewQuestions}
          previewMode
          onBack={onBack}
          onNext={() =>
            toast("Pré-visualização — continuar só no fluxo real de checkout.")
          }
        />
      </div>
    </CheckoutPreviewProvider>
  );
}
