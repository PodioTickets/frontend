"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { Mail, ArrowLeft, Clock } from "lucide-react";
import Image from "next/image";
import { useForgotPassword } from "@/hooks/useForgotPassword";
import { forgotPasswordStep1Schema } from "@/validators/Auth.validator";
import { ZodError } from "zod";

type Step = "email" | "check-email";

const CHECK_STEPS = [
  "Abra seu e-mail e procure por Podioticket",
  'Clique no link "Redefinir minha senha"',
  "Crie sua nova senha",
] as const;

export default function OrganizerForgotPasswordPage() {
  const router = useRouter();
  const { forgotPassword, resendCode, isPending, isResending } =
    useForgotPassword();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [resendCooldown, setResendCooldown] = useState(0);

  const cooldownActive = resendCooldown > 0;
  useEffect(() => {
    if (!cooldownActive) return;
    const id = setInterval(() => {
      setResendCooldown((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [cooldownActive]);

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (errors.email) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.email;
        return next;
      });
    }
  };

  const handleSubmitEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      forgotPasswordStep1Schema.parse({ email });
      setErrors({});
      await forgotPassword({ email, accountType: "ORGANIZER" });
      setResendCooldown(60);
      setStep("check-email");
    } catch (error) {
      if (error instanceof ZodError) {
        const first = error.issues[0];
        const msg = first?.message ?? "E-mail inválido";
        setErrors({ email: msg });
        return;
      }
    }
  };

  const handleResend = async () => {
    if (!email.trim() || resendCooldown > 0) return;
    try {
      await resendCode({ email, accountType: "ORGANIZER" });
      setResendCooldown(60);
      setErrors({});
    } catch {
      // toast no hook
    }
  };

  const handleBack = () => {
    if (step === "check-email") {
      setStep("email");
      setErrors({});
      return;
    }
    router.back();
  };

  return (
    <div className="min-h-screen h-screen bg-gray-2 flex overflow-hidden">
      <div className="flex-1 flex flex-col items-center justify-between px-4 sm:px-8 md:px-[372px] py-11 h-full overflow-y-auto relative">
        <button
          type="button"
          onClick={handleBack}
          className="absolute left-4 sm:left-12 top-12 border border-gray-6 rounded-lg p-2 size-9 flex items-center justify-center hover:bg-gray-3 transition-colors cursor-pointer"
          aria-label="Voltar"
        >
          <ArrowLeft className="size-7 text-gray-12" />
        </button>

        <div className="w-[258px] h-11 relative shrink-0">
          <Image
            src="/images/logo_horizontal_black.png"
            alt="Pódio Ticket"
            width={258}
            height={44}
            className="object-contain"
            priority
          />
        </div>

        <div className="flex flex-col gap-11 items-center w-full max-w-[524px] flex-1 justify-center min-h-0 py-8">
          <div className="bg-gray-1 flex flex-col gap-8 items-start p-8 rounded-2xl shadow-[0px_2px_6px_0px_rgba(17,17,17,0.25)] w-full">
            {step === "email" ? (
              <div className="flex flex-col gap-10 items-center w-full">
                <div className="flex flex-col gap-4 items-center text-center">
                  <h1 className="text-xl font-bold text-gray-12 font-manrope leading-[1.1]">
                    Esqueci minha senha
                  </h1>
                  <p className="text-base text-gray-11 font-family-dm-sans leading-[1.3]">
                    Informe o e-mail da sua conta organizador. Se existir uma
                    conta, você receberá um link para redefinir a senha.
                  </p>
                </div>

                <form
                  onSubmit={handleSubmitEmail}
                  className="flex flex-col gap-2 items-end w-full"
                >
                  <div className="flex flex-col gap-2 items-start w-full mb-6">
                    <label className="text-base text-gray-12 font-family-dm-sans">
                      E-mail cadastrado
                    </label>
                    <div className="relative w-full">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <Mail className="size-5 text-gray-11" />
                      </div>
                      <Input
                        type="email"
                        autoComplete="email"
                        placeholder="Seu@email.com"
                        value={email}
                        onChange={(e) => handleEmailChange(e.target.value)}
                        className={`pl-10 h-12 w-full ${errors.email ? "border-red-11" : ""}`}
                        disabled={isPending}
                      />
                    </div>
                    {errors.email ? (
                      <p className="text-sm text-red-11 font-family-dm-sans">
                        {errors.email}
                      </p>
                    ) : null}
                  </div>

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
              <div className="flex flex-col gap-8 w-full">
                <div className="flex flex-col gap-4 text-center sm:text-left">
                  <h1 className="text-xl font-bold text-gray-12 font-manrope leading-[1.1]">
                    Verifique seu e-mail
                  </h1>
                  <p className="text-base text-gray-12 font-medium font-family-dm-sans leading-[1.3] text-left">
                    Se uma conta organizador existir com{" "}
                    <span className="font-bold">{email}</span>, você receberá
                    um e-mail em instantes com o link para redefinir a senha.
                  </p>
                </div>

                <div className="flex flex-col gap-3 w-full">
                  {CHECK_STEPS.map((text, index) => (
                    <div
                      key={text}
                      className="flex gap-2 items-center w-full min-w-0 rounded-lg"
                    >
                      <div className="flex size-6 shrink-0 items-center justify-center rounded bg-primary-4">
                        <span className="font-medium text-sm leading-[1.3] text-primary-12 font-family-dm-sans">
                          {index + 1}
                        </span>
                      </div>
                      <p className="font-medium text-sm leading-[1.3] text-primary-12 font-family-dm-sans min-w-0 text-left">
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
                    <p className="font-medium text-sm leading-[1.3] text-yellow-12 font-family-dm-sans text-left">
                      O link expira em até 1 hora
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 items-center justify-center w-full pt-2">
                  <p className="font-medium text-sm leading-[1.3] text-gray-12 font-family-dm-sans">
                    Não recebeu o e-mail?
                  </p>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={isResending || resendCooldown > 0}
                    className="font-semibold text-sm leading-[1.3] text-primary-10 font-family-dm-sans hover:text-primary-11 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer bg-transparent border-0 p-0"
                  >
                    {isResending
                      ? "Reenviando..."
                      : resendCooldown > 0
                        ? `Reenviar em ${resendCooldown}s`
                        : "Reenviar e-mail"}
                  </button>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-gray-6 text-gray-12"
                  onClick={() => router.push("/organizer/login")}
                >
                  Voltar ao login
                </Button>
              </div>
            )}
          </div>
        </div>

        <p className="text-base text-gray-11 font-family-dm-sans shrink-0">
          © 2026 PódioTicket
        </p>
      </div>
    </div>
  );
}
