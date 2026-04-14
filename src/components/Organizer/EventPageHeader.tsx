"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useOrganizerAppSurface } from "@/contexts/OrganizerAppSurfaceContext";
import { organizerExternalHref } from "@/lib/organizerPathPresentation";
import { useOrganizerPathname } from "@/hooks/useOrganizerPathname";
import { ArrowButton } from "../ArrowButton";
import { EventMobileTabs, getEventTabs } from "./EventMobileTabs";
import { useOrganizerPermissions } from "@/contexts/OrganizerPermissionsContext";

interface EventPageHeaderProps {
  eventName?: string;
}

export function EventPageHeader({ eventName }: EventPageHeaderProps) {
  const params = useParams();
  const pathname = useOrganizerPathname();
  const appSurface = useOrganizerAppSurface();
  const eventId = params.id as string;
  const navHref = (internal: string) =>
    organizerExternalHref(internal, appSurface);
  const { hasPermission } = useOrganizerPermissions();
  const tabs = getEventTabs(eventId, hasPermission);

  return (
    <div className="bg-gray-1 border-b border-gray-6 md:mb-6 pt-6">
      <div className="max-w-7xl mx-auto lg:px-0">
        <div className="mb-4 px-4 md:px-0">
          <div className="flex items-center gap-2 text-sm text-gray-11">
            <Link href={navHref("/organizer/events")} className="hover:text-gray-12">
              Eventos
            </Link>
            <ArrowButton isOpen={false} className="size-2" />
            <span className="text-gray-12">{eventName || "Evento"}</span>
          </div>
        </div>

        <EventMobileTabs
          variant="pageHeader"
          tabs={tabs}
          activeHref={pathname}
          eventId={eventId}
        />
      </div>
    </div>
  );
}
