import { useState, useEffect, type FormEvent } from "react";
import { ZodError } from "zod";
import toast from "react-hot-toast";
import { useLoginModal } from "@/stores/modalStore";
import { useForgotPassword } from "@/hooks/useForgotPassword";
import { useResetPassword } from "@/hooks/useResetPassword";
import { getCpfValidationMessage } from "@/utils/cpf";
import {
  forgotPasswordStep1Schema,
  resetPasswordSchema,
} from "@/validators/Auth.validator";
import type { ForgotMethod } from "./ForgotPasswordPanels";

/** Passo atual do fluxo de recuperação de senha. */
export type ForgotFlow = "idle" | "email" | "enter-code" | "new-password";

/** Máscara progressiva de CPF (xxx.xxx.xxx-xx). */
function maskCPF(value: string): string {
  const numbers = value.replace(/\D/g, "");
  if (numbers.length <= 3) return numbers;
  if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
  if (numbers.length <= 9)
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
  return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`;
}

/**
 * Máquina de estado do fluxo "esqueci minha senha" (idle → email → enter-code →
 * new-password), extraída do `LoginModal` (Fase 2). Encapsula estado, efeitos
 * (reset ao fechar o modal, cooldown de reenvio, entrada direta via token de
 * `loginModalData`) e handlers. O comportamento é idêntico ao que estava inline;
 * o render do `LoginModal` consome o retorno deste hook.
 */
export function useForgotPasswordFlow() {
  const { isOpen, closeLoginModal, openLoginModal, data: loginModalData } =
    useLoginModal();
  const {
    forgotPassword,
    resendCode,
    verifyResetCode,
    isPending: forgotPasswordPending,
    isResending: forgotPasswordResending,
    isVerifying: forgotPasswordVerifying,
  } = useForgotPassword();
  const { resetPassword, isPending: resetPasswordPending } = useResetPassword();

  const [forgotFlow, setForgotFlow] = useState<ForgotFlow>("idle");
  const [forgotMethod, setForgotMethod] = useState<ForgotMethod>("email");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotCpf, setForgotCpf] = useState("");
  const [passwordResetEmail, setPasswordResetEmail] = useState("");
  /** CPF (só dígitos) usado no passo 1 — identificador das chamadas verify/resend. */
  const [passwordResetCpf, setPasswordResetCpf] = useState("");
  /** E-mail MASCARADO da conta (só no fluxo por CPF) — pra indicar onde o código foi enviado. */
  const [passwordResetMaskedEmail, setPasswordResetMaskedEmail] = useState("");
  const [forgotEmailError, setForgotEmailError] = useState<string | undefined>(
    undefined,
  );
  const [resetCode, setResetCode] = useState("");
  const [resetCodeError, setResetCodeError] = useState<string | undefined>(undefined);
  const [resetPasswordToken, setResetPasswordToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [resetPasswordFieldErrors, setResetPasswordFieldErrors] = useState<{
    password?: string;
    confirmPassword?: string;
  }>({});
  /** Cooldown alinhado ao backend (1 min entre reenvios efetivos) */
  const [forgotResendCooldown, setForgotResendCooldown] = useState(0);

  // Reset ao fechar o modal (espelha o reset que estava no effect do LoginModal).
  useEffect(() => {
    if (isOpen) return;
    setForgotFlow("idle");
    setForgotMethod("email");
    setForgotEmail("");
    setForgotCpf("");
    setPasswordResetEmail("");
    setPasswordResetCpf("");
    setPasswordResetMaskedEmail("");
    setForgotEmailError(undefined);
    setResetCode("");
    setResetCodeError(undefined);
    setResetPasswordToken("");
    setNewPassword("");
    setConfirmNewPassword("");
    setResetPasswordFieldErrors({});
    setForgotResendCooldown(0);
  }, [isOpen]);

  const forgotResendTimerActive = forgotResendCooldown > 0;
  useEffect(() => {
    if (!forgotResendTimerActive) return;
    const id = setInterval(() => {
      setForgotResendCooldown((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [forgotResendTimerActive]);

  // Entrada direta no passo "nova senha" quando o modal abre com um token
  // (ex.: link de redefinição em `loginModalData.passwordResetToken`).
  useEffect(() => {
    if (!isOpen) return;
    const raw = loginModalData?.passwordResetToken;
    const token =
      typeof raw === "string" && raw.trim().length > 0 ? raw.trim() : "";
    if (token) {
      setResetPasswordToken(token);
      setForgotFlow("new-password");
    }
  }, [isOpen, loginModalData?.passwordResetToken]);

  /** Abre o fluxo a partir da tela de login, pré-preenchendo email/CPF pelo digitado. */
  const startForgotFlowFrom = (typed: string) => {
    const t = typed.trim();
    const isCpfLike = t !== "" && /^[\d.\-\s]+$/.test(t);
    setForgotMethod(isCpfLike ? "cpf" : "email");
    setForgotEmail(isCpfLike ? "" : t);
    setForgotCpf(isCpfLike ? maskCPF(t) : "");
    setForgotEmailError(undefined);
    setForgotFlow("email");
  };

  const backToEmailStep = () => setForgotFlow("email");

  const handleForgotEmailChange = (value: string) => {
    setForgotEmail(value);
    if (forgotEmailError) setForgotEmailError(undefined);
  };

  const handleForgotCpfChange = (value: string) => {
    setForgotCpf(maskCPF(value));
    if (forgotEmailError) setForgotEmailError(undefined);
  };

  const handleForgotMethodChange = (method: ForgotMethod) => {
    setForgotMethod(method);
    setForgotEmailError(undefined);
  };

  const handleResetCodeChange = (value: string) => {
    setResetCode(value);
    if (resetCodeError) setResetCodeError(undefined);
  };

  const handleForgotPasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      if (forgotMethod === "cpf") {
        // Validação local (algoritmo da Receita) antes de bater no backend
        const cpfError = getCpfValidationMessage(forgotCpf);
        if (cpfError) {
          setForgotEmailError(cpfError);
          toast.error(cpfError);
          return;
        }
        const cpfDigits = forgotCpf.replace(/\D/g, "");
        setForgotEmailError(undefined);

        // Cooldown: se já enviamos para ESTE mesmo CPF e o cooldown ainda corre,
        // NÃO reenvia (o usuário não pode burlar o limite voltando pra cá) — só
        // retorna ao passo do código com o tempo restante. Identificador
        // diferente = pedido novo → segue o fluxo normal abaixo.
        if (forgotResendCooldown > 0 && passwordResetCpf === cpfDigits) {
          toast.error(`Aguarde ${forgotResendCooldown}s para reenviar o código.`);
          setForgotFlow("enter-code");
          return;
        }

        const result = await forgotPassword({ cpf: cpfDigits, accountType: "USER" });
        setPasswordResetCpf(cpfDigits);
        setPasswordResetEmail("");
        // E-mail mascarado da conta (quando o CPF existe) pra mostrar no passo
        // do código. Ausente = CPF sem conta; mantém a mensagem genérica.
        setPasswordResetMaskedEmail(result?.maskedEmail ?? "");
      } else {
        forgotPasswordStep1Schema.parse({ email: forgotEmail });
        setForgotEmailError(undefined);

        // Mesmo cooldown para o fluxo por e-mail (comparação canônica: trim +
        // lowercase, igual à chave de rate limit do backend).
        const sameEmail =
          passwordResetEmail.trim().toLowerCase() ===
          forgotEmail.trim().toLowerCase();
        if (forgotResendCooldown > 0 && sameEmail) {
          toast.error(`Aguarde ${forgotResendCooldown}s para reenviar o código.`);
          setForgotFlow("enter-code");
          return;
        }

        await forgotPassword({ email: forgotEmail, accountType: "USER" });
        setPasswordResetEmail(forgotEmail);
        setPasswordResetCpf("");
        setPasswordResetMaskedEmail("");
      }
      setResetCode("");
      setResetCodeError(undefined);
      setForgotResendCooldown(60);
      setForgotFlow("enter-code");
    } catch (error) {
      if (error instanceof ZodError) {
        const first = error.issues[0];
        setForgotEmailError(first?.message ?? "Email inválido");
        if (first?.message) toast.error(first.message);
        return;
      }
      // API errors are toasted by useForgotPassword
    }
  };

  const handleCodeSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (resetCode.length !== 6) {
      setResetCodeError("Digite os 6 dígitos do código");
      return;
    }
    try {
      setResetCodeError(undefined);
      const result = await verifyResetCode({
        // Mesmo identificador usado no passo 1 (email OU cpf)
        ...(passwordResetEmail
          ? { email: passwordResetEmail }
          : { cpf: passwordResetCpf }),
        code: resetCode,
        accountType: "USER",
      });
      setResetPasswordToken(result.token);
      setForgotFlow("new-password");
    } catch {
      // Erro tratado no hook (toast)
    }
  };

  const handleResendResetEmail = async () => {
    if ((!passwordResetEmail && !passwordResetCpf) || forgotResendCooldown > 0)
      return;
    try {
      await resendCode({
        ...(passwordResetEmail
          ? { email: passwordResetEmail }
          : { cpf: passwordResetCpf }),
        accountType: "USER",
      });
      setForgotResendCooldown(60);
      setResetCode("");
      setResetCodeError(undefined);
    } catch {
      // Erro tratado no hook (toast)
    }
  };

  const handleNewPasswordChange = (value: string) => {
    setNewPassword(value);
    if (resetPasswordFieldErrors.password) {
      setResetPasswordFieldErrors((prev) => {
        const next = { ...prev };
        delete next.password;
        return next;
      });
    }
  };

  const handleConfirmNewPasswordChange = (value: string) => {
    setConfirmNewPassword(value);
    if (resetPasswordFieldErrors.confirmPassword) {
      setResetPasswordFieldErrors((prev) => {
        const next = { ...prev };
        delete next.confirmPassword;
        return next;
      });
    }
  };

  const handleBackFromNewPassword = () => {
    setResetPasswordFieldErrors({});
    setNewPassword("");
    setConfirmNewPassword("");
    setResetPasswordToken("");
    if (passwordResetEmail || passwordResetCpf) {
      setForgotFlow("enter-code");
    } else {
      setForgotFlow("email");
    }
  };

  const handleNewPasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!resetPasswordToken) {
      toast.error("Link inválido ou expirado. Solicite um novo e-mail.");
      return;
    }
    try {
      const validated = resetPasswordSchema.parse({
        password: newPassword,
        confirmPassword: confirmNewPassword,
      });
      setResetPasswordFieldErrors({});
      await resetPassword({
        token: resetPasswordToken,
        password: validated.password,
      });
      closeLoginModal();
      setTimeout(() => openLoginModal(), 0);
    } catch (error) {
      if (error instanceof ZodError) {
        const next: { password?: string; confirmPassword?: string } = {};
        error.issues.forEach((issue) => {
          const key = issue.path[0];
          if (key === "password" || key === "confirmPassword") {
            next[key] = issue.message;
          }
        });
        setResetPasswordFieldErrors(next);
        return;
      }
      // Erro de API
      const err = error as any;
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Erro ao redefinir senha. Tente novamente.";
      if (msg.toLowerCase().includes("igual")) {
        setResetPasswordFieldErrors({ password: msg });
      } else {
        toast.error(msg);
      }
    }
  };

  return {
    // estado
    forgotFlow,
    forgotMethod,
    forgotEmail,
    forgotCpf,
    forgotEmailError,
    resetCode,
    resetCodeError,
    passwordResetEmail,
    passwordResetMaskedEmail,
    newPassword,
    confirmNewPassword,
    resetPasswordFieldErrors,
    forgotResendCooldown,
    // flags de pending (react-query)
    forgotPasswordPending,
    forgotPasswordResending,
    forgotPasswordVerifying,
    resetPasswordPending,
    // ações
    startForgotFlowFrom,
    backToEmailStep,
    handleForgotMethodChange,
    handleForgotEmailChange,
    handleForgotCpfChange,
    handleResetCodeChange,
    handleForgotPasswordSubmit,
    handleCodeSubmit,
    handleResendResetEmail,
    handleNewPasswordChange,
    handleConfirmNewPasswordChange,
    handleBackFromNewPassword,
    handleNewPasswordSubmit,
  };
}
