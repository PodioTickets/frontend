"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/Button";

type UnsavedTicketChangesModalProps = {
  open: boolean;
  onClose: () => void;
  /** Persiste rascunho no dispositivo (localStorage) e segue o fluxo de saída. */
  onSave: () => void | Promise<void>;
  onLeaveWithoutSaving: () => void;
};

export function UnsavedTicketChangesModal({
  open,
  onClose,
  onSave,
  onLeaveWithoutSaving,
}: UnsavedTicketChangesModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSave = async () => {
    await Promise.resolve(onSave());
  };

  if (!mounted) {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-99999 flex items-center justify-center bg-black/90 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            className="bg-gray-1 rounded-xl shadow-2xl w-full max-w-[442px] overflow-hidden"
          >
            <div className="flex flex-col items-center justify-center px-5 pt-6 pb-5 gap-8">
              <div className="flex flex-col gap-3 items-center justify-center w-full">
                <p className="font-semibold text-[20px] leading-[1.3] text-gray-12 font-family-dm-sans text-center">
                  Alterações não salvas
                </p>
                <p className="font-normal text-base leading-[1.4] text-gray-11 font-family-dm-sans text-center">
                  Você fez alterações neste ingresso. Se voltar agora, elas
                  serão perdidas. Deseja salvar?
                </p>
              </div>

              <div className="flex flex-col gap-2 w-full">


                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="w-full h-12 min-h-12 border-[1.5px] jus border-gray-6 text-gray-12 font-bold text-base font-manrope leading-[1.1] hover:bg-gray-2 rounded-lg"
                >
                  Continuar editando
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onLeaveWithoutSaving}
                  className="w-full h-12 min-h-12 text-gray-11 font-bold text-base font-manrope leading-[1.1] rounded-lg hover:bg-gray-3"
                >
                  Sair sem salvar
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

