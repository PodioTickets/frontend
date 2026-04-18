"use client";

import { usePathname } from "next/navigation";
import { useOrganizerAppSurface } from "@/contexts/OrganizerAppSurfaceContext";
import { withOrganizerPathPrefix } from "@/lib/organizerPathPresentation";

export function ContentWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAppSurface = useOrganizerAppSurface();
  const normalized = withOrganizerPathPrefix(pathname, isAppSurface);

  const isAuthOrganizer =
    normalized.startsWith("/organizer/login") ||
    normalized.startsWith("/organizer/forgot-password") ||
    normalized.startsWith("/organizer/reset-password") ||
    pathname.startsWith("/admin")

  if (isAuthOrganizer) {
    return <div>{children}</div>;
  }

  const isOrganizer = normalized.startsWith("/organizer");

  if (isOrganizer) {
    return <div className="mb-12">{children}</div>;
  }

  return <div className="mt-[64px] md:mt-[68px] mb-12">{children}</div>;
}
