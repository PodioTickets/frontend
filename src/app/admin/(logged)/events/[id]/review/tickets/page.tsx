"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { userService, organizerService } from "@/services";
import { useEditEvent } from "@/contexts/EditEventContext";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/services/cache/QueryClient";
import { Button } from "@/components/Button";
import { UnsavedChangesModal } from "@/components/UnsavedChangesModal";
import { useUnsavedLeaveGuard } from "@/hooks/useUnsavedLeaveGuard";
import { TicketAdvancedKitDisplayOptions } from "@/components/Ticket/TicketAdvancedKitDisplayOptions";
import { type KitImageLayoutMode } from "@/components/Ticket/KitImagePositionDrawer";
import {
  defaultEventKitSelectionDisplay,
  drawerModeToApiLayout,
  layoutToDrawerMode,
  parseEventKitSelectionDisplay,
  type EventKitSelectionDisplay,
} from "@/lib/eventKitSelectionDisplay";
import {
  clearTicketsCheckoutPreviewDraft,
  readTicketsCheckoutPreviewDraft,
  writeTicketsCheckoutPreviewDraft,
} from "@/lib/ticketsCheckoutPreviewDraft";
import { TicketsSection, type TicketsSectionRef } from "@/components/Organizer/TicketsSection";
import toast from "react-hot-toast";

export default function ReviewTicketsPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;
  const { event, reloadEvent } = useEditEvent();
  const queryClient = useQueryClient();
  const ticketsSectionRef = useRef<TicketsSectionRef>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [savingNavigate, setSavingNavigate] = useState(false);
  const [kitImagePositionDrawerOpen, setKitImagePositionDrawerOpen] = useState(false);

  useEffect(() => {
    if (!userService.isAuthenticated()) {
      router.push("/admin/login");
      return;
    }
    const timer = setTimeout(() => setAuthChecked(true), 300);
    return () => clearTimeout(timer);
  }, [router]);

  const kitSelectionDisplayKey = useMemo(
    () => JSON.stringify(event?.kitSelectionDisplay ?? null),
    [event?.kitSelectionDisplay],
  );

  const savedKitSelection = useMemo(
    () => parseEventKitSelectionDisplay(event?.kitSelectionDisplay),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [kitSelectionDisplayKey],
  );

  const [draftKitSelection, setDraftKitSelection] = useState<EventKitSelectionDisplay>(() => ({
    ...defaultEventKitSelectionDisplay(),
  }));

  // Quando o usuário volta da página de prévia (`/review/tickets/preview`), o
  // componente remonta — sem isso, o draft local seria sobrescrito pelo
  // `savedKitSelection` no useEffect abaixo. Lemos o sessionStorage uma vez
  // no mount e marcamos a ref pra travar a ressincronização.
  const hydratedFromStorageRef = useRef(false);
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
    hydratedFromStorageRef.current = true;
  }, [eventId]);

  useEffect(() => {
    // Se hidratamos do sessionStorage (volta da prévia com alterações
    // pendentes), não sobrescrever — `discardLocalChanges` e save fazem o
    // reset explícito e zeram a ref.
    if (hydratedFromStorageRef.current) return;
    setDraftKitSelection({
      ...defaultEventKitSelectionDisplay(),
      ...savedKitSelection,
      primaryKitProductByTicketId: { ...savedKitSelection.primaryKitProductByTicketId },
      primaryKitProductByCategoryId: { ...savedKitSelection.primaryKitProductByCategoryId },
    });
  }, [savedKitSelection]);

  const kitSelectionDirty = useMemo(() => {
    const norm = (k: EventKitSelectionDisplay) => ({
      show: k.showKitImagesOnSelection,
      layout: k.kitImagesLayout,
      byTicket: k.primaryKitProductByTicketId,
      byCat: k.primaryKitProductByCategoryId,
    });
    return JSON.stringify(norm(draftKitSelection)) !== JSON.stringify(norm(savedKitSelection));
  }, [draftKitSelection, savedKitSelection]);

  const discardLocalChanges = useCallback(async () => {
    if (!eventId) return;
    ticketsSectionRef.current?.reset();
    // `TicketsSection` lê do bundle agregado — invalidar as chaves antigas
    // (tickets/ticketCategories) deixava o discard sem efeito visual.
    await queryClient.refetchQueries({
      queryKey: queryKeys.events.ticketsManagement(eventId),
    });
    await reloadEvent();
    // Descarte explícito do rascunho — libera o useEffect de `savedKitSelection`
    // pra voltar a ressincronizar com o backend.
    clearTicketsCheckoutPreviewDraft();
    hydratedFromStorageRef.current = false;
    try {
      const ev = await organizerService.getEventById(eventId);
      const parsed = parseEventKitSelectionDisplay(ev.kitSelectionDisplay);
      setDraftKitSelection({
        ...defaultEventKitSelectionDisplay(),
        ...parsed,
        primaryKitProductByTicketId: { ...parsed.primaryKitProductByTicketId },
        primaryKitProductByCategoryId: { ...parsed.primaryKitProductByCategoryId },
      });
    } catch {
      setDraftKitSelection({
        ...defaultEventKitSelectionDisplay(),
        ...savedKitSelection,
        primaryKitProductByTicketId: { ...savedKitSelection.primaryKitProductByTicketId },
        primaryKitProductByCategoryId: { ...savedKitSelection.primaryKitProductByCategoryId },
      });
    }
  }, [eventId, queryClient, reloadEvent, savedKitSelection]);

  const {
    leavePromptOpen,
    handleBack,
    confirmLeaveWithoutSaving,
    beginNavigationAfterSave,
    dismissLeavePrompt,
    requestNavigate,
  } = useUnsavedLeaveGuard(kitSelectionDirty, {
    navigateTarget: `/admin/events/${eventId}/review/banner`,
    onDiscard: discardLocalChanges,
  });

  const handleSaveChangesNavigate = useCallback(async (): Promise<boolean> => {
    if (!eventId) {
      toast.error("Evento não encontrado.");
      return false;
    }
    if (!kitSelectionDirty) return true;
    setSavingNavigate(true);
    try {
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
        { clientPage: `events/${eventId}/tickets` },
      );
      await reloadEvent();
      // Rascunho foi promovido para o backend — limpa o sessionStorage e
      // libera o useEffect a ressincronizar com `savedKitSelection`.
      clearTicketsCheckoutPreviewDraft();
      hydratedFromStorageRef.current = false;
      toast.success("Alterações salvas com sucesso!");
      return true;
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível salvar as opções de exibição do kit.");
      return false;
    } finally {
      setSavingNavigate(false);
    }
  }, [eventId, kitSelectionDirty, draftKitSelection, reloadEvent]);

  const handleSaveAndLeave = useCallback(async () => {
    const ok = await handleSaveChangesNavigate();
    if (ok) beginNavigationAfterSave();
  }, [handleSaveChangesNavigate, beginNavigationAfterSave]);

  const handleOpenTicketsCheckoutPreview = useCallback(
    (ticketCount: number) => {
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
      router.push(`/admin/events/${eventId}/review/tickets/preview`);
    },
    [eventId, draftKitSelection, router],
  );

  const handleKitDrawerSave = useCallback(
    (payload: {
      layout: KitImageLayoutMode;
      primaryImageUrlByTicketId: Record<string, string>;
      primaryImageUrlByCategoryId: Record<string, string>;
    }) => {
      setDraftKitSelection((prev) => ({
        ...defaultEventKitSelectionDisplay(),
        ...prev,
        kitImagesLayout: drawerModeToApiLayout(payload.layout),
        primaryKitProductByTicketId: { ...payload.primaryImageUrlByTicketId },
        primaryKitProductByCategoryId: { ...payload.primaryImageUrlByCategoryId },
      }));
    },
    [],
  );

  const drawerInitialKitSelection = useMemo(
    () => ({
      layout: layoutToDrawerMode(draftKitSelection.kitImagesLayout),
      primaryByTicket: { ...draftKitSelection.primaryKitProductByTicketId },
      primaryByCategory: { ...draftKitSelection.primaryKitProductByCategoryId },
    }),
    [draftKitSelection],
  );

  return (
    <>
      <div className="bg-gray-2 pb-32 pt-0 md:bg-transparent md:px-0 md:pb-20 md:pt-0">
        <TicketsSection
          ref={ticketsSectionRef}
          eventId={eventId}
          authChecked={authChecked}
          persistMode="immediate"
          onBack={handleBack}
          onCreateTicket={() => requestNavigate(`/admin/events/${eventId}/review/tickets/create`)}
          onEditTicket={(ticketId) => requestNavigate(`/admin/events/${eventId}/review/tickets/${ticketId}`)}
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
              "Posição das imagens atualizada no rascunho. Use «Salvar alterações» abaixo para gravar no evento.",
          }}
          actionSlot={(ticketCount) => (
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={ticketCount === 0}
                onClick={() => handleOpenTicketsCheckoutPreview(ticketCount)}
                className="h-14 w-full rounded-lg border-gray-6 font-manrope text-lg font-bold text-gray-12 sm:h-12 sm:w-auto sm:px-8 sm:text-base disabled:cursor-not-allowed disabled:opacity-50"
              >
                Prévia
              </Button>
              {kitSelectionDirty ? (
                <Button
                  type="button"
                  onClick={() => void handleSaveChangesNavigate()}
                  variant="default"
                  disabled={savingNavigate}
                  className="h-14 w-full rounded-lg font-manrope text-lg font-bold disabled:cursor-not-allowed disabled:opacity-50 sm:h-12 sm:w-auto sm:px-10 sm:text-[20px]"
                >
                  {savingNavigate ? "Salvando..." : "Salvar alterações"}
                </Button>
              ) : null}
            </div>
          )}
        />
      </div>

      <UnsavedChangesModal
        open={leavePromptOpen}
        onClose={dismissLeavePrompt}
        title="Alterações não salvas"
        description="Você fez alterações nos ingressos ou nas categorias. Se sair agora, elas serão perdidas."
        onSaveAndLeave={handleSaveAndLeave}
        onLeaveWithoutSaving={confirmLeaveWithoutSaving}
      />
    </>
  );
}
