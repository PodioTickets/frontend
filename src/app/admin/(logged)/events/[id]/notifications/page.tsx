"use client";

import { useParams, useRouter } from "next/navigation";
import { AdminEventHeader } from "@/components/Admin/AdminEventHeader";
import { EventNotificationsView } from "@/components/Event/EventNotificationsView";

export default function EventNotificationsPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;

  return (
    <EventNotificationsView
      eventId={eventId}
      onUnauthenticated={() => router.push("/admin/login")}
      renderHeader={(event) => (
        <AdminEventHeader eventId={eventId} eventName={event?.name} eventSlug={event?.slug} />
      )}
    />
  );
}
