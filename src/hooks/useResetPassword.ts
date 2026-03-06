import { useMutation } from "@tanstack/react-query";
import { userService } from "@/services";
import toast from "react-hot-toast";

interface ResetPasswordData {
  token: string;
  password: string;
}

interface UseResetPasswordReturn {
  resetPassword: (data: ResetPasswordData) => Promise<void>;
  isPending: boolean;
  error: Error | null;
}

export function useResetPassword(): UseResetPasswordReturn {
  const mutation = useMutation({
    mutationFn: async (data: ResetPasswordData) => {
      return userService.resetPassword(data);
    },
    onSuccess: () => {
      toast.success("Senha redefinida com sucesso!");
    },
    onError: (error: any) => {
      console.error("Error resetting password:", error);
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Erro ao redefinir senha. Tente novamente.";
      toast.error(errorMessage);
    },
  });

  return {
    resetPassword: async (data: ResetPasswordData) => {
      await mutation.mutateAsync(data);
    },
    isPending: mutation.isPending,
    error: mutation.error as Error | null,
  };
}
