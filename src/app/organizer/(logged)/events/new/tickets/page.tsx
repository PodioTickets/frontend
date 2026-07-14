"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useOrganizerNavigate } from "@/hooks/useOrganizerNavigate";
import { useWizardAuth } from "@/hooks/useWizardAuth";
import { useCreateEvent } from "@/contexts/CreateEventContext";
import { organizerService } from "@/services";
import { Button } from "@/components/Button";
import { TicketsSection, type TicketsSectionRef } from "@/components/Organizer/TicketsSection";
import { TicketAdvancedKitDisplayOptions } from "@/components/Ticket/TicketAdvancedKitDisplayOptions";
import { type KitImageLayoutMode } from "@/components/Ticket/KitImagePositionDrawer";
import {
  defaultEventKitSelectionDisplay,
  initialEventKitSelectionDisplayForCreation,
  drawerModeToApiLayout,
  layoutToDrawerMode,
  type EventKitSelectionDisplay,
} from "@/lib/eventKitSelectionDisplay";
import {
  readTicketsCheckoutPreviewDraft,
  writeTicketsCheckoutPreviewDraft,
} from "@/lib/ticketsCheckoutPreviewDraft";
import toast from "react-hot-toast";

export default function IngressosPage() {
  const orgNav = useOrganizerNavigate();
  const { authChecked } = useWizardAuth();
  const { formData } = useCreateEvent();
  const eventId = formData.createdEventId;
  const ticketsSectionRef = useRef<TicketsSectionRef>(null);
  const [savingConfirm, setSavingConfirm] = useState(false);
  const [kitImagePositionDrawerOpen, setKitImagePositionDrawerOpen] = useState(false);

  // Configuração de exibição das imagens do kit (radio Sim/Não + posições).
  // No fluxo de criação não há baseline salvo: começa no default e é persistido
  // no evento ao confirmar os ingressos.
  const [draftKitSelection, setDraftKitSelection] = useState<EventKitSelectionDisplay>(
    () => ({ ...initialEventKitSelectionDisplayForCreation() }),
  );

  // Ao voltar da página de prévia o componente remonta. Reidrata o rascunho do
  // sessionStorage pra preservar as escolhas do usuário (mesmo padrão do edit).
  useEffect(() => {
    if (!eventId) return;
    const draft = readTicketsCheckoutPreviewDraft(eventId);
    if (!draft) return;
    setDraftKitSelection({
      ...defaultEventKitSelectionDisplay(),
      ...draft.kitSelectionDisplay,
      primaryKitProductByTicketId: { ...draft.kitSelectionDisplay.primaryKitProductByTicketId },
      primaryKitProductByCategoryId: { ...draft.kitSelectionDisplay.primaryKitProductByCategoryId },
    });
  }, [eventId]);

  // Difere do default? Usado só pra já abrir o painel avançado quando o usuário
  // volta da prévia com escolhas pendentes.
  const kitSelectionDirty = useMemo(() => {
    const def = initialEventKitSelectionDisplayForCreation();
    const norm = (k: EventKitSelectionDisplay) =>
      JSON.stringify({
        show: k.showKitImagesOnSelection,
        layout: k.kitImagesLayout,
        byTicket: k.primaryKitProductByTicketId,
        byCat: k.primaryKitProductByCategoryId,
      });
    return norm(draftKitSelection) !== norm(def);
  }, [draftKitSelection]);

  const handleBack = useCallback(() => {
    orgNav.push("/organizer/events/new/banner");
  }, [orgNav]);

  const handleConfirmIngressos = useCallback(async () => {
    if (!eventId) {
      toast.error("Evento não encontrado.");
      return;
    }
    setSavingConfirm(true);
    try {
      await ticketsSectionRef.current?.flushAndPersistAll();
      // Persiste a configuração de exibição do kit no evento (default ou
      // ajustada pelo usuário) antes de avançar.
      await organizerService.updateEvent(
        eventId,
        {
          kitSelectionDisplay: {
            ...defaultEventKitSelectionDisplay(),
            ...draftKitSelection,
            primaryKitProductByTicketId: { ...draftKitSelection.primaryKitProductByTicketId },
            primaryKitProductByCategoryId: { ...draftKitSelection.primaryKitProductByCategoryId },
          },
        },
        { clientPage: "events/new/tickets" },
      );
      orgNav.push("/organizer/events/new/topics");
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível salvar os ingressos.");
    } finally {
      setSavingConfirm(false);
    }
  }, [eventId, draftKitSelection, orgNav]);

  const handleOpenPreview = useCallback(() => {
    if (!eventId) return;
    writeTicketsCheckoutPreviewDraft({
      v: 1,
      eventId,
      kitSelectionDisplay: {
        ...defaultEventKitSelectionDisplay(),
        ...draftKitSelection,
        primaryKitProductByTicketId: { ...draftKitSelection.primaryKitProductByTicketId },
        primaryKitProductByCategoryId: { ...draftKitSelection.primaryKitProductByCategoryId },
      },
    });
    orgNav.push("/organizer/events/new/tickets/preview");
  }, [eventId, draftKitSelection, orgNav]);

  const handleKitDrawerSave = useCallback(
    (payload: {
      layout: KitImageLayoutMode;
      primaryImageUrlByTicketId: Record<string, string>;
      primaryImageUrlByCategoryId: Record<string, string>;
      hiddenImageUrlsByTicketId: Record<string, string[]>;
      hiddenImageUrlsByCategoryId: Record<string, string[]>;
    }) => {
      setDraftKitSelection((prev) => ({
        ...defaultEventKitSelectionDisplay(),
        ...prev,
        kitImagesLayout: drawerModeToApiLayout(payload.layout),
        primaryKitProductByTicketId: { ...payload.primaryImageUrlByTicketId },
        primaryKitProductByCategoryId: { ...payload.primaryImageUrlByCategoryId },
        hiddenKitImageUrlsByTicketId: { ...payload.hiddenImageUrlsByTicketId },
        hiddenKitImageUrlsByCategoryId: { ...payload.hiddenImageUrlsByCategoryId },
      }));
    },
    [],
  );

  const drawerInitialKitSelection = useMemo(
    () => ({
      layout: layoutToDrawerMode(draftKitSelection.kitImagesLayout),
      primaryByTicket: { ...draftKitSelection.primaryKitProductByTicketId },
      primaryByCategory: { ...draftKitSelection.primaryKitProductByCategoryId },
      hiddenByTicket: { ...draftKitSelection.hiddenKitImageUrlsByTicketId },
      hiddenByCategory: { ...draftKitSelection.hiddenKitImageUrlsByCategoryId },
    }),
    [draftKitSelection],
  );

  return (
    <div className="flex-1 bg-gray-2 px-4 pb-4 mt-0 pt-0 md:px-5 md:pb-20 md:pt-10">
      <div className="max-w-7xl w-full mx-auto">
        <TicketsSection
          ref={ticketsSectionRef}
          eventId={eventId}
          authChecked={authChecked}
          persistMode="draft"
          onBack={handleBack}
          onCreateTicket={() => orgNav.push("/organizer/events/new/tickets/create")}
          onEditTicket={(ticketId) =>
            orgNav.push(`/organizer/events/new/tickets/edit/${ticketId}`)
          }
          innerClassName="flex w-full flex-col gap-5 md:gap-9"
          extraContent={
            <div className="w-full">
              <TicketAdvancedKitDisplayOptions
                showKitImagesOnSelection={draftKitSelection.showKitImagesOnSelection}
                onShowKitImagesOnSelectionChange={(value) =>
                  setDraftKitSelection((prev) => ({
                    ...defaultEventKitSelectionDisplay(),
                    ...prev,
                    showKitImagesOnSelection: value,
                  }))
                }
                kitImagesLayout={draftKitSelection.kitImagesLayout}
                onOpenKitImagePositionDrawer={() => setKitImagePositionDrawerOpen(true)}
                defaultOpen={kitSelectionDirty}
              />
            </div>
          }
          kitImagePositionDrawer={{
            open: kitImagePositionDrawerOpen,
            onClose: () => setKitImagePositionDrawerOpen(false),
            initialKitSelection: drawerInitialKitSelection,
            onSave: handleKitDrawerSave,
            saveSuccessMessage:
              "Posição das imagens atualizada. Use «Confirmar ingressos» abaixo para gravar no evento.",
          }}
          actionSlot={(ticketCount) => (
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={handleOpenPreview}
                disabled={ticketCount === 0 || !eventId}
                className="rounded-lg sm:px-8 font-manrope text-gray-12 border-gray-6 text-lg sm:text-base font-bold disabled:cursor-not-allowed disabled:opacity-50"
              >
                Prévia
              </Button>
              <Button
                type="button"
                onClick={() => void handleConfirmIngressos()}
                variant="default"
                disabled={savingConfirm || ticketCount === 0}
                className="rounded-lg font-manrope text-lg sm:text-base font-bold disabled:cursor-not-allowed disabled:opacity-50 sm:px-8"
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
