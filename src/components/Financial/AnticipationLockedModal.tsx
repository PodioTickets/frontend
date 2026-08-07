"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Zap } from "lucide-react";
import { Button } from "../Button";

/** Link do WhatsApp específico do pedido de liberação de antecipação. */
const ANTICIPATION_WHATSAPP_URL =
  "https://api.whatsapp.com/send/?phone=5511994302713&text=Preciso%20de%20antecipa%C3%A7%C3%A3o%20no%20meu%20evento";

interface AnticipationLockedModalProps {
  onClose: () => void;
}

/**
 * Gate exibido quando o organizador tenta antecipar mas o evento/organização
 * ainda não passou pela análise de antecipação (sem permissão — `quote.enabled
 * === false`). Design do Figma (6306:126246): ícone de raio, título "Antecipe
 * suas vendas", explicação e as ações "Fechar" / "Falar com a equipe" (WhatsApp
 * do suporte). Portal em `document.body` (z-80) por cima do AnticipationModal.
 */
export function AnticipationLockedModal({ onClose }: AnticipationLockedModalProps) {
  // Fecha no Esc.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleContactTeam = () => {
    window.open(ANTICIPATION_WHATSAPP_URL, "_blank", "noopener,noreferrer");
    onClose();
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50"
      style={{ pointerEvents: "auto" }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Antecipe suas vendas"
    >
      <div
        className="w-full max-w-[442px] bg-gray-1 rounded-[16px] shadow-2xl flex flex-col items-center gap-6 px-5 pt-6 pb-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ícone de raio em círculo verde */}
        <div className="size-[72px] rounded-full bg-primary-3 flex items-center justify-center">
          <Zap className="size-8 text-primary-11" fill="currentColor" />
        </div>

        <div className="flex flex-col items-center gap-2 w-full">
          <h2 className="font-family-dm-sans font-semibold text-[20px] leading-[1.3] text-gray-12 text-center">
            Antecipe suas vendas
          </h2>
          <p className="font-family-dm-sans font-normal text-base leading-[1.3] text-gray-11 text-center">
            Antecipe o dinheiro das vendas que ainda não caíram na sua conta. Para usar
            a antecipação, seu evento precisa passar por uma análise rápida do nosso time.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1 h-12 border-gray-6 text-gray-12 font-manrope font-bold"
          >
            Fechar
          </Button>
          <Button
            type="button"
            variant="default"
            onClick={handleContactTeam}
            className="flex-1 h-12 font-manrope font-bold"
          >
            Falar com a equipe
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
