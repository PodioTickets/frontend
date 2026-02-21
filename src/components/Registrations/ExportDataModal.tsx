"use client";

import { useExportDataModal } from "@/stores/modalStore";
import { motion, AnimatePresence } from "framer-motion";
import { X, File } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/Button";
import { ExcelIcon } from "../Icons/ExcelIcon";
import { Checkbox } from "../CheckBox";
import { TxtIcon } from "../Icons/TxtIcon";
import { PDFIcon } from "../Icons/PDFIcon";

type ExportFormat = "txt" | "excel" | "pdf";

export function ExportDataModal() {
  const { isOpen, closeExportDataModal, data } = useExportDataModal();
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>("txt");

  const exportOptions = [
    {
      id: "txt" as ExportFormat,
      title: "CSV",
      description: "Dados brutos separados por vírgulas",
      icon: TxtIcon,
    },
    {
      id: "excel" as ExportFormat,
      title: "Excel",
      description: "Planilha formatada para uso geral",
      icon: ExcelIcon
    },
    {
      id: "pdf" as ExportFormat,
      title: "PDF",
      description: "Documento para impressão e visualização",
      icon: PDFIcon,
    },
  ];

  const handleExport = () => {
    // TODO: Implementar lógica de exportação baseada no formato selecionado
    console.log("Exportando como:", selectedFormat);
    closeExportDataModal();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-99999 flex items-center justify-center bg-black/50"
          onClick={closeExportDataModal}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            className="bg-gray-1 rounded-lg shadow-2xl w-full max-w-[731px] mx-4 relative overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-2 border-b border-gray-6">
              <h2 className="font-family-dm-sans font-semibold text-sm leading-[1.3] text-gray-12">
                Exportar dados
              </h2>
              <button
                onClick={closeExportDataModal}
                className="size-9 flex items-center justify-center rounded-lg hover:bg-gray-3 transition-colors cursor-pointer"
              >
                <X className="size-5 text-gray-11" />
              </button>
            </div>

            {/* Content */}
            <div className="px-5 py-3">
              <p className="font-family-dm-sans font-normal text-sm leading-[1.3] text-gray-12 mb-6">
                Escolha o formato que deseja exportar
              </p>

              {/* Export Options */}
              <div className="flex gap-4 mb-6">
                {exportOptions.map((option) => {
                  const Icon = option.icon;
                  const isSelected = selectedFormat === option.id;

                  return (
                    <button
                      key={option.id}
                      onClick={() => setSelectedFormat(option.id)}
                      className={`flex-1 flex flex-col gap-6 p-3 rounded-lg border transition-all cursor-pointer ${isSelected
                        ? "border-primary-8 bg-primary-4"
                        : "border-gray-6 bg-gray-1 hover:border-gray-8"
                        }`}
                    >
                      <div className="flex items-start justify-between w-full">
                        <Icon className="size-8 text-gray-12" />
                        <Checkbox checked={isSelected} />
                      </div>
                      <div className="flex flex-col gap-3 items-start w-full">
                        <p className="font-manrope font-extrabold text-base leading-[1.1] text-gray-12">
                          {option.title}
                        </p>
                        <p className="font-family-dm-sans font-normal text-base leading-[1.3] text-gray-12 text-left">
                          {option.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-6">
              <Button
                onClick={closeExportDataModal}
                variant="outline"
                className="border-gray-6 text-gray-12 hover:bg-gray-2"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleExport}
              >
                Exportar
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
