"use client";

import { useExportDataModal } from "@/stores/modalStore";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, ChevronDown } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/Button";
import { ExcelIcon } from "../Icons/ExcelIcon";
import { TxtIcon } from "../Icons/TxtIcon";
import { PDFIcon } from "../Icons/PDFIcon";
import { ArrowButton } from "../ArrowButton";

type ExportFormat = "txt" | "excel" | "pdf";

const exportOptions = [
  {
    id: "txt" as ExportFormat,
    title: "TXT",
    description: "Dados brutos separados por vírgulas",
    icon: TxtIcon,
  },
  {
    id: "excel" as ExportFormat,
    title: "Excel",
    description: "Planilha formatada para uso geral",
    icon: ExcelIcon,
  },
  {
    id: "pdf" as ExportFormat,
    title: "PDF",
    description: "Documento para impressão e visualização",
    icon: PDFIcon,
  },
];

export function ExportDataModal() {
  const { isOpen, closeExportDataModal, data } = useExportDataModal();
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>("txt");

  const eventId = data?.eventId as string | undefined;
  const eventName = (data?.eventName as string) || "Evento";

  const eventTabs = eventId
    ? [
        { label: "Dashboard", href: `/organizer/events/${eventId}/dashboard` },
        { label: "Editar", href: `/organizer/events/${eventId}/edit` },
        { label: "Inscrições", href: `/organizer/events/${eventId}/registrations` },
        { label: "Financeiro", href: `/organizer/events/${eventId}/financial` },
        { label: "Desconto", href: `/organizer/events/${eventId}/discount/cupom` },
        { label: "Ads", href: `/organizer/events/${eventId}/ads` },
      ]
    : [];

  const handleExport = () => {
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
          className="fixed inset-0 z-99999 flex flex-col md:flex md:items-center md:justify-center bg-black/50"
          onClick={closeExportDataModal}
        >
          {/* Mobile: full-screen layout (Figma) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            className="md:hidden flex flex-col flex-1 min-h-0 w-full bg-gray-2 overflow-hidden"
          >
            <div className="bg-gray-1 border-b border-gray-6 shrink-0">
              <div className="flex items-center gap-1 h-[52px] px-4">
                <button
                  type="button"
                  onClick={closeExportDataModal}
                  className="size-8 flex items-center justify-center shrink-0 rounded-lg hover:bg-gray-3 transition-colors -rotate-180"
                  aria-label="Voltar"
                >
                  <ArrowButton isOpen={false} />
                </button>
                <p className="font-manrope font-extrabold text-base leading-[1.1] text-gray-12 truncate flex-1 min-w-0">
                  {eventName}
                </p>
              </div>
              {eventId && (
                <div className="border-b border-gray-6 overflow-x-auto [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
                  <div className="flex items-center min-w-max">
                    {eventTabs.map((tab) => {
                      const isRegistrations = tab.href.includes("/registrations");
                      return (
                        <Link
                          key={tab.href}
                          href={tab.href}
                          onClick={closeExportDataModal}
                          className={`shrink-0 px-4 py-3 text-base transition-colors border-b-2 -mb-px ${isRegistrations ? "border-primary-11 text-primary-11 font-manrope font-bold" : "border-transparent text-gray-11 font-family-dm-sans font-normal"}`}
                        >
                          {tab.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 px-4 py-6">
              <div className="flex items-center justify-center gap-2 flex-wrap text-sm text-gray-11 font-family-dm-sans mb-4">
                <span>Eventos</span>
                <ChevronDown className="size-4 -rotate-90 shrink-0" />
                <span>Inscrições</span>
                <ChevronDown className="size-4 -rotate-90 shrink-0" />
                <span className="text-gray-12">Exportar dados</span>
              </div>

              <div className="flex flex-col gap-3 mb-6">
                <h1 className="font-manrope font-bold text-xl text-gray-12">
                  Exportar dados
                </h1>
                <p className="font-family-dm-sans font-normal text-sm text-gray-11 leading-[1.3]">
                  Escolha o formato que deseja exportar
                </p>
              </div>

              <div className="flex flex-col gap-3">
                {exportOptions.map((option) => {
                  const Icon = option.icon;
                  const isSelected = selectedFormat === option.id;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setSelectedFormat(option.id)}
                      className={`w-full flex flex-col gap-6 p-4 rounded-lg border text-left transition-all cursor-pointer ${isSelected ? "bg-primary-4 border-primary-8" : "bg-gray-1 border-gray-6 hover:border-gray-7"}`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <Icon className="size-8 shrink-0 text-gray-12" />
                        <div className={`shrink-0 size-6 rounded-full flex items-center justify-center ${isSelected ? "bg-primary-11 text-primary-2" : "border border-gray-6 bg-transparent"}`}>
                          {isSelected && <Check className="size-4" strokeWidth={2.5} />}
                        </div>
                      </div>
                      <div className="flex flex-col gap-3 items-start w-full">
                        <p className="font-family-dm-sans font-semibold text-lg leading-[1.3] text-gray-12">
                          {option.title}
                        </p>
                        <p className="font-family-dm-sans font-normal text-base leading-[1.3] text-gray-12">
                          {option.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="shrink-0 flex gap-2 px-4 py-5 border-t border-gray-6 bg-gray-1">
              <Button
                type="button"
                onClick={closeExportDataModal}
                variant="outline"
                className="flex-1 h-11 border-gray-6 text-gray-12 font-manrope font-bold text-base"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleExport}
                className="flex-1 h-11 bg-primary-11 text-primary-2 font-manrope font-bold text-base hover:bg-primary-10"
              >
                Exportar
              </Button>
            </div>
          </motion.div>

          {/* Desktop: centered modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            className="hidden md:block bg-gray-1 rounded-lg shadow-2xl w-full max-w-[731px] mx-4 relative overflow-hidden"
          >
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

            <div className="px-5 py-3">
              <p className="font-family-dm-sans font-normal text-sm leading-[1.3] text-gray-12 mb-6">
                Escolha o formato que deseja exportar
              </p>

              <div className="flex gap-4 mb-6">
                {exportOptions.map((option) => {
                  const Icon = option.icon;
                  const isSelected = selectedFormat === option.id;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setSelectedFormat(option.id)}
                      className={`flex-1 flex flex-col gap-6 p-3 rounded-lg border transition-all cursor-pointer ${isSelected ? "border-primary-8 bg-primary-4" : "border-gray-6 bg-gray-1 hover:border-gray-8"}`}
                    >
                      <div className="flex items-start justify-between w-full">
                        <Icon className="size-8 text-gray-12" />
                        <div className={`shrink-0 size-6 rounded-full flex items-center justify-center ${isSelected ? "bg-primary-11 text-primary-2" : "border border-gray-6 bg-transparent"}`}>
                          {isSelected && <Check className="size-4" strokeWidth={2.5} />}
                        </div>
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

            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-6">
              <Button onClick={closeExportDataModal} variant="outline" className="border-gray-6 text-gray-12 hover:bg-gray-2">
                Cancelar
              </Button>
              <Button onClick={handleExport}>
                Exportar
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
