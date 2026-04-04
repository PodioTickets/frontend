"use client";

import { usePathname } from "next/navigation";
import { useOrganizerAppSurface } from "@/contexts/OrganizerAppSurfaceContext";
import { withOrganizerPathPrefix } from "@/lib/organizerPathPresentation";

/** Pathname como nas rotas internas (/organizer/...), mesmo no app host com URL curta. */
export function useOrganizerPathname() {
  const pathname = usePathname();
  const surface = useOrganizerAppSurface();
  return withOrganizerPathPrefix(pathname, surface);
}
