"use client";

import { useParams, useRouter } from "next/navigation";
import { AdminEventHeader } from "@/components/Admin/AdminEventHeader";
import { EventAdsView } from "@/components/Event/EventAdsView";

export default function AdsPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;

  return (
    <EventAdsView
      eventId={eventId}
      onUnauthenticated={() => router.push("/admin/login")}
      renderHeader={(event) => (
        <AdminEventHeader eventId={eventId} eventName={event?.name} eventSlug={event?.slug} />
      )}
    />
  );
}
