"use client";

import { useParams } from "next/navigation";
import { useOrganizerNavigate } from "@/hooks/useOrganizerNavigate";
import { useEventPermissionGuard } from "@/hooks/useEventPermissionGuard";
import { EventPageHeader } from "@/components/Organizer/EventPageHeader";
import { EventMobileHeader } from "@/components/Organizer/EventMobileHeader";
import { EventVouchersView } from "@/components/Event/EventVouchersView";
import { Loading } from "@/components/Loading";

export default function VouchersPage() {
  const orgNav = useOrganizerNavigate();
  const params = useParams();
  const eventId = params.id as string;
  const { isChecking } = useEventPermissionGuard("coupons");
  if (isChecking) return <div className="min-h-screen bg-gray-2 flex items-center justify-center"><Loading /></div>;

  return (
    <EventVouchersView
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
            activeHref={`/organizer/events/${eventId}/discount/voucher`}
            backHref={`/organizer/events/${eventId}/dashboard`}
            backLinkClassName="rotate-180"
          />
        </>
      )}
    />
  );
}
