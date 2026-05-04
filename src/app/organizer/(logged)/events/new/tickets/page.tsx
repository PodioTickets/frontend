"use client";

import { useState, useRef, useCallback } from "react";
import { useOrganizerNavigate } from "@/hooks/useOrganizerNavigate";
import { useWizardAuth } from "@/hooks/useWizardAuth";
import { useCreateEvent } from "@/contexts/CreateEventContext";
import { Button } from "@/components/Button";
import { TicketsSection, type TicketsSectionRef } from "@/components/Organizer/TicketsSection";
import { writeTicketsCheckoutPreviewDraft } from "@/lib/ticketsCheckoutPreviewDraft";
import { defaultEventKitSelectionDisplay } from "@/lib/eventKitSelectionDisplay";
import toast from "react-hot-toast";

export default function IngressosPage() {
  const orgNav = useOrganizerNavigate();
  const { authChecked } = useWizardAuth();
  const { formData } = useCreateEvent();
  const ticketsSectionRef = useRef<TicketsSectionRef>(null);
  const [savingConfirm, setSavingConfirm] = useState(false);

  const handleBack = useCallback(() => {
    orgNav.push("/organizer/events/new/banner");
  }, [orgNav]);

  const handleConfirmIngressos = useCallback(async () => {
    const eventId = formData.createdEventId;
    if (!eventId) {
      toast.error("Evento não encontrado.");
      return;
    }
    setSavingConfirm(true);
    try {
      await ticketsSectionRef.current?.flushAndPersistAll();
      orgNav.push("/organizer/events/new/topics");
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível salvar a ordem das categorias.");
    } finally {
      setSavingConfirm(false);
    }
  }, [formData.createdEventId, orgNav]);

  const handleOpenPreview = useCallback(() => {
    const eventId = formData.createdEventId;
    if (!eventId) return;
    writeTicketsCheckoutPreviewDraft({
      v: 1,
      eventId,
      kitSelectionDisplay: defaultEventKitSelectionDisplay(),
    });
    orgNav.push("/organizer/events/new/tickets/preview");
  }, [formData.createdEventId, orgNav]);

  return (
    <div className="flex-1 bg-gray-2 px-4 pb-32 pt-0 md:bg-transparent md:px-5 md:pb-0 md:pt-[52px] lg:px-[124px]">
      <div className="mx-auto max-w-[1192px]">
        <TicketsSection
          ref={ticketsSectionRef}
          eventId={formData.createdEventId}
          authChecked={authChecked}
          persistMode="draft"
          onBack={handleBack}
          onCreateTicket={() => orgNav.push("/organizer/events/new/tickets/create")}
          onEditTicket={(ticketId) =>
            orgNav.push(`/organizer/events/new/tickets/edit/${ticketId}`)
          }
          innerClassName="flex flex-col gap-5 md:gap-9"
          actionSlot={(ticketCount) => (
            <div className="flex flex-col gap-2 md:flex-row md:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={handleOpenPreview}
                disabled={ticketCount === 0 || !formData.createdEventId}
                className="h-14 w-full rounded-lg border-gray-6 font-manrope font-bold text-gray-12 disabled:cursor-not-allowed disabled:opacity-50 md:h-12 md:w-auto md:px-10 md:text-[18px]"
              >
                Prévia
              </Button>
              <Button
                type="button"
                onClick={() => void handleConfirmIngressos()}
                variant="default"
                disabled={savingConfirm || ticketCount === 0}
                className="h-14 w-full rounded-lg font-manrope font-bold disabled:cursor-not-allowed disabled:opacity-50 md:h-12 md:w-auto md:px-10 md:text-[18px]"
              >
                {savingConfirm ? "Salvando..." : "Confirmar ingressos"}
              </Button>
            </div>
          )}
        />
      </div>
    </div>
  );
}
