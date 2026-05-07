"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/Button";
import { getApiClient } from "@/services/base/ApiClient";
import toast from "react-hot-toast";

interface RetencaoReleaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string | null;
  eventName: string;
  retainedAmount: number;
  onSuccess: (eventId: string) => void;
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

export function RetencaoReleaseModal({
  isOpen,
  onClose,
  eventId,
  eventName,
  retainedAmount,
  onSuccess,
}: RetencaoReleaseModalProps) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  const handleConfirm = async () => {
    if (!eventId) return;
    setLoading(true);
    try {
      await getApiClient().post(`/api/v1/admin/retention/${eventId}/release`);
      toast.success("Retenção liberada com sucesso.");
      onSuccess(eventId);
      onClose();
    } catch (e: any) {
      toast.error(
        e?.response?.data?.message ?? e?.message ?? "Erro ao liberar retenção."
      );
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="retencao-release-modal-title"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="w-full max-w-[460px] overflow-hidden rounded-xl bg-gray-1 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-6 px-4 py-4">
              <h2
                id="retencao-release-modal-title"
                className="font-family-dm-sans text-xl font-semibold leading-[1.3] text-gray-12"
              >
                Liberar valor retido?
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="flex size-8 items-center justify-center rounded-lg text-gray-11 transition-colors hover:bg-gray-2 hover:text-gray-12"
                aria-label="Fechar"
              >
                <X className="size-5" strokeWidth={2} />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 pb-0 pt-4">
              <p className="font-family-dm-sans text-base font-medium leading-[1.3] text-gray-11">
                O valor de{" "}
                <span className="font-bold text-gray-12">
                  {formatCurrency(retainedAmount)}
                </span>{" "}
                do evento{" "}
                <span className="font-bold text-gray-12">&quot;{eventName}&quot;</span>{" "}
                será liberado para o organizador. A retenção de 10% será desativada
                para compras futuras deste evento.
              </p>
            </div>

            {/* Footer */}
            <div className="flex gap-2.5 px-6 pb-8 pt-4">
              <Button
                type="button"
                variant="outline"
                className="h-12 flex-1 border-gray-6 font-manrope text-base font-bold text-gray-12"
                disabled={loading}
                onClick={onClose}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                className="h-12 flex-1 font-manrope text-base font-bold"
                disabled={loading}
                onClick={() => void handleConfirm()}
              >
                {loading ? "Liberando…" : "Liberar valor"}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
