"use client";

import { useParams, useRouter } from "next/navigation";
import { AdminEventHeader } from "@/components/Admin/AdminEventHeader";
import { EventFinancialView } from "@/components/Event/EventFinancialView";

export default function EventFinancialPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;

  return (
    <EventFinancialView
      eventId={eventId}
      onUnauthenticated={() => router.push("/admin/login")}
      renderHeader={(event) => (
        <AdminEventHeader eventId={eventId} eventName={event?.name} eventSlug={event?.slug} />
      )}
    />
  );
}
