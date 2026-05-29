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

  const getStatusColor = (status: Event["status"]) => {
    switch (status) {
      case "PUBLISHED":
        return "bg-primary-5 border-primary-7";
      case "COMPLETED":
        return "bg-[#F4F0FE] border-[#D4CAFE]";
      case "CANCELLED":
        return "bg-red-3 border-red-6";
      case "SUSPENDED":
        return "bg-primary-5 border-primary-7";
      default:
        return "bg-primary-5";
    }
  };

  const cardContent = (
    <>
      <div className="relative w-full aspect-square overflow-hidden rounded-lg bg-gray-4">
        <ImageWithInitialFallback
          src={(event as any).logoUrl}
          alt={event.name}
          name={event.name}
          fallbackId={event.id}
          fill
          sizes="(max-width: 768px) 100vw, 300px"
          className="size-full border-transparent border-0 aspect-square"
          letterClassName="text-6xl"
        />
      </div>

      <div className="flex flex-col gap-2 px-3 mt-2">
        <h1 className="font-bold truncate">{event.name}</h1>
        <h1 className="flex items-center gap-2 text-gray-12">
          <LocationIcon className="size-5" />{" "}
          <span className="text-sm text-gray-12">
            {event.city}, {event.state}
          </span>
        </h1>
      </div>

      <div className="h-px w-full bg-gray-6 my-3" />

      <div className="flex flex-col justify-between px-3 gap-3">
        <h1 className="flex items-center gap-2 text-sm text-gray-12">
          {(() => {
            const organizer = getEventOrganizer(event);
            if (!organizer) return <FlagIcon className="size-5" />;

            // Se tiver logoUrl (organization), usa ela, senão usa avatar do user (organizer antigo)
            if (organizer.logoUrl) {
              return (
                <ImageWithInitialFallback
                  src={getAvatarUrl(organizer.logoUrl)}
                  alt={organizer.name}
                  name={organizer.name}
                  width={20}
                  height={20}
                  className="hrink-0 rounded-full size-5"
                  imgClassName="object-cover"
                  letterClassName="text-xs"
                />
              );
            }

            // Fallback para formato antigo
            if (event.organizer?.user?.avatarUrl) {
              return (
                <ImageWithInitialFallback
                  src={getAvatarUrl(event.organizer.user.avatarUrl)}
                  alt={organizer.name}
                  name={organizer.name}
                  width={20}
                  height={20}
                  className="rounded-sm shrink-0"
                  imgClassName="object-cover"
                  letterClassName="text-xs"
                />
              );
            }

            return <FlagIcon className="size-5" />;
          })()}
          <span>{getEventOrganizer(event)?.name || "Organizador"}</span>
        </h1>
        <h1 className="flex items-center gap-2 text-sm text-gray-12">
          <CalendarIcon className="size-5" /> <span>{formattedDate}</span>
        </h1>
      </div>

      <div className="flex items-center justify-between mt-3">
        <div
          className={cn(
            "w-auto flex items-center justify-center gap-2 border rounded-tr-xl rounded-bl-xl p-2",
            inscricoesEncerradas
              ? "bg-red-50 border-red-200"
              : inscricoesEmBreve
                ? "bg-amber-50 border-amber-300"
                : vagasEsgotadas
                  ? "bg-violet-50 border-violet-200"
                  : getStatusColor(event.status)
          )}
        >
          {(event.status === "PUBLISHED" || event.status === "SUSPENDED") && !inscricoesEncerradas && !inscricoesEmBreve && !vagasEsgotadas && (
            <div className="border border-primary-12 bg-primary-5 rounded-full p-1">
              <div className="bg-primary-12 rounded-full size-1" />
            </div>)}
          <h1
            className={cn(
              "text-sm font-semibold font-family-dm-sans",
              inscricoesEncerradas
                ? "text-red-900"
                : inscricoesEmBreve
                  ? "text-amber-950"
                  : vagasEsgotadas
                    ? "text-violet-900"
                    : "text-gray-12"
            )}
          >
            {inscricoesEncerradas
              ? "Inscrições encerradas"
              : inscricoesEmBreve
                ? "Inscrições em breve"
                : vagasEsgotadas
                  ? "Vagas esgotadas!"
                  : getStatusText(event.status)}
          </h1>
        </div>
      </div>
    </>
  );

  return (
    <div className="rounded-xl overflow-hidden bg-gray-2 shadow-[0_2px_12px_rgba(0,0,0,0.08)] transition-transform hover:scale-[1.02] duration-200">
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
