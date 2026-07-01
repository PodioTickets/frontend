"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useOrganizerNavigate } from "@/hooks/useOrganizerNavigate";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { OtpCodeInput } from "@/components/OtpCodeInput";
import { Mail, ArrowLeft, Lock, Eye, EyeOff } from "lucide-react";
import { useForgotPassword } from "@/hooks/useForgotPassword";
import { useResetPassword } from "@/hooks/useResetPassword";
import { forgotPasswordStep1Schema, resetPasswordSchema } from "@/validators/Auth.validator";
import { ZodError } from "zod";
import toast from "react-hot-toast";
import { SuccessIcon } from "@/components/Icons/SuccessIcon";

type Step = "email" | "enter-code" | "new-password" | "success";

export default function OrganizerForgotPasswordPage() {
  const router = useRouter();
  const orgNav = useOrganizerNavigate();
  const { forgotPassword, resendCode, verifyResetCode, isPending, isResending, isVerifying } =
    useForgotPassword();
  const { resetPassword, isPending: isResettingPassword } = useResetPassword();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [resendCooldown, setResendCooldown] = useState(0);

  const [resetCode, setResetCode] = useState("");
  const [resetToken, setResetToken] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
      setResetCode("");
      setStep("enter-code");
    } catch (error) {
      if (error instanceof ZodError) {
        const first = error.issues[0];
        const msg = first?.message ?? "E-mail inválido";
        setErrors({ email: msg });
        return;
      }
    }
  };

  const handleSubmitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resetCode.length !== 6) {
      setErrors({ code: "Digite os 6 dígitos do código" });
      return;
    }
    try {
      setErrors({});
      const result = await verifyResetCode({ email, code: resetCode, accountType: "ORGANIZER" });
      setResetToken(result.token);
      setStep("new-password");
    } catch {
      // toast no hook
    }
  };

  const handleSubmitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const validated = resetPasswordSchema.parse({ password, confirmPassword });
      setErrors({});
      await resetPassword({ token: resetToken, password: validated.password });
      setStep("success");
    } catch (error) {
      if (error instanceof ZodError) {
        const next: Record<string, string> = {};
        error.issues.forEach((issue) => {
          const key = issue.path[0] as string;
          if (!next[key]) next[key] = issue.message;
        });
        setErrors(next);
        return;
      }
      // Erro de API (token expirado, senha inválida, etc.)
      const err = error as any;
      const msg = err?.response?.data?.message || err?.message || "Erro ao redefinir senha. Tente novamente.";
      if (msg.toLowerCase().includes("igual")) {
        setErrors({ password: msg });
      } else {
        toast.error(msg);
        setErrors({ password: msg });
      }
    }
  };

  const handleResend = async () => {
    if (!email.trim() || resendCooldown > 0) return;
    try {
      await resendCode({ email, accountType: "ORGANIZER" });
      setResendCooldown(60);
      setResetCode("");
      setErrors({});
    } catch {
      // toast no hook
    }
  };

  const handleBack = () => {
    if (step === "enter-code") {
      setStep("email");
      setErrors({});
      return;
    }
    if (step === "new-password") {
      // Código já foi consumido no backend; reinicia o fluxo do zero
      setStep("email");
      setResetCode("");
      setResetToken("");
      setPassword("");
      setConfirmPassword("");
      setErrors({});
      return;
    }
    router.back();
  };

  return (
    <div className="min-h-screen h-screen bg-gray-2 flex overflow-hidden">
      <div className="flex-1 flex flex-col items-center justify-between px-4 sm:px-8 py-11 h-full overflow-y-auto relative">
        {step !== "success" && (
          <button
            type="button"
            onClick={handleBack}
            className="absolute left-4 sm:left-12 top-12 border border-gray-6 rounded-lg p-2 size-9 flex items-center justify-center hover:bg-gray-3 transition-colors cursor-pointer"
            aria-label="Voltar"
          >
            <ArrowLeft className="size-7 text-gray-12" />
          </button>
        )}

        <div className="h-11 flex items-center shrink-0">
          {/* Logo do organizador — mesma do login (org-login-dark.svg) p/ manter
              consistência de marca no fluxo de autenticação do organizador. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/org-login-dark.svg"
            alt="Pódio Ticket"
            className="h-11 w-auto"
          />
        </div>

        <div className="flex flex-col gap-11 items-center w-full max-w-[524px] flex-1 justify-center min-h-0 py-8">
          <div className="bg-gray-1 flex flex-col gap-8 items-start p-8 rounded-2xl shadow-[0px_2px_6px_0px_rgba(17,17,17,0.25)] w-full">

            {/* Step 1: Email */}
            {step === "email" && (
              <div className="flex flex-col gap-10 items-center w-full">
                <div className="flex flex-col gap-4 items-center text-center">
                  <h1 className="text-xl font-bold text-gray-12 font-manrope leading-[1.1]">
                    Esqueci minha senha
                  </h1>
                  <p className="text-base text-gray-11 font-family-dm-sans leading-[1.3]">
                    Informe o e-mail da sua conta de organizador. Se ele estiver cadastrado, enviaremos um código para redefinir sua senha.
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
                        placeholder="seu@email.com"
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
                    {isPending ? "Enviando..." : "Enviar código de recuperação"}
                  </Button>
                </form>
              </div>
            )}

            {/* Step 2: Enter Code */}
            {step === "enter-code" && (
              <div className="flex flex-col gap-8 items-center w-full">
                <div className="flex flex-col gap-4 items-center text-center">
                  <h1 className="text-xl font-bold text-gray-12 font-manrope leading-[1.1]">
                    Verifique seu e-mail
                  </h1>
                  <p className="text-base text-gray-12 font-family-dm-sans leading-[1.3]">
                    Enviamos um código de 6 dígitos para{" "}
                    <span className="font-bold">{email}</span>. Digite-o abaixo
                    para continuar.
                  </p>
                </div>

                <form
                  onSubmit={handleSubmitCode}
                  className="flex flex-col gap-6 items-center w-full"
                >
                  <div className="flex flex-col gap-3 items-start w-full">
                    <OtpCodeInput
                      value={resetCode}
                      onChange={(v) => {
                        setResetCode(v);
                        if (errors.code) setErrors((p) => { const n = { ...p }; delete n.code; return n; });
                      }}
                      disabled={isVerifying}
                      error={!!errors.code}
                    />
                    {errors.code ? (
                      <p className="text-sm text-red-11 font-family-dm-sans">
                        {errors.code}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2 items-center justify-center w-full">
                    <p className="font-medium text-sm leading-[1.3] text-gray-12 font-family-dm-sans">
                      Não recebeu o código?
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
                          : "Reenviar código"}
                    </button>
                  </div>

                  <Button
                    type="submit"
                    disabled={isVerifying || resetCode.length !== 6}
                    className="w-full"
                  >
                    {isVerifying ? "Verificando..." : "Verificar código"}
                  </Button>
                </form>
              </div>
            )}

            {/* Step 3: New Password */}
            {step === "new-password" && (
              <div className="flex flex-col gap-8 items-center w-full">
                <div className="flex flex-col gap-4 items-center text-center">
                  <h1 className="text-xl font-bold text-gray-12 font-manrope leading-[1.1]">
                    Criação da nova senha
                  </h1>
                  <p className="text-base text-gray-11 font-family-dm-sans leading-[1.3]">
                    Crie uma senha forte e segura para sua conta organizador.
                  </p>
                </div>

                <form
                  onSubmit={handleSubmitPassword}
                  className="flex flex-col gap-5 items-end w-full"
                >
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
                        autoComplete="new-password"
                        placeholder="Digite sua nova senha"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (errors.password) setErrors((p) => { const n = { ...p }; delete n.password; return n; });
                        }}
                        className={`pl-10 pr-10 h-12 w-full ${errors.password ? "border-red-11" : ""}`}
                        disabled={isResettingPassword}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-11 hover:text-gray-12 transition-colors"
                        aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                      >
                        {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                      </button>
                    </div>
                    {errors.password ? (
                      <p className="text-sm text-red-11 font-family-dm-sans">{errors.password}</p>
                    ) : null}
                  </div>

                  <div className="flex flex-col gap-2 items-start w-full">
                    <label className="text-base text-gray-12 font-family-dm-sans">
                      Confirmar nova senha
                    </label>
                    <div className="relative w-full">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <Lock className="size-5 text-gray-11" />
                      </div>
                      <Input
                        type={showConfirmPassword ? "text" : "password"}
                        autoComplete="new-password"
                        placeholder="Digite sua senha novamente"
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          if (errors.confirmPassword) setErrors((p) => { const n = { ...p }; delete n.confirmPassword; return n; });
                        }}
                        className={`pl-10 pr-10 h-12 w-full ${errors.confirmPassword ? "border-red-11" : ""}`}
                        disabled={isResettingPassword}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-11 hover:text-gray-12 transition-colors"
                        aria-label={showConfirmPassword ? "Ocultar senha" : "Mostrar senha"}
                      >
                        {showConfirmPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                      </button>
                    </div>
                    {errors.confirmPassword ? (
                      <p className="text-sm text-red-11 font-family-dm-sans">{errors.confirmPassword}</p>
                    ) : null}
                  </div>

                  <Button
                    type="submit"
                    disabled={isResettingPassword || !password.trim() || !confirmPassword.trim()}
                    className="w-full"
                  >
                    {isResettingPassword ? "Salvando..." : "Criar nova senha"}
                  </Button>
                </form>
              </div>
            )}

            {/* Step 4: Success */}
            {step === "success" && (
              <div className="flex flex-col gap-11 items-center w-full">
                <div className="flex flex-col gap-4 items-center text-center w-full">
                  <div className="flex gap-2.5 items-center p-5 relative">
                    <SuccessIcon className="size-[67px]" />
                  </div>
                  <div className="flex flex-col gap-4 items-center text-center">
                    <h1 className="text-xl font-extrabold text-gray-12 font-manrope leading-[1.1]">
                      Senha redefinida com sucesso!
                    </h1>
                    <p className="text-base text-gray-11 font-family-dm-sans leading-[1.3]">
                      Sua senha foi atualizada. Você já pode acessar a plataforma
                      com suas novas credenciais.
                    </p>
                  </div>
                </div>
                <Button onClick={() => orgNav.push("/organizer/login")} className="w-full">
                  Entrar na plataforma
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
