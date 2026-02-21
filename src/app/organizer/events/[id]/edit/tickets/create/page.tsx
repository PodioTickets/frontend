"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useOrganizerAuth } from "@/hooks/useOrganizerAuth";
import { TicketForm } from "@/components/Ticket/TicketForm";

export default function EditCreateTicketPage() {
  const params = useParams();
  const eventId = params.id as string;
  const searchParams = useSearchParams();
  const groupId = searchParams.get("groupId");
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
      initialGroupId={groupId || ""}
      backUrl={`/organizer/events/${eventId}/edit/tickets`}
      mode="create"
      className="pb-20"
    />
  );
}
