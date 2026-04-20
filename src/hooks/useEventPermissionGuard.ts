import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useOrganizerPermissions } from "@/contexts/OrganizerPermissionsContext";
import { useOrganizerNavigate } from "@/hooks/useOrganizerNavigate";

/**
 * Redireciona para o dashboard do evento se o usuário não tiver nenhuma das permissões.
 * Aceita uma chave única ou um array (OR — basta ter uma).
 * Retorna `true` enquanto ainda está verificando (loading).
 */
export function useEventPermissionGuard(permissionKey: string | string[]): boolean {
  const { hasPermission, loading } = useOrganizerPermissions();
  const orgNav = useOrganizerNavigate();
  const params = useParams();
  const eventId = params?.id as string | undefined;

  useEffect(() => {
    if (loading) return;
    const keys = Array.isArray(permissionKey) ? permissionKey : [permissionKey];
    const allowed = keys.some((k) => hasPermission(k));
    if (!allowed) {
      if (eventId) {
        orgNav.replace(`/organizer/events/${eventId}/dashboard`);
      } else {
        orgNav.replace("/organizer/events");
      }
    }
  }, [loading, hasPermission, permissionKey, eventId, orgNav]);

  return loading;
}
