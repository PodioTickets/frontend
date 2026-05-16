"use client";

import { ImageWithInitialFallback } from "@/components/ImageWithInitialFallback";
import { cn } from "@/utils/cn";
import { getApiClient } from "@/services/base/ApiClient";
import { useRouter } from "next/navigation";
import { modalitiesColumns } from "@/constants";
import Image from "next/image";

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
  const router = useRouter();
  const status = statusConfig[ticket.status] || statusConfig.PENDING;

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

  const primaryModality =
    ticket.modalities.length > 0 ? ticket.modalities[0] : null;
  const modalityIcon = primaryModality ? getModalityIcon(primaryModality) : null;

  return (
    <div
      onClick={handleClick}
      className={cn(
        "bg-white flex flex-col overflow-hidden rounded-xl shadow-[0px_2px_8px_0px_rgba(17,17,17,0.12)] w-[308px] cursor-pointer hover:shadow-[0px_4px_16px_0px_rgba(17,17,17,0.18)] hover:-translate-y-1 transition-all duration-300",
        className
      )}
    >
      {/* Banner image */}
      <div className="relative w-full overflow-hidden rounded-t-xl bg-gray-4" style={{ height: 232 }}>
        <ImageWithInitialFallback
          src={imageUrl}
          alt={ticket.event.name}
          name={ticket.event.name}
          fallbackId={ticket.event.id}
          fill
          sizes="308px"
          className="size-full border-transparent border-0 object-cover"
          imgClassName="object-cover"
          letterClassName="text-5xl font-bold"
        />

        {/* "Inscrição feita por" badge */}
        {ticket.invitedBy && (
          <div
            className="absolute top-2 left-2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full"
            style={{
              background: "rgba(20, 20, 20, 0.65)",
              backdropFilter: "blur(6px)",
              WebkitBackdropFilter: "blur(6px)",
            }}
          >
            <Image
              src="/images/gift-huge.png"
              alt=""
              width={14}
              height={14}
              className="shrink-0 brightness-0 invert"
            />
            <span className="text-white text-xs font-medium leading-none whitespace-nowrap font-dm-sans">
              Inscrição feita por{" "}
              <span className="font-semibold">{ticket.invitedBy.fullName}</span>
            </span>
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="flex flex-col gap-3 px-4 py-4">
        {/* Event name */}
        <h3 className="font-bold text-base leading-[1.2] text-gray-12 font-manrope line-clamp-2">
          {ticket.event.name}
        </h3>

        {/* Location */}
        <div className="flex items-center gap-2">
          <Image
            src="/images/location-huge.png"
            alt="Local"
            width={18}
            height={18}
            className="shrink-0"
          />
          <span className="text-sm text-gray-11 font-dm-sans leading-none">
            {ticket.event.location.city}, {ticket.event.location.state}
          </span>
        </div>

        {/* Date */}
        <div className="flex items-center gap-2">
          <Image
            src="/images/calendar-huge.png"
            alt="Data"
            width={18}
            height={18}
            className="shrink-0"
          />
          <span className="text-sm text-gray-11 font-dm-sans leading-none">
            {formatDate(ticket.event.eventDate)}
          </span>
        </div>

        {/* Modality */}
        {primaryModality && (
          <div className="flex items-center gap-2">
            {modalityIcon ? (
              <Image
                src={modalityIcon}
                alt={primaryModality}
                width={18}
                height={18}
                className="shrink-0 object-contain"
              />
            ) : (
              <div className="size-[18px] shrink-0" />
            )}
            <span className="text-sm text-gray-11 font-dm-sans leading-none line-clamp-1">
              {primaryModality}
            </span>
          </div>
        )}
      </div>

      {/* Status badge */}
      <div className="flex items-center px-4 pb-4">
        <div
          className={cn(
            "flex gap-1.5 items-center px-3 py-1.5 rounded-full border",
            status.bgColor,
            status.borderColor,
            status.textColor
          )}
        >
          <div className="size-2 shrink-0 rounded-full bg-current" />
          <p className="font-semibold text-xs leading-none font-dm-sans whitespace-nowrap">
            {status.label}
          </p>
        </div>
      </div>
    </div>
  );
}
