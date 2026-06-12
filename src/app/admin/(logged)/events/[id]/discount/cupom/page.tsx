"use client";

import { useParams, useRouter } from "next/navigation";
import { AdminEventHeader } from "@/components/Admin/AdminEventHeader";
import { EventCouponsView } from "@/components/Event/EventCouponsView";

export default function CouponsPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;

  return (
    <EventCouponsView
      eventId={eventId}
      onUnauthenticated={() => router.push("/admin/login")}
      renderHeader={(event) => (
        <AdminEventHeader eventId={eventId} eventName={event?.name} eventSlug={event?.slug} />
      )}
    />
  );
}
