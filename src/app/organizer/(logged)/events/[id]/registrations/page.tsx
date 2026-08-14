"use client";

import { useParams } from "next/navigation";
import { useOrganizerNavigate } from "@/hooks/useOrganizerNavigate";
import { Loading } from "@/components/Loading";
import { EventPageHeader } from "@/components/Organizer/EventPageHeader";
import { EventMobileHeader } from "@/components/Organizer/EventMobileHeader";
import { RegistrationsView } from "@/components/Registrations/RegistrationsView";
import { useEventRegistrations } from "@/hooks/useEventRegistrations";
import { useOrganizerPermissions } from "@/contexts/OrganizerPermissionsContext";
import { organizerExternalHref } from "@/lib/organizerPathPresentation";
import { useOrganizerAppSurface } from "@/contexts/OrganizerAppSurfaceContext";

export default function EventRegistrationsPage() {
  const orgNav = useOrganizerNavigate();
  const params = useParams();
  const eventId = params.id as string;
  const { hasPermission } = useOrganizerPermissions();
  const appSurface = useOrganizerAppSurface();

  const { loading, pageError, loadInitialData, registrations, viewProps } =
    useEventRegistrations({
      eventId,
      onUnauthenticated: () => orgNav.push("/organizer/login"),
    });

  // Full-page loading só na carga inicial (ainda sem dados). Refetch (filtros, data etc.) mostra loading só na lista.
  if (pageError) {
    return (
      <div className="min-h-screen bg-gray-2 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-11 text-lg mb-4">{pageError}</p>
          <button
            onClick={() => void loadInitialData()}
            className="px-4 py-2 rounded-lg bg-primary-11 text-primary-2 font-semibold"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  if (loading && registrations.length === 0) {
    return (
      <div className="min-h-screen bg-gray-2 flex items-center justify-center">
        <Loading />
      </div>
    );
  }

  const addRegistrantHref = hasPermission("edit_event")
    ? organizerExternalHref(
        // `?eventId=` é lido pelos providers do checkout (CheckoutContext /
        // CheckoutTimerContext) reaproveitados no fluxo de cortesia.
        `/organizer/events/${eventId}/registrations/novo?eventId=${eventId}`,
        appSurface,
      )
    : undefined;

  return (
    <RegistrationsView
      addRegistrantHref={addRegistrantHref}
      header={
        <>
          <div className="hidden md:block">
            <EventPageHeader eventName={viewProps.event?.name} eventSlug={viewProps.event?.slug} />
          </div>
          <EventMobileHeader
            eventId={eventId}
            eventName={viewProps.event?.name}
            activeHref={`/organizer/events/${eventId}/registrations`}
            backHref={`/organizer/events/${eventId}/dashboard`}
            backLinkClassName="rotate-180"
          />
        </>
      }
      {...viewProps}
    />
  );
}
