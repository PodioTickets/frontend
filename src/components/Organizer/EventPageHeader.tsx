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
              <path d="M12.5006 2.5L17.5006 2.5L17.5007 7.49999M17.5006 2.5L8.33398 11.6667" stroke="#3E9B4F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M10 4.16699H6.5C4.29086 4.16699 2.5 5.95785 2.5 8.16699V13.5003C2.5 15.7095 4.29086 17.5003 6.5 17.5003H11.8333C14.0425 17.5003 15.8333 15.7095 15.8333 13.5003V10.0003" stroke="#3E9B4F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Abrir página do evento
          </Link>
        )}
      </div>
    </div>
  );
}
