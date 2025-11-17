import { CalendarIcon } from "@/components/Icons/CalendarIcon";
import { FlagIcon } from "@/components/Icons/FlagIcon";
import { LocationIcon } from "@/components/Icons/LocationIcon";
import Image from "next/image";

export function EventCard() {
  return (
    <div className="rounded-xl overflow-hidden bg-gray-2 shadow-[0_5px_10px_rgba(0,0,0,0.3)]">
      <Image
        src="/banners/card_placeholder.png"
        alt="Evento"
        width={50000}
        height={148}
        className="rounded-lg object-contain"
      />

      <div className="flex flex-col gap-2 px-3 mt-2">
        <h1 className="text-lg font-bold">Maratona de Santhiago</h1>
        <h1 className="flex items-center gap-2 text-gray-12">
          <LocationIcon className="size-5" />{" "}
          <span className="text-sm text-gray-12">São Paulo, SP</span>
        </h1>
      </div>

      <div className="h-px w-full bg-gray-6 my-3" />

      <div className="flex flex-col justify-between px-3 gap-3">
        <h1 className="flex items-center gap-2 text-sm text-gray-12">
          <FlagIcon className="size-5" /> <span>Maráton Santhiago</span>
        </h1>
        <h1 className="flex items-center gap-2 text-sm text-gray-12">
          <CalendarIcon className="size-5" /> <span>10/10/2025</span>
        </h1>
      </div>

      <div className="flex items-center justify-between mt-3">
        <div className="w-auto flex items-center justify-center gap-2 bg-primary-5 border border-primary-7 rounded-tr-xl rounded-bl-xl p-2">
          <div className="border border-primary-12 bg-primary-5 rounded-full p-1">
            <div className="bg-primary-12 rounded-full size-1" />
          </div>
          <h1 className="text-sm font-semibold font-family-dm-sans text-gray-12">
            Inscrições abertas
          </h1>
        </div>
      </div>
    </div>
  );
}
