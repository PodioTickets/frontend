"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Plus, X } from "lucide-react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/Button";

export interface AwaitingExportFieldOption {
  value: string;
  label: string;
}

// Chaves batem com o COLUMNS do backend (exportFinancialPendingCsv).
export const AWAITING_EXPORT_FIELDS: AwaitingExportFieldOption[] = [
  { value: "orderId", label: "ID do pedido" },
  { value: "buyer", label: "Comprador" },
  { value: "email", label: "E-mail" },
  { value: "document", label: "Documento" },
  { value: "releaseDate", label: "Previsão de liberação" },
  { value: "paymentMethod", label: "Forma de pagamento" },
  { value: "installments", label: "Parcelas pagas" },
  { value: "amount", label: "Valor pendente" },
];

const DEFAULT_SELECTED = AWAITING_EXPORT_FIELDS.map((f) => f.value);

interface AwaitingReleaseExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (params: { fields: string[] }) => Promise<void> | void;
  isExporting?: boolean;
  /** Aba atual — só rotula o subtítulo (à vista / parcelados). */
  tabLabel?: string;
}

export function AwaitingReleaseExportModal({
  isOpen,
  onClose,
  onConfirm,
  isExporting = false,
  tabLabel,
}: AwaitingReleaseExportModalProps) {
  const [selectedFields, setSelectedFields] = useState<string[]>(DEFAULT_SELECTED);
  // Split de superfície: mobile = Drawer (vaul); desktop = modal centralizado.
  // Lazy init a partir do matchMedia (evita setState síncrono em effect); o guard
  // `typeof window` mais abaixo cobre o SSR.
  const [isMdUp, setIsMdUp] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(min-width: 768px)").matches
      : true,
  );

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const onChange = () => setIsMdUp(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (isOpen) setSelectedFields(DEFAULT_SELECTED);
  }, [isOpen]);

  const toggleField = (value: string) =>
    setSelectedFields((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );
  const selectAll = () => setSelectedFields(AWAITING_EXPORT_FIELDS.map((f) => f.value));
  const clearAll = () => setSelectedFields([]);

  const counter = useMemo(
    () => `${selectedFields.length}/${AWAITING_EXPORT_FIELDS.length}`,
    [selectedFields.length],
  );

  const handleClose = () => {
    if (isExporting) return;
    onClose();
  };

  const handleSubmit = async () => {
    if (isExporting || selectedFields.length === 0) return;
    // Preserva a ordem canônica das colunas independente da ordem de clique.
    const ordered = AWAITING_EXPORT_FIELDS.filter((f) =>
      selectedFields.includes(f.value),
    ).map((f) => f.value);
    await onConfirm({ fields: ordered });
  };

  const bodyContent = (
    <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 flex flex-col gap-4">
      <p className="font-family-dm-sans font-normal text-sm text-gray-12">
        Selecione as colunas que deseja incluir no CSV
        {tabLabel ? ` (${tabLabel})` : ""}.
      </p>

      <div className="flex items-center justify-between gap-2">
        <span className="font-family-dm-sans font-normal text-sm text-gray-11">
          {counter}
        </span>
        <div className="flex items-center gap-3 text-sm font-family-dm-sans">
          <button
            type="button"
            onClick={selectAll}
            className="text-primary-11 hover:text-primary-12 font-medium cursor-pointer"
          >
            Selecionar tudo
          </button>
          <span className="text-gray-6">|</span>
          <button
            type="button"
            onClick={clearAll}
            className="text-gray-11 hover:text-gray-12 font-medium cursor-pointer"
          >
            Limpar tudo
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {AWAITING_EXPORT_FIELDS.map((field) => {
          const isSelected = selectedFields.includes(field.value);
          return (
            <button
              type="button"
              key={field.value}
              onClick={() => toggleField(field.value)}
              className={`inline-flex items-center gap-1 px-3 h-8 rounded-full border text-sm font-family-dm-sans font-medium transition-colors cursor-pointer ${
                isSelected
                  ? "bg-primary-11 border-primary-11 text-gray-1 hover:bg-primary-12"
                  : "bg-gray-1 border-gray-6 text-gray-12 hover:bg-gray-2"
              }`}
            >
              {isSelected ? (
                <Check className="size-3.5" strokeWidth={3} />
              ) : (
                <Plus className="size-3.5" />
              )}
              {field.label}
            </button>
          );
        })}
      </div>
    </div>
  );

  const footerContent = (
    <div className="shrink-0 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3 px-5 py-4 border-t border-gray-6">
      <Button
        variant="outline"
        onClick={handleClose}
        disabled={isExporting}
        className="text-gray-12 border-gray-6 w-full sm:w-auto"
      >
        Cancelar
      </Button>
      <Button
        onClick={handleSubmit}
        disabled={selectedFields.length === 0}
        isLoading={isExporting}
        className="w-full sm:w-auto"
      >
        Exportar CSV
      </Button>
    </div>
  );

  if (typeof window === "undefined") return null;

  // MOBILE: Drawer (vaul) full-screen rolável.
  if (!isMdUp) {
    return (
      <Drawer
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) handleClose();
        }}
        direction="right"
      >
        <DrawerContent className="bg-gray-1 h-full w-full border-l border-gray-6">
          <DrawerTitle className="sr-only">Exportar CSV</DrawerTitle>
          <DrawerHeader className="shrink-0 border-b border-gray-6 px-5 py-4">
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-manrope font-extrabold text-lg leading-[1.1] text-gray-12">
                Exportar CSV
              </h2>
              <DrawerClose asChild>
                <button
                  type="button"
                  disabled={isExporting}
                  aria-label="Fechar"
                  className="size-8 flex items-center justify-center shrink-0 rounded-lg hover:bg-gray-3 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <X className="size-5 text-gray-12" />
                </button>
              </DrawerClose>
            </div>
          </DrawerHeader>
          {bodyContent}
          {footerContent}
        </DrawerContent>
      </Drawer>
    );
  }

  // DESKTOP: modal centralizado (portal + framer-motion).
  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 pointer-events-auto"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="bg-gray-1 rounded-xl w-full max-w-[560px] max-h-[90vh] flex flex-col overflow-hidden shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-gray-6">
              <h2 className="font-manrope font-extrabold text-lg leading-[1.1] text-gray-12">
                Exportar CSV
              </h2>
              <button
                type="button"
                onClick={handleClose}
                disabled={isExporting}
                aria-label="Fechar"
                className="size-8 flex items-center justify-center rounded-lg hover:bg-gray-3 transition-colors cursor-pointer disabled:opacity-50"
              >
                <X className="size-5 text-gray-12" />
              </button>
            </div>
            {bodyContent}
            {footerContent}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
