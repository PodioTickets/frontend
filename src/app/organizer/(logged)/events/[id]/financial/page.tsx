"use client";

import { useParams } from "next/navigation";
import { useOrganizerNavigate } from "@/hooks/useOrganizerNavigate";
import { useEventPermissionGuard } from "@/hooks/useEventPermissionGuard";
import { EventPageHeader } from "@/components/Organizer/EventPageHeader";
import { EventMobileHeader } from "@/components/Organizer/EventMobileHeader";
import { EventFinancialView } from "@/components/Event/EventFinancialView";
import { Loading } from "@/components/Loading";

export default function EventFinancialPage() {
  const orgNav = useOrganizerNavigate();
  const params = useParams();
  const eventId = params.id as string;
  const { isChecking, hasPermission } = useEventPermissionGuard("financial");
  // Enquanto verifica OU sem permissão (o guard já dispara o redirect): não
  // renderiza a view nem os fetches financeiros. Evita o flash de conteúdo.
  if (isChecking || !hasPermission)
    return <div className="min-h-screen bg-gray-2 flex items-center justify-center"><Loading /></div>;

  return (
    <EventFinancialView
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
            activeHref={`/organizer/events/${eventId}/financial`}
            backHref={`/organizer/events/${eventId}/registrations`}
            backLinkClassName="rotate-180"
          />
        </>
      )}
    />
  );
}
