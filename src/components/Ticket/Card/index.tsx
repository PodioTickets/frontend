"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { getApiClient } from "@/services/base/ApiClient";
import { EventCardContent } from "@/components/Event/Card/EventCardContent";
import {
  formatEventHappensLabel,
  toUtcDate,
  brasiliaTodayCivilStart,
} from "@/utils/datetimeBR";
import { cn } from "@/utils/cn";

export interface Ticket {
  id: string;
  event: {
    id: string;
    name: string;
    imageUrl?: string;
    eventDate: string;
    location: {
      city: string;
      state: string;
    };
  };
  modalities: string[];
  status: "CONFIRMED" | "PENDING" | "COMPLETED" | "CANCELLED";
  distance?: string;
  qrCode?: string;
  purchaseDate?: string;
  createdAt?: string;
  payment?: {
    id?: string;
    method: string;
    status: string;
    amount: number;
  };
  invitedBy?: { id: string; fullName: string } | null;
  /** Nº de participantes do pedido (linha "X pessoas"). */
  peopleCount?: number;
}

interface TicketCardProps {
  ticket: Ticket;
  className?: string;
}

// Cores das abas de status (tokens do projeto ≈ design do Figma).
const TAB_CONFIRMED = "bg-primary-12 text-primary-4"; // verde
const TAB_UPCOMING = "bg-yellow-12 text-yellow-4"; // amarelo (hoje/amanhã/pendente)
const TAB_NEUTRAL = "bg-gray-12 text-gray-4"; // cinza (realizado/cancelado)

interface StatusTab {
  label: string;
  className: string;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Aba de status do card: combina o status da inscrição com a proximidade do
 * evento (dia civil de Brasília). Confirmada + futuro → "Inscrição confirmada";
 * hoje/amanhã → "Começa hoje/amanhã"; passado → "Evento realizado".
 */
function resolveStatusTab(
  status: Ticket["status"],
  eventDate: string,
): StatusTab {
  if (status === "CANCELLED") {
    return { label: "Inscrição cancelada", className: TAB_NEUTRAL };
  }
  if (status === "PENDING") {
    return { label: "Pagamento pendente", className: TAB_UPCOMING };
  }

  const d = toUtcDate(eventDate);
  if (d) {
    const eventDay = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    const today = brasiliaTodayCivilStart();
    const todayDay = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
    const diffDays = Math.round((eventDay - todayDay) / MS_PER_DAY);
    if (diffDays < 0) return { label: "Evento realizado", className: TAB_NEUTRAL };
    if (diffDays === 0) return { label: "Começa hoje", className: TAB_UPCOMING };
    if (diffDays === 1) return { label: "Começa amanhã", className: TAB_UPCOMING };
  }
  return { label: "Inscrição confirmada", className: TAB_CONFIRMED };
}

/**
 * Card de "Meus ingressos" (1 por pedido) — design do Figma (793:62132).
 * REUTILIZA o `EventCardContent` (mesmo núcleo do card de evento da home) e
 * adiciona a aba de status, o overlay "Inscrição feita por", a linha "X pessoas"
 * e o botão "Visualizar ingresso".
 */
export function TicketCard({ ticket, className }: TicketCardProps) {
  const router = useRouter();

  const goToTicket = () => router.push(`/user/tickets/${ticket.id}`);

  const addressLabel = [ticket.event.location.city, ticket.event.location.state]
    .map((part) => (part ?? "").trim())
    .filter(Boolean)
    .join(", ");

  const dateLabel = formatEventHappensLabel(ticket.event.eventDate);
  const tab = resolveStatusTab(ticket.status, ticket.event.eventDate);

  const peopleLabel =
    typeof ticket.peopleCount === "number" && ticket.peopleCount > 0
      ? `${ticket.peopleCount} ${ticket.peopleCount === 1 ? "pessoa" : "pessoas"}`
      : null;

  // Banner do evento: prefixa o host da API para URLs relativas.
  const imageUrl = ticket.event.imageUrl
    ? ticket.event.imageUrl.startsWith("http")
      ? ticket.event.imageUrl
      : `${getApiClient().getBaseURL()}${ticket.event.imageUrl}`
    : null;

  // Overlay "Inscrição feita por" (pedido de convite) sobre o banner.
  const invitedByOverlay = ticket.invitedBy ? (
    <div
      className="absolute left-2 top-2 flex max-w-[calc(100%-1rem)] items-center gap-1.5 rounded-lg p-1.5"
      style={{
        background: "rgba(1, 29, 33, 0.70)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
      }}
    >
      <Image
        src="/images/gift-huge.png"
        alt=""
        width={16}
        height={16}
        className="size-4 shrink-0 brightness-0 invert"
        draggable={false}
      />
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="font-family-dm-sans text-[10px] font-normal leading-[1.3] text-[#B4B4B4]">
          Inscrição feita por
        </span>
        <span className="font-family-dm-sans truncate text-xs font-semibold leading-[1.3] text-[#EEEEEE]">
          {ticket.invitedBy.fullName}
        </span>
      </div>
    </div>
  ) : null;

  return (
    <div className={cn("flex w-full flex-col items-start", className)}>

      {/* Card */}
      <div className="relative flex w-full items-center gap-2 overflow-hidden rounded-lg bg-[#F9F9F9]">
        {/* Núcleo compartilhado com o EventCard da home. */}
        <EventCardContent
          name={ticket.event.name}
          bannerUrl={imageUrl}
          fallbackId={ticket.event.id}
          addressLabel={addressLabel}
          dateLabel={dateLabel}
          dateClassName="text-gray-11"
          bannerRounded="none"
          // "Meus ingressos" mantém o visual próprio: banner compacto (metade).
          // Data e divisor em CINZA (data verde/divisor primary ficam só na home/busca).
          bannerWidthClassName="w-1/2"
          dividerFromClassName="from-gray-7"
          bannerOverlay={invitedByOverlay}
        >
          {peopleLabel ? (
            <p onClick={goToTicket} className="[text-box-trim:trim-both] font-family-dm-sans font-bold text-base text-primary-11 cursor-pointer">
              Ver ingresso
            </p>
          ) : null}
        </EventCardContent>
      </div>
    </div>
  );
}
