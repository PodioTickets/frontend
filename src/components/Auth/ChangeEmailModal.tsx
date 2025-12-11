"use client";

import React, { useState, useRef, useEffect } from "react";
import { useChangeEmailModal } from "@/stores/modalStore";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/Button";
import { X, ChevronLeft, Mail, ArrowUp } from "lucide-react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/utils/cn";
import Image from "next/image";

export function ChangeEmailModal() {
  const { isOpen, closeChangeEmailModal } = useChangeEmailModal();
  const { user } = useAuth();

  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [code, setCode] = useState<string[]>(["", "", "", "", "", ""]);
  const [newEmail, setNewEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailError, setEmailError] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const emailInputRef = useRef<HTMLInputElement>(null);

  const maskEmail = (email: string): string => {
    if (!email) return "";
    const [localPart, domain] = email.split("@");
    if (localPart.length <= 1) return email;
    const masked = localPart[0] + "*".repeat(Math.min(localPart.length - 1, 6));
    return `${masked}@${domain}`;
  };

  const handleCodeChange = (index: number, value: string) => {
    // Only allow single digit
    if (value.length > 1) return;

    // Only allow numbers
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

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

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleCodeSubmit = async () => {
    const codeString = code.join("");

    if (codeString.length !== 6) {
      toast.error("Por favor, preencha todos os dígitos do código");
      return;
    }

    setIsSubmitting(true);

    // TODO: Implement API call to verify code
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      // Advance to step 2
      setStep(2);
      setIsSubmitting(false);
      setTimeout(() => {
        emailInputRef.current?.focus();
      }, 100);
    } catch (error) {
      toast.error("Código inválido. Tente novamente.");
      setCode(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
      setIsSubmitting(false);
    }
  };

  const handleNewEmailSubmit = async () => {
    if (!newEmail) {
      setEmailError("Email é obrigatório");
      return;
    }

    if (!validateEmail(newEmail)) {
      setEmailError("Email inválido");
      return;
    }

    if (newEmail === user?.email) {
      setEmailError("O novo email deve ser diferente do atual");
      return;
    }

    setIsSubmitting(true);

    // TODO: Implement API call to change email
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success("Email alterado com sucesso!");
      closeChangeEmailModal();
      resetForm();
    } catch (error) {
      toast.error("Erro ao alterar email. Tente novamente.");
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setStep(0);
    setCode(["", "", "", "", "", ""]);
    setNewEmail("");
    setEmailError("");
  };

  const handleContinue = () => {
    setStep(1);
    setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 100);
  };

  const handleResendCode = async () => {
    // TODO: Implement API call to resend code
    toast.success("Código reenviado!");
  };

  const handleClose = () => {
    closeChangeEmailModal();
    resetForm();
  };

  const handleCancel = () => {
    if (step === 2) {
      setStep(1);
      setNewEmail("");
      setEmailError("");
    } else if (step === 1) {
      setStep(0);
      setCode(["", "", "", "", "", ""]);
    } else {
      handleClose();
    }
  };

  const handleBack = () => {
    setStep(1);
    setNewEmail("");
    setEmailError("");
  };

  const handleNewEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewEmail(e.target.value);
    if (emailError) {
      setEmailError("");
    }
  };

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen]);

  // Focus inputs when step changes
  useEffect(() => {
    if (step === 1) {
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    } else if (step === 2) {
      setTimeout(() => {
        emailInputRef.current?.focus();
      }, 100);
    }
  }, [step]);

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
              {step === 0 ? (
                <motion.div
                  key="step0"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col gap-[44px] items-center justify-center p-5 w-full"
                >
                  {/* Top Section */}
                  <div className="flex flex-col gap-6 items-center w-full">
                    {/* Icon */}
                    <Image
                      src="/images/change_email.png"
                      alt="Email Change"
                      width={116}
                      height={88}
                      draggable={false}
                    />

                    {/* Content */}
                    <div className="flex flex-col gap-4 items-center justify-center w-full">
                      <h2 className="font-semibold text-[20px] leading-[1.3] text-gray-12 font-dm-sans text-center">
                        Deseja alterar seu email?
                      </h2>
                      <p className="font-normal text-base leading-[1.3] text-gray-11 font-dm-sans text-center w-full">
                        Você usa este e-mail para entrar no PódioTicket e
                        receber confirmações de inscrição. Ao continuar, será
                        preciso informar e validar um novo email
                      </p>
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-2 items-start w-full">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleClose}
                      className="flex-1 h-12 px-5 border-[1.5px] border-gray-6 text-gray-12 font-bold text-base leading-[1.1] font-manrope"
                    >
                      Fechar
                    </Button>
                    <Button
                      type="button"
                      onClick={handleContinue}
                      className="flex-1 h-12 px-5 bg-[#59E373] text-[#141414] hover:bg-[#59E373]/90 font-bold text-base leading-[1.1] font-manrope"
                    >
                      Alterar email
                    </Button>
                  </div>
                </motion.div>
              ) : step === 1 ? (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                  className="w-full"
                >
                  {/* Header */}
                  <div className="border-b border-gray-6 flex items-center justify-between p-4 w-full">
                    <h2 className="font-semibold text-[20px] leading-[1.3] text-gray-12 font-dm-sans">
                      Confirme seu e-mail atual
                    </h2>
                    <button
                      onClick={handleClose}
                      className="flex items-center justify-center rounded-lg w-8 h-8 hover:bg-gray-3 transition-colors"
                    >
                      <X className="w-5 h-5 text-gray-11" />
                    </button>
                  </div>

                  {/* Content */}
                  <div className="flex flex-col items-start w-full">
                    {/* Inputs Section */}
                    <div className="flex flex-col gap-8 items-start pb-6 pt-4 px-6 w-full">
                      {/* Instruction Text */}
                      <p className="font-medium text-base leading-[1.3] text-gray-12 font-dm-sans w-full">
                        Enviamos um código de 6 dígitos para{" "}
                        {maskEmail(user?.email || "")}. Digite o código abaixo
                        para liberar a alteração do seu e-mail.
                      </p>

                      {/* Code Inputs */}
                      <div className="flex flex-col gap-4 items-end justify-center w-full">
                        <div className="flex gap-2 items-center justify-center w-full">
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
                                onChange={(e) =>
                                  handleCodeChange(index, e.target.value)
                                }
                                onKeyDown={(e) => handleKeyDown(index, e)}
                                onPaste={index === 0 ? handlePaste : undefined}
                                className={cn(
                                  "aspect-square bg-gray-2 border-2 border-gray-6 rounded-lg flex items-center justify-center text-center",
                                  "font-semibold text-[28px] leading-[1.1] text-gray-11 font-manrope",
                                  "focus:outline-none focus:border-primary-10 focus:ring-2 focus:ring-primary-10/20",
                                  "transition-all duration-200",
                                  "w-[62px] h-[62px]"
                                )}
                              />
                              {index === 2 && (
                                <div className="bg-gray-6 h-1 rounded-full w-2" />
                              )}
                            </React.Fragment>
                          ))}
                        </div>

                        {/* Resend Code Link */}
                        <button
                          type="button"
                          onClick={handleResendCode}
                          className="text-primary-10 font-semibold text-base leading-[1.3] underline font-dm-sans hover:text-primary-11 transition-colors"
                        >
                          Reenviar código
                        </button>
                      </div>
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-[10px] items-center justify-end pb-8 pt-4 px-6 w-full">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCancel}
                        className="flex-1 h-12 px-8 border-[1.5px] border-gray-6 text-gray-12 font-bold text-[18px] leading-[1.1] font-manrope"
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="button"
                        onClick={handleCodeSubmit}
                        disabled={isSubmitting || code.join("").length !== 6}
                        className="flex-1 h-12 px-8 bg-[#59E373] text-[#141414] hover:bg-[#59E373]/90 font-bold text-[18px] leading-[1.1] font-manrope disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSubmitting ? "Confirmando..." : "Confirmar código"}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="w-full"
                >
                  {/* Header */}
                  <div className="border-b border-gray-6 flex items-center justify-between p-4 w-full">
                    <div className="flex gap-0.5 items-center">
                      <button
                        onClick={handleBack}
                        className="flex items-center justify-center rounded-lg w-8 h-8 hover:bg-gray-3 transition-colors"
                      >
                        <ChevronLeft className="w-5 h-5 text-gray-11" />
                      </button>
                      <h2 className="font-semibold text-[20px] leading-[1.3] text-gray-12 font-dm-sans">
                        Novo email
                      </h2>
                    </div>
                    <button
                      onClick={handleClose}
                      className="flex items-center justify-center rounded-lg w-8 h-8 hover:bg-gray-3 transition-colors"
                    >
                      <X className="w-5 h-5 text-gray-11" />
                    </button>
                  </div>

                  {/* Content */}
                  <div className="flex flex-col items-start w-full">
                    {/* Input Section */}
                    <div className="flex flex-col items-start p-6 w-full">
                      <div className="flex flex-col gap-2 items-start w-full">
                        <label className="font-normal text-base leading-[1.3] text-gray-12 font-dm-sans">
                          Digite o novo e-mail
                        </label>
                        <div className="border border-gray-6 flex gap-2.5 h-12 items-center px-3 rounded-lg w-full">
                          <div className="flex gap-1 items-center flex-1 min-w-0">
                            <Mail className="w-5 h-5 text-gray-11 shrink-0" />
                            <input
                              ref={emailInputRef}
                              type="email"
                              placeholder="Digite seu email"
                              value={newEmail}
                              onChange={handleNewEmailChange}
                              className={cn(
                                "flex-1 border-0 p-0 h-full bg-transparent text-base font-normal text-gray-11 placeholder:text-gray-11 outline-none focus:outline-none",
                                emailError && "text-red-9"
                              )}
                              aria-invalid={!!emailError}
                            />
                          </div>
                          {newEmail &&
                            !emailError &&
                            validateEmail(newEmail) && (
                              <>
                                <span className="text-base font-normal text-white whitespace-nowrap">
                                  Disponível
                                </span>
                                <ArrowUp className="w-5 h-5 text-white shrink-0" />
                              </>
                            )}
                        </div>
                        {emailError && (
                          <p className="text-sm text-red-9 font-dm-sans">
                            {emailError}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-[10px] items-center justify-end pb-8 pt-4 px-6 w-full">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCancel}
                        className="flex-1 h-12 px-8 border-[1.5px] border-gray-6 text-gray-12 font-bold text-[18px] leading-[1.1] font-manrope"
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="button"
                        onClick={handleNewEmailSubmit}
                        disabled={
                          isSubmitting ||
                          !newEmail ||
                          !!emailError ||
                          !validateEmail(newEmail)
                        }
                        className="flex-1 h-12 px-8 bg-[#59E373] text-[#141414] hover:bg-[#59E373]/90 font-bold text-[18px] leading-[1.1] font-manrope disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSubmitting ? "Salvando..." : "Salvar"}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
