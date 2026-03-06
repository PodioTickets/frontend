import { useMutation } from "@tanstack/react-query";
import { userService } from "@/services";
import toast from "react-hot-toast";

interface ForgotPasswordData {
  email: string;
  accountType?: "USER" | "ORGANIZER";
}

interface UseForgotPasswordReturn {
  forgotPassword: (data: ForgotPasswordData) => Promise<void>;
  resendCode: (data: ForgotPasswordData) => Promise<void>;
  isPending: boolean;
  isResending: boolean;
  error: Error | null;
}

export function useForgotPassword(): UseForgotPasswordReturn {
  const mutation = useMutation({
    mutationFn: async (data: ForgotPasswordData) => {
      return userService.forgotPassword({
        email: data.email,
        accountType: data.accountType || "ORGANIZER",
      });
    },
    onSuccess: () => {
      toast.success("Código de recuperação enviado! Verifique seu email.");
    },
    onError: (error: any) => {
      console.error("Error sending forgot password request:", error);
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Erro ao enviar código de recuperação. Tente novamente.";
      toast.error(errorMessage);
    },
  });

  const resendMutation = useMutation({
    mutationFn: async (data: ForgotPasswordData) => {
      return userService.resendResetCode({
        email: data.email,
        accountType: data.accountType || "ORGANIZER",
      });
    },
    onSuccess: () => {
      toast.success("Código reenviado com sucesso! Verifique seu email.");
    },
    onError: (error: any) => {
      console.error("Error resending reset code:", error);
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Erro ao reenviar código. Tente novamente.";
      toast.error(errorMessage);
    },
  });

  return {
    forgotPassword: async (data: ForgotPasswordData) => {
      await mutation.mutateAsync(data);
    },
    resendCode: async (data: ForgotPasswordData) => {
      await resendMutation.mutateAsync(data);
    },
    isPending: mutation.isPending,
    isResending: resendMutation.isPending,
    error: mutation.error as Error | null,
  };
}
