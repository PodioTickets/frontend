"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/Button";
import { ArrowButton } from "@/components/ArrowButton";
import { LegalDocumentBody } from "@/components/LegalDocument";
import { termsOfUse } from "@/data/termsOfUse";

/* Mesmo conteúdo da página /terms; o "h1" vira o título do header do modal. */
const termsBlocks = termsOfUse.filter((b) => b.type !== "h1");

/**
 * Modal de Termos de Uso da PódioTicket.
 *
 * Renderiza em z-index acima do RegisterModal (z-[100000]) pra abrir em
 * paralelo — usuário lê e clica "Aceitar termos" pra confirmar e voltar
 * pro fluxo de cadastro com o checkbox marcado.
 *
 * Conteúdo: os mesmos blocos da página /terms (`@/data/termsOfUse`),
 * renderizados via `LegalDocumentBody` — substitui o PDF antigo
 * (`/termos-comprador.pdf` + pdf.js).
 */

interface TermsOfServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
}

export function TermsOfServiceModal({
  isOpen,
  onClose,
  onAccept,
}: TermsOfServiceModalProps) {
  // Trava scroll do body enquanto aberto — evita scroll duplo (modal + página).
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  const handleAccept = () => {
    onAccept();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Mobile: fullscreen */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden fixed inset-0 z-[100000] bg-gray-1 flex flex-col"
          >
            <div className="border-b border-gray-6 flex items-center justify-between h-[52px] px-4 py-2 shrink-0 w-full">
              <div className="flex gap-2 items-center flex-1 min-w-0">
                <button
                  onClick={onClose}
                  className="flex items-center justify-center rounded-lg shrink-0 size-8 transition-colors rotate-90 cursor-pointer hover:bg-gray-3"
                  aria-label="Voltar"
                >
                  <ArrowButton isOpen={true} />
                </button>
                <p className="font-family-dm-sans font-semibold text-base leading-[1.3] text-gray-12 truncate">
                  Termos de uso
                </p>
              </div>
              <button
                onClick={onClose}
                className="flex items-center justify-center rounded-lg size-8 transition-colors cursor-pointer hover:bg-gray-3 shrink-0"
                aria-label="Fechar"
              >
                <X className="size-5 text-gray-12" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-gray-2 px-4 py-5">
              <div className="flex flex-col gap-6 font-family-dm-sans">
                <LegalDocumentBody blocks={termsBlocks} />
              </div>
            </div>

            <div className="bg-gray-1 border-t border-gray-6 px-4 py-4 shrink-0 w-full">
              <Button
                onClick={handleAccept}
                className="w-full h-12"
              >
                Aceitar termos
              </Button>
            </div>
          </motion.div>

          {/* Desktop: dialog centralizado em z-index acima do RegisterModal */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="hidden md:flex fixed inset-0 z-[100000] items-center justify-center bg-black/50 p-4"
            onClick={onClose}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gray-1 rounded-xl shadow-2xl w-full max-w-[688px] h-[674px] flex flex-col overflow-hidden"
            >
              <div className="border-b border-gray-6 flex items-center justify-between px-4 py-3 shrink-0 w-full">
                <div className="flex gap-0.5 items-center flex-1 min-w-0">
                  <button
                    onClick={onClose}
                    className="flex items-center justify-center rounded-lg shrink-0 size-8 transition-colors rotate-90 cursor-pointer hover:bg-gray-3"
                    aria-label="Voltar"
                  >
                    <ArrowButton isOpen={true} />
                  </button>
                  <p className="font-family-dm-sans font-semibold text-xl leading-[1.3] text-gray-12">
                    Termos de uso
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="flex items-center justify-center rounded-lg size-8 transition-colors cursor-pointer hover:bg-gray-3 shrink-0"
                  aria-label="Fechar"
                >
                  <X className="size-5 text-gray-12" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto bg-gray-2 p-6 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-gray-8 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-gray-4 [&::-webkit-scrollbar-track]:rounded-full">
                <div className="flex flex-col gap-6 font-family-dm-sans">
                  <LegalDocumentBody blocks={termsBlocks} />
                </div>
              </div>

              <div className="bg-gray-1 border-t border-gray-6 flex items-center justify-end px-6 py-4 shrink-0 w-full">
                <Button
                  onClick={handleAccept}
                  className="px-8 font-bold text-base font-manrope"
                >
                  Aceitar termos
                </Button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
