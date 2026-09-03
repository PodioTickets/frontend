"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/Button";
import { cn } from "@/utils/cn";

/**
 * Limites espelhados do backend (`RejectEventDto`). Duplicados aqui de propósito:
 * sem isso o admin só descobriria o mínimo ao tomar um 400 depois de escrever.
 */
export const REJECTION_REASON_MIN = 10;
export const REJECTION_REASON_MAX = 1000;

/**
 * Modal de recusa do evento em revisão (auditoria do admin). O motivo escrito
 * aqui é o que o organizador lê em "Meus eventos" e recebe por e-mail — daí a
 * exigência de um texto minimamente descritivo.
 */
export function RejectEventModal({
  open,
  onClose,
  onConfirm,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  /** Recebe o motivo já trimado. Deve lançar para manter o modal aberto no erro. */
  onConfirm: (reason: string) => Promise<void>;
  loading: boolean;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/90 z-50"
            onClick={loading ? undefined : onClose}
            aria-hidden
          />
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reject-event-modal-title"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gray-1 rounded-xl border border-gray-6 w-full max-w-[442px] flex flex-col overflow-hidden shadow-[0px_2px_6px_rgba(17,17,17,0.25)]"
            >
              {/* Título */}
              <div className="flex items-center justify-between gap-4 border-b border-gray-6 p-4">
                <h2
                  id="reject-event-modal-title"
                  className="font-semibold text-xl leading-[1.3] text-gray-12 font-family-dm-sans"
                >
                  Rejeitar evento
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  aria-label="Fechar"
                  className="size-8 shrink-0 rounded-lg flex items-center justify-center text-gray-12 hover:bg-gray-3 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <X className="size-5" />
                </button>
              </div>

              <RejectEventForm
                onCancel={onClose}
                onConfirm={onConfirm}
                loading={loading}
              />
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

/**
 * Corpo do formulário. Vive num componente separado porque só é montado
 * enquanto o modal está aberto — assim o motivo digitado e abandonado some
 * sozinho no fechamento, sem um efeito de reset.
 */
function RejectEventForm({
  onCancel,
  onConfirm,
  loading,
}: {
  onCancel: () => void;
  onConfirm: (reason: string) => Promise<void>;
  loading: boolean;
}) {
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);

  const trimmed = reason.trim();
  const tooShort = trimmed.length < REJECTION_REASON_MIN;
  const showError = touched && tooShort;

  const handleConfirm = async () => {
    setTouched(true);
    if (tooShort || loading) return;
    await onConfirm(trimmed);
  };

  return (
    <>
      {/* Conteúdo */}
      <div className="flex flex-col gap-8 px-6 pt-4 pb-6">
        <p className="font-normal text-base leading-[1.3] text-gray-11 font-family-dm-sans">
          O organizador receberá esta mensagem. Explique de forma clara o que
          precisa ser corrigido e como fazer a correção. Quanto mais específico,
          mais ágil será a análise.
        </p>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="reject-event-reason"
            className="font-normal text-base leading-[1.3] text-gray-12 font-family-dm-sans"
          >
            Motivo da rejeição
          </label>
          <textarea
            id="reject-event-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value.slice(0, REJECTION_REASON_MAX))}
            onBlur={() => setTouched(true)}
            disabled={loading}
            rows={4}
            maxLength={REJECTION_REASON_MAX}
            placeholder="Ex: O regulamento anexado está em branco, reenvie o PDF."
            aria-invalid={showError}
            className={cn(
              "w-full min-h-[110px] border border-gray-6 rounded-lg px-3 py-4 bg-transparent text-base font-normal leading-[1.3] text-gray-12 font-family-dm-sans outline-none focus:border-primary-9 transition-colors resize-none placeholder:text-gray-11 disabled:opacity-50",
              showError && "border-red-9 focus:border-red-9"
            )}
          />
          {showError && (
            <p className="text-sm text-red-9 font-family-dm-sans">
              Descreva o motivo com pelo menos {REJECTION_REASON_MIN} caracteres.
            </p>
          )}
        </div>
      </div>

      {/* Ações */}
      <div className="flex gap-2.5 items-stretch justify-end px-6 pt-4 pb-8">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={loading}
          className="flex-1 h-12 border border-gray-6 text-gray-12 font-bold text-base font-manrope hover:bg-gray-2"
        >
          Cancelar
        </Button>
        <Button
          variant="destructive"
          onClick={handleConfirm}
          disabled={loading || tooShort}
          className="flex-1 h-12 font-bold text-base font-manrope disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Rejeitando..." : "Rejeitar evento"}
        </Button>
      </div>
    </>
  );
}
