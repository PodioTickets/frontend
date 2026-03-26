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

const FORGOT_PASSWORD_SUCCESS_FALLBACK =
  "Se uma conta existir com este e-mail, enviaremos instruções para redefinir a senha.";

const RESEND_RESET_SUCCESS_FALLBACK =
  "Se o e-mail estiver cadastrado, você receberá um novo link em instantes.";

function pickSuccessMessage(body: unknown): string | undefined {
  if (!body || typeof body !== "object") return undefined;
  const o = body as Record<string, unknown>;
  if (typeof o.message === "string" && o.message.trim()) return o.message.trim();
  const inner = o.data;
  if (inner && typeof inner === "object" && "message" in inner) {
    const m = (inner as { message?: unknown }).message;
    if (typeof m === "string" && m.trim()) return m.trim();
  }
  return undefined;
}

function toastApiMessage(body: unknown, fallback: string) {
  const m = pickSuccessMessage(body);
  if (m) {
    toast.success(m);
    return;
  }
  toast.success(fallback);
}

export function useForgotPassword(): UseForgotPasswordReturn {
  const mutation = useMutation({
    mutationFn: async (data: ForgotPasswordData) => {
      return userService.forgotPassword({
        email: data.email,
        accountType: data.accountType ?? "USER",
      });
    },
    onSuccess: (res) => {
      toastApiMessage(res, FORGOT_PASSWORD_SUCCESS_FALLBACK);
    },
    onError: (error: any) => {
      console.error("Error sending forgot password request:", error);
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Não foi possível processar o pedido. Tente novamente em instantes.";
      toast.error(errorMessage);
    },
  });

  const resendMutation = useMutation({
    mutationFn: async (data: ForgotPasswordData) => {
      return userService.resendResetCode({
        email: data.email,
        accountType: data.accountType ?? "USER",
      });
    },
    onSuccess: (res) => {
      toastApiMessage(res, RESEND_RESET_SUCCESS_FALLBACK);
    },
    onError: (error: any) => {
      console.error("Error resending reset link:", error);
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Não foi possível reenviar o e-mail. Tente novamente em instantes.";
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
