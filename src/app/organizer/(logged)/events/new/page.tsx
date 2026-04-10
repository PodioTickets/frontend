"use client";

import { useEffect, useRef } from "react";
import { useOrganizerNavigate } from "@/hooks/useOrganizerNavigate";
import { Loading } from "@/components/Loading";
import { useCreateEvent } from "@/contexts/CreateEventContext";
import {
  DEFAULT_CREATE_EVENT_WIZARD_PATH,
  loadLastCreateEventWizardPath,
} from "@/lib/createEventWizardPersistence";
import { organizerService } from "@/services";

export const dynamic = "force-dynamic";

function getNextIncompleteStep(event: any, ticketCount: number): string {
  const cardImage = event.cardImageUrl ?? event.logoUrl ?? event.logo_url ?? "";
  const hasBanner =
    typeof event.bannerUrl === "string" && event.bannerUrl.trim().length > 0;
  const hasCard =
    typeof cardImage === "string" && cardImage.trim().length > 0;
  const topics: any[] = event.topics ?? [];
  const hasConfiguredTopics =
    topics.some((t: any) => !t.isDefault) ||
    topics.some((t: any) => typeof t.content === "string" && t.content.trim().length > 0);

  // Tópicos configurados → info + banner + ingressos já foram feitos
  if (hasBanner && hasCard && hasConfiguredTopics) {
    return "/organizer/events/new/questionnaire";
  }

  // Banner existe → info já foi feita; verifica ingressos
  if (hasBanner && hasCard) {
    if (ticketCount === 0) return "/organizer/events/new/tickets";
    return "/organizer/events/new/topics";
  }

  // Nome existe → info já foi feita; vai para banner
  if (typeof event.name === "string" && event.name.trim().length > 0) {
    return "/organizer/events/new/banner";
  }

  return "/organizer/events/new/information";
}

function formatDateOnly(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatTimeOnly(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function formatCEP(raw: string | null | undefined): string {
  if (!raw) return "";
  const n = raw.replace(/\D/g, "");
  return n.length > 5 ? `${n.slice(0, 5)}-${n.slice(5, 8)}` : n;
}

export default function CreateEventRedirectPage() {
  const orgNav = useOrganizerNavigate();
  const { clearFormData, updateFormData } = useCreateEvent();
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) return;
    handledRef.current = true;
    if (typeof window === "undefined") return;

    const url = new URL(window.location.href);

    if (url.searchParams.get("reset") === "1") {
      clearFormData();
      orgNav.replace(DEFAULT_CREATE_EVENT_WIZARD_PATH);
      return;
    }

    const resumeId = url.searchParams.get("resume");
    if (resumeId) {
      Promise.all([
        organizerService.getEventById(resumeId),
        organizerService.getTickets(resumeId, { page: 1, limit: 1 }),
      ])
        .then(([event, ticketsRes]: [any, any]) => {
          const cardImage =
            event.cardImageUrl ?? event.logoUrl ?? event.logo_url ?? "";
          updateFormData({
            createdEventId: resumeId,
            name: event.name ?? "",
            eventDate: formatDateOnly(event.eventDate),
            registrationStartDate: formatDateOnly(event.registrationStartDate),
            registrationStartTime: formatTimeOnly(event.registrationStartDate),
            registrationEndDate: formatDateOnly(event.registrationEndDate),
            registrationEndTime: formatTimeOnly(event.registrationEndDate),
            cep: formatCEP(event.zipCode ?? event.cep),
            street: event.location ?? "",
            neighborhood: event.neighborhood ?? "",
            city: event.city ?? "",
            state: event.state ?? "",
            googleMapsLink: event.googleMapsLink ?? "",
            bannerUrl: event.bannerUrl ?? "",
            cardImageUrl: typeof cardImage === "string" ? cardImage.trim() : "",
            regulationUrl: event.regulationUrl ?? "",
          });
          const ticketCount = ticketsRes?.tickets?.length ?? 0;
          orgNav.replace(getNextIncompleteStep(event, ticketCount));
        })
        .catch(() => {
          orgNav.replace(DEFAULT_CREATE_EVENT_WIZARD_PATH);
        });
      return;
    }

    const last = loadLastCreateEventWizardPath();
    orgNav.replace(last);
  }, [clearFormData, updateFormData, orgNav]);

  return <Loading />;
}
