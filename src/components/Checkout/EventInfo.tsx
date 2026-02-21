"use client";

import { Button } from "../Button";
import type { Event } from "@/interfaces/event";
import Image from "next/image";
import { MessageIcon } from "../Icons/MessageIcon";
import { useCheckout } from "@/contexts/CheckoutContext";
import { useMemo } from "react";
import type { Ticket } from "@/hooks/useTickets";

interface EventInfoProps {
  event: Event;
  onNext: () => void;
  tickets?: Ticket[];
  categorizedTickets?: Array<{ id: string; name: string; tickets: Ticket[] }>;
  uncategorizedTickets?: Ticket[];
}

export function EventInfo({ event, onNext, tickets = [], categorizedTickets = [], uncategorizedTickets = [] }: EventInfoProps) {
  const { raceQuantities } = useCheckout();

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
            <div className="w-10 h-10 rounded-full bg-gray-3 flex items-center justify-center">
              <span className="text-xs font-bold text-gray-11">
                {event.organizer.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-12">
                {event.organizer.name}
              </p>
              <p className="text-sm text-gray-11">{event.organizer.email}</p>
            </div>
          </div>

          <Button variant="ghost" className="w-full border border-gray-6 mt-4">
            <MessageIcon className="size-5" />
            Falar com organizador
          </Button>
        </div>

        <div className="flex flex-col w-full mt-4 gap-2">
          {groupedTickets.length > 0 ? (
            <>
              {groupedTickets.map((ticket, index) => (
                <p
                  key={index}
                  className="text-sm font-semibold text-gray-12 flex items-center justify-between w-full"
                >
                  ({ticket.quantity}x) {ticket.distance ? `${ticket.distance} ` : ""}{ticket.ticketName}:{" "}
                  <span className="text-gray-12">
                    {formatPrice(ticket.total)}
                  </span>
                </p>
              ))}
              <p className="text-sm font-semibold text-gray-12 flex items-center justify-between w-full">
                Taxa de serviço:{" "}
                <span className="text-gray-12">
                  {formatPrice(event.serviceFee || 0)}
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
              {formatPrice(totalPrice + (event.serviceFee || 0))}
            </span>
          </h1>
        )}

        <Button
          onClick={onNext}
          className="w-full mt-8 font-bold"
          disabled={totalParticipants === 0}
        >
          Proximo
        </Button>
      </div>
    </div>
  );
}
