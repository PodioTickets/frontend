"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, X } from "lucide-react";
import { Button } from "@/components/Button";

interface AdBlockNoticeModalProps {
  open: boolean;
  /** Fecha e silencia o aviso pelo resto da sessão. */
  onDismiss: () => void;
  /** Usuário desativou a extensão e quer recarregar (NÃO silencia). */
  onReload: () => void;
}

/**
 * Aviso de bloqueador de anúncios. Nunca bloqueia a navegação/compra — é
 * sempre dispensável (X, backdrop ou botão), por isso `onDismiss` no overlay.
 */
export function AdBlockNoticeModal({
  open,
  onDismiss,
  onReload,
}: AdBlockNoticeModalProps) {
  // Esc fecha — só assina o listener enquanto o modal está aberto.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onDismiss();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onDismiss]);

  // Sem estado `mounted`: o modal só é montado depois da detecção (client-only),
  // então não há render no servidor para divergir na hidratação.
  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/90 p-4"
          onClick={onDismiss}
          role="dialog"
          aria-modal="true"
          aria-labelledby="adblock-notice-title"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="relative bg-gray-1 rounded-xl flex flex-col gap-8 items-center p-5 w-full max-w-[440px]"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Fechar aviso"
              className="absolute right-4 top-4 text-gray-11 hover:text-gray-12 transition-colors cursor-pointer"
            >
              <X className="size-5" />
            </button>

            <div className="flex flex-col gap-6 items-center w-full pt-4">
              <div className="flex items-center justify-center size-[72px] rounded-full bg-gray-3">
                <ShieldAlert className="size-9 text-primary-11" />
              </div>

              <div className="flex flex-col gap-4 items-center w-full">
                <p
                  id="adblock-notice-title"
                  className="text-gray-12 text-xl font-semibold font-family-dm-sans leading-[1.3] text-center"
                >
                  Bloqueador de anúncios detectado
                </p>
                <p className="text-gray-11 text-base font-normal font-family-dm-sans leading-[1.3] text-center">
                  Extensões de bloqueio podem impedir o carregamento de imagens,
                  mapas e do processamento de pagamento. Para uma melhor
                  experiência, desative o bloqueador e
                  recarregue a página.
                </p>
              </div>
            </div>

            <div className="flex flex-col-reverse md:flex-row gap-3 w-full">
              <Button
                variant="outline"
                className="w-max border-gray-6 text-gray-12 font-bold font-manrope"
                onClick={onDismiss}
              >
                Continuar assim mesmo
              </Button>
              <Button className="w-max font-bold font-manrope" onClick={onReload}>
                Já desativei, recarregar
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
