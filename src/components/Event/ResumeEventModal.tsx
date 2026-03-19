"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/Button";

type EventInfo = { id: string; name: string };

export function ResumeEventModal({
  open,
  onClose,
  event: eventInfo,
  onConfirm,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  event: EventInfo | null;
  onConfirm: () => Promise<void>;
  loading: boolean;
}) {
  if (!eventInfo) return null;

  const handleConfirm = async () => {
    await onConfirm();
    onClose();
  };

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
            onClick={onClose}
            aria-hidden
          />
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="resume-modal-title"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="bg-gray-1 rounded-xl border border-gray-6 w-full max-w-[442px] flex flex-col shadow-[0px_2px_6px_rgba(17,17,17,0.25)]"
            >
              <div className="flex flex-col items-center justify-center px-5 pt-6 pb-5 gap-8">
                <div className="flex flex-col gap-4 items-center justify-center w-full">
                  <h2
                    id="resume-modal-title"
                    className="font-semibold text-xl leading-[1.1] text-gray-12 font-family-dm-sans text-center"
                  >
                    Reativar evento?
                  </h2>
                  <p className="font-normal text-sm leading-[1.3] text-gray-11 font-family-dm-sans text-center">
                    Ao reativar este evento, as inscrições ficam disponíveis
                    novamente para compra, respeitando rigorosamente as
                    configurações de lotes, datas e estoques que já estavam
                    programadas no seu painel
                  </p>
                </div>
                <div className="flex gap-2 items-stretch w-full">
                  <Button
                    variant="outline"
                    onClick={onClose}
                    disabled={loading}
                    className="flex-1 h-12 border border-gray-6 text-gray-12 font-semibold text-base font-family-dm-sans hover:bg-gray-2"
                  >
                    Fechar
                  </Button>
                  <Button
                    variant="default"
                    onClick={handleConfirm}
                    disabled={loading}
                    className="flex-1 h-12 font-semibold text-base font-family-dm-sans disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? "Reativando..." : "Reativar evento"}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
