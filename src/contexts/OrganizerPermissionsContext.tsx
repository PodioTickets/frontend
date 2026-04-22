"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { organizerService } from "@/services";
import type { Organization, OrganizationMeResponse } from "@/services/organizer/OrganizerService";

interface OrganizerPermissionsValue {
  organization: Organization | null;
  role: "OWNER" | "EMPLOYEE" | null;
  permissions: string[];
  isOwner: boolean;
  loading: boolean;
  hasPermission: (key: string) => boolean;
  refetch: () => void;
}

const OrganizerPermissionsContext = createContext<OrganizerPermissionsValue>({
  organization: null,
  role: null,
  permissions: [],
  isOwner: false,
  loading: true,
  hasPermission: () => false,
  refetch: () => {},
});

export function OrganizerPermissionsProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<OrganizationMeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const result = await organizerService.getOrganization();
      setData(result);
    } catch {
      // ignore — useOrganizerAccess já trata redirect de 401
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const isOwner = data?.member?.role === "OWNER" || data?.member == null;
  const permissions = isOwner ? ["all"] : (data?.member?.permissions ?? []);

  const hasPermission = useCallback(
    (key: string) => {
      if (isOwner) return true;
      // Dashboard é derivado — qualquer permissão real dá acesso
      if (key === "dashboard") {
        return permissions.length > 0;
      }
      return permissions.includes(key);
    },
    [isOwner, permissions],
  );

  return (
    <OrganizerPermissionsContext.Provider
      value={{
        organization: data?.organization ?? null,
        role: data?.member?.role ?? (data ? "OWNER" : null),
        permissions,
        isOwner,
        loading,
        hasPermission,
        refetch: load,
      }}
    >
      {children}
    </OrganizerPermissionsContext.Provider>
  );
}

export function useOrganizerPermissions() {
  return useContext(OrganizerPermissionsContext);
}
