"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";
import type { LinkedTicketListItem } from "@/components/Product/CreateProductModal.types";

/**
 * Shell comum dos dois diálogos de confirmação do `CreateProductModal` (excluir
 * e salvar), antes duplicados quase byte-a-byte. Backdrop + container + lista de
 * ingressos vinculados são iguais; título/descrição/cor do marcador/fallback
 * vazio/rodapé (e a ordem dos botões) variam por props. Extraído no Bloco 3.
 */
export function ProductLinkedTicketsConfirmDialog({
  open,
  idBase,
  busy,
  onBackdropClose,
  gapClassName,
  title,
  description,
  items,
  bulletClassName,
  emptyFallback,
  footer,
}: {
  open: boolean;
  /** Prefixo p/ keys do motion e ids de acessibilidade (ex.: "delete-product"). */
  idBase: string;
  /** Em andamento (deleting/submitting): bloqueia fechar pelo backdrop. */
  busy: boolean;
  onBackdropClose: () => void;
  /** "gap-11" (excluir) | "gap-8" (salvar). */
  gapClassName: string;
  title: ReactNode;
  description: ReactNode;
  items: LinkedTicketListItem[];
  bulletClassName: string;
  /** Mostrado quando não há ingressos (só o diálogo de excluir usa). */
  emptyFallback?: ReactNode;
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
            className="fixed inset-0 z-60 bg-[rgba(32,32,32,0.9)]"
            onClick={() => {
              if (!busy) onBackdropClose();
            }}
          />
          <motion.div
            key={`${idBase}-modal`}
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed inset-0 z-61 flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className={`bg-gray-1 rounded-xl w-full max-w-[652px] flex flex-col ${gapClassName} pt-6 pb-5 px-5 shadow-2xl pointer-events-auto max-h-[min(90vh,720px)] min-h-0`}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby={`${idBase}-title`}
              aria-describedby={`${idBase}-desc`}
            >
              <div className="flex flex-col gap-6 items-stretch shrink-0">
                <div className="flex flex-col gap-4 items-center text-center">
                  <h2
                    id={`${idBase}-title`}
                    className="text-gray-12 text-xl font-semibold font-family-dm-sans leading-[1.3]"
                  >
                    {title}
                  </h2>
                  <p
                    id={`${idBase}-desc`}
                    className="text-gray-11 text-base font-normal font-family-dm-sans leading-[1.3] max-w-full"
                  >
                    {description}
                  </p>
                </div>
                <div className="max-h-[min(50vh,420px)] min-h-0 overflow-y-auto rounded-xl bg-gray-3 p-4 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-6 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-2">
                {items.length > 0 ? (
                    <ul className="flex flex-col gap-3">
                      {items.map((row, idx) => (
                        <li
                          key={`${idBase}-${row.name}-${idx}`}
                          className="flex items-center gap-2"
                        >
                          <span
                            className={`mt-1.5 size-1.5 shrink-0 rounded-full ${bulletClassName}`}
                            aria-hidden
                          />
                          <div className="min-w-0 flex-1">
                            {row.categoryLabel !== "—" ? (
                              <span className="block text-xs font-normal font-family-dm-sans leading-[1.3] text-gray-11">
                                {row.categoryLabel}
                              </span>
                            ) : null}
                            <span className="wrap-break-word text-sm font-medium font-family-dm-sans leading-[1.3] text-gray-12">
                              {row.name}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    emptyFallback ?? null
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 shrink-0 flex-wrap">
                {footer}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
