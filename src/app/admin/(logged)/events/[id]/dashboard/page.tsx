"use client";

import { useParams, useRouter } from "next/navigation";
import { AdminEventHeader } from "@/components/Admin/AdminEventHeader";
import { useEventDashboard } from "@/hooks/useEventDashboard";
import { DashboardView } from "@/components/Dashboard/DashboardView";

export default function EventDashboardPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;
  const controller = useEventDashboard(eventId, () => router.push("/admin/login"));

  return (
    <DashboardView
      controller={controller}
      header={
        <AdminEventHeader
          eventId={eventId}
          eventName={controller.event?.name}
          eventSlug={controller.event?.slug}
        />
      }
    />
  );
}
