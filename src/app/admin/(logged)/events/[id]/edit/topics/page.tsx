"use client";

import { useParams, useRouter } from "next/navigation";
import { EventEditTopicsView } from "@/components/Topic/EventEditTopicsView";

export default function EditTopicsPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;

  return (
    <EventEditTopicsView
      eventId={eventId}
      navigate={(href) => router.push(href)}
      eventBasePath={`/admin/events/${eventId}`}
    />
  );
}
