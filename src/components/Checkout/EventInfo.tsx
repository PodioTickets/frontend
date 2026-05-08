"use client";

import { useState } from "react";
import { Button } from "../Button";
import type { Event } from "@/interfaces/event";
import { ImageWithInitialFallback } from "@/components/ImageWithInitialFallback";
import { useCheckout } from "@/contexts/CheckoutContext";
import { useMemo } from "react";
import type { Ticket } from "@/hooks/useTickets";
import { getEventOrganizer } from "@/utils/organization";
import { getAvatarUrl } from "@/utils/avatar";
import { ContactOrganizerModal } from "@/components/Event/ContactOrganizerModal";
import { InstagramIcon } from "@/components/Icons/InstagramIcon";
import { FacebookIcon } from "@/components/Icons/FacebookIcon";
import { YoutubeIcon } from "@/components/Icons/YoutubeIcon";
import { TiktokIcon } from "@/components/Icons/TiktokIcon";
import { GlobeIcon } from "lucide-react";
import Link from "next/link";

interface EventInfoProps {
  event: Event;
  onNext: () => void;
  isSubmitting?: boolean;
  tickets?: Ticket[];
  categorizedTickets?: Array<{ id: string; name: string; tickets: Ticket[] }>;
  uncategorizedTickets?: Ticket[];
}

export function EventInfo({ event, onNext, isSubmitting = false, tickets = [], categorizedTickets = [], uncategorizedTickets = [] }: EventInfoProps) {
  const { raceQuantities } = useCheckout();
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  const formatDate = (date: string) => {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(date));
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  };

  const getTicketPrice = (ticket: Ticket): number => {
    try {
      return parseFloat(ticket.price.replace(/[^\d,]/g, "").replace(",", "."));
    } catch {
      return 0;
    }
  };

  // Agrupa ingressos para exibição
  const groupedTickets = useMemo(() => {
    const grouped: Array<{
      quantity: number;
      ticketName: string;
      categoryName: string;
      distance: string;
      price: number;
      total: number;
    }> = [];

    // Tickets com categoria
    categorizedTickets.forEach((category) => {
      category.tickets.forEach((ticket) => {
        const quantity = raceQuantities[ticket.id] || 0;
        if (quantity > 0) {
          const distance = ticket.distance ? `${ticket.distance}${ticket.distanceUnit || "K"}` : "";
          grouped.push({
            quantity,
            ticketName: ticket.name,
            categoryName: category.name,
            distance,
            price: getTicketPrice(ticket),
            total: getTicketPrice(ticket) * quantity,
          });
        }
      });
    });

    // Tickets avulsos
    uncategorizedTickets.forEach((ticket) => {
      const quantity = raceQuantities[ticket.id] || 0;
      if (quantity > 0) {
        const distance = ticket.distance ? `${ticket.distance}${ticket.distanceUnit || "K"}` : "";
        grouped.push({
          quantity,
          ticketName: ticket.name,
          categoryName: "",
          distance,
          price: getTicketPrice(ticket),
          total: getTicketPrice(ticket) * quantity,
        });
      }
    });

    return grouped;
  }, [raceQuantities, categorizedTickets, uncategorizedTickets]);

  const totalPrice = useMemo(() => {
    let total = 0;

    // Tickets com categoria
    categorizedTickets.forEach((category) => {
      category.tickets.forEach((ticket) => {
        const quantity = raceQuantities[ticket.id] || 0;
        if (quantity > 0) {
          total += getTicketPrice(ticket) * quantity;
        }
      });
    });

    // Tickets avulsos
    uncategorizedTickets.forEach((ticket) => {
      const quantity = raceQuantities[ticket.id] || 0;
      if (quantity > 0) {
        total += getTicketPrice(ticket) * quantity;
      }
    });

    return total;
  }, [raceQuantities, categorizedTickets, uncategorizedTickets]);

  const totalParticipants = useMemo(() => {
    let participants = 0;

    // Tickets com categoria
    categorizedTickets.forEach((category) => {
      category.tickets.forEach((ticket) => {
        const quantity = raceQuantities[ticket.id] || 0;
        if (quantity > 0) {
          participants += quantity;
        }
      });
    });

    // Tickets avulsos
    uncategorizedTickets.forEach((ticket) => {
      const quantity = raceQuantities[ticket.id] || 0;
      if (quantity > 0) {
        participants += quantity;
      }
    });

    return participants;
  }, [raceQuantities, categorizedTickets, uncategorizedTickets]);

  return (
    <div className="rounded-xl overflow-hidden bg-gray-2 shadow-[0_5px_10px_rgba(0,0,0,0.3)]">
      <div className="w-full h-[200px] relative">
        <ImageWithInitialFallback
          src={event.bannerUrl}
          alt={event.name}
          name={event.name}
          fallbackId={event.id}
          fill
          sizes="(max-width: 768px) 100vw, 400px"
          className="size-full border-transparent"
          letterClassName="text-5xl"
        />
      </div>

      <div className="p-4">
        <p className="text-sm text-gray-11">Seu pedido:</p>
        <h1 className="text-lg font-bold mb-2">{event.name}</h1>
        <div className="flex flex-col w-full mt-4 gap-2">
          {groupedTickets.length > 0 ? (
            <>
              {groupedTickets.map((ticket, index) => (
                <div
                  key={index}
                  className="text-sm font-semibold text-gray-12 flex items-center justify-between w-full"
                >
                  <div className="flex items-center gap-1">
                    ({ticket.quantity}x){" "}
                    <div className="flex flex-col items-start">
                      <span className="text-gray-11 text-xs truncate">{ticket.categoryName ? `${ticket.categoryName}` : "Ingresso Avulso"}</span>
                      <span className="text-gray-12 text-sm truncate">{ticket.ticketName}:{" "}</span>
                    </div>
                  </div>
                  <span className="text-gray-12">
                    {formatPrice(ticket.total)}
                  </span>
                </div>
              ))}
              <p className="text-sm font-semibold text-gray-12 flex items-center justify-between w-full">
                Taxa de serviço:{" "}
                <span className="text-gray-12">
                  {formatPrice(totalPrice * ((event.participantFeePercent ?? 0) / 100))}
                </span>
              </p>
            </>
          ) : (
            <p className="text-sm text-gray-11 text-center py-2">
              Nenhum ingresso selecionado
            </p>
          )}
        </div>

        {groupedTickets.length > 0 && (
          <h1 className="text-lg font-bold text-gray-12 flex items-center justify-between w-full mt-4 border-t border-gray-6 pt-4">
            Total:{" "}
            <span className="text-gray-12">
              {formatPrice(totalPrice + totalPrice * ((event.participantFeePercent ?? 0) / 100))}
            </span>
          </h1>
        )}

        <Button
          onClick={onNext}
          className="w-full mt-8 font-bold"
          disabled={totalParticipants === 0}
          isLoading={isSubmitting}
        >
          Proximo
        </Button>
      </div>

      <ContactOrganizerModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        organizerEmail={getEventOrganizer(event)?.email ?? ""}
        eventName={event.name}
      />
    </div>
  );
}
