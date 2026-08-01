"use client";

import { useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { adminService } from "@/services";
import { useAdminAppSurface } from "@/contexts/AdminAppSurfaceContext";
import { adminExternalHref } from "@/lib/adminPathPresentation";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { Mail, Lock, Star, Eye, EyeOff, Info } from "lucide-react";
import Image from "next/image";
import { ZodError } from "zod";
import { loginSchema, type LoginFormData } from "@/validators/Auth.validator";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import toast from "react-hot-toast";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

function classifyLoginError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid credentials") || m.includes("invalid email or password") || m.includes("unauthorized")) {
    return "E-mail ou senha incorretos. Verifique suas credenciais e tente novamente.";
  }
  if (m.includes("user not found") || m.includes("account not found")) {
    return "Conta não encontrada.";
  }
  if (m.includes("too many requests") || m.includes("rate limit")) {
    return "Muitas tentativas. Aguarde um momento e tente novamente.";
  }
  return msg || "Erro ao fazer login. Tente novamente.";
}

export default function AdminLoginPage() {
  const searchParams = useSearchParams();
  const { login, logout } = useAuth();
  const adminSurface = useAdminAppSurface();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const turnstileRef = useRef<TurnstileInstance>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

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
      await login({
        emailOrCpf: validatedData.email,
        password: validatedData.password,
        accountType: "ADMIN_PODIO_STAFF",
        ...(turnstileToken ? { turnstileToken } : {}),
      });
      try {
        await adminService.getMe();
      } catch (adminError: any) {
        await logout();
        const status = adminError?.response?.status;
        const msg = status === 403
          ? "Acesso negado. Sua conta não possui permissão de administrador."
          : "Erro ao verificar permissões. Tente novamente.";
        toast.error(msg);
        return;
      }
      toast.success("Login realizado com sucesso!");
      const next = searchParams.get("next");
      const target = next && next.startsWith("/admin") ? next : "/admin/events";
      // Redirect pós-login via navegação DURA (full reload), não `router.push`:
      // - garante que o middleware (proxy.ts) veja o cookie httpOnly recém-setado
      //   e renderize a área logada (a navegação soft do Next não pegava);
      // - `adminExternalHref` traduz `/admin/events` → `/events` no host dedicado
      //   do admin (URL canônica sem `/admin`), evitando o 307 do proxy.
      window.location.href = adminExternalHref(target, adminSurface);
      return;
    } catch (error) {
      if (error instanceof ZodError) {
        const newErrors: Record<string, string> = {};
        error.issues.forEach((err) => {
          if (err.path.length > 0) newErrors[err.path[0] as string] = err.message;
        });
        setErrors(newErrors);
        toast.error(error.issues[0]?.message ?? "Dados inválidos.");
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

  return (
    <div className="min-h-dvh bg-gray-2 flex flex-col lg:flex-row lg:h-screen lg:overflow-hidden">

      {/* ─── Mobile: hero image ─── */}
      <div className="relative h-[45vh] shrink-0 lg:hidden">
        <Image
          src="/images/admin-login.png"
          alt=""
          fill
          className="object-cover object-top"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent from-[44%] to-[rgba(32,32,32,0.7)]" />
        <div className="absolute top-4 left-4 flex justify-center">
          <Image
            src="/images/logo.png"
            alt="PódioTicket"
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
        lg:bg-gray-2 lg:rounded-none lg:mt-0 lg:py-11 lg:h-full lg:overflow-y-auto lg:gap-0
      ">
        {/* Desktop logo */}
        <div className="hidden lg:flex flex-col items-center self-start w-full mb-10">
          <Image
            src="/images/logo_admin_black.png"
            alt="PódioTicket"
            width={268}
            height={52}
            className="object-contain"
            draggable={false}
            priority
          />
        </div>

        {/* Center block */}
        <div className="flex flex-col gap-6 w-full lg:max-w-[470px] lg:flex-1 lg:justify-center lg:min-h-0 lg:gap-10">

          {/* Identity */}
          <div className="flex flex-row items-center gap-3 lg:flex-col lg:items-center lg:gap-8">
            <div className="size-[72px] lg:size-24 rounded-full flex items-center justify-center shrink-0 bg-linear-to-t from-gray-1 to-gray-8 p-3 lg:p-3">
              <div className="size-full flex items-center justify-center bg-white rounded-full p-2.5 lg:p-4">
                <Star className="size-9 lg:size-[52px] text-gray-12" />
              </div>
            </div>
            <div className="flex flex-col gap-1 lg:gap-4 lg:items-center lg:text-center">
              <h1 className="text-xl lg:text-2xl font-bold text-gray-12 font-manrope leading-[1.1]">
                Conecte sua conta
              </h1>
              <p className="text-sm lg:text-lg text-gray-11 font-family-dm-sans leading-[1.3]">
                Plataforma dedicada a nossa administração
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="w-full h-px bg-gray-6" />

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 lg:gap-5 w-full">
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
                  disabled={isSubmitting}
                  autoComplete="email"
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
                  disabled={isSubmitting}
                  autoComplete="current-password"
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
                  {loginError}
                </p>
              </div>
            )}

            {/* Captcha Turnstile — no mobile segue o padrão do login mobile
                (scale ~0.85 com wrapper de altura fixa); no desktop fica em
                tamanho cheio, igual ao login desktop. */}
            {TURNSTILE_SITE_KEY && (
              <div className="flex w-full items-center justify-center empty:hidden">
                <div className="w-full">
                  <Turnstile
                    ref={turnstileRef}
                    siteKey={TURNSTILE_SITE_KEY}
                    onSuccess={setTurnstileToken}
                    onError={() => setTurnstileToken(null)}
                    onExpire={() => setTurnstileToken(null)}
                    options={{ theme: "light", size: "flexible", appearance: "interaction-only" }}
                  />
                </div>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-[52px] font-bold text-lg mt-1"
              disabled={isSubmitting || (!!TURNSTILE_SITE_KEY && !turnstileToken)}
              isLoading={isSubmitting}
            >
              Entrar na plataforma
            </Button>
          </form>
        </div>

        {/* Desktop spacer */}
        <div className="hidden lg:block opacity-0 pointer-events-none h-[52px]" aria-hidden />
      </div>

      {/* ─── Desktop: right image ─── */}
      <div className="flex-1 hidden lg:flex flex-col h-full p-3">
        <div className="relative flex-1 rounded-xl overflow-hidden">
          <Image
            src="/images/bg-login-organizer.png"
            alt=""
            fill
            sizes="50vw"
            className="object-cover object-center"
            priority
            aria-hidden
          />
        </div>
      </div>
    </div>
  );
}
