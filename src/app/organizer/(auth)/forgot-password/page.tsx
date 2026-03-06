"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { Mail, ArrowLeft } from "lucide-react";
import Image from "next/image";
import { useForgotPassword } from "@/hooks/useForgotPassword";
import { useVerifyResetCode } from "@/hooks/useVerifyResetCode";

export default function OrganizerForgotPasswordPage() {
  const router = useRouter();
  const { forgotPassword, resendCode, isPending, isResending } = useForgotPassword();
  const { verifyCode, isPending: isVerifying } = useVerifyResetCode();
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState<string[]>(["", "", "", "", "", ""]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [resendCountdown, setResendCountdown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus first input when step 2 is shown
  useEffect(() => {
    if (step === 2) {
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
      // Iniciar countdown de 2 minutos quando entrar no step 2
      setResendCountdown(60); // 1 minuto em segundos
    }
  }, [step]);

  // Countdown timer
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => {
        setResendCountdown(resendCountdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

  const handleInputChange = (value: string) => {
    setEmail(value);
    // Clear error when user starts typing
    if (errors.email) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.email;
        return newErrors;
      });
    }
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleCodeChange = (index: number, value: string) => {
    // Only allow single digit
    if (value.length > 1) return;

    // Only allow numbers
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Clear error when user starts typing
    if (errors.code) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.code;
        return newErrors;
      });
    }

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").slice(0, 6);
    const digits = pastedData.split("").filter((char) => /^\d$/.test(char));

    if (digits.length > 0) {
      const newCode = [...code];
      digits.forEach((digit, idx) => {
        if (idx < 6) {
          newCode[idx] = digit;
        }
      });
      setCode(newCode);

      // Focus the next empty input or the last one
      const nextEmptyIndex = newCode.findIndex((val) => !val);
      const focusIndex = nextEmptyIndex === -1 ? 5 : nextEmptyIndex;
      inputRefs.current[focusIndex]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate email
    if (!email.trim()) {
      setErrors({ email: "Email é obrigatório" });
      return;
    }

    if (!validateEmail(email)) {
      setErrors({ email: "Email inválido" });
      return;
    }

    try {
      await forgotPassword({ email, accountType: "ORGANIZER" });
      // Avançar para step 2
      setStep(2);
      setErrors({});
    } catch (error: any) {
      // O erro já é tratado no hook com toast, mas adicionamos ao estado local para exibir no campo
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Erro ao enviar código de recuperação. Tente novamente.";
      setErrors({ email: errorMessage });
    }
  };

  const handleVerifyCode = async () => {
    const codeString = code.join("");

    if (codeString.length !== 6) {
      setErrors({ code: "Por favor, preencha todos os dígitos do código" });
      return;
    }

    try {
      const result = await verifyCode({ email, code: codeString, accountType: "ORGANIZER" });
      // Se o código for válido, redirecionar para a página de reset de senha
      router.push(`/organizer/reset-password?token=${result.token}&email=${encodeURIComponent(email)}`);
    } catch (error: any) {
      // O erro já é tratado no hook com toast, mas adicionamos ao estado local para exibir no campo
      setErrors({ code: "Código inválido" });
      // Não limpar o código, deixar o usuário ver o que digitou
      inputRefs.current[0]?.focus();
    }
  };

  const handleResendCode = async () => {
    if (resendCountdown > 0) return; // Não permitir reenvio durante countdown

    try {
      await resendCode({ email, accountType: "ORGANIZER" });
      setCode(["", "", "", "", "", ""]);
      setResendCountdown(60); // Reiniciar countdown de 1 minuto
      setErrors({});
      inputRefs.current[0]?.focus();
    } catch (error: any) {
      // O erro já é tratado no hook com toast
    }
  };

  const formatCountdown = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (minutes > 0 && secs === 0) {
      return `${minutes}Min`;
    }
    if (minutes > 0) {
      return `${minutes}Min ${secs}s`;
    }
    return `${secs}s`;
  };

  return (
    <div className="min-h-screen h-screen bg-gray-2 flex overflow-hidden">
      {/* Left Side - Form */}
      <div className="flex-1 flex flex-col items-center justify-between px-[372px] py-11 h-full overflow-hidden relative">
        {/* Back Button */}
        <button
          onClick={() => {
            if (step === 2) {
              setStep(1);
              setCode(["", "", "", "", "", ""]);
              setErrors({});
            } else {
              router.back();
            }
          }}
          className="absolute left-12 top-12 border border-gray-6 rounded-lg p-2 size-9 flex items-center justify-center hover:bg-gray-3 transition-colors cursor-pointer"
          aria-label="Voltar"
        >
          <ArrowLeft className="size-7 text-gray-12" />
        </button>

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
            {step === 1 ? (
              /* Step 1: Email Input */
              <div className="flex flex-col gap-10 items-center w-full">
                {/* Title and Description */}
                <div className="flex flex-col gap-4 items-center text-center">
                  <h1 className="text-xl font-bold text-gray-12 font-manrope leading-[1.1]">
                    Esqueci minha senha
                  </h1>
                  <p className="text-base text-gray-11 font-family-dm-sans leading-[1.3]">
                    Informe o e-mail associado à sua conta para receber as instruções de recuperação.
                  </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex flex-col gap-2 items-end w-full">
                  {/* Email Field */}
                  <div className="flex flex-col gap-2 items-start w-full mb-10">
                    <label className="text-base text-gray-12 font-family-dm-sans">
                      Email
                    </label>
                    <div className="relative w-full">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <Mail className="size-5 text-gray-11" />
                      </div>
                      <Input
                        type="email"
                        placeholder="Digite seu email"
                        value={email}
                        onChange={(e) => handleInputChange(e.target.value)}
                        className={`pl-10 h-12 w-full ${errors.email ? "border-red-11" : ""}`}
                        disabled={isPending}
                      />
                    </div>
                    {errors.email && (
                      <p className="text-sm text-red-11 font-family-dm-sans">
                        {errors.email}
                      </p>
                    )}
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    disabled={isPending || !email.trim()}
                    className="w-full"
                  >
                    {isPending ? "Enviando..." : "Enviar link de recuperação"}
                  </Button>
                </form>
              </div>
            ) : (
              /* Step 2: Code Verification */
              <div className="flex flex-col gap-10 items-center w-full">
                {/* Title and Description */}
                <div className="flex flex-col gap-4 items-center text-center">
                  <h1 className="text-xl font-bold text-gray-12 font-manrope leading-[1.1]">
                    Verifique seu e-mail
                  </h1>
                  <p className="text-base text-gray-11 font-family-dm-sans leading-[1.3]">
                    Enviamos um código de 6 dígitos para seu email
                  </p>
                </div>

                {/* Code Input Fields */}
                <div className="flex flex-col gap-5 items-start w-full">
                  <div className="grid grid-cols-7 gap-2 items-center justify-center w-full">
                    {code.map((digit, index) => (
                      <React.Fragment key={index}>
                        <input
                          ref={(el) => {
                            inputRefs.current[index] = el;
                          }}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleCodeChange(index, e.target.value)}
                          onKeyDown={(e) => handleKeyDown(index, e)}
                          onPaste={index === 0 ? handlePaste : undefined}
                          className={`rounded-lg size-[62px] w-full flex items-center justify-center text-center text-[32px] font-extrabold text-gray-12 font-manrope leading-[1.1] focus:outline-none transition-colors ${errors.code
                            ? "bg-[#fff7f7] border-2 border-[#fdbdbe] focus:border-[#fdbdbe]"
                            : "bg-gray-2 border-2 border-gray-6 focus:border-primary-11"
                            }`}
                          disabled={isVerifying}
                        />
                        {index === 2 && (
                          <div
                            className={`h-px w-full shrink-0 ${errors.code ? "bg-[#eb8e90]" : "bg-gray-6"
                              }`}
                          />
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                  {errors.code && (
                    <p className="text-base text-[#ce2c31] font-family-dm-sans text-center w-full">
                      {errors.code}
                    </p>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 items-start w-full">
                  <Button
                    type="button"
                    onClick={handleResendCode}
                    disabled={isResending || resendCountdown > 0}
                    variant="outline"
                    className="border-gray-6 text-gray-12 flex-1"
                  >
                    {isResending
                      ? "Reenviando..."
                      : resendCountdown > 0
                        ? `Reenviar em (${formatCountdown(resendCountdown)})`
                        : "Reenviar código"}
                  </Button>
                  <Button
                    type="button"
                    onClick={handleVerifyCode}
                    disabled={isVerifying || code.join("").length !== 6}
                    className="flex-1"
                  >
                    {isVerifying ? "Verificando..." : "Confirmar código"}
                  </Button>
                </div>
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
