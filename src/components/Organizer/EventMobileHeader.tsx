"use client";

import Link from "next/link";
import { ArrowButton } from "@/components/ArrowButton";
import { useOrganizerAppSurface } from "@/contexts/OrganizerAppSurfaceContext";
import { organizerExternalHref } from "@/lib/organizerPathPresentation";
import { EventMobileTabs, getEventTabs } from "./EventMobileTabs";

interface EventMobileHeaderProps {
  eventId: string;
  eventName?: string;
  /** href da aba ativa (ex.: /organizer/events/[id]/dashboard) */
  activeHref: string;
  /** Link do botão voltar (ex.: /organizer/events ou /organizer/events/[id]/dashboard) */
  backHref: string;
  /** Classe opcional no botão voltar (ex.: -rotate-180 ou rotate-180) */
  backLinkClassName?: string;
}

export function EventMobileHeader({
  eventId,
  eventName = "Evento",
  activeHref,
  backHref,
  backLinkClassName = "-rotate-180",
}: EventMobileHeaderProps) {
  const appSurface = useOrganizerAppSurface();
  const tabs = getEventTabs(eventId);

  return (
    <div className="md:hidden bg-gray-1 border-b border-gray-6">
      <div className="flex items-center gap-1 h-[52px] px-4">
        <Link
          href={organizerExternalHref(backHref, appSurface)}
          className={`size-8 flex items-center justify-center shrink-0 rounded-lg hover:bg-gray-3 transition-colors ${backLinkClassName}`}
          aria-label="Voltar"
        >
          <ArrowButton isOpen={false} />
        </Link>
        <p className="font-manrope font-extrabold text-base leading-[1.1] text-gray-12 truncate flex-1 min-w-0">
          {eventName}
        </p>
      </div>
      <EventMobileTabs tabs={tabs} activeHref={activeHref} eventId={eventId} />
    </div>
  );
}
