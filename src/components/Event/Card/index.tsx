"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { Event } from "@/interfaces/event";
import { formatEventHappensLabel } from "@/utils/datetimeBR";
import { EventCardContent } from "./EventCardContent";

interface EventCardProps {
  event: Event;
  /** Modo prévia (ex.: tela de editar banner): renderiza o MESMO card, mas sem
   *  navegação (sem `<Link>`) e com imagem nativa, aceitando `data:` URLs do
   *  upload em andamento. Default false → comportamento idêntico ao de produção. */
  preview?: boolean;
}

/**
 * Card de evento (home/busca) — design do Figma (222:5298). A imagem é o BANNER do
 * evento (aspect 312/142, cantos arredondados). Card SEM borda/fundo/sombra:
 * banner arredondado → título → endereço (local, cidade, estado) → data por extenso.
 */
export function EventCard({ event, preview = false }: EventCardProps) {
  // Endereço completo: "Local, Cidade, Estado". `locationName` (escolhido no mapa)
  // pode faltar em eventos legados → cai pra "Cidade, Estado".
  const addressLabel = useMemo(() => {
    return [event.locationName, event.city, event.state]
      .map((part) => (part ?? "").trim())
      .filter(Boolean)
      .join(", ");
  }, [event.locationName, event.city, event.state]);

  // "Acontece no sábado, 25 de julho" — helper compartilhado com o card de ingresso.
  const dateLabel = useMemo(
    () => formatEventHappensLabel(event.eventDate),
    [event.eventDate],
  );

  const cardInner = (
    <div className="flex w-full flex-col items-start transition-transform duration-200 hover:scale-[1.01]">
      {/* Núcleo compartilhado com o TicketCard (banner + título + endereço + data). */}
      <EventCardContent
        name={event.name}
        bannerUrl={event.bannerUrl}
        fallbackId={event.id}
        addressLabel={addressLabel}
        dateLabel={dateLabel}
        nativeImg={preview}
      />
    </div>
  );

  // Prévia não navega (sem slug real / contexto de edição); produção mantém o Link.
  return preview ? (
    <div className="block">{cardInner}</div>
  ) : (
    <Link href={`/events/${event.slug}`} className="block">
      {cardInner}
    </Link>
  );
}
