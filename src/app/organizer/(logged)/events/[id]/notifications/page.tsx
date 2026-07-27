"use client";

import { useParams } from "next/navigation";
import { useOrganizerNavigate } from "@/hooks/useOrganizerNavigate";
import { useEventPermissionGuard } from "@/hooks/useEventPermissionGuard";
import { EventPageHeader } from "@/components/Organizer/EventPageHeader";
import { EventMobileHeader } from "@/components/Organizer/EventMobileHeader";
import { EventNotificationsView } from "@/components/Event/EventNotificationsView";
import { Loading } from "@/components/Loading";
import { useOrganizerPermissions } from "@/contexts/OrganizerPermissionsContext";

export default function EventNotificationsPage() {
  const orgNav = useOrganizerNavigate();
  const params = useParams();
  const eventId = params.id as string;
  // Ver as notificações exige acesso ao evento; enviar mensagens (criar) exige
  // a permissão específica `notify`.
  const { isChecking } = useEventPermissionGuard(["notify", "view_event"]);
  const { hasPermission } = useOrganizerPermissions();
  const canManage = hasPermission("notify");
  if (isChecking)
    return <div className="min-h-screen bg-gray-2 flex items-center justify-center"><Loading /></div>;

  return (
    <EventNotificationsView
      eventId={eventId}
      canManage={canManage}
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
