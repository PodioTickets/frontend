"use client";

import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { organizerService } from "@/services";
import { useEditEvent } from "@/contexts/EditEventContext";
import { ArrowButton } from "@/components/ArrowButton";
import { BannerSection, type BannerSectionOrganizerData } from "@/components/Organizer/BannerSection";
import { organizerEventEditClientPage } from "@/lib/organizerAudit";
import { getEventOrganizer } from "@/utils/organization";
import { getAvatarUrl } from "@/utils/avatar";
import type { Event } from "@/interfaces/event";
import toast from "react-hot-toast";

export default function EditBannerPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;
  const { formData, updateFormData, event } = useEditEvent();

  const handleBannerUploaded = async (url: string) => {
    updateFormData({ bannerUrl: url });
    await organizerService.updateEvent(eventId, { bannerUrl: url }, { clientPage: organizerEventEditClientPage(eventId, "banner") });
    toast.success("Banner enviado com sucesso!");
  };

  const handleCardUploaded = async (url: string) => {
    updateFormData({ cardImageUrl: url });
    await organizerService.updateEvent(eventId, { cardImageUrl: url }, { clientPage: organizerEventEditClientPage(eventId, "banner") });
    toast.success("Imagem de pré-visualização enviada!");
  };

  const organizerPreview = event ? getEventOrganizer(event as Event) : null;
  const org = event?.organization;
  const orgTradeName = org?.tradeName?.trim() ?? null;
  const orgLegalName = org?.name?.trim() ?? null;

  const organizer: BannerSectionOrganizerData = {
    name: organizerPreview?.name?.trim() || "Organização",
    logoSrc: organizerPreview?.logoUrl ? getAvatarUrl(organizerPreview.logoUrl) : null,
    showLegalSubtitle: Boolean(orgTradeName && orgLegalName && orgTradeName !== orgLegalName),
    legalName: orgLegalName,
    document: org?.document,
  };

  const editHref = `/admin/events/${eventId}/edit`;

  return (
    <div className="min-w-0 bg-gray-2 pb-28 md:bg-transparent md:pb-20">
      {/* Mobile header */}
      <div className="md:hidden sticky top-0 z-20 bg-gray-2 border-b border-gray-6 -mx-4 px-4">
        <div className="flex h-[52px] items-center gap-1">
          <Link href={editHref} className="size-8 flex items-center justify-center shrink-0 rounded-lg hover:bg-gray-3 transition-colors -rotate-180" aria-label="Voltar">
            <ArrowButton isOpen={false} />
          </Link>
          <h1 className="font-manrope font-extrabold text-base leading-[1.1] text-gray-12 truncate flex-1 min-w-0">
            Banners do evento
          </h1>
        </div>
      </div>

      <p className="pt-4 pb-2 text-base text-gray-11 font-family-dm-sans leading-[1.3] md:hidden">
        Imagens principais do evento para os participantes visualizarem
      </p>

      <div className="mx-auto flex w-full max-w-[1100px] flex-col items-stretch gap-6 px-0 md:items-center md:gap-9 md:mt-10">
        {/* Desktop header */}
        <div className="hidden md:flex flex-col gap-4 items-center w-full">
          <div className="flex gap-3 items-center flex-wrap justify-center">
            <button
              type="button"
              onClick={() => router.push(`/admin/events/${eventId}/edit`)}
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
        />
      </div>
    </div>
  );
}
