"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/Button";

interface CheckoutCardErrorModalProps {
  open: boolean;
  onConfirm: () => void;
}

export function CheckoutCardErrorModal({ open, onConfirm }: CheckoutCardErrorModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/90 p-4"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-gray-1 rounded-xl flex flex-col gap-11 items-center justify-center p-5 w-full max-w-[440px]"
          >
            <div className="flex flex-col gap-6 items-center w-full">
              <img
                src="/icons-3d/Icon3D-Cartao-Invalido.webp"
                alt=""
                className="w-[116px] h-[106px] object-contain pointer-events-none"
              />
              <div className="flex flex-col gap-4 items-center w-full">
                <p className="text-gray-12 text-xl font-semibold font-family-dm-sans leading-[1.3]">
                  Pagamento não aprovado
                </p>
                <p className="text-gray-11 text-base font-normal font-family-dm-sans leading-[1.3] text-center">
                  Sua transação não foi autorizada pela operadora do cartão. Verifique os dados informados ou tente outro método de pagamento
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full border-gray-6 text-gray-12 font-bold font-manrope"
              onClick={onConfirm}
            >
              Tentar novamente
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
