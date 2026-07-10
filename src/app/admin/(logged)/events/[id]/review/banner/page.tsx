"use client";

import { useParams } from "next/navigation";
import { organizerService } from "@/services";
import { useEditEvent } from "@/contexts/EditEventContext";
import { BannerSection, type BannerSectionOrganizerData } from "@/components/Organizer/BannerSection";
import { WizardStepLayout } from "@/components/Organizer/WizardStepLayout";
import { organizerEventEditClientPage } from "@/lib/organizerAudit";
import { getEventOrganizer } from "@/utils/organization";
import { getAvatarUrl } from "@/utils/avatar";
import type { Event } from "@/interfaces/event";
import toast from "react-hot-toast";

export default function ReviewBannerPage() {
  const params = useParams();
  const eventId = params.id as string;
  const { formData, updateFormData, event } = useEditEvent();

  const handleBannerUploaded = async (url: string) => {
    updateFormData({ bannerUrl: url });
    await organizerService.updateEvent(eventId, { bannerUrl: url }, { clientPage: organizerEventEditClientPage(eventId, "banner") });
    toast.success("Banner enviado com sucesso!");
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

  const backHref = `/admin/events/${eventId}/review/information`;

  return (
    <WizardStepLayout
      title="Banner"
      description="Imagens principais do evento que aparecem na página pública."
      showDescriptionOnMobile
      stickyMobileHeader
      backHref={backHref}
      className="bg-gray-2 flex-1 pb-28 md:pb-44 md:px-[124px] pt-0 min-w-0"
      maxWidth="max-w-[1100px]"
    >
      <BannerSection
        bannerUrl={formData.bannerUrl}
        eventName={formData.name}
        eventDate={formData.eventDate}
        street={formData.street}
        locationName={formData.locationName}
        city={formData.city}
        state={formData.state}
        socialLinks={{
          instagram: formData.instagram,
          facebook: formData.facebook,
          youtube: formData.youtube,
          tiktok: formData.tiktok,
          website: formData.website,
        }}
        organizer={organizer}
        previewEvent={event as Event}
        onBannerUploaded={handleBannerUploaded}
      />
    </WizardStepLayout>
  );
}
