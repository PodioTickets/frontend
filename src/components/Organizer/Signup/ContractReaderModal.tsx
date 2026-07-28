"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/Button";
import { Checkbox } from "@/components/CheckBox";
import { LegalDocumentBody } from "@/components/LegalDocument";
import type { OrganizerContract } from "@/data/organizerContracts";

interface ContractReaderModalProps {
  /** Contrato aberto (null = fechado). */
  contract: OrganizerContract | null;
  onClose: () => void;
  /** Chamado ao confirmar o aceite; recebe o id do contrato. */
  onAccept: (id: string) => void;
}

/**
 * Leitor de contrato (etapa "revise os contratos"). Banner escuro com título +
 * "Última atualização", corpo rolável (`LegalDocumentBody`) e rodapé com
 * checkbox de aceite + "Confirmar". Confirmar só habilita após marcar o aceite.
 * Fullscreen no mobile, dialog centralizado no desktop.
 */
export function ContractReaderModal({
  contract,
  onClose,
  onAccept,
}: ContractReaderModalProps) {
  const [accepted, setAccepted] = useState(false);
  const isOpen = !!contract;

  // Reseta o checkbox a cada contrato aberto e trava o scroll do body.
  useEffect(() => {
    if (!isOpen) return;
    setAccepted(false);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen, contract?.id]);

  const handleConfirm = () => {
    if (!contract || !accepted) return;
    onAccept(contract.id);
    onClose();
  };

  const header = contract ? (
    <div className="flex items-center justify-between gap-3 bg-linear-to-r from-[#141a15] to-[#1d3a24] px-4 py-3.5">
      <div className="flex items-center gap-2 min-w-0">
        <span className="size-2.5 shrink-0 rounded-full bg-[#59E373]" />
        <p className="truncate font-manrope text-base font-semibold text-white">
          {contract.title}
        </p>
      </div>
      <p className="shrink-0 font-family-dm-sans text-xs text-gray-8">
        Última atualização: {contract.updatedAt}
      </p>
    </div>
  ) : null;

  const footer = contract ? (
    <div className="flex flex-col gap-3 border-t border-gray-6 bg-gray-1 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <label className="flex cursor-pointer items-center gap-2 font-family-dm-sans text-sm text-gray-12">
        <Checkbox checked={accepted} onCheckedChange={(v) => setAccepted(!!v)} />
        Li e aceito a{" "}
        <span className="font-semibold underline">{contract.title}</span> da
        PódioTicket.
      </label>
      <Button
        type="button"
        onClick={handleConfirm}
        disabled={!accepted}
        className="shrink-0"
      >
        Confirmar
      </Button>
    </div>
  ) : null;

  return (
    <AnimatePresence>
      {isOpen && contract && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100000] flex items-stretch justify-center bg-black/50 sm:items-center sm:p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 12 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            className="flex h-full w-full flex-col overflow-hidden bg-gray-1 sm:h-[674px] sm:max-w-[688px] sm:rounded-xl sm:shadow-2xl"
          >
            <div className="relative">
              {header}
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar"
                className="absolute right-3 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-white/90 transition-colors hover:bg-white/10 sm:hidden"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-gray-2 p-5 md:p-6">
              <div className="flex flex-col gap-6 font-family-dm-sans">
                <LegalDocumentBody blocks={contract.blocks} />
              </div>
            </div>

            {footer}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
