"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useOrganizerAuth } from "@/hooks/useOrganizerAuth";
import { TicketForm } from "@/components/Ticket/TicketForm";
import { Loading } from "@/components/Loading";

export default function ReviewCreateTicketPage() {
  const params = useParams();
  const eventId = params.id as string;
  const searchParams = useSearchParams();
  const groupId = searchParams.get("groupId");
  const { isAuthenticated, isLoading } = useOrganizerAuth();

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loading />
      </div>
    );
  }

  return (
    <TicketForm
      eventId={eventId}
      initialGroupId={groupId || ""}
      backUrl={`/admin/events/${eventId}/review/tickets`}
      mode="create"
      className="pb-20"
    />
  );
}
