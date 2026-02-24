"use client";

import Image from "next/image";
import { MapPin, Calendar, Clock, Navigation } from "lucide-react";
import { cn } from "@/utils/cn";
import { getApiClient } from "@/services/base/ApiClient";

export interface Ticket {
  id: string;
  event: {
    id: string;
    name: string;
    imageUrl?: string;
    eventDate: string;
    location: {
      city: string;
      state: string;
    };
  };
  modality: {
    icon?: string;
    name: string;
  };
  status: "CONFIRMED" | "PENDING" | "COMPLETED" | "CANCELLED";
  distance?: string;
  // Campos adicionais da API
  qrCode?: string;
  purchaseDate?: string;
  payment?: {
    id: string;
    method: string;
    status: string;
    amount: number;
  };
}

interface TicketCardProps {
  ticket: Ticket;
  className?: string;
}

const statusConfig = {
  CONFIRMED: {
    label: "Inscrição confirmada",
    bgColor: "bg-[#c4e8d1]",
    borderColor: "border-primary-7",
    textColor: "text-primary-12",
  },
  PENDING: {
    label: "Pagamento pendente",
    bgColor: "bg-yellow-3",
    borderColor: "border-yellow-8",
    textColor: "text-yellow-12",
  },
  COMPLETED: {
    label: "Evento realizado",
    bgColor: "bg-red-3",
    borderColor: "border-red-8",
    textColor: "text-red-12",
  },
  CANCELLED: {
    label: "Cancelado",
    bgColor: "bg-red-3",
    borderColor: "border-red-8",
    textColor: "text-red-12",
  },
};

export function TicketCard({ ticket, className }: TicketCardProps) {
  const status = statusConfig[ticket.status] || statusConfig.PENDING;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const imageUrl = ticket.event.imageUrl
    ? ticket.event.imageUrl.startsWith("http")
      ? ticket.event.imageUrl
      : `${getApiClient().getBaseURL()}${ticket.event.imageUrl}`
    : "/banners/card_placeholder.png";

  return (
    <div
      className={cn(
        "bg-gray-2 flex flex-col items-start overflow-hidden rounded-lg shadow-[0px_2px_6px_0px_rgba(17,17,17,0.25)] w-full max-w-[308px] cursor-pointer border border-transparent hover:border-gray-6 hover:translate-y-[-5px] transition-all duration-300",
        className
      )}
    >
      {/* Image */}
      <div className="h-[232px] relative rounded-t-lg shrink-0 w-full">
        <Image
          src={imageUrl}
          alt={ticket.event.name}
          fill
          className="object-cover rounded-t-lg"
          onError={(e) => {
            e.currentTarget.src = "/banners/card_placeholder.png";
          }}
        />
      </div>

      {/* Title Section */}
      <div className="border-b border-gray-6 flex flex-col gap-3 items-start justify-center pb-3 pt-4 px-3 w-full">
        <h3 className="font-bold text-base leading-[1.1] text-gray-12 font-manrope line-clamp-2">
          {ticket.event.name}
        </h3>
        <div className="flex gap-1 items-center justify-center">
          <MapPin className="size-5 shrink-0 text-gray-12" />
          <p className="font-normal text-sm leading-[1.3] text-gray-12 font-family-dm-sans">
            {ticket.event.location.city}, {ticket.event.location.state}
          </p>
        </div>
      </div>

      {/* Info Section */}
      <div className="flex flex-col gap-4 items-start justify-center pt-3 px-0 w-full">
        <div className="flex flex-col gap-3 items-start px-3 w-full">
          {/* Modality */}
          <div className="flex gap-1 items-center w-full">
            <Image
              src={
                ticket.modality?.icon || "/icons-3d/Icon3D-corrida-de-rua.webp"
              }
              alt={ticket.modality.name}
              width={20}
              height={20}
            />
            <p className="font-normal text-sm leading-[1.3] text-gray-12 font-family-dm-sans line-clamp-1">
              {ticket.modality.name}
            </p>
          </div>

          {/* Date and Time */}
          <div className="flex items-center justify-between w-full">
            <div className="flex gap-1 items-center justify-center">
              <Calendar className="size-5 shrink-0 text-gray-12" />
              <p className="font-normal text-sm leading-[1.3] text-gray-12 font-family-dm-sans">
                {formatDate(ticket.event.eventDate)}
              </p>
            </div>
            <div className="flex gap-1 items-center justify-center">
              <Clock className="size-5 shrink-0 text-gray-12" />
              <p className="font-normal text-sm leading-[1.3] text-gray-12 font-family-dm-sans">
                {formatTime(ticket.event.eventDate)}
              </p>
            </div>
          </div>

          {/* Distance */}
          {ticket.distance && (
            <div className="flex gap-1 items-center justify-center">
              <Navigation className="size-5 shrink-0 text-gray-12" />
              <p className="font-normal text-sm leading-[1.3] text-gray-12 font-family-dm-sans">
                {ticket.distance}
              </p>
            </div>
          )}
        </div>

        {/* Status Badge */}
        <div className="flex items-center pl-0 pr-3 py-0 w-full">
          <div
            className={cn(
              "border-t border-r border-l-0 border-b-0 rounded-tr-2xl flex gap-1 items-center justify-center p-3",
              status.bgColor,
              status.borderColor,
              status.textColor
            )}
          >
            <div className="relative shrink-0 size-3 rounded-full bg-current" />
            <p className="font-semibold text-sm leading-[1.3] font-family-dm-sans whitespace-nowrap">
              {status.label}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
