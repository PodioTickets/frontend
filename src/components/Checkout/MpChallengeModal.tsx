"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import type { PixPollStatusResponse } from "@/interfaces/order";

/**
 * Desafio 3DS do Mercado Pago (cartão de DÉBITO).
 *
 * O MP devolveu `pending_challenge` + {externalResourceUrl, creq}: o banco
 * exige autenticação. Renderizamos um iframe e submetemos um form POST com o
 * `creq` para a URL do desafio (contrato oficial do MP). O resultado NÃO chega
 * pelo iframe de forma confiável — a confirmação real vem do backend, por
 * polling em `GET /payments/order/:id/mp-debit-status` (que reconsulta o MP e
 * finaliza o pedido) a cada 3s, com escuta de postMessage como acelerador.
 *
 * z-[100000]: acima do fluxo de checkout, mesmo padrão dos outros modais.
 */
const POLL_INTERVAL_MS = 3000;
const CHALLENGE_TIMEOUT_MS = 5 * 60 * 1000;

interface MpChallengeModalProps {
  isOpen: boolean;
  challenge: { externalResourceUrl: string; creq: string } | null;
  /** Polling do backend — injetado pelo PaymentStep (useCheckoutReservation.getMpDebitStatus). */
  pollStatus: () => Promise<PixPollStatusResponse>;
  onSuccess: () => void;
  /** Recusa/erro/timeout — o caller decide entre modal de recusa e toast. */
  onFailure: (reason: "REFUSED" | "TIMEOUT" | "CANCELLED") => void;
}

export function MpChallengeModal({
  isOpen,
  challenge,
  pollStatus,
  onSuccess,
  onFailure,
}: MpChallengeModalProps) {
  const formRef = useRef<HTMLFormElement>(null);
  // Guards de ciclo de vida: evita poll/decisão dupla (unmount, sucesso+timeout etc).
  const settledRef = useRef(false);

  // Trava scroll do body enquanto aberto (mesmo padrão dos outros modais).
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  // Orders API: challenge SEM creq — a URL é autocontida e vai direto no src
  // do iframe. Legado (/v1/payments): URL + creq via form POST no iframe.
  const isUrlOnly = !!challenge && !challenge.creq;

  useEffect(() => {
    if (!isOpen || !challenge) return;
    settledRef.current = false;

    // Fluxo legado (creq): submete o form do desafio para dentro do iframe.
    const submitTimer = isUrlOnly
      ? null
      : setTimeout(() => formRef.current?.submit(), 50);

    const settle = (fn: () => void) => {
      if (settledRef.current) return;
      settledRef.current = true;
      fn();
    };

    let pollTimer: ReturnType<typeof setInterval> | null = null;
    const poll = async () => {
      try {
        const result = await pollStatus();
        if (result.paid) {
          settle(onSuccess);
        } else if (result.status === "FAILED" || result.status === "REFUNDED") {
          settle(() => onFailure("REFUSED"));
        }
      } catch {
        // Erro transitório de rede — o próximo tick tenta de novo.
      }
    };
    pollTimer = setInterval(poll, POLL_INTERVAL_MS);

    // Acelerador: o ACS/MP posta mensagens quando o desafio conclui — dispara
    // um poll imediato em qualquer message (a fonte de verdade segue o backend).
    const onMessage = () => void poll();
    window.addEventListener("message", onMessage);

    const timeoutTimer = setTimeout(() => settle(() => onFailure("TIMEOUT")), CHALLENGE_TIMEOUT_MS);

    return () => {
      if (submitTimer) clearTimeout(submitTimer);
      clearTimeout(timeoutTimer);
      if (pollTimer) clearInterval(pollTimer);
      window.removeEventListener("message", onMessage);
    };
  }, [isOpen, challenge, isUrlOnly, pollStatus, onSuccess, onFailure]);

  const handleCancel = () => {
    if (settledRef.current) return;
    settledRef.current = true;
    onFailure("CANCELLED");
  };

  return (
    <AnimatePresence>
      {isOpen && challenge && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/60 p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="bg-gray-1 rounded-xl shadow-2xl w-full max-w-[480px] h-[640px] max-h-[90vh] flex flex-col overflow-hidden"
          >
            <div className="border-b border-gray-6 flex items-center justify-between px-4 py-3 shrink-0 w-full">
              <p className="font-family-dm-sans font-semibold text-base leading-[1.3] text-gray-12">
                Autenticação do banco
              </p>
              <button
                onClick={handleCancel}
                className="flex items-center justify-center rounded-lg size-8 transition-colors cursor-pointer hover:bg-gray-3 shrink-0"
                aria-label="Cancelar autenticação"
              >
                <X className="size-5 text-gray-12" />
              </button>
            </div>

            <div className="px-4 py-2 shrink-0">
              <p className="text-xs text-gray-11 font-family-dm-sans leading-[1.4]">
                Seu banco pediu uma verificação extra para este débito. Conclua a
                autenticação abaixo — a confirmação é automática.
              </p>
            </div>

            <div className="flex-1 bg-white">
              <iframe
                name="mp-3ds-challenge"
                title="Autenticação 3DS do banco"
                className="w-full h-full border-0"
                {...(isUrlOnly ? { src: challenge.externalResourceUrl } : {})}
              />
              {/* Fluxo legado (creq): form POST oficial do desafio — target no iframe. */}
              {!isUrlOnly && (
                <form
                  ref={formRef}
                  method="post"
                  action={challenge.externalResourceUrl}
                  target="mp-3ds-challenge"
                  className="hidden"
                >
                  <input type="hidden" name="creq" value={challenge.creq} />
                </form>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
