import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useOrganizerPermissions } from "@/contexts/OrganizerPermissionsContext";
import { useOrganizerNavigate } from "@/hooks/useOrganizerNavigate";

export interface EventPermissionGuardResult {
  /** `true` enquanto as permissões ainda estão sendo carregadas. */
  isChecking: boolean;
  /** `true` quando o usuário tem ao menos uma das permissões pedidas (e não está mais carregando). */
  hasPermission: boolean;
}

/**
 * Redireciona para o dashboard do evento se o usuário não tiver nenhuma das permissões.
 * Aceita uma chave única ou um array (OR — basta ter uma).
 *
 * Retorna `{ isChecking, hasPermission }`. Use `isChecking` para bloquear a
 * renderização enquanto as permissões estão sendo verificadas.
 */
export function useEventPermissionGuard(permissionKey: string | string[]): EventPermissionGuardResult {
  const { hasPermission, loading } = useOrganizerPermissions();
  const orgNav = useOrganizerNavigate();
  const params = useParams();
  const eventId = params?.id as string | undefined;

  useEffect(() => {
    if (loading) return;
    const keys = Array.isArray(permissionKey) ? permissionKey : [permissionKey];
    const allowed = keys.some((k) => hasPermission(k));
    if (!allowed) {
      // Se a própria página de dashboard não é permitida, vai para a lista de eventos
      const isDashboardGuard = keys.length === 1 && keys[0] === "dashboard";
      if (eventId && !isDashboardGuard) {
        orgNav.replace(`/organizer/events/${eventId}/dashboard`);
      } else {
        orgNav.replace("/organizer/events");
      }
    }
  }, [loading, hasPermission, permissionKey, eventId, orgNav]);

  const keys = Array.isArray(permissionKey) ? permissionKey : [permissionKey];
  const allowed = !loading && keys.some((k) => hasPermission(k));

  return { isChecking: loading, hasPermission: allowed };
}
