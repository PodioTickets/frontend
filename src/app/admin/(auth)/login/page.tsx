"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { Mail, Lock, Star, Eye, EyeOff } from "lucide-react";
import Image from "next/image";
import { ZodError } from "zod";
import { loginSchema, type LoginFormData } from "@/validators/Auth.validator";
import toast from "react-hot-toast";

function translateLoginError(msg: string): string {
  const m = msg.toLowerCase();
  if (
    m.includes("invalid credentials") ||
    m.includes("invalid email or password") ||
    m.includes("unauthorized")
  ) {
    return "E-mail ou senha incorretos.";
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
  const router = useRouter();
  const { login } = useAuth();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
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
        accountType: "ORGANIZER",
      });
      toast.success("Login realizado com sucesso!");
      router.push("/admin/events");
      setFormData({ email: "", password: "" });
      setErrors({});
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
        toast.error(translateLoginError(raw));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen h-screen bg-gray-2 flex overflow-hidden">
      {/* Left — Form */}
      <div className="flex-1 flex flex-col items-center justify-between py-11 h-full overflow-y-auto">
        <div className="flex flex-col justify-center items-center h-full gap-11 w-full max-w-[470px]">
          <div className="flex flex-col items-center self-start w-full mb-10">
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
          <div className="flex flex-col gap-10 items-center w-full">
            {/* Avatar circle */}
            <div className="flex flex-col gap-8 items-center">
              <div className="bg-gray-1 size-24 rounded-full p-3 flex items-center justify-center shrink-0 bg-linear-to-t from-gray-1 to-gray-8">
                <div className="size-full flex items-center justify-center bg-white rounded-full p-4">
                  <Star className="size-[52px] text-gray-12" />
                </div>
              </div>

              <div className="flex flex-col gap-4 items-center text-center">
                <h1 className="font-bold text-2xl leading-[1.1] text-gray-12 font-manrope">
                  Conecte sua conta
                </h1>
                <p className="text-lg leading-[1.3] text-gray-11 font-family-dm-sans">
                  Plataforma dedicada a nossa administração
                </p>
              </div>
            </div>

            {/* Divider */}
            <div className="w-full h-px bg-gray-6" />

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-5 w-full">
              {/* Email */}
              <div className="flex flex-col gap-2">
                <label className="text-base text-gray-12 font-family-dm-sans">
                  Email
                </label>
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

              {/* Senha */}
              <div className="flex flex-col gap-2">
                <label className="text-base text-gray-12 font-family-dm-sans">
                  Senha
                </label>
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

              <Button
                type="submit"
                className="w-full h-[52px] font-bold text-lg mt-1"
                disabled={isSubmitting}
                isLoading={isSubmitting}
              >
                Entrar na plataforma
              </Button>
            </form>
          </div>
        </div>

        {/* Bottom spacer */}
        <div className="opacity-0 pointer-events-none h-[52px]" aria-hidden />
      </div>

      {/* Right — Photo panel */}
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
