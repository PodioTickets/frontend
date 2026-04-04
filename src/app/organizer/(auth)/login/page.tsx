"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useOrganizerNavigate } from "@/hooks/useOrganizerNavigate";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { Mail, Lock, Building2, Eye, EyeOff } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { loginSchema, type LoginFormData } from "@/validators/Auth.validator";
import { ZodError } from "zod";
import toast from "react-hot-toast";
import { HotelsIcon } from "@/components/Icons/Organizer/HotelsIcon";
import { publicSiteHref } from "@/lib/organizerHostNavigation";

export default function OrganizerLoginPage() {
  const router = useRouter();
  const orgNav = useOrganizerNavigate();
  const { login, isLoading: authLoading } = useAuth();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
      await login({
        emailOrCpf: validatedData.email,
        password: validatedData.password,
        accountType: "ORGANIZER",
      });

      toast.success("Login realizado com sucesso!");
      router.refresh();
      orgNav.push("/organizer/events");
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
        // Show first error as toast
        const firstError = error.issues[0];
        if (firstError) {
          toast.error(firstError.message);
        }
      } else {
        // Erro da API ou do contexto
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

  return (
    <div className="min-h-screen h-screen bg-gray-2 flex overflow-hidden">
      {/* Left Side - Form */}
      <div className="flex-1 flex flex-col items-center justify-between px-[124px] py-8 h-full overflow-hidden">
        {/* Logo */}
        <div className="w-[258px] h-11 relative">
          <Image
            src="/images/logo_horizontal_black.png"
            alt="Pódio Ticket"
            width={258}
            height={44}
            className="object-contain"
            priority
          />
        </div>

        {/* Form Content */}
        <div className="flex flex-col gap-8 w-full max-w-[470px] flex-1 justify-center min-h-0">
          {/* Header */}
          <div className="flex flex-col gap-8 items-center shrink-0">
            {/* Building Icon */}
            <div className="bg-gray-1 size-24 rounded-full p-4 flex items-center justify-center shrink-0 bg-linear-to-t from-gray-1 to-gray-8">
              <div className="size-full flex items-center justify-center bg-white rounded-full p-4">
                <HotelsIcon className="size-[52px] text-gray-12" />
              </div>
            </div>

            {/* Title and Subtitle */}
            <div className="flex flex-col gap-3 items-center text-center">
              <h1 className="text-2xl font-bold text-gray-12 font-manrope leading-[1.1]">
                Conecte sua conta
              </h1>
              <p className="text-lg text-gray-11 font-family-dm-sans leading-[1.3]">
                Plataforma dedicada a organizadores
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="w-full h-px bg-gray-6" />

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full shrink-0">
            {/* Email Field */}
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
                  disabled={isSubmitting || authLoading}
                />
              </div>
              {errors.email && (
                <p className="text-sm text-red-11 font-family-dm-sans">
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password Field */}
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
                  disabled={isSubmitting || authLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-11 hover:text-gray-12 transition-colors"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? (
                    <EyeOff className="size-5" />
                  ) : (
                    <Eye className="size-5" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-red-11 font-family-dm-sans">
                  {errors.password}
                </p>
              )}
            </div>

            {/* Forgot Password Link */}
            <div className="flex justify-end w-full">
              <Link
                href="/organizer/forgot-password"
                className="text-base font-semibold text-gray-11 font-family-dm-sans hover:text-gray-12 transition-colors underline"
              >
                Esqueci minha senha
              </Link>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isSubmitting || authLoading}
            >
              {isSubmitting || authLoading ? "Entrando..." : "Entrar na plataforma"}
            </Button>
          </form>
        </div>

        {/* Terms and Privacy */}
        <p className="text-sm text-gray-11 font-family-dm-sans text-center max-w-[328px] leading-[1.3]">
          Ao continuar você concorda com nossos{" "}
          <Link
            href={publicSiteHref("/terms")}
            className="font-bold text-gray-12 underline hover:text-gray-11 transition-colors"
          >
            Termos de serviço
          </Link>{" "}
          e{" "}
          <Link
            href={publicSiteHref("/privacy")}
            className="font-bold text-gray-12 underline hover:text-gray-11 transition-colors"
          >
            Política de privacidade
          </Link>
        </p>
      </div>

      {/* Right Side - Image */}
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
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-linear-to-b from-transparent from-[30.647%] to-[rgba(32,32,32,0.7)] rounded-xl" />
        </div>
      </div>
    </div>
  );
}
