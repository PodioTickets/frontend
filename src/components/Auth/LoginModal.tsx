"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useLoginModal, useRegisterModal } from "@/stores/modalStore";
import { useAuth } from "@/hooks/useAuth";
import { useForgotPassword } from "@/hooks/useForgotPassword";
import { useResetPassword } from "@/hooks/useResetPassword";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { Mail, Lock, X, Clock, ArrowLeft } from "lucide-react";
import Image from "next/image";
import {
  loginSchema,
  forgotPasswordStep1Schema,
  resetPasswordSchema,
  type LoginFormData,
} from "@/validators/Auth.validator";
import { ZodError } from "zod";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

function ForgotPasswordPanel({
  email,
  onEmailChange,
  error,
  onSubmit,
  isPending,
  onClose,
}: {
  email: string;
  onEmailChange: (value: string) => void;
  error?: string;
  onSubmit: (e: FormEvent) => void;
  isPending: boolean;
  onClose: () => void;
}) {
  return (
    <div className="bg-gray-1 rounded-xl w-full overflow-hidden flex flex-col border border-gray-6 md:border-0">
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-6 shrink-0">
        <h2 className="font-semibold text-xl leading-[1.3] text-gray-12 font-family-dm-sans">
          Esqueceu sua senha?
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="flex items-center justify-center size-8 rounded-lg hover:bg-gray-3 transition-colors shrink-0"
          aria-label="Fechar modal"
        >
          <X className="size-[18px] text-gray-12" />
        </button>
      </div>
      <form onSubmit={onSubmit} className="flex flex-col w-full">
        <div className="flex flex-col gap-8 pt-4 pb-6 px-6">
          <p className="font-medium text-base leading-[1.3] text-gray-12 font-family-dm-sans">
            Informe o e-mail da sua conta e enviaremos um link para criar uma
            nova senha
          </p>
          <div className="flex flex-col gap-2 w-full min-w-0">
            <label
              htmlFor="forgot-password-email"
              className="font-normal text-base leading-[1.3] text-gray-12 font-family-dm-sans"
            >
              E-mail cadastrado
            </label>
            <div className="relative w-full">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-11 pointer-events-none" />
              <Input
                id="forgot-password-email"
                type="email"
                autoComplete="email"
                placeholder="Seu@email.com"
                value={email}
                onChange={(e) => onEmailChange(e.target.value)}
                className={`pl-10 h-12 rounded-lg ${error ? "border-red-9 focus-visible:border-red-9" : ""
                  }`}
                aria-invalid={!!error}
              />
            </div>
            {error ? (
              <p className="text-sm text-red-9 font-family-dm-sans">{error}</p>
            ) : null}
          </div>
        </div>
        <div className="flex px-6 pt-4 pb-8 w-full">
          <Button
            type="submit"
            disabled={isPending}
            className="w-full h-12 leading-[1.1] font-manrope rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? "Enviando..." : "Enviar link de recuperação"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function ForgotPasswordCheckEmailPanel({
  sentToEmail,
  onClose,
  onResend,
  isResending,
  resendCooldownSeconds,
}: {
  sentToEmail: string;
  onClose: () => void;
  onResend: () => void;
  isResending: boolean;
  resendCooldownSeconds: number;
}) {
  const steps = [
    "Abra seu e-mail e procure por Podioticket",
    'Clique no link "Redefinir minha senha"',
    "Crie sua nova senha",
  ] as const;

  return (
    <div className="bg-gray-1 rounded-xl w-full overflow-hidden flex flex-col border border-gray-6 md:border-0">
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-6 shrink-0">
        <h2 className="font-semibold text-xl leading-[1.3] text-gray-12 font-family-dm-sans">
          Verifique seu e-mail
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="flex items-center justify-center size-8 rounded-lg hover:bg-gray-3 transition-colors shrink-0"
          aria-label="Fechar modal"
        >
          <X className="size-[18px] text-gray-12" />
        </button>
      </div>
      <div className="flex flex-col gap-8 pt-4 pb-6 px-6 w-full">
        <div className="flex flex-col gap-4 w-full min-w-0">
          <p className="font-medium text-base leading-[1.3] text-gray-12 font-family-dm-sans">
            Se uma conta existir com{" "}
            <span className="font-bold text-gray-12">{sentToEmail}</span>, você
            receberá um e-mail em instantes com o link para redefinir a senha.
          </p>
          <div className="flex flex-col gap-3 w-full">
            {steps.map((text, index) => (
              <div
                key={text}
                className="flex gap-2 items-center w-full min-w-0 rounded-lg"
              >
                <div className="flex size-6 shrink-0 items-center justify-center rounded bg-primary-4">
                  <span className="font-medium text-sm leading-[1.3] text-primary-12 font-family-dm-sans">
                    {index + 1}
                  </span>
                </div>
                <p className="font-medium text-sm leading-[1.3] text-primary-12 font-family-dm-sans min-w-0">
                  {text}
                </p>
              </div>
            ))}
            <div className="flex gap-1 items-center w-full rounded-lg bg-yellow-3 p-3">
              <Clock
                className="size-5 shrink-0 text-yellow-12"
                strokeWidth={1.75}
                aria-hidden
              />
              <p className="font-medium text-sm leading-[1.3] text-yellow-12 font-family-dm-sans">
                O link expira em até 1 hora
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 items-center justify-center w-full">
          <p className="font-medium text-sm leading-[1.3] text-gray-12 font-family-dm-sans">
            Não recebeu o email?
          </p>
          <button
            type="button"
            onClick={onResend}
            disabled={isResending || resendCooldownSeconds > 0}
            className="font-semibold text-sm leading-[1.3] text-primary-10 font-family-dm-sans hover:text-primary-11 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer bg-transparent border-0 p-0"
          >
            {isResending
              ? "Reenviando..."
              : resendCooldownSeconds > 0
                ? `Reenviar em ${resendCooldownSeconds}s`
                : "Reenviar e-mail"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ForgotPasswordNewPasswordPanel({
  password,
  confirmPassword,
  onPasswordChange,
  onConfirmPasswordChange,
  fieldErrors,
  onSubmit,
  onBack,
  onClose,
  isPending,
}: {
  password: string;
  confirmPassword: string;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  fieldErrors: { password?: string; confirmPassword?: string };
  onSubmit: (e: FormEvent) => void;
  onBack: () => void;
  onClose: () => void;
  isPending: boolean;
}) {
  return (
    <div className="bg-gray-1 rounded-xl w-full overflow-hidden flex flex-col border border-gray-6 md:border-0">
      <div className="flex items-start justify-between px-4 py-4 border-b border-gray-6 shrink-0 gap-2">
        <div className="flex gap-0.5 items-center min-w-0 flex-1">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center justify-center size-8 rounded-lg hover:bg-gray-3 transition-colors shrink-0"
            aria-label="Voltar"
          >
            <ArrowLeft className="size-[18px] text-gray-12" />
          </button>
          <h2 className="font-semibold text-xl leading-[1.3] text-gray-12 font-family-dm-sans truncate pl-0.5">
            Alterar senha
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex items-center justify-center size-8 rounded-lg hover:bg-gray-3 transition-colors shrink-0"
          aria-label="Fechar modal"
        >
          <X className="size-[18px] text-gray-12" />
        </button>
      </div>
      <form onSubmit={onSubmit} className="flex flex-col w-full">
        <div className="flex flex-col gap-6 p-6 w-full">
          <div className="flex flex-col gap-2 w-full min-w-0">
            <label
              htmlFor="new-password-field"
              className="font-normal text-base leading-[1.3] text-gray-12 font-family-dm-sans"
            >
              Nova senha
            </label>
            <div className="relative w-full">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-11 pointer-events-none" />
              <Input
                id="new-password-field"
                type="password"
                autoComplete="new-password"
                placeholder="Digite uma nova senha"
                value={password}
                onChange={(e) => onPasswordChange(e.target.value)}
                className={`pl-10 h-12 rounded-lg ${
                  fieldErrors.password
                    ? "border-red-9 focus-visible:border-red-9"
                    : ""
                }`}
                aria-invalid={!!fieldErrors.password}
              />
            </div>
            {fieldErrors.password ? (
              <p className="text-sm text-red-9 font-family-dm-sans">
                {fieldErrors.password}
              </p>
            ) : null}
          </div>
          <div className="flex flex-col gap-2 w-full min-w-0">
            <label
              htmlFor="confirm-new-password-field"
              className="font-normal text-base leading-[1.3] text-gray-12 font-family-dm-sans"
            >
              Confirmar nova senha
            </label>
            <div className="relative w-full">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-11 pointer-events-none" />
              <Input
                id="confirm-new-password-field"
                type="password"
                autoComplete="new-password"
                placeholder="Digite sua senha novamente"
                value={confirmPassword}
                onChange={(e) => onConfirmPasswordChange(e.target.value)}
                className={`pl-10 h-12 rounded-lg ${
                  fieldErrors.confirmPassword
                    ? "border-red-9 focus-visible:border-red-9"
                    : ""
                }`}
                aria-invalid={!!fieldErrors.confirmPassword}
              />
            </div>
            {fieldErrors.confirmPassword ? (
              <p className="text-sm text-red-9 font-family-dm-sans">
                {fieldErrors.confirmPassword}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex px-6 pt-4 pb-8 w-full">
          <Button
            type="submit"
            disabled={isPending}
            className="w-full h-12 bg-primary-11 text-primary-2 hover:bg-primary-10 font-bold text-lg leading-[1.1] font-manrope rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </form>
    </div>
  );
}

const GoogleIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="28"
    height="28"
    viewBox="0 0 28 28"
    fill="none"
  >
    <path
      d="M25.4404 11.7148H24.5007V11.6663H14.0007V16.333H20.5941C19.6322 19.0496 17.0474 20.9997 14.0007 20.9997C10.1349 20.9997 7.00065 17.8654 7.00065 13.9997C7.00065 10.1339 10.1349 6.99967 14.0007 6.99967C15.7851 6.99967 17.4085 7.67284 18.6446 8.77242L21.9445 5.47251C19.8608 3.53059 17.0737 2.33301 14.0007 2.33301C7.55773 2.33301 2.33398 7.55676 2.33398 13.9997C2.33398 20.4426 7.55773 25.6663 14.0007 25.6663C20.4436 25.6663 25.6673 20.4426 25.6673 13.9997C25.6673 13.2174 25.5868 12.4538 25.4404 11.7148Z"
      fill="#FBC02D"
    />
    <path
      d="M3.67773 8.56942L7.51082 11.3805C8.54799 8.81267 11.0598 6.99967 13.9992 6.99967C15.7837 6.99967 17.4071 7.67284 18.6432 8.77242L21.9431 5.47251C19.8594 3.53059 17.0722 2.33301 13.9992 2.33301C9.51807 2.33301 5.6319 4.86292 3.67773 8.56942Z"
      fill="#E53935"
    />
    <path
      d="M13.9995 25.6671C17.013 25.6671 19.7512 24.5138 21.8214 22.6384L18.2106 19.5829C17.0393 20.4702 15.5833 21.0004 13.9995 21.0004C10.965 21.0004 8.38845 19.0655 7.41778 16.3652L3.61328 19.2965C5.54411 23.0747 9.46528 25.6671 13.9995 25.6671Z"
      fill="#4CAF50"
    />
    <path
      d="M25.4398 11.7154L25.4304 11.667H24.5H14V16.3337H20.5934C20.1314 17.6386 19.292 18.7638 18.2093 19.5834L18.2111 19.5822L21.8219 22.6377C21.5664 22.8699 25.6667 19.8337 25.6667 14.0003C25.6667 13.2181 25.5862 12.4545 25.4398 11.7154Z"
      fill="#1565C0"
    />
  </svg>
);

type ForgotFlow = "idle" | "email" | "check-email" | "new-password";

export function LoginModal() {
  const { isOpen, closeLoginModal, openLoginModal, data: loginModalData } =
    useLoginModal();
  const { openRegisterModal } = useRegisterModal();
  const { login, isLoading: authLoading } = useAuth();
  const {
    forgotPassword,
    resendCode,
    isPending: forgotPasswordPending,
    isResending: forgotPasswordResending,
  } = useForgotPassword();
  const { resetPassword, isPending: resetPasswordPending } = useResetPassword();

  // Form data state
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [forgotFlow, setForgotFlow] = useState<ForgotFlow>("idle");
  const [forgotEmail, setForgotEmail] = useState("");
  const [passwordResetEmail, setPasswordResetEmail] = useState("");
  const [forgotEmailError, setForgotEmailError] = useState<string | undefined>(
    undefined
  );
  const [resetPasswordToken, setResetPasswordToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [resetPasswordFieldErrors, setResetPasswordFieldErrors] = useState<{
    password?: string;
    confirmPassword?: string;
  }>({});
  /** Cooldown alinhado ao backend (1 min entre reenvios efetivos) */
  const [forgotResendCooldown, setForgotResendCooldown] = useState(0);

  // Validation errors state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setForgotFlow("idle");
      setForgotEmail("");
      setPasswordResetEmail("");
      setForgotEmailError(undefined);
      setResetPasswordToken("");
      setNewPassword("");
      setConfirmNewPassword("");
      setResetPasswordFieldErrors({});
      setForgotResendCooldown(0);
    }
  }, [isOpen]);

  const forgotResendTimerActive = forgotResendCooldown > 0;
  useEffect(() => {
    if (!forgotResendTimerActive) return;
    const id = setInterval(() => {
      setForgotResendCooldown((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [forgotResendTimerActive]);

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

  const handleGoogleLogin = () => {
    // Salva a URL atual para redirecionar após o login
    if (typeof window !== "undefined") {
      const currentPath = window.location.pathname + window.location.search;
      // Não salvar se já estiver na página de callback ou auth
      if (!currentPath.startsWith("/auth/")) {
        sessionStorage.setItem("redirectAfterLogin", currentPath);
      }
    }
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3333";
    window.location.href = `${apiUrl}/api/v1/auth/google`;
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const validatedData: LoginFormData = loginSchema.parse(formData);

      // Chama a função de login do contexto
      await login({
        emailOrCpf: validatedData.email,
        password: validatedData.password,
      });

      toast.success("Login realizado com sucesso!");
      closeLoginModal();
      // Limpa o formulário
      setFormData({ email: "", password: "" });
      setErrors({});
    } catch (error) {
      console.log("error", error);
      if (error instanceof ZodError) {
        const newErrors: Record<string, string> = {};
        error.issues.forEach((err) => {
          if (err.path.length > 0) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        console.log("newErrors", newErrors);
        setErrors(newErrors);
        // Show first error as toast
        const firstError = error.issues[0];
        if (firstError) {
          toast.error(firstError.message);
        }
      } else {
        // Erro da API ou do contexto
        console.log("error", error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Erro ao fazer login. Tente novamente.";
        toast.error(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotEmailChange = (value: string) => {
    setForgotEmail(value);
    if (forgotEmailError) setForgotEmailError(undefined);
  };

  const handleForgotPasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      forgotPasswordStep1Schema.parse({ email: forgotEmail });
      setForgotEmailError(undefined);
      await forgotPassword({ email: forgotEmail, accountType: "USER" });
      setPasswordResetEmail(forgotEmail);
      setForgotResendCooldown(60);
      setForgotFlow("check-email");
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

  const handleResendResetEmail = async () => {
    if (!passwordResetEmail || forgotResendCooldown > 0) return;
    try {
      await resendCode({ email: passwordResetEmail, accountType: "USER" });
      setForgotResendCooldown(60);
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
    if (passwordResetEmail) {
      setForgotFlow("check-email");
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
        const first = error.issues[0];
        if (first?.message) toast.error(first.message);
        return;
      }
    }
  };

  const showForgotFlow = forgotFlow !== "idle";

  const forgotStepContent =
    forgotFlow === "email" ? (
      <ForgotPasswordPanel
        email={forgotEmail}
        onEmailChange={handleForgotEmailChange}
        error={forgotEmailError}
        onSubmit={handleForgotPasswordSubmit}
        isPending={forgotPasswordPending}
        onClose={closeLoginModal}
      />
    ) : forgotFlow === "check-email" ? (
      <ForgotPasswordCheckEmailPanel
        sentToEmail={passwordResetEmail}
        onClose={closeLoginModal}
        onResend={handleResendResetEmail}
        isResending={forgotPasswordResending}
        resendCooldownSeconds={forgotResendCooldown}
      />
    ) : forgotFlow === "new-password" ? (
      <ForgotPasswordNewPasswordPanel
        password={newPassword}
        confirmPassword={confirmNewPassword}
        onPasswordChange={handleNewPasswordChange}
        onConfirmPasswordChange={handleConfirmNewPasswordChange}
        fieldErrors={resetPasswordFieldErrors}
        onSubmit={handleNewPasswordSubmit}
        onBack={handleBackFromNewPassword}
        onClose={closeLoginModal}
        isPending={resetPasswordPending}
      />
    ) : null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Mobile Version */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden fixed inset-0 z-99999 bg-gray-2 overflow-y-auto"
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="bg-gray-1 rounded-t-[12px] min-h-full relative overflow-hidden"
            >
              {showForgotFlow ? (
                <div className="flex flex-col min-h-full p-4 pt-6 pb-8">
                  {forgotStepContent}
                </div>
              ) : (
                <>
                  {/* Header with glow effect */}
                  <div className="relative h-[164px] flex items-end justify-between pb-7 pt-8 px-4 overflow-hidden">
                    {/* Glow effect background */}
                    <div className="absolute top-[-190px] left-1/2 -translate-x-1/2 w-[390px] h-[312px] flex items-center justify-center pointer-events-none">
                      <div className="rotate-90 w-[312px] h-[390px] relative">
                        <div className="absolute inset-[-60.87%_-76.09%] opacity-20">
                          <div className="w-full h-full bg-primary-5 rounded-full blur-3xl" />
                        </div>
                      </div>
                    </div>

                    {/* Close button */}
                    <button
                      onClick={closeLoginModal}
                      className="absolute top-4 right-4 z-20 flex items-center justify-center size-8 rounded-full hover:bg-gray-3 transition-colors"
                      aria-label="Fechar modal"
                    >
                      <X className="size-5 text-gray-12" />
                    </button>

                    {/* Left decorative */}
                    <div className="absolute left-0 top-0 w-[162px] h-[80px]">
                      <Image
                        src="/images/login_left.png"
                        alt="Decorative left"
                        width={162}
                        height={80}
                        draggable={false}
                        className="w-full h-full object-contain"
                      />
                    </div>

                    {/* Logo */}
                    <div className="relative w-full z-10 flex items-center justify-center gap-2.5">
                      <Image
                        src="/images/logo_horizontal_black.png"
                        alt="Pódio Ticket"
                        width={33}
                        height={33}
                        priority
                        className="h-8 w-auto"
                        draggable={false}
                      />
                    </div>

                    {/* Right decorative */}
                    <div className="absolute right-0 top-0 w-[162px] h-[80px]">
                      <Image
                        src="/images/login_right.png"
                        alt="Decorative right"
                        width={162}
                        height={80}
                        draggable={false}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex flex-col items-center w-full min-h-[648px]">
                    {/* Welcome text */}
                    <div className="flex flex-col items-center justify-center pt-3 px-4 pb-0">
                      <h2 className="font-extrabold text-2xl leading-[1.1] text-gray-12 font-manrope">
                        Bem-vindo de volta
                      </h2>
                    </div>

                    {/* Form inputs */}
                    <form
                      onSubmit={handleSubmit}
                      className="flex flex-col gap-5 items-start px-4 py-6 w-full"
                    >
                      <div className="flex flex-col gap-5 items-start w-full">
                        {/* Email input */}
                        <div className="flex flex-col gap-2 items-start w-full">
                          <label className="font-normal text-base leading-[1.3] text-gray-11 font-family-dm-sans">
                            Email
                          </label>
                          <div className="relative w-full">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-11" />
                            <Input
                              type="email"
                              placeholder="Digite seu email"
                              value={formData.email}
                              onChange={(e) =>
                                handleInputChange("email", e.target.value)
                              }
                              className={`pl-10 h-12 ${errors.email
                                  ? "border-red-9 focus-visible:border-red-9"
                                  : ""
                                }`}
                              aria-invalid={!!errors.email}
                            />
                          </div>
                          {errors.email && (
                            <p className="text-sm text-red-9 font-family-dm-sans">
                              {errors.email}
                            </p>
                          )}
                        </div>

                        {/* Password input */}
                        <div className="flex flex-col gap-2 items-start w-full">
                          <label className="font-normal text-base leading-[1.3] text-gray-11 font-family-dm-sans">
                            Senha
                          </label>
                          <div className="relative w-full">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-11" />
                            <Input
                              type="password"
                              placeholder="Digite sua senha"
                              value={formData.password}
                              onChange={(e) =>
                                handleInputChange("password", e.target.value)
                              }
                              className={`pl-10 h-12 ${errors.password
                                  ? "border-red-9 focus-visible:border-red-9"
                                  : ""
                                }`}
                              aria-invalid={!!errors.password}
                            />
                          </div>
                          {errors.password && (
                            <p className="text-sm text-red-9 font-family-dm-sans">
                              {errors.password}
                            </p>
                          )}
                        </div>

                        {/* Forgot password link */}
                        <button
                          type="button"
                          onClick={() => {
                            setForgotEmail(formData.email);
                            setForgotEmailError(undefined);
                            setForgotFlow("email");
                          }}
                          className="font-semibold text-sm leading-[1.3] text-gray-11 hover:text-primary-10 transition-colors font-family-dm-sans cursor-pointer underline"
                        >
                          Esqueci minha senha
                        </button>
                      </div>

                      {/* Login button */}
                      <Button
                        type="submit"
                        disabled={isSubmitting || authLoading}
                        className="w-full h-11 bg-primary-11 text-primary-2 hover:bg-primary-10 font-bold text-base font-manrope disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSubmitting || authLoading
                          ? "Conectando..."
                          : "Conectar-se"}
                      </Button>
                    </form>

                    {/* Social login section */}
                    <div className="flex-1 flex flex-col gap-6 items-center justify-between pb-8 pt-4 px-4 w-full">
                      <div className="flex flex-col gap-6 items-start w-full">
                        {/* Divider */}
                        <div className="flex gap-2.5 items-center justify-center w-full">
                          <div className="flex-1 h-px bg-gray-6" />
                          <p className="font-normal text-sm leading-[1.3] text-gray-11 text-center font-family-dm-sans whitespace-nowrap">
                            Ou conecte-se com
                          </p>
                          <div className="flex-1 h-px bg-gray-6" />
                        </div>

                        <div className="w-full">
                          <Button
                            variant="ghost"
                            onClick={handleGoogleLogin}
                            className="w-full border border-gray-6 rounded-lg h-11 flex items-center justify-center gap-2 hover:bg-gray-3 transition-colors"
                          >
                            <GoogleIcon />
                            <span className="font-normal text-sm leading-[1.3] text-gray-12 font-family-dm-sans">
                              Entrar com Google
                            </span>
                          </Button>
                        </div>
                      </div>

                      {/* Sign up link */}
                      <div className="flex gap-1 items-center">
                        <p className="font-medium text-sm leading-[1.3] text-gray-12 text-center font-family-dm-sans">
                          Ainda não possui uma conta?
                        </p>
                        <button
                          onClick={() => {
                            closeLoginModal();
                            openRegisterModal();
                          }}
                          className="font-semibold text-base leading-[1.3] text-primary-10 underline hover:text-primary-11 transition-colors font-family-dm-sans cursor-pointer"
                        >
                          Cadastrar-se
                        </button>
                      </div>

                      {/* Terms and privacy */}
                      <p className="text-xs leading-[1.3] text-gray-11 text-center font-family-dm-sans">
                        Ao continuar você concorda com nossos{" "}
                        <button className="font-bold text-gray-12 underline hover:text-primary-10 transition-colors cursor-pointer">
                          Termos de serviço
                        </button>{" "}
                        e{" "}
                        <button className="font-bold text-gray-12 underline hover:text-primary-10 transition-colors cursor-pointer">
                          Política de privacidade
                        </button>
                      </p>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>

          {/* Desktop Version */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="hidden md:flex fixed inset-0 z-99999 items-center justify-center bg-black/50"
            onClick={closeLoginModal}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
              className={`rounded-xl shadow-2xl w-full mx-4 relative overflow-hidden ${showForgotFlow
                  ? "max-w-[460px] bg-transparent"
                  : "max-w-[600px] bg-gray-1"
                }`}
            >
              {showForgotFlow ? (
                forgotStepContent
              ) : (
                <>
                  <div className="relative pt-8 pb-3 px-6 flex items-center justify-center">
                    {/* Close button */}
                    <button
                      onClick={closeLoginModal}
                      className="absolute top-4 right-4 z-20 flex items-center justify-center size-8 rounded-full hover:bg-gray-3 transition-colors"
                      aria-label="Fechar modal"
                    >
                      <X className="size-5 text-gray-12" />
                    </button>

                    <div className="absolute left-0 top-0 w-[162px] h-[80px] flex items-center justify-center">
                      <Image
                        src="/images/login_left.png"
                        alt="Decorative left"
                        width={162}
                        height={80}
                        draggable={false}
                      />
                    </div>

                    <div className="relative z-10 flex items-center">
                      <Image
                        src="/images/logo_horizontal_black.png"
                        alt="Pódio Ticket"
                        width={210}
                        height={36}
                        priority
                        className="h-9 w-auto"
                        draggable={false}
                      />
                    </div>

                    <div className="absolute right-0 top-0 w-[162px] h-[80px]">
                      <Image
                        src="/images/login_right.png"
                        alt="Decorative right"
                        width={162}
                        height={80}
                        draggable={false}
                      />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex flex-col items-center w-full">
                    {/* Welcome text */}
                    <div className="flex flex-col gap-4 items-center justify-center pt-8 pb-0 px-6 text-center">
                      <h2 className="font-extrabold text-[28px] leading-[1.1] text-gray-12 font-manrope">
                        Bem-vindo de volta
                      </h2>
                      <p className="font-normal text-lg leading-[1.3] text-gray-11 font-family-dm-sans">
                        Por favor, preencha os campos para conectar-se
                      </p>
                    </div>

                    {/* Form inputs */}
                    <form
                      onSubmit={handleSubmit}
                      className="flex flex-col gap-5 items-start p-6 w-full"
                    >
                      <div className="flex flex-col gap-5 items-start w-full">
                        {/* Email input */}
                        <div className="flex flex-col gap-1 items-start w-full">
                          <label className="font-normal text-base leading-[1.3] text-gray-11 font-family-dm-sans">
                            Email
                          </label>
                          <div className="relative w-full">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-11" />
                            <Input
                              type="email"
                              placeholder="Digite seu email"
                              value={formData.email}
                              onChange={(e) =>
                                handleInputChange("email", e.target.value)
                              }
                              className={`pl-10 h-12 ${errors.email
                                  ? "border-red-9 focus-visible:border-red-9"
                                  : ""
                                }`}
                              aria-invalid={!!errors.email}
                            />
                          </div>
                          {errors.email && (
                            <p className="text-sm text-red-9 font-family-dm-sans">
                              {errors.email}
                            </p>
                          )}
                        </div>

                        {/* Password input */}
                        <div className="flex flex-col gap-1 items-start w-full">
                          <label className="font-normal text-base leading-[1.3] text-gray-11 font-family-dm-sans">
                            Senha
                          </label>
                          <div className="relative w-full">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-11" />
                            <Input
                              type="password"
                              placeholder="Digite sua senha"
                              value={formData.password}
                              onChange={(e) =>
                                handleInputChange("password", e.target.value)
                              }
                              className={`pl-10 h-12 ${errors.password
                                  ? "border-red-9 focus-visible:border-red-9"
                                  : ""
                                }`}
                              aria-invalid={!!errors.password}
                            />
                          </div>
                          {errors.password && (
                            <p className="text-sm text-red-9 font-family-dm-sans">
                              {errors.password}
                            </p>
                          )}
                        </div>

                        {/* Forgot password link */}
                        <button
                          type="button"
                          onClick={() => {
                            setForgotEmail(formData.email);
                            setForgotEmailError(undefined);
                            setForgotFlow("email");
                          }}
                          className="font-semibold text-base leading-[1.3] text-gray-11 hover:text-primary-10 transition-colors font-family-dm-sans cursor-pointer underline"
                        >
                          Esqueci minha senha
                        </button>
                      </div>

                      {/* Login button */}
                      <Button
                        type="submit"
                        disabled={isSubmitting || authLoading}
                        className="w-full h-12 bg-primary-11 text-primary-2 hover:bg-primary-10 font-bold text-xl font-manrope disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSubmitting || authLoading
                          ? "Conectando..."
                          : "Conectar-se"}
                      </Button>
                    </form>

                    {/* Social login section */}
                    <div className="flex flex-col gap-6 items-center justify-center pb-8 px-6 w-full">
                      <div className="flex flex-col gap-6 items-start w-full">
                        {/* Divider */}
                        <div className="flex gap-2.5 items-center justify-center w-full">
                          <div className="flex-1 h-px bg-gray-6" />
                          <p className="font-normal text-base leading-[1.3] text-gray-11 text-center font-family-dm-sans whitespace-nowrap">
                            Ou conecte-se com
                          </p>
                          <div className="flex-1 h-px bg-gray-6" />
                        </div>

                        <div className="w-full">
                          <Button
                            variant="ghost"
                            onClick={handleGoogleLogin}
                            className="w-full border border-gray-6 rounded-lg h-12 flex items-center justify-center gap-2 hover:bg-gray-3 transition-colors"
                          >
                            <GoogleIcon />
                            <span className="font-normal text-base leading-[1.3] text-gray-12 font-family-dm-sans">
                              Entrar com Google
                            </span>
                          </Button>
                        </div>
                      </div>

                      {/* Sign up link */}
                      <div className="flex gap-1 items-start">
                        <p className="font-normal text-base leading-[1.3] text-gray-12 text-center font-family-dm-sans">
                          Ainda não possui uma conta?
                        </p>
                        <button
                          onClick={() => {
                            closeLoginModal();
                            openRegisterModal();
                          }}
                          className="font-semibold text-base leading-[1.3] text-primary-10 underline hover:text-primary-11 transition-colors font-family-dm-sans cursor-pointer"
                        >
                          Cadastrar-se
                        </button>
                      </div>

                      {/* Terms and privacy */}
                      <p className="text-xs leading-[1.3] text-gray-11 text-center font-family-dm-sans">
                        Ao continuar você concorda com nossos{" "}
                        <button className="font-bold text-gray-12 underline hover:text-primary-10 transition-colors cursor-pointer">
                          Termos de serviço
                        </button>{" "}
                        e{" "}
                        <button className="font-bold text-gray-12 underline hover:text-primary-10 transition-colors cursor-pointer">
                          Política de privacidade
                        </button>
                      </p>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
