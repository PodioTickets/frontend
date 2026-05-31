"use client";

import { CalendarIcon } from "@/components/Icons/CalendarIcon";
import { FlagIcon } from "@/components/Icons/FlagIcon";
import { LocationIcon } from "@/components/Icons/LocationIcon";
import Link from "next/link";
import { useMemo } from "react";
import type { Event } from "@/interfaces/event";
import { getAvatarUrl } from "@/utils/avatar";
import { getEventOrganizer } from "@/utils/organization";
import { cn } from "@/utils/cn";
import { ImageWithInitialFallback } from "@/components/ImageWithInitialFallback";

interface EventCardProps {
  event: Event;
}

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function EventCard({ event }: EventCardProps) {
  const formattedDate = useMemo(() => {
    if (!event?.eventDate) return "";
    return dateFormatter?.format?.(new Date(event?.eventDate));
  }, [event?.eventDate]);

  const eventRealizationPassed = useMemo(() => {
    if (!event?.eventDate) return false;
    const at = new Date(event.eventDate);
    return !Number.isNaN(at.getTime()) && Date.now() >= at.getTime();
  }, [event?.eventDate]);

  const registrationPeriodEnded = useMemo(() => {
    if (!event?.registrationEndDate) return false;
    const at = new Date(event.registrationEndDate);
    return !Number.isNaN(at.getTime()) && Date.now() >= at.getTime();
  }, [event?.registrationEndDate]);

  const inscricoesEncerradas = eventRealizationPassed || registrationPeriodEnded;

  const inscricoesEmBreve = useMemo(() => {
    if (event.status !== "PUBLISHED" || !event.registrationStartDate) return false;
    const opens = new Date(event.registrationStartDate);
    if (Number.isNaN(opens.getTime())) return false;
    return Date.now() < opens.getTime();
  }, [event.status, event.registrationStartDate]);

  const vagasEsgotadas =
    event.hasRegistrationSlotsAvailable === false &&
    event.status === "PUBLISHED" &&
    !inscricoesEmBreve &&
    !inscricoesEncerradas;

  const statusLabel = inscricoesEncerradas
    ? "Inscrições encerradas"
    : inscricoesEmBreve
      ? "Inscrições em breve"
      : vagasEsgotadas
        ? "Vagas esgotadas!"
        : event.status === "COMPLETED"
          ? "Evento realizado"
          : "Inscrições abertas";

  // Tag de status (canto inferior esquerdo). Aberto = verde (Figma).
  const tagBg = inscricoesEncerradas
    ? "bg-red-50 border-red-200"
    : inscricoesEmBreve
      ? "bg-amber-50 border-amber-300"
      : vagasEsgotadas
        ? "bg-violet-50 border-violet-200"
        : event.status === "COMPLETED"
          ? "bg-[#F4F0FE] border-[#D4CAFE]"
          : "bg-[#c4e8d1] border-[#94ce9a]";

  const tagText = inscricoesEncerradas
    ? "text-red-900"
    : inscricoesEmBreve
      ? "text-amber-950"
      : vagasEsgotadas
        ? "text-violet-900"
        : event.status === "COMPLETED"
          ? "text-[#5B3FBF]"
          : "text-[#203c25]";

  const dotColor = inscricoesEncerradas
    ? "bg-red-600"
    : inscricoesEmBreve
      ? "bg-amber-500"
      : vagasEsgotadas
        ? "bg-violet-600"
        : event.status === "COMPLETED"
          ? "bg-[#5B3FBF]"
          : "bg-[#3e9b4f]";

  const organizer = getEventOrganizer(event);
  const organizerImg = organizer?.logoUrl
    ? getAvatarUrl(organizer.logoUrl)
    : event.organizer?.user?.avatarUrl
      ? getAvatarUrl(event.organizer.user.avatarUrl)
      : null;

  const eventImg = (event as any).logoUrl;

  return (
    <Link href={`/events/${event.slug}`} className="block h-full">
      <div className="flex h-full w-full flex-col overflow-hidden rounded-lg border border-[#cecece] bg-[#f9f9f9] shadow-[0_2px_6px_0_rgba(17,17,17,0.3)] transition-transform duration-200 hover:scale-[1.01]">
        {/* Imagem (banner) */}
        <div className="relative h-[232px] w-full shrink-0 bg-gray-4">
          <ImageWithInitialFallback
            src={eventImg}
            alt={event.name}
            name={event.name}
            fallbackId={event.id}
            fill
            sizes="(max-width: 768px) 90vw, 308px"
            className="size-full border-0 object-cover"
            letterClassName="text-6xl"
          />
        </div>

        {/* Título + local */}
        <div className="flex flex-col gap-3 border-b border-[#d9d9d9] px-3 pb-3 pt-4">
          <p className="truncate font-manrope text-base font-bold leading-[1.1] text-[#202020]">
            {event.name}
          </p>
          <div className="flex items-center gap-1">
            <LocationIcon className="size-5 shrink-0 text-[#202020]" />
            <span className="font-family-dm-sans text-sm leading-[1.3] text-[#202020]">
              {event.city}, {event.state}
            </span>
          </div>
        </div>

        {/* Organizador + data + tag (empurrada pro fundo) */}
        <div className="mt-auto flex flex-col gap-4 pt-3">
          <div className="flex flex-col gap-3 px-3">
            <div className="flex items-center gap-1">
              {organizerImg ? (
                <ImageWithInitialFallback
                  src={organizerImg}
                  alt={organizer?.name ?? "Organizador"}
                  name={organizer?.name ?? "Organizador"}
                  width={20}
                  height={20}
                  className="size-5 shrink-0 rounded-full"
                  imgClassName="object-cover"
                  letterClassName="text-xs"
                />
              ) : (
                <FlagIcon className="size-5 shrink-0" />
              )}
              <span className="truncate font-family-dm-sans text-sm leading-[1.3] text-[#202020]">
                {organizer?.name || "Organizador"}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <CalendarIcon className="size-5 shrink-0 text-[#202020]" />
              <span className="font-family-dm-sans text-sm leading-[1.3] text-[#202020]">
                {formattedDate}
              </span>
            </div>
          </div>

          <div className="flex items-center">
            <div className={cn("flex items-center gap-1 rounded-tr-[16px] border-r border-t p-3", tagBg)}>
              <span className={cn("size-3 shrink-0 rounded-full", dotColor)} />
              <span className={cn("font-family-dm-sans text-sm font-semibold leading-[1.3]", tagText)}>
                {statusLabel}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
