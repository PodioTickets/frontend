"use client";

import { useParams } from "next/navigation";
import toast from "react-hot-toast";
import { organizerService } from "@/services";
import { useEditEvent } from "@/contexts/EditEventContext";
import { useOrganizerNavigate } from "@/hooks/useOrganizerNavigate";
import { EventEditTopicsView } from "@/components/Topic/EventEditTopicsView";
import { organizerEventEditClientPage } from "@/lib/organizerAudit";

/** Etapa "Página" (Banner + Tópicos) da edição do evento. */
export default function EditBannerPage() {
  const params = useParams();
  const eventId = params.id as string;
  const orgNav = useOrganizerNavigate();
  const { formData, updateFormData } = useEditEvent();

  const handleBannerUploaded = async (url: string) => {
    updateFormData({ bannerUrl: url });
    await organizerService.updateEvent(eventId, { bannerUrl: url }, { clientPage: organizerEventEditClientPage(eventId, "banner") });
    toast.success("Banner enviado com sucesso!");
  };

  return (
    <EventEditTopicsView
      eventId={eventId}
      navigate={(href) => orgNav.push(href)}
      eventBasePath={`/organizer/events/${eventId}`}
      banner={{ url: formData.bannerUrl, onUploaded: handleBannerUploaded }}
    />
  );
}
