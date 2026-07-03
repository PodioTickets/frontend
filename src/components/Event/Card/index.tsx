"use client";

import { CalendarIcon } from "@/components/Icons/CalendarIcon";
import Link from "next/link";
import { useMemo } from "react";
import type { Event } from "@/interfaces/event";
import { getAvatarUrl } from "@/utils/avatar";
import { getEventOrganizer } from "@/utils/organization";
import { formatDateBR } from "@/utils/datetimeBR";
import { ImageWithInitialFallback } from "@/components/ImageWithInitialFallback";
import { CityStateLabel } from "./CityStateLabel";

interface EventCardProps {
  event: Event;
  /** Modo prévia (ex.: tela de editar banner): renderiza o MESMO card, mas sem
   *  navegação (sem `<Link>`) e com imagem nativa, aceitando `data:` URLs do
   *  upload em andamento. Default false → comportamento idêntico ao de produção. */
  preview?: boolean;
}

/**
 * Card de evento (home/busca) — design do Figma (222:5298). A imagem é o BANNER
 * do evento (aspect 312/142), não a logo/card image. Estrutura: banner → título +
 * cidade/estado (com borda inferior) → organizador + data. Sem tag de status.
 */
export function EventCard({ event, preview = false }: EventCardProps) {
  const formattedDate = useMemo(() => {
    if (!event?.eventDate) return "";
    return formatDateBR(event.eventDate, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }, [event?.eventDate]);

  const organizer = getEventOrganizer(event);
  const organizerImg = organizer?.logoUrl
    ? getAvatarUrl(organizer.logoUrl)
    : event.organizer?.user?.avatarUrl
      ? getAvatarUrl(event.organizer.user.avatarUrl)
      : null;

  // Imagem do card = BANNER do evento (antes era a logo/card image).
  const eventImg = event.bannerUrl;

  const cardInner = (
    <div className="flex w-full flex-col overflow-hidden rounded-lg border border-[#cecece] bg-[#f9f9f9] shadow-[0_2px_6px_0_rgba(17,17,17,0.3)] transition-transform duration-200 hover:scale-[1.01]">
      {/* Banner — proporção do Figma (312/142) */}
      <div className="relative aspect-[312/142] w-full shrink-0 bg-gray-4">
        <ImageWithInitialFallback
          src={eventImg}
          alt={event.name}
          name={event.name}
          fallbackId={event.id}
          fill
          sizes="(max-width: 768px) 90vw, 308px"
          className="size-full border-0 object-cover"
          letterClassName="text-5xl"
          // Prévia mostra `data:` URLs (upload em andamento) — next/image rejeita
          // data URLs; `nativeImg` cai num <img> simples.
          nativeImg={preview}
        />
      </div>

      {/* Título + cidade/estado */}
      <div className="flex flex-col gap-2 border-b border-[#d9d9d9] px-3 py-4">
        <p className="truncate font-manrope text-base font-bold leading-[1.1] text-[#202020]">
          {event.name}
        </p>
        {/* Só a cidade trunca; o estado fica colado no "…" (medição em canvas,
            ver CityStateLabel) — CSS puro deixaria um vão antes da vírgula. */}
        <CityStateLabel
          city={event.city ?? ""}
          state={event.state ?? ""}
          className="font-family-dm-sans text-sm leading-[1.3] text-[#646464]"
        />
      </div>

      {/* Organizador + data */}
      <div className="flex flex-col gap-2 px-3 py-4">
        <div className="flex min-w-0 items-center gap-1">
          <ImageWithInitialFallback
            src={organizerImg}
            alt={organizer?.name ?? "Organizador"}
            name={organizer?.name ?? "Organizador"}
            fallbackId={organizer?.id ?? event.id}
            width={20}
            height={20}
            className="size-5 shrink-0 rounded-full"
            imgClassName="object-cover"
            letterClassName="text-[10px]"
          />
          <span className="truncate font-family-dm-sans text-sm leading-[1.3] text-[#646464]">
            {organizer?.name || "Organizador"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <CalendarIcon className="size-5 shrink-0 text-[#646464]" />
          <span className="font-family-dm-sans text-sm leading-[1.3] text-[#646464]">
            {formattedDate}
          </span>
        </div>
      </div>
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
