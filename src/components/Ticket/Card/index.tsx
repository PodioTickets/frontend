"use client";

import { MapPin, Calendar } from "lucide-react";
import { cn } from "@/utils/cn";
import { getApiClient } from "@/services/base/ApiClient";
import { useRouter } from "next/navigation";
import { modalitiesColumns } from "@/constants";
import Image from "next/image";
import { useState, useCallback } from "react";
import { itemInitialLetter } from "@/utils/itemInitial";

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
  modalities: string[];
  status: "CONFIRMED" | "PENDING" | "COMPLETED" | "CANCELLED";
  distance?: string;
  qrCode?: string;
  purchaseDate?: string;
  createdAt?: string;
  payment?: {
    id?: string;
    method: string;
    status: string;
    amount: number;
  };
  invitedBy?: { id: string; fullName: string } | null;
}

interface TicketCardProps {
  ticket: Ticket;
  className?: string;
}

export function TicketCard({ ticket, className }: TicketCardProps) {
  const router = useRouter();
  const [imgFailed, setImgFailed] = useState(false);
  const onImgError = useCallback(() => setImgFailed(true), []);

  const handleClick = () => {
    router.push(`/user/tickets/${ticket.id}`);
  };

  const allModalityOptions = modalitiesColumns.flat();
  const getModalityIcon = (name: string) =>
    allModalityOptions.find((item) => item.label === name)?.icon;

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const imageUrl = ticket.event.imageUrl
    ? ticket.event.imageUrl.startsWith("http")
      ? ticket.event.imageUrl
      : `${getApiClient().getBaseURL()}${ticket.event.imageUrl}`
    : null;

  const primaryModality = ticket.modalities.length > 0 ? ticket.modalities[0] : null;
  const modalityIcon = primaryModality ? getModalityIcon(primaryModality) : null;

  return (
    <div
      onClick={handleClick}
      className={cn(
        "relative flex flex-col overflow-hidden rounded-lg cursor-pointer bg-[#F9F9F9] w-full",
        "hover:-translate-y-1 transition-transform duration-200",
        className
      )}
      style={{ boxShadow: "0px 2px 6px rgba(17, 17, 17, 0.25)" }}
    >
      {/* Banner image */}
      <div className="relative w-full aspect-square overflow-hidden rounded-lg bg-[#E8E8E8]">
        {imageUrl && !imgFailed ? (
          <Image
            src={imageUrl}
            alt={ticket.event.name}
            fill
            sizes="(max-width: 1440px) 25vw, 308px"
            className="object-cover"
            onError={onImgError}
          />
        ) : (
          <span className="text-5xl font-bold text-gray-400 select-none">
            {itemInitialLetter(ticket.event.name, ticket.event.id)}
          </span>
        )}
      </div>

      {/* "Inscrição feita por" badge — absolute over image */}
      {ticket.invitedBy && (
        <div
          className="absolute top-2 left-2 flex items-center gap-2 rounded-lg p-2"
          style={{
            background: "rgba(1, 29, 33, 0.70)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
          }}
        >
          <Image
            src="/images/gift-huge.png"
            alt=""
            width={20}
            height={20}
            className="shrink-0 brightness-0 invert"
          />
          <div className="flex flex-col gap-2">
            <span
              className="font-dm-sans font-normal text-[#B4B4B4]"
              style={{ fontSize: 12, lineHeight: "15.6px" }}
            >
              Inscrição feita por
            </span>
            <span
              className="font-dm-sans font-semibold text-[#EEEEEE]"
              style={{ fontSize: 12, lineHeight: "15.6px" }}
            >
              {ticket.invitedBy.fullName}
            </span>
          </div>
        </div>
      )}

      {/* Info section (border-bottom) */}
      <div
        className="w-full flex flex-col gap-3 border-b border-[#D9D9D9]"
        style={{ paddingTop: 16, paddingBottom: 12, paddingLeft: 12, paddingRight: 12 }}
      >
        {/* Event name */}
        <p
          className="font-manrope font-bold text-[#202020] line-clamp-2"
          style={{ fontSize: 16, lineHeight: "17.6px" }}
        >
          {ticket.event.name}
        </p>

        {/* Location */}
        <div className="flex items-center gap-1">
          <MapPin
            size={20}
            strokeWidth={1.5}
            className="shrink-0 text-[#202020]"
          />
          <span
            className="font-dm-sans font-normal text-[#202020]"
            style={{ fontSize: 14, lineHeight: "18.2px" }}
          >
            {ticket.event.location.city}, {ticket.event.location.state}
          </span>
        </div>

        {/* Date */}
        <div className="flex items-center gap-1">
          <Calendar
            size={20}
            strokeWidth={1.5}
            className="shrink-0 text-[#202020]"
          />
          <span
            className="font-dm-sans font-normal text-[#202020]"
            style={{ fontSize: 14, lineHeight: "18.2px" }}
          >
            {formatDate(ticket.event.eventDate)}
          </span>
        </div>
      </div>

      {/* Bottom: modality */}
      <div
        className="w-full flex flex-col"
        style={{ paddingTop: 12, paddingBottom: 16 }}
      >
        <div
          className="w-full flex items-center gap-3"
          style={{ paddingLeft: 12, paddingRight: 12 }}
        >
          {primaryModality && (
            <div className="flex items-center gap-1">
              {modalityIcon ? (
                <Image
                  src={modalityIcon}
                  alt={primaryModality}
                  width={20}
                  height={20}
                  className="shrink-0 object-contain"
                />
              ) : (
                <div className="size-5 shrink-0" />
              )}
              <span
                className="font-dm-sans font-normal text-[#202020] line-clamp-1"
                style={{ fontSize: 14, lineHeight: "18.2px" }}
              >
                {primaryModality}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
