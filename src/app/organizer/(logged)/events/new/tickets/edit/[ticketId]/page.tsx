"use client";

import { useParams } from "next/navigation";
import { useCreateEvent } from "@/contexts/CreateEventContext";
import { useOrganizerAuth } from "@/hooks/useOrganizerAuth";
import { TicketForm } from "@/components/Ticket/TicketForm";
import { Loading } from "@/components/Loading";

export default function EditTicketPage() {
  const params = useParams();
  const ticketId = params.ticketId as string;
  const { formData } = useCreateEvent();
  const { isAuthenticated, isLoading } = useOrganizerAuth();

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loading />
      </div>
    );
  }

  if (!formData.createdEventId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-11">Evento não encontrado. Por favor, crie um evento primeiro.</div>
      </div>
    );
  }

  return (
    <TicketForm
      eventId={formData.createdEventId}
      ticketId={ticketId}
      backUrl="/organizer/events/new/tickets"
      mode="edit"
      className="bg-gray-2 flex-1 px-4 md:px-5 pb-28 pt-[52px]"
    />
  );
}
