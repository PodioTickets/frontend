"use client";

import { useEffect, useState, useCallback } from "react";
import { useOrganizerNavigate } from "@/hooks/useOrganizerNavigate";
import { useCreateEvent } from "@/contexts/CreateEventContext";
import { organizerService } from "@/services";
import { CheckoutPreviewProvider } from "@/contexts/CheckoutContext";
import { CheckoutTimerPreviewProvider } from "@/contexts/CheckoutTimerContext";
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

export default function CreateTicketsCheckoutPreviewPage() {
  const orgNav = useOrganizerNavigate();
  const { formData } = useCreateEvent();
  const eventId = formData.createdEventId;
  const [previewEvent, setPreviewEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (!eventId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    organizerService
      .getEventById(eventId)
      .then((event) => {
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
      })
      .catch(() => {
        setPreviewEvent(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [eventId]);

  const handleBack = useCallback(() => {
    orgNav.push("/organizer/events/new/tickets");
  }, [orgNav]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loading />
      </div>
    );
  }

  if (!previewEvent) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-gray-11">Evento não encontrado. Crie o evento primeiro.</p>
      </div>
    );
  }

  return (
    <div className="pb-24 pt-6 w-full max-w-7xl mx-auto">
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
        <CheckoutTimerPreviewProvider>
          <ModalitiesStep
            event={previewEvent}
            onNext={() => {
              handleBack();
            }}
          />
        </CheckoutTimerPreviewProvider>
      </CheckoutPreviewProvider>
    </div>
  );
}
