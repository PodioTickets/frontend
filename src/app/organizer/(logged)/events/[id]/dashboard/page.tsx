"use client";

import { useParams } from "next/navigation";
import { useOrganizerNavigate } from "@/hooks/useOrganizerNavigate";
import { useEventPermissionGuard } from "@/hooks/useEventPermissionGuard";
import { EventPageHeader } from "@/components/Organizer/EventPageHeader";
import { EventMobileHeader } from "@/components/Organizer/EventMobileHeader";
import { useEventDashboard } from "@/hooks/useEventDashboard";
import { DashboardView } from "@/components/Dashboard/DashboardView";

export default function EventDashboardPage() {
  const orgNav = useOrganizerNavigate();
  const params = useParams();
  const eventId = params.id as string;
  useEventPermissionGuard("dashboard");
  const controller = useEventDashboard(eventId, () => orgNav.push("/organizer/login"));

  return (
    <DashboardView
      controller={controller}
      header={
        <>
          <div className="hidden md:block">
            <EventPageHeader eventName={controller.event?.name} eventSlug={controller.event?.slug} />
          </div>
          <EventMobileHeader
            eventId={eventId}
            eventName={controller.event?.name}
            activeHref={`/organizer/events/${eventId}/dashboard`}
            backHref="/organizer/events"
          />
        </>
      }
    />
  );
}
