"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useOrganizerAppSurface } from "@/contexts/OrganizerAppSurfaceContext";
import { organizerExternalHref } from "@/lib/organizerPathPresentation";

/**
 * Navegação com path interno (/organizer/...) mas URL curta no host app (sem 307 extra).
 * Referências estáveis para poder usar em dependências de useEffect sem refetch em loop.
 */
export function useOrganizerNavigate() {
  const router = useRouter();
  const appSurface = useOrganizerAppSurface();

  const push = useCallback(
    (internalPath: string) => {
      router.push(organizerExternalHref(internalPath, appSurface));
    },
    [router, appSurface],
  );

  const replace = useCallback(
    (internalPath: string) => {
      router.replace(organizerExternalHref(internalPath, appSurface));
    },
    [router, appSurface],
  );

  return useMemo(() => ({ push, replace }), [push, replace]);
}
