"use client";

import { useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { useOrganizerNavigate } from "@/hooks/useOrganizerNavigate";
import { useOrganizerAppSurface } from "@/contexts/OrganizerAppSurfaceContext";
import { organizerExternalHref } from "@/lib/organizerPathPresentation";
import { organizerService } from "@/services";
import { useWizardAuth } from "@/hooks/useWizardAuth";
import { useCreateEvent } from "@/contexts/CreateEventContext";
import { useAuth } from "@/hooks/useAuth";
import { Loading } from "@/components/Loading";
import { EventEditTopicsView } from "@/components/Topic/EventEditTopicsView";
import { ensureCreateEventSyncedFromDraft } from "@/lib/createEventDraftSync";
import { organizerNewEventClientPage } from "@/lib/organizerAudit";

function readStoredCreatedEventId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("createEventFormData");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { createdEventId?: unknown };
    const id = parsed?.createdEventId;
    if (typeof id === "string" && id.trim() !== "") return id;
    if (typeof id === "number" && Number.isFinite(id)) return String(id);
    return null;
  } catch {
    return null;
  }
}

/**
 * Etapa "Página" (Banner + Tópicos) da criação do evento. O evento já existe aqui
 * (a etapa Informações cria o rascunho); os tópicos precisam dele.
 */
export default function BannerPage() {
  const orgNav = useOrganizerNavigate();
  const appSurface = useOrganizerAppSurface();
  const { isAuthenticated } = useAuth();
  const { formData, updateFormData } = useCreateEvent();
  const { authChecked } = useWizardAuth();
  const syncStartedRef = useRef(false);

  useEffect(() => {
    if (authChecked && !isAuthenticated) {
      orgNav.push("/organizer/login");
    }
  }, [authChecked, isAuthenticated, orgNav]);

  // Rascunho sem id no contexto: tenta o salvo; se não houver, cria a partir do rascunho
  // (antes isso só acontecia no "Próximo" desta etapa — os tópicos precisam do evento).
  useEffect(() => {
    if (!authChecked || formData.createdEventId || syncStartedRef.current) return;
    const fromStorage = readStoredCreatedEventId();
    if (fromStorage) {
      updateFormData({ createdEventId: fromStorage });
      return;
    }
    syncStartedRef.current = true;
    ensureCreateEventSyncedFromDraft({ formData, updateFormData }).catch((error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Erro ao criar o evento. Tente novamente.");
    });
  }, [authChecked, formData, updateFormData]);

  const eventId = formData.createdEventId;

  const handleBannerUploaded = async (url: string) => {
    updateFormData({ bannerUrl: url });
    if (eventId) {
      await organizerService.updateEvent(eventId, { bannerUrl: url }, { clientPage: organizerNewEventClientPage("banner") });
      toast.success("Banner enviado com sucesso!");
    }
  };

  if (!authChecked || !eventId) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loading />
      </div>
    );
  }

  return (
    <EventEditTopicsView
      eventId={eventId}
      navigate={(href) => orgNav.push(href)}
      eventBasePath={`/organizer/events/${eventId}`}
      banner={{ url: formData.bannerUrl, onUploaded: handleBannerUploaded }}
      previewHref="/organizer/events/new/topics/preview"
      leaveTarget="/organizer/events/new/tickets"
      backHref={organizerExternalHref("/organizer/events/new/information", appSurface)}
      continueFlow={{ label: "Salvar e continuar" }}
    />
  );
}
