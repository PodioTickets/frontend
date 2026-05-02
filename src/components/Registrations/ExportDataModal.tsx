"use client";

import { useExportDataModal } from "@/stores/modalStore";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, ChevronDown, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/Button";
import { ExcelIcon } from "../Icons/ExcelIcon";
import { TxtIcon } from "../Icons/TxtIcon";
import { PDFIcon } from "../Icons/PDFIcon";
import { ArrowButton } from "../ArrowButton";
import { EventMobileTabs, getEventTabs } from "@/components/Organizer/EventMobileTabs";
import { useOrganizerPermissions } from "@/contexts/OrganizerPermissionsContext";
import { organizerService } from "@/services";
import toast from "react-hot-toast";

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

const ALL_FIELDS = [
  { id: "nome", label: "Nome" },
  { id: "email", label: "E-mail" },
  { id: "cpf", label: "CPF" },
  { id: "dataNascimento", label: "Data de Nascimento" },
  { id: "telefone", label: "Telefone" },
  { id: "sexo", label: "Sexo" },
  { id: "contatoEmergencia", label: "Contato de emergência" },
  { id: "endereco", label: "Endereço de pagamento" },
  { id: "ingresso", label: "Ingresso" },
  { id: "produtosEscolhidos", label: "Produtos escolhidos" },
  { id: "perguntasRespostas", label: "Perguntas e respostas" },
  { id: "dataPagamento", label: "Data da compra" },
  { id: "status", label: "Status da compra" },
  { id: "formaPagamento", label: "Forma de pagamento" },
  { id: "valorPago", label: "Valor pago" },
];

const DEFAULT_SELECTED = new Set(ALL_FIELDS.map((f) => f.id));

function FieldChip({
  label,
  selected,
  onToggle,
}: {
  label: string;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`inline-flex items-center gap-1 px-3 py-2 rounded-full text-sm font-medium font-family-dm-sans transition-colors ${
        selected
          ? "bg-primary-11 text-primary-1"
          : "bg-gray-2 border border-gray-6 text-gray-11 hover:border-gray-8"
      }`}
    >
      {selected && (
        <span className="size-4 flex items-center justify-center shrink-0">
          <Check className="size-3" strokeWidth={2.5} />
        </span>
      )}
      {label}
    </button>
  );
}

function AdvancedFields({
  selectedFields,
  onToggle,
  onSelectAll,
  onClearAll,
}: {
  selectedFields: Set<string>;
  onToggle: (id: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
}) {
  return (
    <div className="flex flex-col gap-6 pt-4 pb-2">
      <p className="font-manrope font-bold text-base text-gray-12 leading-[1.1]">
        Selecione os campos que deseja incluir na exportação de dados.
      </p>
      <div className="flex items-center justify-between">
        <span className="text-sm font-family-dm-sans text-gray-11">
          {selectedFields.size}/{ALL_FIELDS.length}
        </span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onSelectAll}
            className="text-sm font-medium font-family-dm-sans text-primary-10 hover:text-primary-11 transition-colors"
          >
            Selecionar tudo
          </button>
          <button
            type="button"
            onClick={onClearAll}
            className="text-sm font-medium font-family-dm-sans text-gray-11 hover:text-gray-12 transition-colors"
          >
            Limpar tudo
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {ALL_FIELDS.map((field) => (
          <FieldChip
            key={field.id}
            label={field.label}
            selected={selectedFields.has(field.id)}
            onToggle={() => onToggle(field.id)}
          />
        ))}
      </div>
    </div>
  );
}

export function ExportDataModal() {
  const { isOpen, closeExportDataModal, data } = useExportDataModal();
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>("txt");
  const [showAdvanced, setShowAdvanced] = useState(true);
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set(DEFAULT_SELECTED));
  const [isExporting, setIsExporting] = useState(false);

  const eventId = data?.eventId as string | undefined;
  const eventName = (data?.eventName as string) || "Evento";
  const { hasPermission } = useOrganizerPermissions();
  const eventTabs = eventId ? getEventTabs(eventId, hasPermission) : [];

  const toggleField = (id: string) => {
    setSelectedFields((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedFields(new Set(ALL_FIELDS.map((f) => f.id)));
  const clearAll = () => setSelectedFields(new Set());

  const handleExport = async () => {
    if (!eventId) {
      toast.error("Evento não identificado");
      return;
    }
    if (selectedFields.size === 0) {
      toast.error("Selecione ao menos um campo para exportar");
      return;
    }
    setIsExporting(true);
    try {
      const { blob, filename } = await organizerService.exportEventRegistrations(
        eventId,
        selectedFormat,
        ALL_FIELDS.filter((f) => selectedFields.has(f.id)).map((f) => f.id),
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      closeExportDataModal();
    } catch {
      toast.error("Erro ao exportar. Tente novamente.");
    } finally {
      setIsExporting(false);
    }
  };

  const AdvancedToggle = ({ className = "" }: { className?: string }) => (
    <button
      type="button"
      onClick={() => setShowAdvanced((v) => !v)}
      className={`flex items-center gap-0 text-primary-11 font-medium font-family-dm-sans text-base leading-[1.3] hover:text-primary-10 transition-colors ${className}`}
    >
      Ver opções avançadas
      <ChevronDown
        className={`size-6 transition-transform duration-200 ${showAdvanced ? "" : "-rotate-90"}`}
      />
    </button>
  );

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
          {/* Mobile */}
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
                <EventMobileTabs
                  tabs={eventTabs}
                  activeHref={`/organizer/events/${eventId}/registrations`}
                  onLinkClick={closeExportDataModal}
                  eventId={eventId}
                />
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

              <div className="flex flex-col gap-3 mb-6">
                {exportOptions.map((option) => {
                  const Icon = option.icon;
                  const isSelected = selectedFormat === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setSelectedFormat(option.id)}
                      className={`w-full flex flex-col gap-6 p-4 rounded-lg border text-left transition-all cursor-pointer ${isSelected ? "bg-primary-4 border-primary-8" : "bg-gray-1 border-gray-6 hover:border-gray-6"}`}
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

              <AdvancedToggle />

              {showAdvanced && (
                <AdvancedFields
                  selectedFields={selectedFields}
                  onToggle={toggleField}
                  onSelectAll={selectAll}
                  onClearAll={clearAll}
                />
              )}
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
                disabled={isExporting}
                className="flex-1 h-11 bg-primary-11 text-primary-2 font-manrope font-bold text-base hover:bg-primary-10 disabled:opacity-60"
              >
                {isExporting ? <Loader2 className="size-4 animate-spin" /> : "Exportar"}
              </Button>
            </div>
          </motion.div>

          {/* Desktop */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            className="hidden md:flex flex-col bg-gray-1 rounded-xl shadow-2xl w-full max-w-[731px] mx-4 relative overflow-hidden max-h-[90vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-6 shrink-0">
              <h2 className="font-family-dm-sans font-semibold text-xl leading-[1.3] text-gray-12">
                Exportar dados
              </h2>
              <button
                onClick={closeExportDataModal}
                className="size-9 flex items-center justify-center rounded-lg hover:bg-gray-3 transition-colors cursor-pointer"
              >
                <X className="size-5 text-gray-11" />
              </button>
            </div>

            {/* Body — scrollable */}
            <div className="flex-1 overflow-y-auto min-h-0 px-5 pt-5 pb-8 flex flex-col gap-8">
              {/* Format cards */}
              <div className="flex flex-col gap-4">
                <p className="font-family-dm-sans font-normal text-base leading-[1.3] text-gray-11">
                  Escolha o formato que deseja exportar
                </p>
                <div className="flex gap-2">
                  {exportOptions.map((option) => {
                    const Icon = option.icon;
                    const isSelected = selectedFormat === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setSelectedFormat(option.id)}
                        className={`flex-1 flex flex-col gap-6 p-4 rounded-lg transition-all cursor-pointer outline outline-1 outline-offset-[-1px] ${
                          isSelected
                            ? "bg-primary-4 outline-primary-8"
                            : "bg-gray-2 outline-gray-6 hover:outline-gray-8"
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <Icon className="size-8 text-gray-12" />
                          <div
                            className={`shrink-0 size-6 rounded-full flex items-center justify-center ${
                              isSelected
                                ? "bg-primary-11 text-primary-2"
                                : "border border-gray-6 bg-transparent"
                            }`}
                          >
                            {isSelected && <Check className="size-4" strokeWidth={2.5} />}
                          </div>
                        </div>
                        <div className="flex flex-col gap-3 items-start w-full">
                          <p className="font-family-dm-sans font-semibold text-lg leading-[1.3] text-gray-12">
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

              {/* Advanced toggle + section */}
              <div className="flex flex-col rounded-lg">
                <AdvancedToggle />
                {showAdvanced && (
                  <AdvancedFields
                    selectedFields={selectedFields}
                    onToggle={toggleField}
                    onSelectAll={selectAll}
                    onClearAll={clearAll}
                  />
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="shrink-0 flex items-center justify-end gap-2 px-4 py-3 bg-gray-2 border-t border-gray-6">
              <Button
                onClick={closeExportDataModal}
                variant="outline"
                className="h-11 border-gray-6 text-gray-12 font-manrope font-bold hover:bg-gray-3"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleExport}
                disabled={isExporting}
                className="h-11 font-manrope font-bold disabled:opacity-60"
              >
                {isExporting ? <Loader2 className="size-4 animate-spin" /> : "Exportar"}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
