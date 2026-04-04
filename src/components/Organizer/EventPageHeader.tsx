"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useOrganizerAppSurface } from "@/contexts/OrganizerAppSurfaceContext";
import { organizerExternalHref } from "@/lib/organizerPathPresentation";
import { useOrganizerPathname } from "@/hooks/useOrganizerPathname";
import { ArrowButton } from "../ArrowButton";
import { Dropdown } from "../Dropdown";

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

  const tabs = [
    { label: "Dashboard", href: `/organizer/events/${eventId}/dashboard` },
    { label: "Inscrições", href: `/organizer/events/${eventId}/registrations` },
    { label: "Financeiro", href: `/organizer/events/${eventId}/financial` },
    { label: "Editar", href: `/organizer/events/${eventId}/edit` },
  ];

  // Discount dropdown options
  const discountOptions = [
    {
      id: "cupom",
      label: "Cupom",
      href: navHref(`/organizer/events/${eventId}/discount/cupom`),
    },
    {
      id: "voucher",
      label: "Voucher",
      href: navHref(`/organizer/events/${eventId}/discount/voucher`),
    },
  ];

  // Determine which tab is active based on current pathname
  const getActiveTab = (href: string): boolean => {
    // Special handling for edit tab - it should be active for all /edit routes
    if (href.includes("/edit")) {
      return pathname.includes("/edit");
    }
    // For other tabs, check exact match or if pathname starts with the href
    return pathname === href || pathname.startsWith(href + "/");
  };

  // Check if discount tab is active (cupom or voucher)
  const isDiscountActive = pathname.includes("/discount");

  return (
    <div className="bg-gray-1 border-b border-gray-6 mb-6 pt-6">
      <div className="max-w-7xl mx-auto px-4 lg:px-0">
        <div className="mb-4">
          <div className="flex items-center gap-2 text-sm text-gray-11">
            <Link href={navHref("/organizer/events")} className="hover:text-gray-12">
              Eventos
            </Link>
            <ArrowButton isOpen={false} className="size-2" />
            <span className="text-gray-12">{eventName || "Evento"}</span>
          </div>
        </div>

        <div className="flex gap-6">
          {tabs.map((tab) => {
            const isActive = getActiveTab(tab.href);
            return (
              <Link
                key={tab.href}
                href={navHref(tab.href)}
                className={`pb-3 px-1 text-sm transition-colors border-b-2 ${isActive
                  ? "border-primary-10 text-primary-10 font-manrope font-bold"
                  : "border-transparent text-gray-11 hover:text-gray-12 font-family-dm-sans font-normal"
                  }`}
              >
                {tab.label}
              </Link>
            );
          })}

          {/* Discount Dropdown */}
          <Dropdown
            width="w-40"
            position="bottom"
            align="start"
            trigger={(isOpen) => (
              <div
                className={`pb-3 px-1 text-sm transition-colors border-b-2 flex items-center gap-1 cursor-pointer ${isDiscountActive
                  ? "border-primary-10 text-primary-10 font-manrope font-bold"
                  : "border-transparent text-gray-11 hover:text-gray-12 font-family-dm-sans font-normal"
                  }`}
              >
                <span>Desconto</span>
              </div>
            )}
            options={discountOptions}
          />


          <Link
            href={navHref(`/organizer/events/${eventId}/ads`)}
            className={`pb-3 px-1 text-sm transition-colors border-b-2 ${pathname.includes("/ads")
              ? "border-primary-10 text-primary-10 font-manrope font-bold"
              : "border-transparent text-gray-11 hover:text-gray-12 font-family-dm-sans font-normal"
              }`}
          >
            Ads
          </Link>

          <Link
            href={navHref(`/organizer/events/${eventId}/notifications`)}
            className={`pb-3 px-1 text-sm transition-colors border-b-2 ${pathname.includes("/notifications")
              ? "border-primary-10 text-primary-10 font-manrope font-bold"
              : "border-transparent text-gray-11 hover:text-gray-12 font-family-dm-sans font-normal"
              }`}
          >
            Notificação
          </Link>
        </div>
      </div>
    </div>
  );
}
