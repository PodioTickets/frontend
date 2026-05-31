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

  const getStatusText = (status: Event["status"]) => {
    switch (status) {
      case "PUBLISHED":
        return "Inscrições abertas";
      case "DRAFT":
        return "Rascunho";
      case "CANCELLED":
        return "Cancelado";
      default:
        return "Inscrições abertas";
      case "COMPLETED":
        return "Evento realizado";
    }
  };

  const isOpen =
    (event.status === "PUBLISHED" || event.status === "SUSPENDED") &&
    !inscricoesEncerradas &&
    !inscricoesEmBreve &&
    !vagasEsgotadas;

  // Cores da tag de status (canto inferior esquerdo). Aberto = verde (design Figma).
  const tagColor = inscricoesEncerradas
    ? "bg-red-50 border-red-200"
    : inscricoesEmBreve
      ? "bg-amber-50 border-amber-300"
      : vagasEsgotadas
        ? "bg-violet-50 border-violet-200"
        : event.status === "COMPLETED"
          ? "bg-[#F4F0FE] border-[#D4CAFE]"
          : "bg-primary-5 border-primary-7";

  const tagTextColor = inscricoesEncerradas
    ? "text-red-900"
    : inscricoesEmBreve
      ? "text-amber-950"
      : vagasEsgotadas
        ? "text-violet-900"
        : event.status === "COMPLETED"
          ? "text-[#5B3FBF]"
          : "text-primary-12";

  const statusLabel = inscricoesEncerradas
    ? "Inscrições encerradas"
    : inscricoesEmBreve
      ? "Inscrições em breve"
      : vagasEsgotadas
        ? "Vagas esgotadas!"
        : getStatusText(event.status);

  const organizer = getEventOrganizer(event);

  const cardContent = (
    <>
      {/* Imagem (landscape) */}
      <div className="relative w-full h-[232px] overflow-hidden bg-gray-4">
        <ImageWithInitialFallback
          src={(event as any).logoUrl}
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
      <div className="flex flex-col gap-3 px-3 pt-4 pb-3 border-b border-gray-6">
        <h1 className="font-manrope font-bold text-base leading-[1.1] text-gray-12 truncate">
          {event.name}
        </h1>
        <div className="flex items-center gap-1 text-gray-12">
          <LocationIcon className="size-5 shrink-0" />
          <span className="text-sm font-family-dm-sans text-gray-12">
            {event.city}, {event.state}
          </span>
        </div>
      </div>

      {/* Organizador + data */}
      <div className="flex flex-col gap-4 pt-3">
        <div className="flex flex-col gap-3 px-3">
          <div className="flex items-center gap-1 text-sm font-family-dm-sans text-gray-12">
            {organizer?.logoUrl ? (
              <ImageWithInitialFallback
                src={getAvatarUrl(organizer.logoUrl)}
                alt={organizer.name}
                name={organizer.name}
                width={20}
                height={20}
                className="shrink-0 rounded-full size-5"
                imgClassName="object-cover"
                letterClassName="text-xs"
              />
            ) : event.organizer?.user?.avatarUrl ? (
              <ImageWithInitialFallback
                src={getAvatarUrl(event.organizer.user.avatarUrl)}
                alt={organizer?.name ?? "Organizador"}
                name={organizer?.name ?? "Organizador"}
                width={20}
                height={20}
                className="shrink-0 rounded-full size-5"
                imgClassName="object-cover"
                letterClassName="text-xs"
              />
            ) : (
              <FlagIcon className="size-5 shrink-0" />
            )}
            <span className="truncate">{organizer?.name || "Organizador"}</span>
          </div>
          <div className="flex items-center gap-1 text-sm font-family-dm-sans text-gray-12">
            <CalendarIcon className="size-5 shrink-0" />
            <span>{formattedDate}</span>
          </div>
        </div>

        {/* Tag de status — canto inferior esquerdo */}
        <div className="flex items-center">
          <div
            className={cn(
              "flex items-center gap-1 p-3 rounded-tr-[16px] border-t border-r",
              tagColor,
            )}
          >
            {isOpen && (
              <div className="border border-primary-12 bg-primary-5 rounded-full p-1">
                <div className="bg-primary-12 rounded-full size-1" />
              </div>
            )}
            <span className={cn("text-sm font-semibold font-family-dm-sans leading-[1.3]", tagTextColor)}>
              {statusLabel}
            </span>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="rounded-lg overflow-hidden bg-gray-2 border border-gray-7 shadow-[0_2px_6px_rgba(17,17,17,0.3)] transition-transform hover:scale-[1.02] duration-200">
      {event ? (
        <Link href={`/events/${event.slug}`} className="block">
          {cardContent}
        </Link>
      ) : (
        cardContent
      )}
    </div>
  );
}
