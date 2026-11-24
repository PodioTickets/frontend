"use client";

import type { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { ArrowButton } from "../ArrowButton";
import { cn } from "@/utils/cn";

/**
 * Diálogo por cima do modal de kit (z-60/61, acima do z-50 do modal):
 * "Configurar estoque" e "Prévia do kit". Cabeçalho com título/subtítulo e X,
 * corpo e rodapé livres. Esc/backdrop fecham via `onClose`.
 */
export function KitOverlayDialog({
  open,
  idBase,
  title,
  subtitle,
  onClose,
  onBack,
  widthClassName,
  children,
  footer,
}: {
  open: boolean;
  idBase: string;
  title: ReactNode;
  subtitle?: ReactNode;
  onClose: () => void;
  /** Mostra a seta de voltar à esquerda do título (Prévia do kit). */
  onBack?: () => void;
  widthClassName: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key={`${idBase}-backdrop`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-60 bg-black/60"
            onClick={onClose}
          />
          <motion.div
            key={`${idBase}-dialog`}
            initial={{ opacity: 0, scale: 0.97, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 12 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="pointer-events-none fixed inset-0 z-61 flex items-center justify-center p-4"
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby={`${idBase}-title`}
              className={cn(
                "pointer-events-auto flex max-h-[90vh] min-h-0 w-full flex-col overflow-hidden rounded-2xl border border-gray-6 bg-gray-1 shadow-[0px_8px_12px_0px_rgba(0,0,0,0.3)]",
                widthClassName,
              )}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.stopPropagation();
                  onClose();
                }
              }}
            >
              <div className="flex shrink-0 items-center gap-3 border-b border-gray-4 px-6 py-5">
                {onBack && (
                  <button
                    type="button"
                    onClick={onBack}
                    aria-label="Voltar"
                    className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-gray-6 hover:bg-gray-3"
                  >
                    <ArrowButton isOpen={false} className="rotate-180" />
                  </button>
                )}
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <h2 id={`${idBase}-title`} className="font-manrope text-xl font-semibold leading-[1.1] text-gray-12">
                    {title}
                  </h2>
                  {subtitle && (
                    <p className="truncate font-family-dm-sans text-sm leading-[1.3] text-gray-11">{subtitle}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Fechar"
                  className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-gray-11 hover:text-gray-12"
                >
                  <X className="size-6" />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
              <div className="flex shrink-0 items-center justify-end gap-3 border-t border-gray-4 px-6 py-4">{footer}</div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
