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
  eventSlug?: string;
}

export function EventPageHeader({ eventName, eventSlug }: EventPageHeaderProps) {
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
      <div className="flex items-end justify-between">
        <div className="flex-1 min-w-0">
          <div className="mb-4 px-6">
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

        {eventSlug && (
          <Link
            href={`/events/${eventSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:flex items-center gap-1 pb-3 pr-8 text-primary-10 text-base underline hover:text-primary-11 shrink-0"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="2.5" y="4.167" width="13.333" height="13.333" rx="4" stroke="currentColor" strokeWidth="1.5"/>
              <rect x="8.333" y="2.5" width="9.167" height="9.167" rx="1" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
            Abrir página do evento
          </Link>
        )}
      </div>
    </div>
  );
}
