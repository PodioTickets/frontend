import { useState, useEffect } from "react";
import { useOrganizerNavigate } from "@/hooks/useOrganizerNavigate";
import { organizerService } from "@/services";
import { useAuth } from "./useAuth";

export interface OrganizerAccess {
  isMember: boolean;
  role?: "OWNER" | "EMPLOYEE";
  organizationId?: string;
  organization?: {
    id: string;
    name: string;
    tradeName?: string | null;
  } | null;
}

export function useOrganizerAccess() {
  const orgNav = useOrganizerNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [access, setAccess] = useState<OrganizerAccess | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accessError, setAccessError] = useState(false);

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
        orgNav.push("/organizer/login");
        return;
      }
    } catch (error: any) {
      console.error("Error checking organizer access:", error);
      setError(error.response?.data?.message || "Erro ao verificar acesso");

      if (error.response?.status === 404 || error.response?.status === 401) {
        orgNav.push("/organizer/login");
      } else {
        // Erro de rede ou server error — não redireciona, expõe accessError
        // para o layout exibir mensagem de erro em vez de tela branca.
        setAccessError(true);
      }
    } finally {
      setLoading(false);
    }
  };

  return {
    access,
    loading,
    error,
    accessError,
    isMember: access?.isMember || false,
    role: access?.role,
    organizationId: access?.organizationId,
    refetch: checkAccess,
  };
}
