"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail } from "lucide-react";
import { Button } from "../Button";
import { Input } from "@/components/Input";
import { cn } from "@/utils/cn";

interface ResendTicketsModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Dispara o reenvio para o e-mail validado. O parent controla `loading`. */
  onConfirm: (email: string) => void;
  loading?: boolean;
  /** Quantidade de ingressos do pedido (texto dinâmico singular/plural). */
  ticketCount: number;
}

// Validação leve no client (a verdade é o backend). Mesmo regex do ChangeEmailModal.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Reenvio do e-mail do pedido (organizador): todos os ingressos + comprovante
 * para o endereço informado. Overlay próprio (z-70) por cima do conteúdo do
 * PaymentDetailsModal (z-61) — controlado por estado local, não pelo modalStore
 * (que é single-modal). Espelha o CancelOrderModal.
 */
export function ResendTicketsModal({
  isOpen,
  onClose,
  onConfirm,
  loading = false,
  ticketCount,
}: ResendTicketsModalProps) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | undefined>();
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset ao abrir + foco no campo.
  useEffect(() => {
    if (isOpen) {
      setEmail("");
      setError(undefined);
      const id = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(id);
    }
  }, [isOpen]);

  const handleConfirm = () => {
    if (loading) return;
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setError("E-mail é obrigatório");
      return;
    }
    if (!EMAIL_REGEX.test(trimmed)) {
      setError("E-mail inválido");
      return;
    }
    onConfirm(trimmed);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-[70]"
            style={{ pointerEvents: "auto" }}
            onClick={loading ? undefined : onClose}
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
            <div className="bg-gray-1 rounded-[12px] w-full max-w-[474px] shadow-2xl flex flex-col gap-8 pt-6 pb-5 px-5">
              <div className="flex flex-col gap-6 w-full">
                <div className="flex flex-col gap-2 items-center w-full">
                  <p className="font-family-dm-sans font-semibold text-[20px] leading-[1.3] text-gray-12 text-center">
                    Reenviar ingressos e comprovante
                  </p>
                  <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-11 text-center w-[85%]">
                    Reenvie o ingresso e o comprovante de pagamento para o e-mail do participante.
                  </p>
                </div>

                <div className="flex flex-col gap-2 w-full">
                  <label
                    htmlFor="resend-email"
                    className="font-family-dm-sans font-normal text-base leading-[1.3] text-gray-12"
                  >
                    E-mail de destino
                  </label>
                  <div className="relative w-full">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-11 pointer-events-none" />
                    <Input
                      id="resend-email"
                      ref={inputRef}
                      type="email"
                      autoComplete="email"
                      placeholder="destino@email.com"
                      value={email}
                      disabled={loading}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (error) setError(undefined);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleConfirm();
                      }}
                      className={cn(
                        "pl-10 h-12 w-full",
                        error && "border-red-9 focus-visible:border-red-9",
                      )}
                    />
                  </div>
                  {error && (
                    <p className="text-sm text-red-9 font-family-dm-sans">
                      {error}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-2 items-center w-full">
                <Button
                  variant="outline"
                  onClick={onClose}
                  disabled={loading}
                  className="flex-1 h-12 border-gray-6 text-gray-12"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleConfirm}
                  isLoading={loading}
                  className="flex-1 h-12"
                >
                  Reenviar
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
