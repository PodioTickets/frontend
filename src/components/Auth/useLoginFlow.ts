import { useState, useEffect, useRef, type FormEvent } from "react";
import { ZodError } from "zod";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { type TurnstileInstance } from "@marsidev/react-turnstile";
import { useLoginModal } from "@/stores/modalStore";
import { useAuth } from "@/hooks/useAuth";
import { loginSchema, type LoginFormData } from "@/validators/Auth.validator";
import {
  saveReturnPath,
  sanitizeReturnPath,
  readReturnPath,
  clearReturnPath,
} from "@/utils/authRedirect";

/**
 * Fluxo de login (e-mail/senha + MFA + Google OAuth), extraído do `LoginModal`
 * (Fase 2). Encapsula estado de formulário, captcha (Turnstile), passo MFA e os
 * efeitos associados (reset ao fechar, auto-abertura do MFA via Google OAuth,
 * cooldown de reenvio). O comportamento é idêntico ao que estava inline; o render
 * do `LoginModal` consome o retorno. O fluxo de "esqueci senha" vive em
 * `useForgotPasswordFlow` (hook irmão).
 */
export function useLoginFlow() {
  const { isOpen, closeLoginModal, openLoginModal } = useLoginModal();
  const router = useRouter();
  const { login, finishLoginMfa, isLoading: authLoading } = useAuth();

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
      // Remove só a flag e preserva o resto da query (ex.: `eventId` do checkout).
      // O passo 2FA do Google agora volta PARA a rota de origem em vez da home,
      // então limpar a query inteira apagaria parâmetros essenciais da página.
      params.delete("googleMfa");
      const qs = params.toString();
      window.history.replaceState(
        null,
        "",
        window.location.pathname + (qs ? `?${qs}` : "") + window.location.hash,
      );
      openLoginModal();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const handleSubmit = async (e: FormEvent) => {
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

  const fecharMfa = () => {
    setMfaToken(null);
    setMfaCode("");
    setMfaError("");
    setMfaResendCooldown(0);
  };

  /** OtpCodeInput do passo MFA: atualiza o código e limpa o erro. */
  const handleMfaCodeChange = (value: string) => {
    setMfaCode(value);
    setMfaError("");
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
      // MFA do Google: o callback abriu este passo (via store) já na rota de
      // origem e re-salvou o destino no storage. Concluído o 2FA, garante a volta
      // pra lá (ex.: checkout com a quantidade já selecionada). Só navega se houver
      // destino salvo — MFA de e-mail/senha não salva e mantém o comportamento
      // atual (só fecha).
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

  return {
    // estado
    formData,
    errors,
    isSubmitting,
    credentialsError,
    showPassword,
    setShowPassword,
    turnstileToken,
    setTurnstileToken,
    authLoading,
    // MFA
    mfaToken,
    mfaCode,
    mfaError,
    mfaConfirming,
    mfaResendCooldown,
    handleMfaCodeChange,
    // refs do turnstile
    mobileTurnstileRef,
    desktopTurnstileRef,
    // handlers
    handleGoogleLogin,
    handleInputChange,
    handleSubmit,
    fecharMfa,
    handleMfaResend,
    handleMfaConfirm,
  };
}
