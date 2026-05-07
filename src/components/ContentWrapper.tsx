"use client";

import { usePathname } from "next/navigation";
import { useOrganizerAppSurface } from "@/contexts/OrganizerAppSurfaceContext";
import { withOrganizerPathPrefix } from "@/lib/organizerPathPresentation";
import { useAdminAppSurface } from "@/contexts/AdminAppSurfaceContext";
import { withAdminPathPrefix } from "@/lib/adminPathPresentation";

export function ContentWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdminSurface = useAdminAppSurface()
  const isAppSurface = useOrganizerAppSurface();
  const normalized = withOrganizerPathPrefix(pathname, isAppSurface);
  const adminNormalized = withAdminPathPrefix(pathname, isAdminSurface)

  const isAuthOrganizer =
    normalized.startsWith("/organizer/login") ||
    normalized.startsWith("/organizer/forgot-password") ||
    normalized.startsWith("/organizer/reset-password") ||
    adminNormalized.startsWith("/admin")

  if (isAuthOrganizer) {
    return <div>{children}</div>;
  }

  const isOrganizer = normalized.startsWith("/organizer");

  if (isOrganizer) {
    return <div className="mb-12">{children}</div>;
  }

  return <div className="mt-[64px] md:mt-[68px] mb-12">{children}</div>;
}
