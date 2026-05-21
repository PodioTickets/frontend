"use client";

import { useState, useEffect } from "react";
import { useOrganizerNavigate } from "@/hooks/useOrganizerNavigate";
import { useOrganizerAppSurface } from "@/contexts/OrganizerAppSurfaceContext";
import { organizerExternalHref } from "@/lib/organizerPathPresentation";
import { organizerService } from "@/services";
import { useWizardAuth } from "@/hooks/useWizardAuth";
import { useCreateEvent } from "@/contexts/CreateEventContext";
import { useAuth } from "@/hooks/useAuth";
import { Loading } from "@/components/Loading";
import { BannerSection, type BannerSectionOrganizerData } from "@/components/Organizer/BannerSection";
import { WizardStepLayout } from "@/components/Organizer/WizardStepLayout";
import { ensureCreateEventSyncedFromDraft } from "@/lib/createEventDraftSync";
import { organizerNewEventClientPage } from "@/lib/organizerAudit";
import { getAvatarUrl } from "@/utils/avatar";
import toast from "react-hot-toast";

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

export default function BannerPage() {
  const orgNav = useOrganizerNavigate();
  const appSurface = useOrganizerAppSurface();
  const { isAuthenticated, user } = useAuth();
  const { formData, updateFormData } = useCreateEvent();
  const { authChecked } = useWizardAuth();
  const [syncingEvent, setSyncingEvent] = useState(false);

  useEffect(() => {
    if (authChecked && !isAuthenticated) {
      orgNav.push("/organizer/login");
    }
  }, [authChecked, isAuthenticated, orgNav]);

  useEffect(() => {
    if (!authChecked || formData.createdEventId) return;
    const fromStorage = readStoredCreatedEventId();
    if (fromStorage) updateFormData({ createdEventId: fromStorage });
  }, [authChecked, formData.createdEventId, updateFormData]);

  const handleBannerUploaded = async (url: string) => {
    updateFormData({ bannerUrl: url });
    const draftId = formData.createdEventId;
    if (draftId) {
      await organizerService.updateEvent(draftId, { bannerUrl: url }, { clientPage: organizerNewEventClientPage("banner") });
      toast.success("Banner enviado com sucesso!");
    } else {
      toast.success("Banner salvo no rascunho.");
    }
  };

  const handleCardUploaded = async (url: string) => {
    updateFormData({ cardImageUrl: url });
    const draftId = formData.createdEventId;
    if (draftId) {
      await organizerService.updateEvent(draftId, { cardImageUrl: url }, { clientPage: organizerNewEventClientPage("banner") });
      toast.success("Imagem de pré-visualização enviada!");
    } else {
      toast.success("Imagem salva no rascunho.");
    }
  };

  const handleNext = async () => {
    if (!formData.createdEventId) {
      setSyncingEvent(true);
      try {
        await ensureCreateEventSyncedFromDraft({ formData, updateFormData });
        toast.success("Evento criado. Continue com os ingressos.");
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Erro ao criar o evento. Tente novamente.";
        toast.error(message);
        return;
      } finally {
        setSyncingEvent(false);
      }
    }
    orgNav.push("/organizer/events/new/tickets");
  };

  const orgName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
    user?.firstName?.trim() ||
    "Organizador";

  const organizer: BannerSectionOrganizerData = {
    name: orgName,
    logoSrc: user?.avatarUrl ? getAvatarUrl(user.avatarUrl) : null,
    document: user?.documentNumber,
  };

  const backHref = organizerExternalHref("/organizer/events/new/information", appSurface);

  if (!authChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loading />
      </div>
    );
  }

  return (
    <WizardStepLayout
      title="Banner"
      description="Imagens principais do evento que aparecem na página pública."
      showDescriptionOnMobile
      stickyMobileHeader
      backHref={backHref}
      className="bg-gray-2 flex-1 pb-28 md:pb-44 md:px-[124px] pt-0 -mx-4 md:mx-0 md:pt-10 min-w-0"
      maxWidth="max-w-[1060px]"
    >
      <BannerSection
        bannerUrl={formData.bannerUrl}
        cardImageUrl={formData.cardImageUrl}
        eventName={formData.name}
        eventDate={formData.eventDate}
        street={formData.street}
        city={formData.city}
        state={formData.state}
        organizer={organizer}
        onBannerUploaded={handleBannerUploaded}
        onCardUploaded={handleCardUploaded}
        onNext={handleNext}
        nextLoading={syncingEvent}
      />
    </WizardStepLayout>
  );
}
