"use client";

import { useExportDataModal } from "@/stores/modalStore";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, ChevronDown, Loader2, GripVertical } from "lucide-react";
import { useState, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
  { id: "cpf", label: "Documento" },
  { id: "dataNascimento", label: "Data de Nascimento" },
  { id: "telefone", label: "Telefone" },
  { id: "sexo", label: "Sexo" },
  { id: "contatoEmergencia", label: "Contato de emergência" },
  { id: "endereco", label: "Endereço de pagamento" },
  { id: "ingresso", label: "Ingresso" },
  { id: "modalidade", label: "Modalidade" },
  { id: "produtosEscolhidos", label: "Produtos escolhidos" },
  { id: "perguntasRespostas", label: "Perguntas e respostas" },
  { id: "dataPagamento", label: "Data da compra" },
  { id: "status", label: "Status da compra" },
  { id: "formaPagamento", label: "Forma de pagamento" },
  { id: "valorPago", label: "Valor pago por ingresso" },
];

const DEFAULT_SELECTED = new Set(ALL_FIELDS.map((f) => f.id));
const FIELD_LABELS = new Map(ALL_FIELDS.map((f) => [f.id, f.label]));

function columnLetter(index: number): string {
  let result = "";
  let n = index;
  do {
    result = String.fromCharCode(65 + (n % 26)) + result;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return result;
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`relative inline-flex h-6 w-10 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
        checked ? "bg-primary-11" : "bg-gray-7"
      }`}
    >
      <span
        className={`inline-block size-[18px] rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-[19px]" : "translate-x-[3px]"
        }`}
      />
    </button>
  );
}

function SortableFieldRow({
  id,
  label,
  columnIndex,
  onToggle,
}: {
  id: string;
  label: string;
  columnIndex: number;
  onToggle: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-3 h-14 px-4 pr-3.5 border-t border-gray-4 bg-gray-1 ${isDragging ? "opacity-40 z-10" : ""}`}
    >
      <button
        type="button"
        className="shrink-0 text-gray-8 cursor-grab active:cursor-grabbing touch-manipulation"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>
      <div className="shrink-0 size-[26px] rounded-md bg-primary-11 flex items-center justify-center overflow-hidden">
        <span className="font-mono text-xs font-medium text-gray-1 leading-none">
          {columnLetter(columnIndex)}
        </span>
      </div>
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <span className="font-family-dm-sans text-base text-gray-12 leading-[1.3] truncate">{label}</span>
        <span className="font-family-dm-sans text-xs text-gray-10 leading-[1.3]">Coluna {columnIndex + 1}</span>
      </div>
      <ToggleSwitch checked onChange={onToggle} />
    </div>
  );
}

function DisabledFieldRow({
  label,
  onToggle,
}: {
  label: string;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center gap-3 h-14 px-4 pr-3.5 border-t border-gray-4 bg-gray-1">
      <span className="shrink-0 text-gray-6 w-4">
        <GripVertical className="size-4" />
      </span>
      <div className="shrink-0 size-[26px] rounded-md border-[1.5px] border-dashed border-gray-7" />
      <div className="flex-1 min-w-0">
        <span className="font-family-dm-sans text-base text-gray-11 leading-[1.3] truncate">{label}</span>
      </div>
      <ToggleSwitch checked={false} onChange={onToggle} />
    </div>
  );
}

function AdvancedFieldsList({
  fieldOrder,
  onReorder,
  selectedFields,
  onToggle,
  onSelectAll,
  onDeselectAll,
}: {
  fieldOrder: string[];
  onReorder: (order: string[]) => void;
  selectedFields: Set<string>;
  onToggle: (id: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}) {
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  );

  const [activeId, setActiveId] = useState<string | null>(null);

  const includedFields = fieldOrder.filter((id) => selectedFields.has(id));
  const excludedFields = fieldOrder.filter((id) => !selectedFields.has(id));

  const handleDragStart = ({ active }: DragStartEvent) => {
    setActiveId(String(active.id));
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null);
    if (!over || active.id === over.id) return;
    const oldIndex = fieldOrder.indexOf(String(active.id));
    const newIndex = fieldOrder.indexOf(String(over.id));
    if (oldIndex !== -1 && newIndex !== -1) {
      onReorder(arrayMove(fieldOrder, oldIndex, newIndex));
    }
  };

  const noneSelected = selectedFields.size === 0;

  return (
    <div className="flex flex-col gap-5">
      <p className="font-manrope font-bold text-base text-gray-12 leading-[1.1]">
        Selecione as colunas que deseja incluir ou remover do arquivo.
      </p>
      <div className="border border-gray-5 rounded-lg overflow-hidden">
        {/* Included section header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-3 text-sm">
          <span className="font-family-dm-sans font-semibold text-gray-11 leading-[1.3]">Incluir coluna</span>
          <button
            type="button"
            onClick={onDeselectAll}
            disabled={noneSelected}
            className={`font-family-dm-sans font-medium leading-[1.3] transition-colors ${
              noneSelected ? "text-gray-8 cursor-default" : "text-primary-11 hover:text-primary-10 cursor-pointer"
            }`}
          >
            Remover todas
          </button>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={includedFields} strategy={verticalListSortingStrategy}>
            {includedFields.map((id, i) => (
              <SortableFieldRow
                key={id}
                id={id}
                label={FIELD_LABELS.get(id) ?? id}
                columnIndex={i}
                onToggle={() => onToggle(id)}
              />
            ))}
          </SortableContext>
          {createPortal(
            <DragOverlay zIndex={100000}>
              {activeId && (
                <div className="flex items-center gap-3 h-14 px-4 pr-3.5 bg-gray-1 shadow-lg rounded-lg border border-gray-5">
                  <GripVertical className="size-4 text-gray-8 shrink-0" />
                  <div className="shrink-0 size-[26px] rounded-md bg-primary-11 flex items-center justify-center overflow-hidden">
                    <span className="font-mono text-xs font-medium text-gray-1 leading-none">
                      {columnLetter(includedFields.indexOf(activeId))}
                    </span>
                  </div>
                  <span className="font-family-dm-sans text-base text-gray-12 leading-[1.3]">
                    {FIELD_LABELS.get(activeId) ?? activeId}
                  </span>
                </div>
              )}
            </DragOverlay>,
            document.body,
          )}
        </DndContext>

        {/* Seção "Remover coluna" só existe com alguma coluna desmarcada. */}
        {excludedFields.length > 0 && (
          <>
            <div className="flex items-center justify-between px-4 py-3 bg-gray-3 text-sm">
              <span className="font-family-dm-sans font-semibold text-gray-11 leading-[1.3]">Remover coluna</span>
              <button
                type="button"
                onClick={onSelectAll}
                className="font-family-dm-sans font-medium leading-[1.3] transition-colors text-primary-11 hover:text-primary-10 cursor-pointer"
              >
                Adicionar todas
              </button>
            </div>
            {excludedFields.map((id) => (
              <DisabledFieldRow
                key={id}
                label={FIELD_LABELS.get(id) ?? id}
                onToggle={() => onToggle(id)}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

export function ExportDataModal() {
  const { isOpen, closeExportDataModal, data } = useExportDataModal();
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>("txt");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set(DEFAULT_SELECTED));
  const [fieldOrder, setFieldOrder] = useState<string[]>(() => ALL_FIELDS.map((f) => f.id));
  const [isExporting, setIsExporting] = useState(false);

  const eventId = data?.eventId as string | undefined;
  const eventName = (data?.eventName as string) || "Evento";
  const exportFilters = data?.filters as {
    search?: string;
    status?: string;
    ticketIds?: string[];
    startDate?: string;
    endDate?: string;
  } | undefined;
  const { hasPermission } = useOrganizerPermissions();
  const eventTabs = eventId ? getEventTabs(eventId, hasPermission) : [];

  const toggleField = useCallback((id: string) => {
    setSelectedFields((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => setSelectedFields(new Set(ALL_FIELDS.map((f) => f.id))), []);
  const deselectAll = useCallback(() => setSelectedFields(new Set()), []);

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
        fieldOrder.filter((id) => selectedFields.has(id)),
        exportFilters,
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
      className={`flex items-center gap-1 text-primary-11 font-medium font-family-dm-sans text-base leading-[1.3] hover:text-primary-10 transition-colors ${className}`}
    >
      {showAdvanced ? "Ocultar opções avançadas" : "Ver opções avançadas"}
      <ChevronDown
        className={`size-6 transition-transform duration-200 ${showAdvanced ? "rotate-180" : ""}`}
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
                  menuZClass="z-[100000]"
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
                <div className="mt-5">
                  <AdvancedFieldsList
                    fieldOrder={fieldOrder}
                    onReorder={setFieldOrder}
                    selectedFields={selectedFields}
                    onToggle={toggleField}
                    onSelectAll={selectAll}
                    onDeselectAll={deselectAll}
                  />
                </div>
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
                disabled={isExporting || selectedFields.size === 0}
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
            className="hidden md:flex flex-col bg-gray-1 rounded-xl shadow-2xl w-full max-w-[760px] mx-4 relative overflow-hidden max-h-[90vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between pl-6 pr-5 py-4 border-b border-gray-6 shrink-0">
              <h2 className="font-family-dm-sans font-semibold text-xl leading-[1.3] text-gray-12">
                Exportar dados
              </h2>
              <button
                onClick={closeExportDataModal}
                className="size-9 flex items-center justify-center rounded-lg hover:bg-gray-3 transition-colors cursor-pointer"
              >
                <X className="size-7 text-gray-11" />
              </button>
            </div>

            {/* Body — scrollable */}
            <div className="flex-1 overflow-y-auto min-h-0 px-6 pt-5 pb-6 flex flex-col gap-6">
              {/* Format cards */}
              <div className="flex flex-col gap-4">
                <p className="font-family-dm-sans font-normal text-base leading-[1.3] text-gray-11">
                  Escolha o formato que deseja exportar
                </p>
                <div className="flex gap-3">
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
              <div className="flex flex-col gap-5">
                <AdvancedToggle />
                {showAdvanced && (
                  <AdvancedFieldsList
                    fieldOrder={fieldOrder}
                    onReorder={setFieldOrder}
                    selectedFields={selectedFields}
                    onToggle={toggleField}
                    onSelectAll={selectAll}
                    onDeselectAll={deselectAll}
                  />
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="shrink-0 flex items-center justify-end gap-2 px-6 py-4 bg-gray-2 border-t border-gray-6">
              <Button
                onClick={closeExportDataModal}
                variant="outline"
                className="h-11 border-gray-6 text-gray-12 font-manrope font-bold hover:bg-gray-3"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleExport}
                disabled={isExporting || selectedFields.size === 0}
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
