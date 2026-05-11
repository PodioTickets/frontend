"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useOrganizerNavigate } from "@/hooks/useOrganizerNavigate";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { Mail, Lock, Eye, EyeOff, Info, Shield, X } from "lucide-react";
import { OtpCodeInput } from "@/components/OtpCodeInput";
import Image from "next/image";
import Link from "next/link";
import { loginSchema, type LoginFormData } from "@/validators/Auth.validator";
import { ZodError } from "zod";
import { HotelsIcon } from "@/components/Icons/Organizer/HotelsIcon";
import { publicSiteHref } from "@/lib/organizerHostNavigation";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import toast from "react-hot-toast";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

type LoginErrorKind = "credentials" | "inactive_org" | "generic";

function classifyLoginError(msg: string): { kind: LoginErrorKind; text: string } {
  const m = msg.toLowerCase();
  if (m.includes("organization is inactive")) {
    return { kind: "inactive_org", text: "Esta organização está desativada. Entre em contato com o suporte." };
  }
  if (m.includes("invalid credentials") || m.includes("invalid email or password") || m.includes("unauthorized")) {
    return { kind: "credentials", text: "E-mail ou senha incorretos. Verifique suas credenciais e tente novamente." };
  }
  if (m.includes("user not found") || m.includes("account not found")) {
    return { kind: "credentials", text: "Conta não encontrada." };
  }
  if (m.includes("too many requests") || m.includes("rate limit")) {
    return { kind: "generic", text: "Muitas tentativas. Aguarde um momento e tente novamente." };
  }
  return { kind: "generic", text: msg || "Erro ao fazer login. Tente novamente." };
}

export default function OrganizerLoginPage() {
  const router = useRouter();
  const orgNav = useOrganizerNavigate();
  const { login, finishLoginMfa, isLoading: authLoading } = useAuth();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loginError, setLoginError] = useState<{ kind: LoginErrorKind; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const turnstileRef = useRef<TurnstileInstance>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  // Estado do passo MFA
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaError, setMfaError] = useState("");
  const [mfaConfirming, setMfaConfirming] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Inicia o cooldown de reenvio quando o modal MFA abre
  useEffect(() => {
    if (mfaToken) { setResendCooldown(60); }
  }, [mfaToken]);

  // Countdown de reenvio
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setLoginError(null);
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
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
        accountType: "ORGANIZER",
        ...(turnstileToken ? { turnstileToken } : {}),
      });

      if (result?.mfaRequired) {
        setMfaToken(result.mfaToken);
        setMfaCode("");
        setMfaError("");
        return;
      }

      toast.success("Login realizado com sucesso!");
      router.refresh();
      orgNav.push("/organizer/events");
      setFormData({ email: "", password: "" });
      setErrors({});
    } catch (error) {
      if (error instanceof ZodError) {
        const newErrors: Record<string, string> = {};
        error.issues.forEach((err) => {
          if (err.path.length > 0) newErrors[err.path[0] as string] = err.message;
        });
        setErrors(newErrors);
      } else {
        const raw = error instanceof Error ? error.message : "";
        setLoginError(classifyLoginError(raw));
        setTurnstileToken(null);
        turnstileRef.current?.reset();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const footer = (
    <p className="text-xs lg:text-sm text-gray-11 font-family-dm-sans text-center max-w-[328px] leading-[1.3]">
      Ao continuar você concorda com nossos{" "}
      <Link href={publicSiteHref("/terms")} className="font-bold text-gray-12 underline hover:text-gray-11 transition-colors">
        Termos de serviço
      </Link>{" "}
      e{" "}
      <Link href={publicSiteHref("/privacy")} className="font-bold text-gray-12 underline hover:text-gray-11 transition-colors">
        Política de privacidade
      </Link>
    </p>
  );

  const fecharModal = () => {
    setMfaToken(null);
    setMfaCode("");
    setMfaError("");
    setResendCooldown(0);
  };

  const handleResend = () => {
    setResendCooldown(60);
    toast.success("Código reenviado para seu e-mail.");
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
      await finishLoginMfa(mfaToken, mfaCode, "ORGANIZER");
      toast.success("Login realizado com sucesso!");
      router.refresh();
      orgNav.push("/organizer/events");
    } catch (err: any) {
      setMfaError(err?.message || "Código inválido. Tente novamente.");
      setResendCooldown(60);
    } finally {
      setMfaConfirming(false);
    }
  };

  return (
    <div className="min-h-dvh bg-gray-2 flex flex-col lg:flex-row lg:h-screen lg:overflow-hidden">

      {/* ─── Mobile: hero image ─── */}
      <div className="relative h-[45vh] shrink-0 lg:hidden">
        <Image
          src="/images/bg-login-organizer.png"
          alt=""
          fill
          className="object-cover object-center"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent from-[44%] to-[rgba(32,32,32,0.7)]" />
        <div className="absolute top-4 left-4 flex justify-center">
          <Image
            src="/images/logo.png"
            alt="Pódio Ticket"
            width={44}
            height={44}
            className="object-contain"
            priority
          />
        </div>
      </div>

      {/* ─── Form column ─── */}
      <div className="
        relative z-10 flex flex-col gap-6
        bg-gray-1 rounded-t-[24px] -mt-6 px-4 pt-5 pb-8
        lg:flex-1 lg:flex lg:flex-col lg:items-center lg:justify-between
        lg:bg-gray-2 lg:rounded-none lg:mt-0 lg:px-[124px] lg:py-6 xl:py-8 lg:h-full lg:overflow-hidden lg:gap-0
      ">
        {/* Desktop logo */}
        <div className="hidden lg:flex items-center self-center shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/org-login-dark.svg"
            alt="Pódio Ticket"
            className="h-11 w-auto"
          />
        </div>

        {/* Center block */}
        <div className="flex flex-col gap-6 w-full lg:max-w-[470px] lg:flex-1 lg:min-h-0 lg:gap-6 xl:gap-8">

          {/* Identity */}
            <div className="flex flex-row items-center gap-3 lg:flex-col lg:items-center lg:gap-4 xl:gap-8">
              <div className="size-[72px] lg:size-20 xl:size-24 rounded-full flex items-center justify-center shrink-0 bg-linear-to-t from-gray-1 to-gray-8 p-3">
                <div className="size-full flex items-center justify-center bg-white rounded-full p-2.5 lg:p-3 xl:p-4">
                  <HotelsIcon className="size-9 lg:size-11 xl:size-[52px] text-gray-12" />
                </div>
              </div>
              <div className="flex flex-col gap-1 lg:gap-2 xl:gap-3 lg:items-center lg:text-center">
                <h1 className="text-xl xl:text-2xl font-bold text-gray-12 font-manrope leading-[1.1]">
                  Conecte sua conta
                </h1>
                <p className="text-sm xl:text-lg text-gray-11 font-family-dm-sans leading-[1.3]">
                  Plataforma exclusiva para organizadores
                </p>
              </div>
            </div>

            {/* Divider */}
            <div className="w-full h-px bg-gray-6" />

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full">
              {/* Email */}
              <div className="flex flex-col gap-2">
                <label className="text-base text-gray-12 font-family-dm-sans">Email</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <Mail className="size-5 text-gray-11" />
                  </div>
                  <Input
                    type="email"
                    placeholder="Digite seu email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    className={`pl-10 h-12 ${errors.email ? "border-red-11" : ""}`}
                    disabled={isSubmitting || authLoading}
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-red-11 font-family-dm-sans">{errors.email}</p>
                )}
              </div>

              {/* Password */}
              <div className="flex flex-col gap-2">
                <label className="text-base text-gray-12 font-family-dm-sans">Senha</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <Lock className="size-5 text-gray-11" />
                  </div>
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Digite sua senha"
                    value={formData.password}
                    onChange={(e) => handleInputChange("password", e.target.value)}
                    className={`pl-10 pr-10 h-12 ${errors.password ? "border-red-11" : ""}`}
                    disabled={isSubmitting || authLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-11 hover:text-gray-12 transition-colors"
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-red-11 font-family-dm-sans">{errors.password}</p>
                )}
              </div>

              {/* Error banner */}
              {loginError && (
                <div className="flex items-center gap-2 w-full rounded-lg border border-red-6 bg-gradient-to-r from-red-4 to-red-3 p-3">
                  <Info className="size-5 shrink-0 text-red-12" strokeWidth={1.75} aria-hidden />
                  <p className="font-medium text-sm leading-[1.3] text-red-12 font-family-dm-sans">
                    {loginError.text}
                  </p>
                </div>
              )}

              {/* Forgot password */}
              <div className="flex justify-end w-full">
                <Link
                  href="/organizer/forgot-password"
                  className="text-sm lg:text-base font-semibold text-gray-11 font-family-dm-sans hover:text-gray-12 transition-colors underline"
                >
                  Esqueci minha senha
                </Link>
              </div>

              {/* Captcha */}
              {TURNSTILE_SITE_KEY && (
                <Turnstile
                  ref={turnstileRef}
                  siteKey={TURNSTILE_SITE_KEY}
                  onSuccess={setTurnstileToken}
                  onError={() => setTurnstileToken(null)}
                  onExpire={() => setTurnstileToken(null)}
                  options={{ theme: "auto", size: "flexible" }}
                  className="w-full"
                />
              )}

              <Button
                type="submit"
                disabled={isSubmitting || authLoading || (!!TURNSTILE_SITE_KEY && !turnstileToken)}
              >
                {isSubmitting || authLoading ? "Entrando..." : "Entrar na plataforma"}
              </Button>
            </form>
        </div>

        {/* Footer */}
        <div className="flex justify-center mt-2 lg:mt-0 lg:shrink-0">{footer}</div>
      </div>

      {/* ─── Desktop: right image ─── */}
      <div className="flex-1 relative hidden lg:block">
        <div className="absolute inset-0 overflow-hidden rounded-xl m-3">
          <div className="absolute inset-0 bg-linear-to-br from-primary-11/20 via-primary-11/10 to-gray-12/30" />
          <Image
            src="/images/bg-login-organizer.png"
            alt="Corredores"
            fill
            className="object-cover rounded-xl"
            priority
          />
          <div className="absolute inset-0 bg-linear-to-b from-transparent from-[30.647%] to-[rgba(32,32,32,0.7)] rounded-xl" />
        </div>
      </div>

      {/* ─── Modal de verificação MFA ─── */}
      {mfaToken && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-[rgba(32,32,32,0.90)]" onClick={fecharModal} />

          {/* Card do modal */}
          <div className="relative w-[492px] max-w-[calc(100vw-32px)] bg-[#FCFCFC] rounded-xl overflow-hidden flex flex-col shadow-xl">

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
                onClick={fecharModal}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-3 transition-colors"
                aria-label="Fechar"
              >
                <X className="size-[18px] text-[#646464]" strokeWidth={1.5} />
              </button>
            </div>

            {/* Corpo */}
            <div className="p-6 flex flex-col gap-6">
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
                {resendCooldown > 0 ? (
                  <span className="font-family-dm-sans font-semibold text-sm text-[#646464]">
                    Aguarde ({resendCooldown} seg) para reenviar
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResend}
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
        </div>
      )}
    </div>
  );
}
