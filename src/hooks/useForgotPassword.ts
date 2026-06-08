import { useMutation } from "@tanstack/react-query";
import { userService } from "@/services";
import toast from "react-hot-toast";

/** Identificador exclusivo: informe `email` OU `cpf` (dígitos, sem máscara). */
interface ForgotPasswordData {
  email?: string;
  cpf?: string;
  accountType?: "USER" | "ORGANIZER";
}

interface VerifyCodeData {
  email?: string;
  cpf?: string;
  code: string;
  accountType?: "USER" | "ORGANIZER";
}

/** Resultado do passo 1 — `maskedEmail` só vem no fluxo por CPF. */
interface ForgotPasswordResult {
  success?: boolean;
  message?: string;
  maskedEmail?: string;
}

interface UseForgotPasswordReturn {
  forgotPassword: (data: ForgotPasswordData) => Promise<ForgotPasswordResult>;
  resendCode: (data: ForgotPasswordData) => Promise<void>;
  verifyResetCode: (data: VerifyCodeData) => Promise<{ token: string }>;
  isPending: boolean;
  isResending: boolean;
  isVerifying: boolean;
  error: Error | null;
}

const FORGOT_PASSWORD_SUCCESS_FALLBACK =
  "Se uma conta existir com este e-mail, enviaremos instruções para redefinir a senha.";

const RESEND_RESET_SUCCESS_FALLBACK =
  "Se o e-mail estiver cadastrado, você receberá um novo código em instantes.";

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
        cpf: data.cpf,
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
        cpf: data.cpf,
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
        "Não foi possível reenviar o código. Tente novamente em instantes.";
      toast.error(errorMessage);
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async (data: VerifyCodeData) => {
      return userService.verifyResetCode(data);
    },
    onError: (error: any) => {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Código inválido ou expirado.";
      toast.error(errorMessage);
    },
  });

  return {
    forgotPassword: async (data: ForgotPasswordData) => {
      return mutation.mutateAsync(data);
    },
    resendCode: async (data: ForgotPasswordData) => {
      await resendMutation.mutateAsync(data);
    },
    verifyResetCode: async (data: VerifyCodeData) => {
      return verifyMutation.mutateAsync(data);
    },
    isPending: mutation.isPending,
    isResending: resendMutation.isPending,
    isVerifying: verifyMutation.isPending,
    error: mutation.error as Error | null,
  };
}
