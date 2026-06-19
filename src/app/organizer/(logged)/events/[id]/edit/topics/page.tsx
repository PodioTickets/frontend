"use client";

import { useParams } from "next/navigation";
import { useOrganizerNavigate } from "@/hooks/useOrganizerNavigate";
import { EventEditTopicsView } from "@/components/Topic/EventEditTopicsView";

export default function EditTopicsPage() {
  const orgNav = useOrganizerNavigate();
  const params = useParams();
  const eventId = params.id as string;

  return (
    <EventEditTopicsView
      eventId={eventId}
      navigate={(href) => orgNav.push(href)}
      eventBasePath={`/organizer/events/${eventId}`}
    />
  );
}
