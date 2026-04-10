"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import toast from "react-hot-toast";
import { useOrganizerNavigate } from "@/hooks/useOrganizerNavigate";
import { useEditEvent } from "@/contexts/EditEventContext";
import { CheckoutPreviewProvider } from "@/contexts/CheckoutContext";
import { ModalitiesStep } from "@/components/Checkout/ModalitiesStep";
import { Loading } from "@/components/Loading";
import { Button } from "@/components/Button";
import { ArrowButton } from "@/components/ArrowButton";
import type { Event } from "@/interfaces/event";
import {
  defaultEventKitSelectionDisplay,
  parseEventKitSelectionDisplay,
} from "@/lib/eventKitSelectionDisplay";
import { readTicketsCheckoutPreviewDraft } from "@/lib/ticketsCheckoutPreviewDraft";

export default function EditTicketsCheckoutPreviewPage() {
  const params = useParams();
  const eventId = params.id as string;
  const orgNav = useOrganizerNavigate();
  const { event, loading } = useEditEvent();
  const [previewEvent, setPreviewEvent] = useState<Event | null>(null);

  useEffect(() => {
    if (!event) {
      setPreviewEvent(null);
      return;
    }
    const draft = readTicketsCheckoutPreviewDraft(eventId);
    const kit = draft?.kitSelectionDisplay
      ? {
        ...defaultEventKitSelectionDisplay(),
        ...draft.kitSelectionDisplay,
        primaryKitProductByTicketId: {
          ...draft.kitSelectionDisplay.primaryKitProductByTicketId,
        },
        primaryKitProductByCategoryId: {
          ...draft.kitSelectionDisplay.primaryKitProductByCategoryId,
        },
      }
      : parseEventKitSelectionDisplay(event.kitSelectionDisplay);
    setPreviewEvent({ ...event, kitSelectionDisplay: kit } as Event);
  }, [event, eventId]);

  const handleBack = useCallback(() => {
    orgNav.push(`/organizer/events/${eventId}/edit/tickets`);
  }, [orgNav, eventId]);

  const handleNext = useCallback(() => {
    toast("Pré-visualização — avançar para a próxima etapa só no checkout real.");
  }, []);

  if (loading || !previewEvent) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loading />
      </div>
    );
  }

  return (
    <div className="pb-24 pt-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-14">
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
              Pré-visualização — escolha de ingressos
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

      <CheckoutPreviewProvider>
        <ModalitiesStep event={previewEvent} onNext={handleNext} />
      </CheckoutPreviewProvider>
    </div>
  );
}
