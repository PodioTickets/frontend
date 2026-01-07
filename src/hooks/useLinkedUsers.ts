import { useApiQuery } from "./base/useApiQuery";
import { userService } from "@/services";

export interface LinkedUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  documentNumber: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  avatarUrl?: string | null;
  isMainUser?: boolean;
}

export function useLinkedUsers() {
  const { data, isLoading, error, refetch } = useApiQuery<{
    users: LinkedUser[];
  }>(
    ["linked-users"],
    () => userService.getLinkedUsers(),
    {
      staleTime: 5 * 60 * 1000, // 5 minutos
      gcTime: 10 * 60 * 1000, // 10 minutos
    }
  );

  return {
    linkedUsers: data?.users || [],
    isLoading,
    error,
    refetch,
  };
}

