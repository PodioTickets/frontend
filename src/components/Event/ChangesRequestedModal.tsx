"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/Button";

/**
 * Motivo da recusa do admin, visto pelo organizador em "Meus eventos" quando o
 * evento está em `CHANGES_REQUESTED`.
 *
 * "Fazer ajustes" devolve o evento para DRAFT (destravando o financeiro) e leva
 * ao wizard de criação — por isso é ação de escrita, não só navegação.
 */
export function ChangesRequestedModal({
  open,
  onClose,
  reason,
  onMakeAdjustments,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  /** Texto escrito pelo admin. Quebras de linha são preservadas. */
  reason?: string | null;
  onMakeAdjustments: () => Promise<void>;
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
            aria-labelledby="changes-requested-modal-title"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gray-1 rounded-xl border border-gray-6 w-full max-w-[480px] flex flex-col gap-11 px-5 pt-6 pb-5 shadow-[0px_2px_6px_rgba(17,17,17,0.25)]"
            >
              <div className="flex flex-col gap-5 w-full">
                <div className="flex flex-col gap-4 items-center text-center">
                  <h2
                    id="changes-requested-modal-title"
                    className="font-semibold text-xl leading-[1.3] text-gray-12 font-family-dm-sans"
                  >
                    Seu evento precisa de ajustes
                  </h2>
                  <p className="font-normal text-base leading-[1.3] text-gray-11 font-family-dm-sans">
                    Nossa equipe revisou seu evento e identificou alguns pontos
                    que precisam ser ajustados antes da publicação. Faça as
                    correções indicadas e envie o evento novamente para análise.
                  </p>
                </div>

                {/* Painel do motivo: cabeçalho colado no corpo (o -mb-2 do topo
                    faz o card de baixo cobrir a borda inferior do cabeçalho). */}
                <div className="flex flex-col w-full">
                  <div className="-mb-2 rounded-t-lg border border-gray-6 bg-gray-2 px-3 pt-3 pb-5">
                    <p className="font-medium text-base leading-[1.3] text-gray-11 font-family-dm-sans">
                      O que precisa ser corrigido?
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-6 bg-gray-1 px-3 py-4">
                    {/* `whitespace-pre-line` preserva as quebras que o admin
                        digitou; `break-words` evita estouro com URLs longas. */}
                    <p className="font-normal text-base leading-[1.3] text-gray-11 font-family-dm-sans whitespace-pre-line break-words">
                      {reason?.trim() || "O motivo não foi informado pela equipe de análise."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 items-stretch w-full">
                <Button
                  variant="outline"
                  onClick={onClose}
                  disabled={loading}
                  className="flex-1 h-12 border border-gray-6 text-gray-12 font-bold text-base font-manrope hover:bg-gray-2"
                >
                  Fechar
                </Button>
                <Button
                  onClick={() => void onMakeAdjustments()}
                  disabled={loading}
                  className="flex-1 h-12 font-bold text-base font-manrope disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Abrindo..." : "Fazer ajustes"}
                </Button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
