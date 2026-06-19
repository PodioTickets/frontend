"use client";

import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronDown, FileText, Plus, X } from "lucide-react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/Button";
import { ExcelIcon } from "@/components/Icons/ExcelIcon";
import { PDFIcon } from "@/components/Icons/PDFIcon";

export type FiscalExportFormat = "txt" | "xlsx" | "pdf";

export interface FiscalExportFieldOption {
  value: string;
  label: string;
}

export const FISCAL_EXPORT_FIELDS: FiscalExportFieldOption[] = [
  { value: "name", label: "Nome" },
  { value: "email", label: "E-mail" },
  { value: "cpf", label: "CPF" },
  { value: "birthDate", label: "Data de nascimento" },
  { value: "phone", label: "Telefone" },
  { value: "gender", label: "Sexo" },
  { value: "address", label: "Endereço" },
  { value: "ticket", label: "Ingresso" },
  { value: "products", label: "Produtos escolhidos" },
  { value: "paymentDate", label: "Data de pagamento" },
  { value: "paymentMethod", label: "Forma de pagamento" },
  { value: "amountPaid", label: "Valor pago" },
  { value: "fee", label: "Taxa" },
  { value: "netAmount", label: "Valor líquido" },
  { value: "status", label: "Status do pedido" },
];

const DEFAULT_SELECTED_FIELDS = FISCAL_EXPORT_FIELDS.map((f) => f.value);

interface FiscalExportFormatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (params: {
    format: FiscalExportFormat;
    fields: string[];
  }) => Promise<void> | void;
  isExporting?: boolean;
}

const FORMAT_OPTIONS: {
  value: FiscalExportFormat;
  label: string;
  description: string;
  Icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    value: "txt",
    label: "TXT",
    description: "Dados brutos separados por vírgulas",
    Icon: ({ className }) => <FileText className={className} />,
  },
  {
    value: "xlsx",
    label: "Excel",
    description: "Planilha formatada para uso geral",
    Icon: ExcelIcon,
  },
  {
    value: "pdf",
    label: "PDF",
    description: "Documento para impressão e visualização",
    Icon: PDFIcon,
  },
];

export function FiscalExportFormatModal({
  isOpen,
  onClose,
  onConfirm,
  isExporting = false,
}: FiscalExportFormatModalProps) {
  const [format, setFormat] = useState<FiscalExportFormat>("txt");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedFields, setSelectedFields] = useState<string[]>(
    DEFAULT_SELECTED_FIELDS,
  );
  // Split de superfície: mobile usa Drawer (vaul) full-screen rolável; desktop
  // mantém o modal centralizado original. `mounted` evita render do portal no SSR.
  const [isMdUp, setIsMdUp] = useState(true);
  const [mounted, setMounted] = useState(false);

  useLayoutEffect(() => {
    setMounted(true);
    setIsMdUp(window.matchMedia("(min-width: 768px)").matches);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const onChange = () => setIsMdUp(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setFormat("txt");
      setShowAdvanced(false);
      setSelectedFields(DEFAULT_SELECTED_FIELDS);
    }
  }, [isOpen]);

  const toggleField = (value: string) => {
    setSelectedFields((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );
  };

  const selectAll = () =>
    setSelectedFields(FISCAL_EXPORT_FIELDS.map((f) => f.value));
  const clearAll = () => setSelectedFields([]);

  const counter = useMemo(
    () => `${selectedFields.length}/${FISCAL_EXPORT_FIELDS.length}`,
    [selectedFields.length],
  );

  const handleClose = () => {
    if (isExporting) return;
    onClose();
  };

  const handleSubmit = async () => {
    if (isExporting || selectedFields.length === 0) return;
    await onConfirm({ format, fields: selectedFields });
  };

  // Corpo rolável — compartilhado entre o Drawer (mobile) e o modal (desktop).
  const bodyContent = (
    <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 flex flex-col gap-5">
                <p className="font-family-dm-sans font-normal text-sm text-gray-12">
                  Escolha o formato que deseja exportar
                </p>

                {/* Format cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {FORMAT_OPTIONS.map((opt) => {
                    const isActive = opt.value === format;
                    return (
                      <button
                        type="button"
                        key={opt.value}
                        onClick={() => setFormat(opt.value)}
                        className={`relative text-left rounded-lg border p-4 flex flex-col gap-3 transition-colors cursor-pointer ${
                          isActive
                            ? "bg-primary-4 border-primary-11"
                            : "bg-gray-1 border-gray-6 hover:bg-gray-2"
                        }`}
                      >
                        <span
                          className={`absolute top-3 right-3 size-5 rounded-full flex items-center justify-center border ${
                            isActive
                              ? "bg-primary-11 border-primary-11"
                              : "bg-gray-1 border-gray-6"
                          }`}
                        >
                          {isActive && (
                            <Check className="size-3 text-gray-1" strokeWidth={3} />
                          )}
                        </span>
                        <opt.Icon className="size-6 text-gray-12" />
                        <div className="flex flex-col gap-1">
                          <p className="font-manrope font-extrabold text-base text-gray-12">
                            {opt.label}
                          </p>
                          <p className="font-family-dm-sans font-normal text-xs text-gray-11 leading-[1.3]">
                            {opt.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Advanced toggle */}
                <button
                  type="button"
                  onClick={() => setShowAdvanced((v) => !v)}
                  className="flex items-center gap-1 font-family-dm-sans font-medium text-sm text-primary-11 hover:text-primary-12 transition-colors w-fit cursor-pointer"
                >
                  Ver opções avançadas
                  <ChevronDown
                    className={`size-4 transition-transform ${showAdvanced ? "rotate-180" : ""}`}
                  />
                </button>

                {showAdvanced && (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <p className="font-family-dm-sans font-medium text-sm text-gray-12 leading-[1.3]">
                        Selecione os campos que deseja incluir na exportação de dados.
                      </p>
                    </div>
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
                      {FISCAL_EXPORT_FIELDS.map((field) => {
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
                )}
              </div>
  );

  // Rodapé compartilhado: no mobile os botões empilham full-width (primário no
  // topo via flex-col-reverse); em sm+ voltam lado a lado à direita.
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
        Exportar
      </Button>
    </div>
  );

  if (!mounted) return null;

  /* MOBILE: Drawer (vaul) — full-screen e rolável nativamente (o vaul gerencia o
   * container de scroll). Mesmo padrão dos demais drawers do módulo financeiro. */
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
          <DrawerTitle className="sr-only">Exportar dados fiscais</DrawerTitle>
          <DrawerHeader className="shrink-0 border-b border-gray-6 px-5 py-4">
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-manrope font-extrabold text-lg leading-[1.1] text-gray-12">
                Exportar dados fiscais
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

  /* DESKTOP: modal centralizado original (portal + framer-motion) — inalterado. */
  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 z-[100] pointer-events-auto"
            onClick={handleClose}
          />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-auto"
            onClick={handleClose}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="bg-gray-1 rounded-xl w-full max-w-[620px] max-h-[90vh] flex flex-col overflow-hidden shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-gray-6">
                <h2 className="font-manrope font-extrabold text-lg leading-[1.1] text-gray-12">
                  Exportar dados fiscais
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
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
