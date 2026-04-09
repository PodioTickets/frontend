"use client";

import { useEffect, useRef } from "react";
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
      <div className="pb-8 pt-4">
        <InformationStep
          event={event}
          previewQuestions={previewQuestions}
          onBack={onBack}
          onNext={() =>
            toast("Pré-visualização — continuar só no fluxo real de checkout.")
          }
        />
      </div>
    </CheckoutPreviewProvider>
  );
}
