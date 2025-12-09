import { Button } from "../Button";
import type { Event } from "@/interfaces/event";
import Image from "next/image";
import { MessageIcon } from "../Icons/MessageIcon";

interface EventInfoProps {
  event: Event;
  onNext: () => void;
}

export function EventInfo({ event, onNext }: EventInfoProps) {
  const formatDate = (date: string) => {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(date));
  };

  return (
    <div className="rounded-xl overflow-hidden bg-gray-2 shadow-[0_5px_10px_rgba(0,0,0,0.3)]">
      <div className="w-full h-[200px] relative">
        <Image
          src={event.bannerUrl}
          alt={event.name}
          fill
          className="object-cover"
        />
      </div>

      <div className="p-4">
        <p className="text-sm text-gray-11">Seu pedido:</p>
        <h1 className="text-lg font-bold">{event.name}</h1>
        <p className="text-sm font-medium text-gray-12 mb-2">
          Do dia {formatDate(event.eventDate)}
        </p>

        <div className="flex flex-col gap-2 bg-gray-3 rounded-lg p-3 border border-gray-6">
          <p className="text-sm font-medium text-gray-11">Organizador</p>

          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-gray-5 flex items-center justify-center">
              <span className="text-xs font-bold text-gray-11">
                {event.organizer.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-12">
                {event.organizer.name}
              </p>
              <p className="text-sm text-gray-11">
                {event.organizer.email}
              </p>
            </div>
          </div>

          <Button variant="ghost" className="w-full border border-gray-6 mt-4">
            <MessageIcon className="size-5" />
            Falar com organizador
          </Button>
        </div>

        <div className="flex flex-col w-full mt-4 gap-2">
          <p className="text-sm font-medium text-gray-11 flex items-center justify-between w-full">
            Valor dos ingressos:{" "}
            <span className="text-gray-12">R$ {event.price?.toFixed(2) || 0}</span>
          </p>
          <p className="text-sm font-medium text-gray-11 flex items-center justify-between w-full">
            Taxa de serviço:{" "}
            <span className="text-gray-12">R$ {event.serviceFee?.toFixed(2) || 0}</span>
          </p>
        </div>

        <h1 className="text-lg font-bold text-gray-12 flex items-center justify-between w-full mt-4 border-t border-gray-6 pt-4">
          Total: <span className="text-gray-12">R$ {(event.price + event.serviceFee || 0).toFixed(2)}</span>
        </h1>

        <Button onClick={onNext} className="w-full mt-8 font-bold">
          Proximo
        </Button>
      </div>
    </div>
  );
}
