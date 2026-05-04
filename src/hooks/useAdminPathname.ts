"use client";

import { usePathname } from "next/navigation";
import { useAdminAppSurface } from "@/contexts/AdminAppSurfaceContext";
import { withAdminPathPrefix } from "@/lib/adminPathPresentation";

/** Pathname como nas rotas internas (/admin/...), mesmo no admin host com URL curta. */
export function useAdminPathname() {
  const pathname = usePathname();
  const surface = useAdminAppSurface();
  return withAdminPathPrefix(pathname, surface);
}
