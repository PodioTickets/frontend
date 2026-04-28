"use client";

import React, { useState, useRef, useEffect } from "react";
import { useChangeEmailModal } from "@/stores/modalStore";
import { useAuth } from "@/hooks/useAuth";
import { userService } from "@/services";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { X, ChevronLeft, Mail, Lock, Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/utils/cn";
import Image from "next/image";

type Step = "confirm" | "form" | "code" | "success";

export function ChangeEmailModal() {
  const { isOpen, closeChangeEmailModal } = useChangeEmailModal();
  const { user, refetchUser } = useAuth();

  const [step, setStep] = useState<Step>("confirm");
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState<{ newEmail?: string; currentPassword?: string }>({});

  const [code, setCode] = useState<string[]>(["", "", "", "", "", ""]);
  const [codeError, setCodeError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const emailInputRef = useRef<HTMLInputElement>(null);

  const cooldownActive = resendCooldown > 0;
  useEffect(() => {
    if (!cooldownActive) return;
    const id = setInterval(() => setResendCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldownActive]);

  useEffect(() => {
    if (!isOpen) resetForm();
  }, [isOpen]);

  useEffect(() => {
    if (step === "code") setTimeout(() => inputRefs.current[0]?.focus(), 100);
    if (step === "form") setTimeout(() => emailInputRef.current?.focus(), 100);
  }, [step]);

  const resetForm = () => {
    setStep("confirm");
    setNewEmail("");
    setCurrentPassword("");
    setShowPassword(false);
    setFormErrors({});
    setCode(["", "", "", "", "", ""]);
    setCodeError("");
    setResendCooldown(0);
    setIsSubmitting(false);
    setIsResending(false);
  };

  const handleClose = () => {
    closeChangeEmailModal();
    resetForm();
  };

  // Step 1: submit new email + password → API sends code to new email
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { newEmail?: string; currentPassword?: string } = {};

    if (!newEmail.trim()) errors.newEmail = "E-mail é obrigatório";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) errors.newEmail = "E-mail inválido";
    else if (newEmail.toLowerCase() === user?.email?.toLowerCase())
      errors.newEmail = "O novo e-mail deve ser diferente do atual";

    if (!currentPassword.trim()) errors.currentPassword = "Senha é obrigatória";

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      await userService.changeEmail({ newEmail: newEmail.trim().toLowerCase(), currentPassword });
      setCode(["", "", "", "", "", ""]);
      setCodeError("");
      setResendCooldown(60);
      setStep("code");
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Erro ao solicitar troca de e-mail.";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2: verify 6-digit code
  const handleCodeSubmit = async () => {
    const codeStr = code.join("");
    if (codeStr.length !== 6) {
      setCodeError("Preencha todos os 6 dígitos");
      return;
    }
    setIsSubmitting(true);
    try {
      await userService.verifyEmailChange(codeStr);
      setStep("success");
      refetchUser().catch(() => {});
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Código inválido ou expirado.";
      toast.error(msg);
      setCode(["", "", "", "", "", ""]);
      setCodeError(msg);
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || isSubmitting || isResending) return;
    setIsResending(true);
    try {
      await userService.changeEmail({ newEmail: newEmail.trim().toLowerCase(), currentPassword });
      setResendCooldown(60);
      setCode(["", "", "", "", "", ""]);
      setCodeError("");
      toast.success("Código reenviado!");
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Erro ao reenviar código.";
      toast.error(msg);
    } finally {
      setIsResending(false);
    }
  };

  // 6-digit code input handlers
  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1 || (value && !/^\d$/.test(value))) return;
    const next = [...code];
    next[index] = value;
    setCode(next);
    setCodeError("");
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleCodePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6).split("");
    if (!digits.length) return;
    const next = [...code];
    digits.forEach((d, i) => { if (i < 6) next[i] = d; });
    setCode(next);
    const focusIdx = next.findIndex((v) => !v);
    inputRefs.current[focusIdx === -1 ? 5 : focusIdx]?.focus();
  };

  const maskEmail = (email: string) => {
    if (!email) return "";
    const [local, domain] = email.split("@");
    return `${local[0]}${"*".repeat(Math.min(local.length - 1, 6))}@${domain}`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-99999 flex items-center justify-center bg-black/50"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            className="bg-gray-1 rounded-xl shadow-2xl w-full max-w-[460px] mx-4 relative overflow-hidden"
          >
            <AnimatePresence mode="wait">

              {/* Step 0: Confirm */}
              {step === "confirm" && (
                <motion.div
                  key="confirm"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col gap-11 items-center justify-center p-5 w-full"
                >
                  <div className="flex flex-col gap-6 items-center w-full">
                    <Image
                      src="/images/change_email.png"
                      alt="Email Change"
                      width={116}
                      height={88}
                      draggable={false}
                    />
                    <div className="flex flex-col gap-4 items-center w-full">
                      <h2 className="font-semibold text-[20px] leading-[1.3] text-gray-12 font-family-dm-sans text-center">
                        Deseja alterar seu e-mail?
                      </h2>
                      <p className="font-normal text-base leading-[1.3] text-gray-11 font-family-dm-sans text-center">
                        Você usa este e-mail para entrar no PódioTicket e receber
                        confirmações de inscrição. Ao continuar, informe o novo
                        e-mail e sua senha atual.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 items-start w-full">
                    <Button
                      variant="outline"
                      onClick={handleClose}
                      className="flex-1 h-12 px-5 border-[1.5px] border-gray-6 text-gray-12 font-bold text-base leading-[1.1] font-manrope"
                    >
                      Fechar
                    </Button>
                    <Button
                      onClick={() => setStep("form")}
                      className="flex-1 h-12 px-5 bg-[#59E373] text-[#141414] hover:bg-[#59E373]/90 font-bold text-base leading-[1.1] font-manrope"
                    >
                      Alterar e-mail
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Step 1: New email + password */}
              {step === "form" && (
                <motion.div
                  key="form"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="w-full"
                >
                  <div className="border-b border-gray-6 flex items-center justify-between p-4 w-full">
                    <div className="flex gap-0.5 items-center">
                      <button
                        onClick={() => setStep("confirm")}
                        className="flex items-center justify-center rounded-lg w-8 h-8 hover:bg-gray-3 transition-colors"
                        aria-label="Voltar"
                      >
                        <ChevronLeft className="w-5 h-5 text-gray-11" />
                      </button>
                      <h2 className="font-semibold text-[20px] leading-[1.3] text-gray-12 font-family-dm-sans">
                        Novo e-mail
                      </h2>
                    </div>
                    <button
                      onClick={handleClose}
                      className="flex items-center justify-center rounded-lg w-8 h-8 hover:bg-gray-3 transition-colors"
                      aria-label="Fechar"
                    >
                      <X className="w-5 h-5 text-gray-11" />
                    </button>
                  </div>

                  <form onSubmit={handleFormSubmit} className="flex flex-col w-full">
                    <div className="flex flex-col gap-5 p-6 w-full">
                      {/* New email */}
                      <div className="flex flex-col gap-2 w-full">
                        <label className="font-normal text-base leading-[1.3] text-gray-12 font-family-dm-sans">
                          Novo e-mail
                        </label>
                        <div className="relative w-full">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-11 pointer-events-none" />
                          <Input
                            ref={emailInputRef}
                            type="email"
                            autoComplete="email"
                            placeholder="novo@email.com"
                            value={newEmail}
                            onChange={(e) => {
                              setNewEmail(e.target.value);
                              if (formErrors.newEmail) setFormErrors((p) => ({ ...p, newEmail: undefined }));
                            }}
                            className={cn("pl-10 h-12 w-full", formErrors.newEmail && "border-red-9 focus-visible:border-red-9")}
                          />
                        </div>
                        {formErrors.newEmail && (
                          <p className="text-sm text-red-9 font-family-dm-sans">{formErrors.newEmail}</p>
                        )}
                      </div>

                      {/* Current password */}
                      <div className="flex flex-col gap-2 w-full">
                        <label className="font-normal text-base leading-[1.3] text-gray-12 font-family-dm-sans">
                          Senha atual
                        </label>
                        <div className="relative w-full">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-11 pointer-events-none" />
                          <Input
                            type={showPassword ? "text" : "password"}
                            autoComplete="current-password"
                            placeholder="Digite sua senha atual"
                            value={currentPassword}
                            onChange={(e) => {
                              setCurrentPassword(e.target.value);
                              if (formErrors.currentPassword) setFormErrors((p) => ({ ...p, currentPassword: undefined }));
                            }}
                            className={cn("pl-10 pr-10 h-12 w-full", formErrors.currentPassword && "border-red-9 focus-visible:border-red-9")}
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
                        {formErrors.currentPassword && (
                          <p className="text-sm text-red-9 font-family-dm-sans">{formErrors.currentPassword}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 pb-8 pt-2 px-6 w-full">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setStep("confirm")}
                        className="flex-1 h-12 border-[1.5px] border-gray-6 text-gray-12 font-bold text-base font-manrope"
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex-1 h-12 bg-[#59E373] text-[#141414] hover:bg-[#59E373]/90 font-bold text-base font-manrope disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSubmitting ? "Enviando..." : "Enviar código"}
                      </Button>
                    </div>
                  </form>
                </motion.div>
              )}

              {/* Step 2: Enter code */}
              {step === "code" && (
                <motion.div
                  key="code"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="w-full"
                >
                  <div className="border-b border-gray-6 flex items-center justify-between p-4 w-full">
                    <div className="flex gap-0.5 items-center">
                      <button
                        onClick={() => { setStep("form"); setCode(["","","","","",""]); setCodeError(""); }}
                        className="flex items-center justify-center rounded-lg w-8 h-8 hover:bg-gray-3 transition-colors"
                        aria-label="Voltar"
                      >
                        <ChevronLeft className="w-5 h-5 text-gray-11" />
                      </button>
                      <h2 className="font-semibold text-[20px] leading-[1.3] text-gray-12 font-family-dm-sans">
                        Confirme seu e-mail
                      </h2>
                    </div>
                    <button
                      onClick={handleClose}
                      className="flex items-center justify-center rounded-lg w-8 h-8 hover:bg-gray-3 transition-colors"
                      aria-label="Fechar"
                    >
                      <X className="w-5 h-5 text-gray-11" />
                    </button>
                  </div>

                  <div className="flex flex-col items-start w-full">
                    <div className="flex flex-col gap-6 items-start pb-6 pt-4 px-6 w-full">
                      <p className="font-medium text-base leading-[1.3] text-gray-12 font-family-dm-sans">
                        Enviamos um código de 6 dígitos para{" "}
                        <span className="font-bold">{maskEmail(user?.email || "")}</span>.
                        Digite-o abaixo para confirmar a troca.
                      </p>

                      <div className="flex flex-col gap-3 items-end w-full">
                        <div className="flex gap-2 items-center justify-center w-full">
                          {code.map((digit, index) => (
                            <React.Fragment key={index}>
                              <input
                                ref={(el) => { inputRefs.current[index] = el; }}
                                type="text"
                                inputMode="numeric"
                                maxLength={1}
                                value={digit}
                                onChange={(e) => handleCodeChange(index, e.target.value)}
                                onKeyDown={(e) => handleCodeKeyDown(index, e)}
                                onPaste={index === 0 ? handleCodePaste : undefined}
                                disabled={isSubmitting}
                                className={cn(
                                  "w-[62px] h-[62px] aspect-square bg-gray-2 border-2 rounded-lg text-center",
                                  "font-semibold text-[28px] leading-[1.1] text-gray-11 font-manrope",
                                  "focus:outline-none focus:border-primary-10 focus:ring-2 focus:ring-primary-10/20",
                                  "transition-all duration-200 disabled:opacity-50",
                                  codeError ? "border-red-9" : "border-gray-6"
                                )}
                              />
                              {index === 2 && (
                                <div className="bg-gray-6 h-1 rounded-full w-2 shrink-0" />
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                        {codeError && (
                          <p className="text-sm text-red-9 font-family-dm-sans w-full">{codeError}</p>
                        )}
                        <button
                          type="button"
                          onClick={handleResend}
                          disabled={resendCooldown > 0 || isSubmitting || isResending}
                          className="text-primary-10 font-semibold text-base leading-[1.3] underline font-family-dm-sans hover:text-primary-11 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isResending ? "Reenviando..." : resendCooldown > 0 ? `Reenviar em ${resendCooldown}s` : "Reenviar código"}
                        </button>
                      </div>
                    </div>

                    <div className="flex gap-2 items-center pb-8 pt-4 px-6 w-full">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => { setStep("form"); setCode(["","","","","",""]); setCodeError(""); }}
                        className="flex-1 h-12 border-[1.5px] border-gray-6 text-gray-12 font-bold text-base font-manrope"
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="button"
                        onClick={handleCodeSubmit}
                        disabled={isSubmitting || code.join("").length !== 6}
                        className="flex-1 h-12 bg-[#59E373] text-[#141414] hover:bg-[#59E373]/90 font-bold text-base font-manrope disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSubmitting ? "Confirmando..." : "Confirmar código"}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Success */}
              {step === "success" && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col gap-11 items-center justify-center p-5 w-full"
                >
                  <div className="flex flex-col gap-6 items-center w-full">
                    <Image
                      src="/images/change_email.png"
                      alt="E-mail alterado"
                      width={116}
                      height={88}
                      draggable={false}
                    />
                    <div className="flex flex-col gap-4 items-center w-full">
                      <h2 className="font-semibold text-[20px] leading-[1.3] text-gray-12 font-family-dm-sans text-center">
                        E-mail alterado com sucesso!
                      </h2>
                      <p className="font-normal text-base leading-[1.3] text-gray-11 font-family-dm-sans text-center">
                        Seu e-mail foi atualizado para{" "}
                        <span className="font-bold text-gray-12">{newEmail}</span>.
                        Use-o no próximo login.
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={handleClose}
                    className="w-full h-12 font-bold text-base font-manrope"
                  >
                    Fechar
                  </Button>
                </motion.div>
              )}

            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
