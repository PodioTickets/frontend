import { useMutation } from "@tanstack/react-query";
import { userService } from "@/services";
import toast from "react-hot-toast";

interface VerifyResetCodeData {
  email: string;
  code: string;
  accountType?: "USER" | "ORGANIZER";
}

interface UseVerifyResetCodeReturn {
  verifyCode: (data: VerifyResetCodeData) => Promise<{ token: string }>;
  isPending: boolean;
  error: Error | null;
}

export function useVerifyResetCode(): UseVerifyResetCodeReturn {
  const mutation = useMutation({
    mutationFn: async (data: VerifyResetCodeData) => {
      return userService.verifyResetCode({
        email: data.email,
        code: data.code,
        accountType: data.accountType || "ORGANIZER",
      });
    },
    onSuccess: () => {
      toast.success("Código verificado com sucesso!");
    },
    onError: (error: any) => {
      console.error("Error verifying reset code:", error);
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Código inválido. Tente novamente.";
      toast.error(errorMessage);
    },
  });

  return {
    verifyCode: async (data: VerifyResetCodeData) => {
      return await mutation.mutateAsync(data);
    },
    isPending: mutation.isPending,
    error: mutation.error as Error | null,
  };
}
