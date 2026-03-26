"use client";

import { useSearchParams } from "next/navigation";
import { useCreateEvent } from "@/contexts/CreateEventContext";
import { useOrganizerAuth } from "@/hooks/useOrganizerAuth";
import { TicketForm } from "@/components/Ticket/TicketForm";
import { Loading } from "@/components/Loading";

export default function CreateTicketPage() {
  const searchParams = useSearchParams();
  const groupId = searchParams.get("groupId");
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
      initialGroupId={groupId || ""}
      backUrl="/organizer/events/new/tickets"
      mode="create"
      localStorageKey="createTicketFormData"
      className="bg-gray-2 flex-1 pb-[176px] px-5 md:px-[124px] pt-[52px]"
    />
  );
}
