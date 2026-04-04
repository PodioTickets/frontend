"use client";

import { useEffect } from "react";
import { useOrganizerPathname } from "@/hooks/useOrganizerPathname";
import { organizerService } from "@/services";
import { resolveOrganizerAuditPageKey } from "@/lib/organizerAudit";

/**
 * Uma requisição de page-view por mudança de rota (dedupe ~30min no servidor).
 * Falhas de rede/403 não bloqueiam a UI — ver ORGANIZER_AUDIT_FRONTEND.md.
 */
export function OrganizerAuditPageViewTracker() {
  const pathname = useOrganizerPathname();

  useEffect(() => {
    const pageKey = resolveOrganizerAuditPageKey(pathname);
    if (!pageKey) return;
    void organizerService.recordOrganizerAuditPageView(pageKey);
  }, [pathname]);

  return null;
}
