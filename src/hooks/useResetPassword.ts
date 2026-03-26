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

const RESET_SUCCESS_FALLBACK = "Senha redefinida com sucesso";

function pickResetSuccessMessage(body: unknown): string | undefined {
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

export function useResetPassword(): UseResetPasswordReturn {
  const mutation = useMutation({
    mutationFn: async (data: ResetPasswordData) => {
      return userService.resetPassword(data);
    },
    onSuccess: (res) => {
      const m = pickResetSuccessMessage(res);
      toast.success(m ?? RESET_SUCCESS_FALLBACK);
    },
    onError: (error: any) => {
      console.error("Error resetting password:", error);
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Não foi possível redefinir a senha. Verifique o link ou solicite um novo e-mail.";
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
