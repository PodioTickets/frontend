"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/Button";

type CategoryDeleteBlockedModalProps = {
  open: boolean;
  onClose: () => void;
};

export function CategoryDeleteBlockedModal({
  open,
  onClose,
}: CategoryDeleteBlockedModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/90 p-4"
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
            <div className="flex flex-col items-center justify-center px-5 pt-6 pb-5 gap-11">
              <div className="flex flex-col gap-4 items-center justify-center w-full">
                <p className="font-semibold text-[20px] leading-[1.3] text-gray-12 font-family-dm-sans text-center">
                  Não é possível deletar a categoria
                </p>
                <p className="font-normal text-base leading-[1.3] text-gray-11 font-family-dm-sans text-center">
                  Esta categoria ainda possui ingressos. Retire ou delete todos os
                  ingressos desta categoria primeiro; depois você poderá
                  deletar a categoria.
                </p>
              </div>

              <Button
                type="button"
                variant="default"
                onClick={onClose}
                className="w-full h-12 min-h-12 font-bold text-base font-manrope leading-[1.1] rounded-lg"
              >
                Entendi
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
