"use client";

import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { organizerService } from "@/services";
import { useEditEvent } from "@/contexts/EditEventContext";
import { EventEditTopicsView } from "@/components/Topic/EventEditTopicsView";
import { organizerEventEditClientPage } from "@/lib/organizerAudit";

/** Etapa "Página" (Banner + Tópicos) da edição do evento pelo admin. */
export default function EditBannerPage() {
  const params = useParams();
  const eventId = params.id as string;
  const router = useRouter();
  const { formData, updateFormData } = useEditEvent();

  const handleBannerUploaded = async (url: string) => {
    updateFormData({ bannerUrl: url });
    await organizerService.updateEvent(eventId, { bannerUrl: url }, { clientPage: organizerEventEditClientPage(eventId, "banner") });
    toast.success("Banner enviado com sucesso!");
  };

  return (
    <EventEditTopicsView
      eventId={eventId}
      navigate={(href) => router.push(href)}
      eventBasePath={`/admin/events/${eventId}`}
      banner={{ url: formData.bannerUrl, onUploaded: handleBannerUploaded }}
    />
  );
}
