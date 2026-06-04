"use client";

import { useState, useEffect, useRef, type FormEvent } from "react";
import { useLoginModal, useRegisterModal } from "@/stores/modalStore";
import { useAuth } from "@/hooks/useAuth";
import { useForgotPassword } from "@/hooks/useForgotPassword";
import { useResetPassword } from "@/hooks/useResetPassword";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { OtpCodeInput } from "@/components/OtpCodeInput";
import { Mail, Lock, X, ArrowLeft, Eye, EyeOff, Info, Shield } from "lucide-react";
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
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { useRouter } from "next/navigation";
import {
  saveReturnPath,
  sanitizeReturnPath,
  readReturnPath,
  clearReturnPath,
} from "@/utils/authRedirect";
import { EmailIcon } from "../Icons/EmailIcon";
import { PasswordIcon } from "../Icons/PasswordIcon";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

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
            Informe o e-mail da sua conta e enviaremos um código para criar uma
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
                placeholder="seu@email.com"
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
            {isPending ? "Enviando..." : "Enviar código de recuperação"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function ForgotPasswordEnterCodePanel({
  sentToEmail,
  code,
  onCodeChange,
  error,
  onSubmit,
  onBack,
  onClose,
  onResend,
  isResending,
  isVerifying,
  resendCooldownSeconds,
}: {
  sentToEmail: string;
  code: string;
  onCodeChange: (value: string) => void;
  error?: string;
  onSubmit: (e: FormEvent) => void;
  onBack: () => void;
  onClose: () => void;
  onResend: () => void;
  isResending: boolean;
  isVerifying: boolean;
  resendCooldownSeconds: number;
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
            Verifique seu e-mail
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
        <div className="flex flex-col gap-6 pt-4 pb-2 px-6 w-full">
          <p className="font-medium text-base leading-[1.3] text-gray-12 font-family-dm-sans">
            Enviamos um código de 6 dígitos para{" "}
            <span className="font-bold text-gray-12">{sentToEmail}</span>.
            Digite-o abaixo para continuar.
          </p>
          <div className="flex flex-col gap-3 w-full min-w-0">
            <OtpCodeInput
              value={code}
              onChange={onCodeChange}
              disabled={isVerifying}
              error={!!error}
            />
            {error ? (
              <p className="text-sm text-red-9 font-family-dm-sans">{error}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2 items-center justify-center w-full">
            <p className="font-medium text-sm leading-[1.3] text-gray-12 font-family-dm-sans">
              Não recebeu o código?
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
                  : "Reenviar código"}
            </button>
          </div>
        </div>
        <div className="flex px-6 pt-4 pb-8 w-full">
          <Button
            type="submit"
            disabled={isVerifying || code.length !== 6}
            className="w-full h-12 leading-[1.1] font-manrope rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isVerifying ? "Verificando..." : "Verificar código"}
          </Button>
        </div>
      </form>
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
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
                type={showNewPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Digite uma nova senha"
                value={password}
                onChange={(e) => onPasswordChange(e.target.value)}
                className={`pl-10 pr-10 h-12 rounded-lg ${fieldErrors.password
                  ? "border-red-9 focus-visible:border-red-9"
                  : ""
                  }`}
                aria-invalid={!!fieldErrors.password}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-11 hover:text-gray-12 transition-colors"
                aria-label={showNewPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
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
                type={showConfirmPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Digite sua senha novamente"
                value={confirmPassword}
                onChange={(e) => onConfirmPasswordChange(e.target.value)}
                className={`pl-10 pr-10 h-12 rounded-lg ${fieldErrors.confirmPassword
                  ? "border-red-9 focus-visible:border-red-9"
                  : ""
                  }`}
                aria-invalid={!!fieldErrors.confirmPassword}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-11 hover:text-gray-12 transition-colors"
                aria-label={showConfirmPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
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

const GoogleIcon = ({ className = "size-6" }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="28"
    height="28"
    viewBox="0 0 28 28"
    fill="none"
    className={className}
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

type ForgotFlow = "idle" | "email" | "enter-code" | "new-password";

export function LoginModal() {
  const { isOpen, closeLoginModal, openLoginModal, data: loginModalData } =
    useLoginModal();
  const { openRegisterModal } = useRegisterModal();
  const router = useRouter();
  const { login, finishLoginMfa, isLoading: authLoading } = useAuth();
  const {
    forgotPassword,
    resendCode,
    verifyResetCode,
    isPending: forgotPasswordPending,
    isResending: forgotPasswordResending,
    isVerifying: forgotPasswordVerifying,
  } = useForgotPassword();
  const { resetPassword, isPending: resetPasswordPending } = useResetPassword();

  // Form data state
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  // Estado do passo MFA de login
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaError, setMfaError] = useState("");
  const [mfaConfirming, setMfaConfirming] = useState(false);
  const [mfaResendCooldown, setMfaResendCooldown] = useState(0);

  const [forgotFlow, setForgotFlow] = useState<ForgotFlow>("idle");
  const [forgotEmail, setForgotEmail] = useState("");
  const [passwordResetEmail, setPasswordResetEmail] = useState("");
  const [forgotEmailError, setForgotEmailError] = useState<string | undefined>(
    undefined
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

  const [showPassword, setShowPassword] = useState(false);

  // Turnstile
  const mobileTurnstileRef = useRef<TurnstileInstance>(null);
  const desktopTurnstileRef = useRef<TurnstileInstance>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  // Validation errors state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [credentialsError, setCredentialsError] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setForgotFlow("idle");
      setForgotEmail("");
      setPasswordResetEmail("");
      setForgotEmailError(undefined);
      setResetCode("");
      setResetCodeError(undefined);
      setResetPasswordToken("");
      setNewPassword("");
      setConfirmNewPassword("");
      setResetPasswordFieldErrors({});
      setForgotResendCooldown(0);
      setCredentialsError(false);
      setTurnstileToken(null);
      setMfaToken(null);
      setMfaCode("");
      setMfaError("");
      setMfaResendCooldown(0);
      mobileTurnstileRef.current?.reset();
      desktopTurnstileRef.current?.reset();
    } else {
      // Verifica se há um token MFA do Google OAuth pendente
      const googleMfaToken = sessionStorage.getItem("googleMfaToken");
      if (googleMfaToken) {
        sessionStorage.removeItem("googleMfaToken");
        setMfaToken(googleMfaToken);
        setMfaCode("");
        setMfaError("");
      }
    }
  }, [isOpen]);

  // Auto-abre o modal quando redireccionado do Google OAuth com MFA pendente
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("googleMfa") === "1") {
      window.history.replaceState(null, "", window.location.pathname);
      openLoginModal();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const forgotResendTimerActive = forgotResendCooldown > 0;
  useEffect(() => {
    if (!forgotResendTimerActive) return;
    const id = setInterval(() => {
      setForgotResendCooldown((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [forgotResendTimerActive]);

  // Inicia cooldown de reenvio MFA quando token aparece
  useEffect(() => {
    if (mfaToken) { setMfaResendCooldown(60); }
  }, [mfaToken]);

  // Countdown do reenvio MFA
  useEffect(() => {
    if (mfaResendCooldown <= 0) return;
    const timer = setTimeout(() => setMfaResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [mfaResendCooldown]);

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
    // Salva a URL atual para voltar a ela após o login (resiliente ao
    // round-trip do OAuth — ver utils/authRedirect).
    let returnTo: string | null = null;
    if (typeof window !== "undefined") {
      const currentPath = window.location.pathname + window.location.search;
      // Não salvar se já estiver na página de callback ou auth
      if (!currentPath.startsWith("/auth/")) {
        saveReturnPath(currentPath);
        returnTo = sanitizeReturnPath(currentPath);
      }
    }
    const apiUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3333").replace(/\/$/, "");
    // Também enviamos o destino na URL: se o backend ecoar `redirect_to` no
    // callback, o retorno sobrevive mesmo a uma troca de origem do OAuth (quando
    // o storage por-origem não está visível na origem do callback). Inofensivo
    // se o backend ignorar o param.
    const googleUrl = returnTo
      ? `${apiUrl}/api/v1/auth/google?redirect_to=${encodeURIComponent(returnTo)}`
      : `${apiUrl}/api/v1/auth/google`;
    window.location.href = googleUrl;
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setCredentialsError(false);
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

      const result = await login({
        emailOrCpf: validatedData.email,
        password: validatedData.password,
        ...(turnstileToken ? { turnstileToken } : {}),
      });

      if (result?.mfaRequired) {
        setMfaToken(result.mfaToken);
        setMfaCode("");
        setMfaError("");
        return;
      }

      toast.success("Login realizado com sucesso!");
      closeLoginModal();
      setFormData({ email: "", password: "" });
      setErrors({});
    } catch (error) {
      if (error instanceof ZodError) {
        const newErrors: Record<string, string> = {};
        error.issues.forEach((err) => {
          if (err.path.length > 0) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
        const firstError = error.issues[0];
        if (firstError) {
          toast.error(firstError.message);
        }
      } else {
        setCredentialsError(true);
        // Reseta o captcha para exigir nova resolução após erro de credenciais
        setTurnstileToken(null);
        mobileTurnstileRef.current?.reset();
        desktopTurnstileRef.current?.reset();
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
        email: passwordResetEmail,
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
    if (!passwordResetEmail || forgotResendCooldown > 0) return;
    try {
      await resendCode({ email: passwordResetEmail, accountType: "USER" });
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
    if (passwordResetEmail) {
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

  const fecharMfa = () => {
    setMfaToken(null);
    setMfaCode("");
    setMfaError("");
    setMfaResendCooldown(0);
  };

  const handleMfaResend = async () => {
    if (!mfaToken) return;
    try {
      const apiBase = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3333").replace(/\/$/, "");
      const res = await fetch(`${apiBase}/api/v1/auth/2fa/resend-login-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mfaToken }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data?.message || "Erro ao reenviar código.");
        return;
      }
      setMfaResendCooldown(60);
      toast.success("Código reenviado para seu e-mail.");
    } catch {
      toast.error("Erro ao reenviar código. Tente novamente.");
    }
  };

  const handleMfaConfirm = async () => {
    if (!mfaToken) return;
    if (mfaCode.length < 6) {
      setMfaError("Preencha todos os 6 dígitos do código.");
      return;
    }
    setMfaConfirming(true);
    setMfaError("");
    try {
      await finishLoginMfa(mfaToken, mfaCode);
      toast.success("Login realizado com sucesso!");
      closeLoginModal();
      setFormData({ email: "", password: "" });
      setErrors({});
      // MFA do Google: o callback redirecionou pra `/?googleMfa=1` e o destino
      // original ficou no storage. Concluído o 2FA, volta pra lá (ex.: checkout
      // com a quantidade já selecionada). Só navega se houver destino salvo —
      // MFA de e-mail/senha não salva e mantém o comportamento atual (só fecha).
      const returnTo = readReturnPath();
      if (returnTo) {
        clearReturnPath();
        router.replace(returnTo);
      }
    } catch (err: any) {
      setMfaError(err?.message || "Código inválido. Tente novamente.");
      setMfaResendCooldown(60);
    } finally {
      setMfaConfirming(false);
    }
  };

  const mfaStepContent = mfaToken ? (
    <div className="bg-[#FCFCFC] rounded-xl w-full overflow-hidden flex flex-col border border-gray-6 md:border-0">
      {/* Cabeçalho */}
      <div className="flex justify-between items-center px-4 py-3 border-b border-[#D9D9D9]">
        <div className="flex items-center gap-2">
          <Shield className="size-5 text-[#646464] shrink-0" strokeWidth={1.5} />
          <span className="font-family-dm-sans font-semibold text-xl text-[#202020] leading-[1.3]">
            Verifique sua identidade
          </span>
        </div>
        <button
          type="button"
          onClick={fecharMfa}
          className="flex items-center justify-center size-8 rounded-lg hover:bg-gray-3 transition-colors shrink-0"
          aria-label="Fechar"
        >
          <X className="size-[18px] text-[#646464]" strokeWidth={1.5} />
        </button>
      </div>

      {/* Corpo */}
      <div className="flex flex-col gap-6 p-6">
        <p className="font-family-dm-sans text-base text-[#646464] leading-[1.3]">
          Enviamos um código de 6 dígitos para o seu e-mail. Digite ou cole o código abaixo para acessar sua conta.
        </p>

        <OtpCodeInput
          value={mfaCode}
          onChange={(v) => { setMfaCode(v); setMfaError(""); }}
          disabled={mfaConfirming}
          error={!!mfaError}
          autoFocus
        />

        {/* Banner de erro */}
        {mfaError && (
          <div
            className="flex items-center gap-2 p-3 rounded-lg border border-[#FDBDBE]"
            style={{ background: "linear-gradient(90deg, #FFDBDC 0%, #FEEBEC 100%)" }}
          >
            <Info className="size-5 shrink-0 text-[#641723]" strokeWidth={1.5} aria-hidden />
            <p className="font-family-dm-sans font-medium text-sm text-[#641723]">
              Código inválido. Verifique e tente novamente
            </p>
          </div>
        )}

        {/* Reenviar código */}
        <div className="flex justify-end">
          {mfaResendCooldown > 0 ? (
            <span className="font-family-dm-sans font-semibold text-sm text-[#646464]">
              Aguarde ({mfaResendCooldown} seg) para reenviar
            </span>
          ) : (
            <button
              type="button"
              onClick={handleMfaResend}
              className="font-family-dm-sans font-semibold text-sm text-[#646464] hover:text-[#202020] transition-colors"
            >
              Enviar código
            </button>
          )}
        </div>
      </div>

      {/* Rodapé */}
      <div className="px-6 pb-8 pt-4 flex justify-end items-center">
        <button
          type="button"
          onClick={handleMfaConfirm}
          disabled={mfaConfirming || mfaCode.length < 6}
          className="h-12 px-8 bg-[#59E373] rounded-lg font-manrope font-bold text-lg text-[#141A15] disabled:opacity-50 hover:bg-[#4fd066] transition-colors"
        >
          {mfaConfirming ? "Verificando..." : "Confirmar"}
        </button>
      </div>
    </div>
  ) : null;

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
    ) : forgotFlow === "enter-code" ? (
      <ForgotPasswordEnterCodePanel
        sentToEmail={passwordResetEmail}
        code={resetCode}
        onCodeChange={(v) => { setResetCode(v); if (resetCodeError) setResetCodeError(undefined); }}
        error={resetCodeError}
        onSubmit={handleCodeSubmit}
        onBack={() => setForgotFlow("email")}
        onClose={closeLoginModal}
        onResend={handleResendResetEmail}
        isResending={forgotPasswordResending}
        isVerifying={forgotPasswordVerifying}
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
              {mfaToken ? (
                <div className="flex flex-col min-h-full p-4 pt-6 pb-8">
                  {mfaStepContent}
                </div>
              ) : showForgotFlow ? (
                <div className="flex flex-col min-h-full p-4 pt-6 pb-8">
                  {forgotStepContent}
                </div>
              ) : (
                <>
                  {/* Header — mesmo padrão do desktop: logo central + linhas
                      decorativas em gradiente (Figma 883:50467/50468). */}
                  <div className="relative h-[68px] px-4 flex items-center justify-center overflow-hidden">
                    {/* Close button */}
                    <button
                      onClick={closeLoginModal}
                      className="absolute top-4 right-4 z-20 flex items-center justify-center size-8 rounded-full bg-gray-1 hover:bg-gray-3 transition-colors"
                      aria-label="Fechar modal"
                    >
                      <X className="size-5 text-gray-12" />
                    </button>

                    {/* Linhas decorativas — versão REDUZIDA (~65%) das do
                        desktop: em 390px de viewport, dois lados de 162px
                        quase encostariam no logo. Lado esquerdo é espelho. */}
                    <div className="pointer-events-none absolute right-0 top-0 h-[68px] w-[106px]" aria-hidden>
                      <div className="absolute bottom-[42px] left-[33px] h-1.5 w-[73px] rounded-l-full bg-gradient-to-l from-[rgba(62,155,79,0)] to-[#3e9b4f]" />
                      <div className="absolute bottom-[31px] left-[53px] h-1.5 w-[53px] rounded-l-full bg-gradient-to-l from-[rgba(62,155,79,0)] to-[#3e9b4f]" />
                      <div className="absolute bottom-[20px] left-[73px] h-1.5 w-[33px] rounded-l-full bg-gradient-to-l from-[rgba(62,155,79,0)] to-[#3e9b4f]" />
                    </div>
                    <div className="pointer-events-none absolute left-0 top-0 h-[68px] w-[106px] -scale-x-100" aria-hidden>
                      <div className="absolute bottom-[42px] left-[33px] h-1.5 w-[73px] rounded-l-full bg-gradient-to-l from-[rgba(62,155,79,0)] to-[#3e9b4f]" />
                      <div className="absolute bottom-[31px] left-[53px] h-1.5 w-[53px] rounded-l-full bg-gradient-to-l from-[rgba(62,155,79,0)] to-[#3e9b4f]" />
                      <div className="absolute bottom-[20px] left-[73px] h-1.5 w-[33px] rounded-l-full bg-gradient-to-l from-[rgba(62,155,79,0)] to-[#3e9b4f]" />
                    </div>

                    {/* Logo */}
                    <div className="relative z-10 flex items-center justify-center">
                      <Image
                        src="/images/logo_horizontal_black.png"
                        alt="Pódio Ticket"
                        width={210}
                        height={36}
                        priority
                        className="h-8 w-auto"
                        draggable={false}
                      />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex flex-col items-center justify-center w-full min-h-[648px] h-full">
                    {/* Welcome text — mesmo texto do desktop */}
                    <div className="flex flex-col items-center justify-center pt-6 px-4 pb-0 text-center">
                      <p className="font-normal text-lg leading-[1.3] text-gray-11 font-family-dm-sans">
                        Sua próxima largada começa aqui!
                      </p>
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
                            <EmailIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-11" />
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
                            <PasswordIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-11 pointer-events-none" />
                            <Input
                              type={showPassword ? "text" : "password"}
                              placeholder="Digite sua senha"
                              value={formData.password}
                              onChange={(e) =>
                                handleInputChange("password", e.target.value)
                              }
                              className={`pl-10 pr-10 h-12 ${errors.password
                                ? "border-red-9 focus-visible:border-red-9"
                                : ""
                                }`}
                              aria-invalid={!!errors.password}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword((v) => !v)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-11 hover:text-gray-12 transition-colors"
                              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                            >
                              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                          </div>
                          {errors.password && (
                            <p className="text-sm text-red-9 font-family-dm-sans">
                              {errors.password}
                            </p>
                          )}
                        </div>

                        {/* Credentials error banner */}
                        {credentialsError && (
                          <div className="flex items-center gap-2 w-full rounded-lg border border-red-6 bg-gradient-to-r from-red-4 to-red-3 p-3">
                            <Info className="size-5 shrink-0 text-red-12" strokeWidth={1.75} aria-hidden />
                            <p className="font-medium text-sm leading-[1.3] text-red-12 font-family-dm-sans">
                              E-mail ou senha incorretos. Verifique suas credenciais e tente novamente
                            </p>
                          </div>
                        )}

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

                      {/* Captcha Turnstile — retângulo "normal" (300×65)
                          reduzido via scale pra ~255×55: não existe tamanho
                          fino nativo no widget. Wrapper com altura fixa
                          absorve o espaço extra do scale. */}
                      {TURNSTILE_SITE_KEY && (
                        <div className="flex h-14 w-full items-center justify-center">
                          <div className="scale-[0.85]">
                            <Turnstile
                              ref={mobileTurnstileRef}
                              siteKey={TURNSTILE_SITE_KEY}
                              onSuccess={setTurnstileToken}
                              onError={() => setTurnstileToken(null)}
                              onExpire={() => setTurnstileToken(null)}
                              options={{ theme: "auto", size: "normal" }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Login button */}
                      <Button
                        type="submit"
                        disabled={isSubmitting || authLoading || (!!TURNSTILE_SITE_KEY && !turnstileToken)}
                        className="w-full h-11 font-bold text-base font-manrope disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSubmitting || authLoading
                          ? "Conectando..."
                          : "Entrar"}
                      </Button>
                    </form>

                    {/* Social login section */}
                    <div className="flex-1 flex flex-col gap-6 items-center justify-between pb-8 px-4 w-full">
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
                          Criar conta
                        </button>
                      </div>
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
              className={`rounded-xl shadow-2xl w-full mx-4 relative overflow-hidden max-h-[calc(100dvh-32px)] ${mfaToken || showForgotFlow
                ? "max-w-[460px] bg-transparent"
                : "max-w-[624px] bg-gray-1 overflow-y-auto"
                }`}
            >
              {mfaToken ? (
                mfaStepContent
              ) : showForgotFlow ? (
                forgotStepContent
              ) : (
                <>
                  <div className="relative h-[68px] px-6 flex items-center justify-center">
                    {/* Close button */}
                    <button
                      onClick={closeLoginModal}
                      className="absolute top-4 right-4 z-20 flex items-center justify-center size-8 rounded-full bg-gray-1 hover:bg-gray-3 transition-colors"
                      aria-label="Fechar modal"
                    >
                      <X className="size-5 text-gray-12" />
                    </button>

                    {/* Linhas decorativas em gradiente (Figma 883:50467/50468) —
                        lado esquerdo é o espelho horizontal do direito. */}
                    <div className="pointer-events-none absolute right-0 top-0 h-[68px] w-[162px]" aria-hidden>
                      <div className="absolute bottom-[46px] left-[50px] h-2 w-[112px] rounded-l-full bg-gradient-to-l from-[rgba(62,155,79,0)] to-[#3e9b4f]" />
                      <div className="absolute bottom-[30px] left-[81px] h-2 w-[81px] rounded-l-full bg-gradient-to-l from-[rgba(62,155,79,0)] to-[#3e9b4f]" />
                      <div className="absolute bottom-[14px] left-[111px] h-2 w-[51px] rounded-l-full bg-gradient-to-l from-[rgba(62,155,79,0)] to-[#3e9b4f]" />
                    </div>
                    <div className="pointer-events-none absolute left-0 top-0 h-[68px] w-[162px] -scale-x-100" aria-hidden>
                      <div className="absolute bottom-[46px] left-[50px] h-2 w-[112px] rounded-l-full bg-gradient-to-l from-[rgba(62,155,79,0)] to-[#3e9b4f]" />
                      <div className="absolute bottom-[30px] left-[81px] h-2 w-[81px] rounded-l-full bg-gradient-to-l from-[rgba(62,155,79,0)] to-[#3e9b4f]" />
                      <div className="absolute bottom-[14px] left-[111px] h-2 w-[51px] rounded-l-full bg-gradient-to-l from-[rgba(62,155,79,0)] to-[#3e9b4f]" />
                    </div>

                    <div className="relative z-10 flex items-center">
                      <Image
                        src="/images/logo_horizontal_black.png"
                        alt="Pódio Ticket"
                        width={210}
                        height={36}
                        priority
                        className="h-8 w-auto"
                        draggable={false}
                      />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex flex-col items-center w-full">
                    {/* Welcome text */}
                    <div className="flex flex-col gap-4 items-center justify-center pt-6 pb-0 px-6 text-center">
                      <p className="font-normal text-lg leading-[1.3] text-gray-11 font-family-dm-sans">
                        Sua próxima largada começa aqui!
                      </p>
                    </div>

                    {/* Form inputs */}
                    <form
                      onSubmit={handleSubmit}
                      className="flex flex-col gap-3 items-start p-6 w-full"
                    >
                      <div className="flex flex-col gap-3 items-start w-full">
                        {/* Email input */}
                        <div className="flex flex-col gap-1 items-start w-full">
                          <label className="font-normal text-base leading-[1.3] text-gray-11 font-family-dm-sans">
                            Email
                          </label>
                          <div className="relative w-full">
                            <EmailIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-11" />
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
                            <PasswordIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-11 pointer-events-none" />
                            <Input
                              type={showPassword ? "text" : "password"}
                              placeholder="Digite sua senha"
                              value={formData.password}
                              onChange={(e) =>
                                handleInputChange("password", e.target.value)
                              }
                              className={`pl-10 pr-10 h-12 ${errors.password
                                ? "border-red-9 focus-visible:border-red-9"
                                : ""
                                }`}
                              aria-invalid={!!errors.password}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword((v) => !v)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-11 hover:text-gray-12 transition-colors"
                              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                            >
                              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                          </div>
                          {errors.password && (
                            <p className="text-sm text-red-9 font-family-dm-sans">
                              {errors.password}
                            </p>
                          )}
                        </div>

                        {/* Credentials error banner */}
                        {credentialsError && (
                          <div className="flex items-center gap-2 w-full rounded-lg border border-red-6 bg-gradient-to-r from-red-4 to-red-3 p-3">
                            <Info className="size-5 shrink-0 text-red-12" strokeWidth={1.75} aria-hidden />
                            <p className="font-medium text-sm leading-[1.3] text-red-12 font-family-dm-sans">
                              E-mail ou senha incorretos. Verifique suas credenciais e tente novamente
                            </p>
                          </div>
                        )}

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

                      {/* Captcha Turnstile — retângulo "normal" (300×65)
                          reduzido via scale pra ~255×55: não existe tamanho
                          fino nativo no widget. Wrapper com altura fixa
                          absorve o espaço extra do scale. */}
                      {TURNSTILE_SITE_KEY && (
                        <div className="flex h-14 w-full items-center justify-center">
                          <div className="scale-100 w-full">
                            <Turnstile
                              ref={desktopTurnstileRef}
                              siteKey={TURNSTILE_SITE_KEY}
                              onSuccess={setTurnstileToken}
                              onError={() => setTurnstileToken(null)}
                              onExpire={() => setTurnstileToken(null)}
                              options={{ theme: "light", size: "flexible" }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Login button */}
                      <Button
                        type="submit"
                        disabled={isSubmitting || authLoading || (!!TURNSTILE_SITE_KEY && !turnstileToken)}
                        className="w-full h-12 font-bold text-lg font-manrope disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSubmitting || authLoading
                          ? "Conectando..."
                          : "Entrar"}
                      </Button>
                    </form>

                    {/* Social login section */}
                    <div className="flex flex-col gap-8 items-center justify-center pt-2 pb-8 px-6 w-full">
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
                            <GoogleIcon className="size-6" />
                            <span className="font-normal text-sm leading-[1.3] text-gray-12 font-family-dm-sans">
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
                          Criar conta
                        </button>
                      </div>
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
