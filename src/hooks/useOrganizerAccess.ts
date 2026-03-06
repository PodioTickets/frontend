import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { organizerService } from "@/services";
import { useAuth } from "./useAuth";

export interface OrganizerAccess {
  isMember: boolean;
  role?: "OWNER" | "EMPLOYEE";
  organizationId?: string;
}

export function useOrganizerAccess() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [access, setAccess] = useState<OrganizerAccess | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    checkAccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAuthenticated]);

  const checkAccess = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await organizerService.checkOrganizerAccess();
      setAccess(result);

      if (!result.isMember) {
        router.push("/organizer/login");
        return;
      }
    } catch (error: any) {
      console.error("Error checking organizer access:", error);
      setError(error.response?.data?.message || "Erro ao verificar acesso");

      if (error.response?.status === 404 || error.response?.status === 401) {
        router.push("/organizer/login");
      }
    } finally {
      setLoading(false);
    }
  };

  return {
    access,
    loading,
    error,
    isMember: access?.isMember || false,
    role: access?.role,
    organizationId: access?.organizationId,
    refetch: checkAccess,
  };
}
