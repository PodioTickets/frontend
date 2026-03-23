"use client";

import { useParams } from "next/navigation";
import { useOrganizerAuth } from "@/hooks/useOrganizerAuth";
import { TicketForm } from "@/components/Ticket/TicketForm";

export default function EditTicketPage() {
  const params = useParams();
  const eventId = params.id as string;
  const ticketId = params.ticketId as string;
  const { isAuthenticated, isLoading } = useOrganizerAuth();

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-11">Carregando...</div>
      </div>
    );
  }

  return (
    <TicketForm
      eventId={eventId}
      ticketId={ticketId}
      backUrl={`/organizer/events/${eventId}/edit/tickets`}
      mode="edit"
      className="pb-20"
    />
  );
}
