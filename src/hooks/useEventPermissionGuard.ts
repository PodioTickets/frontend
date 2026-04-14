import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useOrganizerPermissions } from "@/contexts/OrganizerPermissionsContext";
import { useOrganizerNavigate } from "@/hooks/useOrganizerNavigate";

/**
 * Redireciona para o dashboard do evento se o usuário não tiver a permissão.
 * Retorna `true` enquanto ainda está verificando (loading).
 */
export function useEventPermissionGuard(permissionKey: string): boolean {
  const { hasPermission, loading } = useOrganizerPermissions();
  const orgNav = useOrganizerNavigate();
  const params = useParams();
  const eventId = params?.id as string | undefined;

  useEffect(() => {
    if (loading) return;
    if (!hasPermission(permissionKey)) {
      if (eventId) {
        orgNav.replace(`/organizer/events/${eventId}/dashboard`);
      } else {
        orgNav.replace("/organizer/events");
      }
    }
  }, [loading, hasPermission, permissionKey, eventId, orgNav]);

  return loading;
}
