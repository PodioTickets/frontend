"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/Button";

interface CheckoutExpiredModalProps {
  open: boolean;
  onConfirm: () => void;
}

export function CheckoutExpiredModal({ open, onConfirm }: CheckoutExpiredModalProps) {
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
            {/* Imagem */}
            <div className="flex flex-col gap-6 items-center w-full">
              <img
                src="/icons-3d/Icon3D-Timer-Expirado.webp"
                alt=""
                className="w-[116px] h-[106px] object-contain pointer-events-none"
              />
              <div className="flex flex-col gap-4 items-center w-full">
                <p className="text-gray-12 text-xl font-semibold font-family-dm-sans leading-[1.3]">
                  Tempo esgotado!
                </p>
                <p className="text-gray-11 text-base font-normal font-family-dm-sans leading-[1.3] text-center">
                  O tempo para finalizar sua inscrição expirou e os itens foram liberados. Você pode iniciar uma nova inscrição, sujeita à disponibilidade de vagas
                </p>
              </div>
            </div>

            {/* Botão */}
            <Button
              variant="outline"
              className="w-full border-gray-6 text-gray-12 font-bold font-manrope"
              onClick={onConfirm}
            >
              Voltar para o evento
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
