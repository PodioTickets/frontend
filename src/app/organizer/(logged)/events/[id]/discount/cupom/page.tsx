"use client";

import { useParams } from "next/navigation";
import { useOrganizerNavigate } from "@/hooks/useOrganizerNavigate";
import { useEventPermissionGuard } from "@/hooks/useEventPermissionGuard";
import { EventPageHeader } from "@/components/Organizer/EventPageHeader";
import { EventMobileHeader } from "@/components/Organizer/EventMobileHeader";
import { EventCouponsView } from "@/components/Event/EventCouponsView";
import { Loading } from "@/components/Loading";
import { useOrganizerPermissions } from "@/contexts/OrganizerPermissionsContext";

export default function CouponsPage() {
  const orgNav = useOrganizerNavigate();
  const params = useParams();
  const eventId = params.id as string;
  // Ver os descontos exige acesso ao evento; gerenciar (criar/editar/excluir)
  // exige a permissão específica de cupons.
  const { isChecking } = useEventPermissionGuard(["coupons", "view_event"]);
  const { hasPermission } = useOrganizerPermissions();
  const canManage = hasPermission("coupons");
  if (isChecking) return <div className="min-h-screen bg-gray-2 flex items-center justify-center"><Loading /></div>;

  return (
    <EventCouponsView
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
            activeHref={`/organizer/events/${eventId}/discount/cupom`}
            backHref={`/organizer/events/${eventId}/dashboard`}
            backLinkClassName="rotate-180"
          />
        </>
      )}
    />
  );
}
