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
 * Card de evento (home/busca) — design do Figma (222:5298), 308×242. A imagem é o
 * BANNER do evento (aspect 312/142, cantos arredondados). Card SEM borda/fundo/sombra:
 * banner arredondado → título + cidade/estado → organizador + data, tudo flush-left.
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

  // Imagem do card = BANNER do evento.
  const eventImg = event.bannerUrl;

  const cardInner = (
    <div className="flex w-full flex-col items-start transition-transform duration-200 hover:scale-[1.01]">
      {/* Banner — proporção do Figma (312/142), cantos arredondados */}
      <div className="relative aspect-[312/142] w-full shrink-0 overflow-hidden rounded-[8px] bg-gray-4">
        <ImageWithInitialFallback
          src={eventImg}
          alt={event.name}
          name={event.name}
          fallbackId={event.id}
          fill
          sizes="(max-width: 768px) 92vw, 320px"
          quality={90}
          className="size-full border-0 object-cover"
          letterClassName="text-5xl"
          // Prévia mostra `data:` URLs (upload em andamento) — next/image rejeita
          // data URLs; `nativeImg` cai num <img> simples.
          nativeImg={preview}
        />
      </div>

      {/* Título + cidade/estado (sem padding lateral, sem borda) */}
      <div className="flex w-full flex-col pt-3 pb-2">
        <p className="[text-box-trim:trim-both] truncate font-manrope text-base font-bold text-[#202020]">
          {event.name}
        </p>
        {/* Wrapper em LINHA (igual ao "local" do Figma): o `flex-1` interno do
            CityStateLabel cresce na HORIZONTAL. Sem esta linha, ele ficava como
            filho da coluna → flex-1 crescia vertical (altura inconsistente). */}
        <div className="flex w-full items-center">
          {/* Só a cidade trunca; o estado fica colado no "…" (medição em canvas,
              ver CityStateLabel) — CSS puro deixaria um vão antes da vírgula. */}
          <CityStateLabel
            city={event.city ?? ""}
            state={event.state ?? ""}
            className="[text-box-trim:trim-both] font-family-dm-sans text-sm text-[#646464]"
          />
        </div>
      </div>

      {/* Organizador + data */}
      <div className="flex w-full flex-col gap-2">
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
          <span className="truncate [text-box-trim:trim-both] [text-box-edge:cap_alphabetic] font-family-dm-sans text-sm leading-[1.3] text-[#646464]">
            {organizer?.name || "Organizador"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <CalendarIcon className="size-5 shrink-0 text-[#646464]" />
          <span className="[text-box-trim:trim-both] [text-box-edge:cap_alphabetic] font-family-dm-sans text-sm leading-[1.3] text-[#646464]">
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
