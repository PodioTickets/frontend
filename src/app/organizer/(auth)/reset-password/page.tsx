"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { Lock, ArrowLeft, Eye, EyeOff } from "lucide-react";
import Image from "next/image";
import toast from "react-hot-toast";
import { useResetPassword } from "@/hooks/useResetPassword";
import { resetPasswordSchema, type ResetPasswordFormData } from "@/validators/Auth.validator";
import { ZodError } from "zod";
import { SuccessIcon } from "@/components/Icons/SuccessIcon";

export default function OrganizerResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { resetPassword, isPending } = useResetPassword();

  const token = searchParams.get("token")?.trim() || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      toast.error("Link inválido ou incompleto. Solicite um novo e-mail.");
      router.push("/organizer/forgot-password");
    }
  }, [token, router]);

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    // Clear error when user starts typing
    if (errors.password) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.password;
        return newErrors;
      });
    }
    // Validar confirmação de senha em tempo real se já foi tocada
    if (touched.confirmPassword && confirmPassword) {
      validateField("confirmPassword", confirmPassword);
    }
  };

  const handleConfirmPasswordChange = (value: string) => {
    setConfirmPassword(value);
    // Clear error when user starts typing
    if (errors.confirmPassword) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.confirmPassword;
        return newErrors;
      });
    }
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    if (field === "password") {
      validateField("password", password);
      // Validar confirmação também se já foi preenchida
      if (confirmPassword) {
        validateField("confirmPassword", confirmPassword);
      }
    } else if (field === "confirmPassword") {
      validateField("confirmPassword", confirmPassword);
    }
  };

  const validateField = (field: string, value: string) => {
    try {
      const formData: any = {
        password: field === "password" ? value : password,
        confirmPassword: field === "confirmPassword" ? value : confirmPassword,
      };

      // Validar apenas o campo específico
      if (field === "password") {
        resetPasswordSchema.shape.password.parse(value);
      } else if (field === "confirmPassword") {
        resetPasswordSchema.shape.confirmPassword.parse(value);
        // Validar se as senhas coincidem
        if (password && value && password !== value) {
          setErrors((prev) => ({
            ...prev,
            confirmPassword: "As senhas não coincidem",
          }));
          return;
        }
      }

      // Validar o schema completo para verificar se as senhas coincidem
      resetPasswordSchema.parse(formData);

      // Se chegou aqui, o campo é válido
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    } catch (error) {
      if (error instanceof ZodError) {
        const fieldError = error.issues.find((err) => err.path.includes(field));
        if (fieldError) {
          setErrors((prev) => ({
            ...prev,
            [field]: fieldError.message,
          }));
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Marcar todos os campos como tocados
    setTouched({ password: true, confirmPassword: true });

    // Validar usando Zod
    try {
      const validatedData: ResetPasswordFormData = resetPasswordSchema.parse({
        password,
        confirmPassword,
      });

      if (!token) {
        toast.error("Link inválido ou incompleto. Solicite um novo e-mail.");
        router.push("/organizer/forgot-password");
        return;
      }

      await resetPassword({ token, password: validatedData.password });
      // Mostrar tela de sucesso
      setIsSuccess(true);
    } catch (error) {
      if (error instanceof ZodError) {
        const newErrors: Record<string, string> = {};
        error.issues.forEach((err) => {
          if (err.path.length > 0) {
            const field = err.path[0] as string;
            newErrors[field] = err.message;
          }
        });
        setErrors(newErrors);
        // Mostrar primeiro erro como toast
        const firstError = error.issues[0];
        if (firstError) {
          toast.error(firstError.message);
        }
      } else {
        // Erro da API ou do hook
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Erro ao redefinir senha. Tente novamente.";
        toast.error(errorMessage);
        setErrors({ password: errorMessage });
      }
    }
  };

  return (
    <div className="min-h-screen h-screen bg-gray-2 flex overflow-hidden">
      {/* Left Side - Form */}
      <div className="flex-1 flex flex-col items-center justify-between px-[372px] py-11 h-full overflow-hidden relative">
        {/* Back Button */}
        {!isSuccess && (
          <button
            onClick={() => router.back()}
            className="absolute left-12 top-12 border border-gray-6 rounded-lg p-2 size-9 flex items-center justify-center hover:bg-gray-3 transition-colors cursor-pointer"
            aria-label="Voltar"
          >
            <ArrowLeft className="size-7 text-gray-12" />
          </button>
        )}

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
        <div className="flex flex-col gap-11 items-center w-full max-w-[524px] flex-1 justify-center min-h-0">
          {/* Card */}
          <div className="bg-gray-1 flex flex-col gap-11 items-start p-8 rounded-2xl shadow-[0px_2px_6px_0px_rgba(17,17,17,0.25)] w-full">
            {isSuccess ? (
              /* Success Screen */
              <div className="flex flex-col gap-11 items-center w-full">
                {/* Success Content */}
                <div className="flex flex-col gap-4 items-center text-center w-full">
                  {/* Success Icon */}
                  <div className="flex gap-2.5 items-center p-5 relative">
                    <SuccessIcon className="size-[67px]" />
                  </div>

                  {/* Success Message */}
                  <div className="flex flex-col gap-4 items-center text-center">
                    <h1 className="text-xl font-extrabold text-gray-12 font-manrope leading-[1.1]">
                      Senha redefinida com sucesso!
                    </h1>
                    <div className="text-base text-gray-11 font-family-dm-sans leading-[1.3]">
                      <p className="mb-0">Sua senha foi atualizada. Você já pode acessar</p>
                      <p>a plataforma com suas novas credenciais</p>
                    </div>
                  </div>
                </div>

                {/* Button */}
                <Button
                  onClick={() => router.push("/organizer/login")}
                  className="w-full"
                >
                  Entrar na plataforma
                </Button>
              </div>
            ) : (
              /* Form Screen */
              <div className="flex flex-col gap-10 items-center w-full">

                {/* Title and Description */}
                <div className="flex flex-col gap-4 items-center text-center">
                  <h1 className="text-xl font-bold text-gray-12 font-manrope leading-[1.1]">
                    Criação da nova senha
                  </h1>
                  <p className="text-base text-gray-11 font-family-dm-sans leading-[1.3]">
                    Crie uma senha forte e segura. Ela não pode ser igual às suas senhas anteriores
                  </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex flex-col gap-5 items-end w-full">
                  {/* Password Field */}
                  <div className="flex flex-col gap-2 items-start w-full">
                    <label className="text-base text-gray-12 font-family-dm-sans">
                      Nova senha
                    </label>
                    <div className="relative w-full">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <Lock className="size-5 text-gray-11" />
                      </div>
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Digite sua nova senha"
                        value={password}
                        onChange={(e) => handlePasswordChange(e.target.value)}
                        onBlur={() => handleBlur("password")}
                        className={`pl-10 pr-10 h-12 w-full ${errors.password ? "border-red-11" : ""}`}
                        disabled={isPending}
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

                  {/* Confirm Password Field */}
                  <div className="flex flex-col gap-2 items-start w-full">
                    <label className="text-base text-gray-12 font-family-dm-sans">
                      Nova senha novamente
                    </label>
                    <div className="relative w-full">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <Lock className="size-5 text-gray-11" />
                      </div>
                      <Input
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Digite sua senha novamente"
                        value={confirmPassword}
                        onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                        onBlur={() => handleBlur("confirmPassword")}
                        className={`pl-10 pr-10 h-12 w-full ${errors.confirmPassword ? "border-red-11" : ""}`}
                        disabled={isPending}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-11 hover:text-gray-12 transition-colors"
                        aria-label={showConfirmPassword ? "Ocultar senha" : "Mostrar senha"}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="size-5" />
                        ) : (
                          <Eye className="size-5" />
                        )}
                      </button>
                    </div>
                    {errors.confirmPassword && (
                      <p className="text-sm text-red-11 font-family-dm-sans">
                        {errors.confirmPassword}
                      </p>
                    )}
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    disabled={isPending || !password.trim() || !confirmPassword.trim()}
                    className="w-full"
                  >
                    {isPending ? "Criando..." : "Criar nova senha"}
                  </Button>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* Copyright */}
        <p className="text-base text-gray-11 font-family-dm-sans">
          © 2026 PódioTicket
        </p>
      </div>
    </div>
  );
}
