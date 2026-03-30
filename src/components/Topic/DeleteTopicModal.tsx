"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/Button";

type DeleteTopicModalProps = {
  open: boolean;
  onClose: () => void;
  topicTitle?: string;
  onConfirm: () => void | Promise<void>;
};

export function DeleteTopicModal({
  open,
  onClose,
  topicTitle,
  onConfirm,
}: DeleteTopicModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleConfirm = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await Promise.resolve(onConfirm());
      onClose();
    } catch {
      // Toast vem da página / API
    } finally {
      setSubmitting(false);
    }
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
                  Excluir tópico?
                </p>
                <p className="font-normal text-base leading-[1.3] text-gray-11 font-family-dm-sans text-center">
                  {topicTitle ? (
                    <>
                      O tópico{" "}
                      <span className="font-semibold text-gray-12">&quot;{topicTitle}&quot;</span> será
                      removido permanentemente. Esta ação não pode ser desfeita.
                    </>
                  ) : (
                    <>
                      Este tópico será removido permanentemente. Esta ação não pode ser desfeita.
                    </>
                  )}
                </p>
              </div>

              <div className="flex gap-2 items-stretch w-full">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={submitting}
                  className="flex-1 h-12 min-h-12 border-[1.5px] border-gray-6 text-gray-12 font-bold text-base font-manrope leading-[1.1] hover:bg-gray-2 rounded-lg"
                >
                  Fechar
                </Button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={submitting}
                  className="flex-1 h-12 min-h-12 bg-red-11 text-red-2 font-bold text-base font-manrope leading-[1.1] rounded-lg transition-colors duration-200 flex items-center justify-center hover:bg-red-12 disabled:pointer-events-none disabled:opacity-50"
                >
                  Excluir tópico
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
