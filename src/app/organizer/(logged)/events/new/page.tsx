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
import { toUtcDate } from "@/utils/datetimeBR";

export const dynamic = "force-dynamic";

function getNextIncompleteStep(event: any, ticketCount: number): string {
  // Imagem do evento = BANNER apenas (a antiga "imagem do card" foi descontinuada).
  const hasBanner =
    typeof event.bannerUrl === "string" && event.bannerUrl.trim().length > 0;
  const topics: any[] = event.topics ?? [];
  const hasConfiguredTopics =
    topics.some((t: any) => !t.isDefault) ||
    topics.some((t: any) => typeof t.content === "string" && t.content.trim().length > 0);

  // Tópicos configurados → info + banner + ingressos já foram feitos
  if (hasBanner && hasConfiguredTopics) {
    return "/organizer/events/new/questionnaire";
  }

  // Banner existe → info já foi feita; verifica ingressos
  if (hasBanner) {
    if (ticketCount === 0) return "/organizer/events/new/tickets";
    return "/organizer/events/new/topics";
  }

  // Nome existe → info já foi feita; vai para banner
  if (typeof event.name === "string" && event.name.trim().length > 0) {
    return "/organizer/events/new/banner";
  }

  return "/organizer/events/new/information";
}

// Datas/horas do evento são WALL-CLOCK (backend devolve ISO com `Z`). Ler em UTC
// (mesmo padrão do EditEventContext/datetimeBR) pra não deslocar dia/hora ao
// re-hidratar um rascunho existente no fluxo de criação.
function formatDateOnly(iso: string | null | undefined): string {
  const d = toUtcDate(iso);
  if (!d) return "";
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatTimeOnly(iso: string | null | undefined): string {
  const d = toUtcDate(iso);
  if (!d) return "";
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
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
    /* "Fazer ajustes" (evento recusado): hidrata o rascunho igual ao resume
     * normal, mas ABRE NA PRIMEIRA ETAPA. O evento recusado está completo, então
     * `getNextIncompleteStep` mandaria pro fim do wizard — e o organizador tem
     * que revisar desde as informações para atender ao motivo da recusa. */
    const restartFromFirstStep = url.searchParams.get("restart") === "1";
    if (resumeId) {
      Promise.all([
        organizerService.getEventById(resumeId),
        organizerService.getTickets(resumeId, { page: 1, limit: 1 }),
        // Config financeira é persistida por endpoint próprio (saveFinancialSettings),
        // não pelo payload do evento — precisa ser restaurada à parte no resume, senão
        // o passo "Pagamento" volta aos defaults e ao re-salvar SOBRESCREVE o que foi
        // configurado. `.catch` → mantém os defaults do contexto.
        organizerService.getFinancialSettings(resumeId).catch(() => null),
      ])
        .then(([event, ticketsRes, financial]: [any, any, any]) => {
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
            regulationUrl: event.regulationUrl ?? "",
            emergencyContactRequired: !!event.emergencyContactRequired,
            // Contato + redes sociais (salvos no create, mas o resume não os
            // restaurava → resetavam ao reabrir o rascunho sem localStorage).
            contactEmail: event.contactEmail ?? "",
            instagram: event.instagram ?? "",
            facebook: event.facebook ?? "",
            youtube: event.youtube ?? "",
            tiktok: event.tiktok ?? "",
            website: event.website ?? "",
            // Financeiro (do endpoint próprio) — só sobrescreve quando veio.
            ...(financial
              ? {
                  organizerFeePercent: financial.organizerFeePercent,
                  maxInstallments: financial.maxInstallments,
                  acceptedPaymentMethods: financial.acceptedPaymentMethods,
                }
              : {}),
          });
          const ticketCount = ticketsRes?.tickets?.length ?? 0;
          orgNav.replace(
            restartFromFirstStep
              ? DEFAULT_CREATE_EVENT_WIZARD_PATH
              : getNextIncompleteStep(event, ticketCount),
          );
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
