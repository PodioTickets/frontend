"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";
import { OtpCodeInput } from "@/components/OtpCodeInput";
import { userService } from "@/services";
import { cn } from "@/utils/cn";

interface DeleteAccountSectionProps {
  /** E-mail do usuário — exibido na instrução de código */
  userEmail: string;
  /**
   * Chamado após a exclusão ser confirmada com sucesso no backend.
   * O pai deve deslogar (limpar auth) e redirecionar (ex.: home).
   */
  onDeleted: () => void | Promise<void>;
}

type Step = "confirm" | "code";

/** Motivos pré-definidos de exclusão. `outro` libera o campo de texto livre. */
const DELETE_REASONS = [
  { id: "nao-uso", label: "Não uso mais a plataforma" },
  { id: "outra-conta", label: "Criei outra conta" },
  { id: "privacidade", label: "Preocupações com privacidade e dados" },
  { id: "experiencia", label: "Tive uma experiência ruim" },
  { id: "sem-eventos", label: "Não encontro eventos do meu interesse" },
  { id: "outro", label: "Outro motivo" },
] as const;

const OTHER_REASON_MAX = 500;

/**
 * Seção "Excluir conta" (Figma 5654:56720) — abaixo do 2FA no painel do usuário.
 *
 * O TÍTULO "Excluir conta" (sublinhado) é o alvo de clique → abre um modal:
 *   1. Confirmação ("tem certeza?"). SÓ ao confirmar dispara o envio do código
 *      de segurança por e-mail (`send2FACode`).
 *   2. OTP de 6 dígitos → confirma. O backend faz SOFT-DELETE/anonimização,
 *      preservando inscrições e histórico para o organizador (dados em snapshot).
 *
 * Exclusão irreversível para o usuário: por isso o código de e-mail antes de
 * efetivar.
 */
export function DeleteAccountSection({
  userEmail,
  onDeleted,
}: DeleteAccountSectionProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("confirm");
  const [reasonId, setReasonId] = useState("");
  const [otherText, setOtherText] = useState("");
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const busy = sending || deleting;

  // Countdown de reenvio
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  // Trava o scroll do body enquanto o modal está aberto
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const resetState = () => {
    setStep("confirm");
    setReasonId("");
    setOtherText("");
    setCode("");
    setCodeError("");
    setResendCooldown(0);
  };

  // Motivo resolvido enviado ao backend: rótulo da opção, ou o texto livre quando "Outro".
  const isOther = reasonId === "outro";
  const resolvedReason = isOther
    ? otherText.trim()
    : DELETE_REASONS.find((r) => r.id === reasonId)?.label ?? "";
  const reasonValid = resolvedReason.length > 0;

  const openModal = () => {
    resetState();
    setOpen(true);
  };

  const closeModal = () => {
    if (busy) return;
    setOpen(false);
    resetState();
  };

  // Passo 1 → dispara o envio do código e avança para o OTP.
  const handleSendCode = async () => {
    if (!reasonValid) return; // Motivo obrigatório (botão já fica desabilitado).
    setSending(true);
    setCodeError("");
    try {
      await userService.sendAccountDeletionCode();
      setStep("code");
      setCode("");
      setResendCooldown(60);
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      toast.error(message || "Erro ao enviar código. Tente novamente.");
    } finally {
      setSending(false);
    }
  };

  const handleResend = async () => {
    setSending(true);
    setCodeError("");
    try {
      await userService.sendAccountDeletionCode();
      toast.success("Novo código enviado para o seu e-mail.");
      setCode("");
      setResendCooldown(60);
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      toast.error(message || "Erro ao reenviar código.");
    } finally {
      setSending(false);
    }
  };

  // Passo 2 → confirma o código e efetiva a exclusão.
  const handleConfirmDelete = async () => {
    if (code.length < 6) {
      setCodeError("Preencha todos os 6 dígitos do código.");
      return;
    }
    setDeleting(true);
    setCodeError("");
    try {
      await userService.deleteAccount(code, resolvedReason);
      toast.success("Conta excluída. Sentiremos sua falta!");
      setOpen(false);
      await onDeleted();
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      setCodeError(
        message ||
          "Código incorreto ou expirado. Tente novamente ou reenvie um novo código."
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      {/* Cabeçalho — o TÍTULO sublinhado é o alvo de clique (abre o modal) */}
      <div className="flex flex-col items-start w-full gap-[16px]">
        <button
          type="button"
          onClick={openModal}
          className="font-manrope font-bold text-gray-12 underline text-left hover:text-red-11 transition-colors cursor-pointer"
          style={{ fontSize: 20, lineHeight: "22px" }}
        >
          Excluir conta
        </button>
        <p
          className="font-family-dm-sans font-normal text-gray-11 w-full"
          style={{ fontSize: 16, lineHeight: "20.8px" }}
        >
          Esta ação é permanente. Sua conta e seus dados serão removidos e não
          poderão ser recuperados. Suas inscrições e o histórico de compras
          permanecem registrados junto aos organizadores dos eventos.
        </p>
      </div>

      {/* Modal de confirmação / código */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/50 z-[70]"
              style={{ pointerEvents: "auto" }}
              onClick={closeModal}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="fixed inset-0 z-[70] flex items-center justify-center p-4"
              style={{ pointerEvents: "auto" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gray-1 rounded-[12px] w-full max-w-[474px] max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col gap-8 pt-6 pb-5 px-5">
                {step === "confirm" ? (
                  <>
                    <div className="flex flex-col gap-4 items-center w-full">
                      <div className="size-12 rounded-full bg-red-3 flex items-center justify-center shrink-0">
                        <AlertTriangle className="size-6 text-red-11" />
                      </div>
                      <div className="flex flex-col gap-2 items-center w-full">
                        <p className="font-family-dm-sans font-semibold text-[20px] leading-[1.3] text-gray-12 text-center">
                          Excluir sua conta?
                        </p>
                        <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-11 text-center">
                          Esta ação é permanente e não pode ser desfeita. Vamos
                          enviar um código de segurança para{" "}
                          <span className="font-semibold text-gray-12">
                            {userEmail || "seu e-mail"}
                          </span>{" "}
                          para confirmar a exclusão.
                        </p>
                      </div>
                    </div>

                    {/* Motivo da exclusão (obrigatório) */}
                    <div className="flex flex-col gap-3 w-full">
                      <p className="font-family-dm-sans font-semibold text-[16px] leading-[1.3] text-gray-12">
                        Por que você está excluindo sua conta?
                      </p>
                      <div className="flex flex-col gap-2 w-full">
                        {DELETE_REASONS.map((r) => {
                          const selected = reasonId === r.id;
                          return (
                            <button
                              key={r.id}
                              type="button"
                              onClick={() => setReasonId(r.id)}
                              disabled={busy}
                              className={cn(
                                "flex items-center gap-2.5 w-full rounded-[8px] border px-3 py-2.5 text-left transition-colors disabled:opacity-60 disabled:cursor-not-allowed",
                                selected
                                  ? "border-red-9 bg-red-2"
                                  : "border-gray-6 hover:bg-gray-3"
                              )}
                            >
                              <span
                                className={cn(
                                  "size-4 shrink-0 rounded-full border-2 flex items-center justify-center",
                                  selected ? "border-red-9" : "border-gray-7"
                                )}
                              >
                                {selected && (
                                  <span className="size-2 rounded-full bg-red-9" />
                                )}
                              </span>
                              <span className="font-family-dm-sans text-[14px] leading-[1.3] text-gray-12">
                                {r.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      {isOther && (
                        <textarea
                          value={otherText}
                          onChange={(e) =>
                            setOtherText(e.target.value.slice(0, OTHER_REASON_MAX))
                          }
                          disabled={busy}
                          rows={3}
                          autoFocus
                          placeholder="Conte pra gente o motivo…"
                          className="w-full resize-none rounded-[8px] border border-gray-6 bg-gray-1 px-3 py-2.5 text-[14px] text-gray-12 placeholder:text-gray-11 font-family-dm-sans outline-none focus-visible:border-gray-8"
                        />
                      )}
                    </div>

                    <div className="flex gap-2 items-center w-full">
                      <button
                        type="button"
                        onClick={closeModal}
                        disabled={busy}
                        className="flex-1 h-12 rounded-[8px] border border-gray-6 font-sans font-semibold text-gray-12 hover:bg-gray-3 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleSendCode}
                        disabled={busy || !reasonValid}
                        className="flex-1 h-12 rounded-[8px] bg-red-9 font-sans font-semibold text-white hover:bg-red-10 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {sending ? "Enviando..." : "Excluir conta"}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex flex-col gap-3 items-center w-full">
                      <p className="font-family-dm-sans font-semibold text-[20px] leading-[1.3] text-gray-12 text-center">
                        Confirme a exclusão
                      </p>
                      <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-11 text-center">
                        Enviamos um código de segurança para{" "}
                        <span className="font-semibold text-gray-12">
                          {userEmail || "seu e-mail"}
                        </span>
                        . Insira-o abaixo para excluir sua conta.
                      </p>
                    </div>

                    <div className="flex flex-col gap-4 items-center w-full">
                      <OtpCodeInput
                        value={code}
                        onChange={(v) => {
                          setCode(v);
                          setCodeError("");
                        }}
                        disabled={busy}
                        error={!!codeError}
                        autoFocus
                        showSeparator={false}
                      />

                      {codeError && (
                        <p className="font-family-dm-sans text-red-9 text-center text-[14px] leading-[1.3]">
                          {codeError}
                        </p>
                      )}

                      <button
                        type="button"
                        onClick={handleResend}
                        disabled={busy || resendCooldown > 0}
                        className="font-family-dm-sans text-gray-11 hover:text-gray-12 underline text-[14px] disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {sending
                          ? "Reenviando..."
                          : resendCooldown > 0
                            ? `Reenviar código em ${resendCooldown}s`
                            : "Reenviar código"}
                      </button>
                    </div>

                    <div className="flex gap-2 items-center w-full">
                      <button
                        type="button"
                        onClick={closeModal}
                        disabled={busy}
                        className="flex-1 h-12 rounded-[8px] border border-gray-6 font-sans font-semibold text-gray-12 hover:bg-gray-3 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmDelete}
                        disabled={busy || code.length < 6}
                        className="flex-1 h-12 rounded-[8px] bg-red-9 font-sans font-semibold text-white hover:bg-red-10 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {deleting ? "Excluindo..." : "Excluir conta"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
