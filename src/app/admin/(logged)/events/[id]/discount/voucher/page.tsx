"use client";

import { useParams, useRouter } from "next/navigation";
import { AdminEventHeader } from "@/components/Admin/AdminEventHeader";
import { EventVouchersView } from "@/components/Event/EventVouchersView";

export default function VouchersPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;

  return (
    <EventVouchersView
      eventId={eventId}
      onUnauthenticated={() => router.push("/admin/login")}
      renderHeader={(event) => (
        <AdminEventHeader eventId={eventId} eventName={event?.name} eventSlug={event?.slug} />
      )}
    />
  );
}
