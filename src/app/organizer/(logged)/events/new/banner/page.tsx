"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useOrganizerNavigate } from "@/hooks/useOrganizerNavigate";
import { useOrganizerAppSurface } from "@/contexts/OrganizerAppSurfaceContext";
import { organizerExternalHref } from "@/lib/organizerPathPresentation";
import { organizerService } from "@/services";
import { useWizardAuth } from "@/hooks/useWizardAuth";
import { useCreateEvent } from "@/contexts/CreateEventContext";
import { useAuth } from "@/hooks/useAuth";
import { ArrowButton } from "@/components/ArrowButton";
import { Loading } from "@/components/Loading";
import { BannerSection, type BannerSectionOrganizerData } from "@/components/Organizer/BannerSection";
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
    <div className="min-w-0 bg-gray-2 pb-28 md:bg-transparent md:pb-20">
      {/* Mobile header */}
      <div className="md:hidden sticky top-0 z-20 bg-gray-2 border-b border-gray-6 -mx-4 px-4">
        <div className="flex h-[52px] items-center gap-1 px-4">
          <Link href={backHref} className="size-8 flex items-center justify-center shrink-0 rounded-lg hover:bg-gray-3 transition-colors -rotate-180" aria-label="Voltar">
            <ArrowButton isOpen={false} />
          </Link>
          <h1 className="font-manrope font-extrabold text-base leading-[1.1] text-gray-12 truncate flex-1 min-w-0">
            Banners do evento
          </h1>
        </div>
      </div>

      <p className="px-4 pt-4 pb-2 text-base text-gray-11 font-family-dm-sans leading-[1.3] md:hidden">
        Imagens principais do evento para os participantes visualizarem
      </p>

      <div className="mx-auto flex w-full max-w-[1100px] flex-col items-stretch gap-6 px-4 md:items-center md:gap-9 md:px-8 md:mt-10">
        {/* Desktop header */}
        <div className="hidden md:flex flex-col gap-4 items-center w-full">
          <div className="flex gap-3 items-center flex-wrap justify-center">
            <button
              type="button"
              onClick={() => orgNav.push("/organizer/events/new/information")}
              className="border border-gray-6 rounded-[52px] cursor-pointer size-9 flex items-center justify-center hover:bg-gray-3 transition-colors rotate-180"
            >
              <ArrowButton isOpen={false} />
            </button>
            <h1 className="text-gray-12 text-[28px] font-bold font-manrope leading-[1.1] text-center">
              Banner principal do evento
            </h1>
          </div>
          <p className="text-gray-11 text-base font-family-dm-sans leading-[1.3] text-center max-w-[640px]">
            Essa é a imagem grande que aparece no topo da página do seu evento
          </p>
        </div>

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
      </div>
    </div>
  );
}
