import { Button } from "../Button";
import { Event } from "@/constants/events";
import Image from "next/image";
import { MessageIcon } from "../Icons/MessageIcon";

interface EventInfoProps {
  event: Event;
  onNext: () => void;
}

export function EventInfo({ event, onNext }: EventInfoProps) {
  return (
    <div className="rounded-xl overflow-hidden bg-gray-2 shadow-[0_5px_10px_rgba(0,0,0,0.3)] h-full">
      <Image
        src={event.image}
        alt={event.title}
        width={100000}
        height={100000}
        className="w-full h-full object-cover rounded-xl"
      />

      <div className="p-4">
        <p className="text-sm text-gray-11">Seu pedido:</p>
        <h1 className="text-lg font-bold">{event.title}</h1>
        <p className="text-sm font-medium text-gray-12 mb-2">
          Do dia 13 - 15 Dez 2025
        </p>

        <div className="flex flex-col gap-2 bg-gray-3 rounded-lg p-3 border border-gray-6">
          <p className="text-sm font-medium text-gray-11">Organizador</p>

          <div className="flex items-center gap-2">
            <Image
              src={event.image}
              alt={event.title}
              width={100000}
              height={100000}
              className="w-10 h-10 rounded-full object-cover"
            />
            <div>
              <p className="text-sm font-medium text-gray-12">
                {event.organizer}
              </p>
              <p className="text-sm text-gray-11">CNPJ: 27.912.458/0001-73</p>
            </div>
          </div>

          <Button variant="ghost" className="w-full border border-gray-6 mt-4">
            <MessageIcon className="size-5" />
            Falar com organizador
          </Button>
        </div>

        <div className="flex flex-col w-full mt-4 gap-2">
          <p className="text-sm font-medium text-gray-11 flex items-center justify-between w-full">
            Valor dos ingressos: <span className="text-gray-12">R$ 100,00</span>
          </p>
          <p className="text-sm font-medium text-gray-11 flex items-center justify-between w-full">
            Taxa de serviço: <span className="text-gray-12">R$ 39,85</span>
          </p>
        </div>

        <h1 className="text-lg font-bold text-gray-12 flex items-center justify-between w-full mt-4 border-t border-gray-6 pt-4">
          Total: <span className="text-gray-12">R$ 139,85</span>
        </h1>

        <Button onClick={onNext} className="w-full mt-8 font-bold">
          Proximo
        </Button>
      </div>
    </div>
  );
}

