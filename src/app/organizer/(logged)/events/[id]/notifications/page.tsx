"use client";

import { useParams } from "next/navigation";
import { useOrganizerNavigate } from "@/hooks/useOrganizerNavigate";
import { useEventPermissionGuard } from "@/hooks/useEventPermissionGuard";
import { EventPageHeader } from "@/components/Organizer/EventPageHeader";
import { EventMobileHeader } from "@/components/Organizer/EventMobileHeader";
import { EventNotificationsView } from "@/components/Event/EventNotificationsView";
import { Loading } from "@/components/Loading";

export default function EventNotificationsPage() {
  const orgNav = useOrganizerNavigate();
  const params = useParams();
  const eventId = params.id as string;
  const { isChecking, hasPermission } = useEventPermissionGuard("notify");
  // Enquanto verifica OU sem permissão (o guard já dispara o redirect): não
  // renderiza a view nem os fetches. Evita o flash de conteúdo.
  if (isChecking || !hasPermission)
    return <div className="min-h-screen bg-gray-2 flex items-center justify-center"><Loading /></div>;

  return (
    <EventNotificationsView
      eventId={eventId}
      onUnauthenticated={() => orgNav.push("/organizer/login")}
      renderHeader={(event) => (
        <>
          <div className="hidden md:block">
            <EventPageHeader eventName={event?.name} eventSlug={event?.slug} />
          </div>
          <EventMobileHeader
            eventId={eventId}
            eventName={event?.name}
            activeHref={`/organizer/events/${eventId}/notifications`}
            backHref={`/organizer/events/${eventId}/dashboard`}
            backLinkClassName="rotate-180"
          />
        </>
      )}
    />
  );
}
