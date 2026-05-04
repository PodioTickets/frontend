"use client";

import { TicketCategoryCard } from "./TicketCategoryCard";
import { EventInfo } from "./EventInfo";
import type { Event } from "@/interfaces/event";
import { Fragment } from "react/jsx-runtime";
import { useMemo } from "react";
import { useCheckout } from "@/contexts/CheckoutContext";
import { Button } from "../Button";
import { useTickets } from "@/hooks/useTickets";
import { useTicketCategories } from "@/hooks/useTicketCategories";
import { Loading } from "../Loading";
import type { Ticket } from "@/hooks/useTickets";
import { parseEventKitSelectionDisplay } from "@/lib/eventKitSelectionDisplay";
import { useAuth } from "@/hooks/useAuth";
import { useLoginModal } from "@/stores/modalStore";

interface ModalitiesStepProps {
  event: Event;
  onNext: () => void;
  isSubmitting?: boolean;
}

export function ModalitiesStep({ event, onNext, isSubmitting = false }: ModalitiesStepProps) {
  const { raceQuantities } = useCheckout();
  const { isAuthenticated } = useAuth();
  const { openLoginModal } = useLoginModal();

  const handleNext = () => {
    if (!isAuthenticated) {
      openLoginModal();
      return;
    }
    onNext();
  };
  const eventId = event?.id;

  // Buscar tickets e categorias do servidor
  const { tickets, loading: ticketsLoading } = useTickets(eventId, !!eventId);
  const { categories, loading: categoriesLoading } = useTicketCategories(eventId, !!eventId);

  const loading = ticketsLoading || categoriesLoading;

  const kitSelectionDisplay = useMemo(
    () => parseEventKitSelectionDisplay(event.kitSelectionDisplay),
    [event.kitSelectionDisplay]
  );

  // Separar tickets com categoria dos avulsos
  const { categorizedTickets, uncategorizedTickets } = useMemo(() => {
    const categorized: Array<{
      id: string;
      name: string;
      description?: string;
      tickets: Ticket[];
    }> = [];
    const uncategorized: Ticket[] = [];

    // Mapear categorias por ID
    const categoryMap = new Map(categories.map((cat) => [cat.id, cat.name]));

    // Agrupar tickets por categoria
    const ticketsByCategory: Record<string, Ticket[]> = {};
    tickets.forEach((ticket) => {
      const categoryId = ticket.groupId;
      if (categoryId && categoryMap.has(categoryId)) {
        // Ticket tem categoria válida
        if (!ticketsByCategory[categoryId]) {
          ticketsByCategory[categoryId] = [];
        }
        ticketsByCategory[categoryId].push(ticket);
      } else {
        // Ticket sem categoria (avulso)
        uncategorized.push(ticket);
      }
    });

    // Processar categorias com tickets
    categories.forEach((category) => {
      const categoryTickets = ticketsByCategory[category.id] || [];
      if (categoryTickets.length > 0) {
        categorized.push({
          id: category.id,
          name: category.name,
          description: category.description,
          tickets: categoryTickets.filter((ticket) => {
            try {
              const price = parseFloat(ticket.price.replace(/[^\d,]/g, "").replace(",", "."));
              return !isNaN(price) && price > 0;
            } catch {
              return false;
            }
          }),
        });
      }
    });

    // Filtrar tickets avulsos válidos
    const validUncategorized = uncategorized.filter((ticket) => {
      try {
        const price = parseFloat(ticket.price.replace(/[^\d,]/g, "").replace(",", "."));
        return !isNaN(price) && price > 0;
      } catch {
        return false;
      }
    });

    return {
      categorizedTickets: categorized,
      uncategorizedTickets: validUncategorized,
    };
  }, [tickets, categories]);

  const getTicketPrice = (ticket: Ticket): number => {
    try {
      return parseFloat(ticket.price.replace(/[^\d,]/g, "").replace(",", "."));
    } catch {
      return 0;
    }
  };

  const { totalParticipants, totalPrice } = useMemo(() => {
    let participants = 0;
    let total = 0;

    // Tickets com categoria
    categorizedTickets.forEach((category) => {
      category.tickets.forEach((ticket) => {
        const quantity = raceQuantities[ticket.id] || 0;
        if (quantity > 0) {
          participants += quantity;
          total += getTicketPrice(ticket) * quantity;
        }
      });
    });

    // Tickets avulsos
    uncategorizedTickets.forEach((ticket) => {
      const quantity = raceQuantities[ticket.id] || 0;
      if (quantity > 0) {
        participants += quantity;
        total += getTicketPrice(ticket) * quantity;
      }
    });

    return { totalParticipants: participants, totalPrice: total };
  }, [raceQuantities, categorizedTickets, uncategorizedTickets]);

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

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <>
      {/* Mobile Layout */}
      <div className="w-full md:hidden pb-24 px-0">
        {/* Instruction Card */}
        <div className=" rounded-lg mb-4">
          <p className="text-sm text-gray-11">
            Escolha seu ingresso e defina a quantidade. Você pode ajustar depois em Informações.
          </p>
        </div>

        {/* Categories List */}
        <div className="flex flex-col gap-4">
          {categorizedTickets.length > 0 || uncategorizedTickets.length > 0 ? (
            <>
              {uncategorizedTickets.map((ticket) => (
                <TicketCategoryCard
                  key={ticket.id}
                  tickets={[ticket]}
                  event={event}

                  kitSelectionDisplay={kitSelectionDisplay}
                />
              ))}
              {categorizedTickets.map((category, index) => (
                <TicketCategoryCard
                  key={category.id}
                  categoryId={category.id}
                  categoryName={category.name}
                  categoryDescription={category.description}
                  tickets={category.tickets}
                  index={index}
                  expandedByDefault={index === 0}
                  event={event}

                  kitSelectionDisplay={kitSelectionDisplay}
                />
              ))}
            </>
          ) : (
            <div className="w-full rounded-lg border border-gray-5 px-4 py-8 text-center ">
              <p className="text-gray-11">
                Nenhum ingresso disponível para este evento.
              </p>
            </div>
          )}
        </div>

        {/* Fixed Bottom Bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-gray-2 border-t border-gray-6 shadow-lg px-4 py-4 z-50 md:hidden">
          <div className="flex items-end justify-between text-gray-12 font-family-dm-sans">
            <div className="flex flex-col gap-2">
              <h1 className="text-base font-bold">{event.name}</h1>
              <p className="text-sm">
                Participantes:{" "}
                <span className="font-semibold">{totalParticipants}</span>
              </p>
              {groupedTickets.map((ticket, index) => (
                <p key={index} className="text-sm">
                  ({ticket.quantity}x) {ticket.distance ? `${ticket.distance} ` : ""}{ticket.ticketName}:{" "}
                  <span className="font-semibold">
                    {formatPrice(ticket.total)}
                  </span>
                </p>
              ))}
              <p className="text-base">
                Valor total:{" "}
                <span className="font-bold">{formatPrice(totalPrice)}</span>
              </p>
            </div>
            <Button onClick={handleNext} disabled={totalParticipants === 0} isLoading={isSubmitting}>
              Selecionar
            </Button>
          </div>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:block w-full">
        <div className="w-full">
          <h1 className="text-2xl font-bold">Selecione seus ingressos</h1>
          <p className="text-sm text-gray-11 mt-4">
            Escolha seus ingressos e defina a quantidade. Você pode ajustar depois em Informações.
          </p>
        </div>

        <div className="w-full flex items-start gap-11 mt-6">
          <div className="flex-1 flex flex-col gap-6">
            {categorizedTickets.length > 0 || uncategorizedTickets.length > 0 ? (
              <>
                {uncategorizedTickets.map((ticket, index) => {
                  const isLast = index === uncategorizedTickets.length - 1;
                  return (
                    <Fragment key={ticket.id}>
                      <TicketCategoryCard
                        tickets={[ticket]}
                        event={event}
      
                        kitSelectionDisplay={kitSelectionDisplay}
                      />
                      {!isLast && <div className="w-full h-px bg-gray-6" />}
                    </Fragment>
                  );
                })}

                {categorizedTickets.map((category, index) => {
                  const isLastCategory = index === categorizedTickets.length - 1;
                  return (
                    <Fragment key={category.id}>
                      <TicketCategoryCard
                        categoryId={category.id}
                        categoryName={category.name}
                        categoryDescription={category.description}
                        tickets={category.tickets}
                        index={index}
                        expandedByDefault={index === 0}
                        event={event}
      
                        kitSelectionDisplay={kitSelectionDisplay}
                      />
                      {!isLastCategory && (
                        <div className="w-full h-px bg-gray-6" />
                      )}
                    </Fragment>
                  );
                })}
              </>
            ) : (
              <div className="w-full rounded-lg border border-gray-5 px-4 py-8 text-center">
                <p className="text-gray-11">
                  Nenhum ingresso disponível para este evento.
                </p>
              </div>
            )}
          </div>
          <div className="w-[400px] shrink-0">
            <EventInfo
              event={event}
              onNext={handleNext}
              isSubmitting={isSubmitting}
              tickets={tickets}
              categorizedTickets={categorizedTickets}
              uncategorizedTickets={uncategorizedTickets}
            />
          </div>
        </div>
      </div>
    </>
  );
}
