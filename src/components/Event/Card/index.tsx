import { CalendarIcon } from "@/components/Icons/CalendarIcon";
import { FlagIcon } from "@/components/Icons/FlagIcon";
import { LocationIcon } from "@/components/Icons/LocationIcon";
import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import type { Event } from "@/constants/events";

interface EventCardProps {
  event: Event;
}

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function EventCard({ event }: EventCardProps) {
  const formattedDate = useMemo(
    () => dateFormatter.format(event.date),
    [event.date]
  );

  const getStatusText = (status: Event["status"]) => {
    switch (status) {
      case "inscricoes-abertas":
        return "Inscrições abertas";
      case "inscricoes-encerradas":
        return "Inscrições encerradas";
      case "evento-encerrado":
        return "Evento encerrado";
      default:
        return "Inscrições abertas";
    }
  };

  const cardContent = (
    <>
      <Image
        src={event.image}
        alt={event.title}
        width={50000}
        height={148}
        className="rounded-lg object-contain"
      />

      <div className="flex flex-col gap-2 px-3 mt-2">
        <h1 className="text-lg font-bold truncate">{event.title}</h1>
        <h1 className="flex items-center gap-2 text-gray-12">
          <LocationIcon className="size-5" />{" "}
          <span className="text-sm text-gray-12">
            {event.location.city}, {event.location.state}
          </span>
        </h1>
      </div>

      <div className="h-px w-full bg-gray-6 my-3" />

      <div className="flex flex-col justify-between px-3 gap-3">
        <h1 className="flex items-center gap-2 text-sm text-gray-12">
          <FlagIcon className="size-5" /> <span>{event.organizer}</span>
        </h1>
        <h1 className="flex items-center gap-2 text-sm text-gray-12">
          <CalendarIcon className="size-5" />{" "}
          <span>{formattedDate}</span>
        </h1>
      </div>

      <div className="flex items-center justify-between mt-3">
        <div className="w-auto flex items-center justify-center gap-2 bg-primary-5 border border-primary-7 rounded-tr-xl rounded-bl-xl p-2">
          <div className="border border-primary-12 bg-primary-5 rounded-full p-1">
            <div className="bg-primary-12 rounded-full size-1" />
          </div>
          <h1 className="text-sm font-semibold font-family-dm-sans text-gray-12">
            {getStatusText(event.status)}
          </h1>
        </div>
      </div>
    </>
  );

  return (
    <div className="rounded-xl overflow-hidden bg-gray-2 shadow-[0_5px_10px_rgba(0,0,0,0.3)] transition-transform hover:scale-[1.02] duration-200">
      {event ? (
        <Link href={`/events/${event.id}`} className="block">
          {cardContent}
        </Link>
      ) : (
        cardContent
      )}
    </div>
  );
}

