"use client";

import { useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  formatCpfInput,
  validateNewCpf,
  parseCpfCsvText,
  cpfCsvSummary,
} from "@/lib/cpfList";

export type CpfListStatus = "DISABLED" | "ENABLED";

/**
 * Estado + handlers do painel "lista de CPF" dos modais de Cupom e Voucher.
 * Antes esse bloco (~150 linhas) era duplicado byte a byte entre os dois modais.
 * A lógica pura (formatação/validação/CSV) vive em `src/lib/cpfList.ts`.
 */
export function useCpfList() {
  const [cpfListStatus, setCpfListStatus] = useState<CpfListStatus>("DISABLED");
  const [cpfList, setCpfList] = useState<string[]>([]);
  const [cpfSearch, setCpfSearch] = useState("");
  const [isAddingCpf, setIsAddingCpf] = useState(false);
  const [newCpfInput, setNewCpfInput] = useState("");
  const [newCpfError, setNewCpfError] = useState("");
  const [isDraggingCsv, setIsDraggingCsv] = useState(false);
  const [cpfListError, setCpfListError] = useState("");
  const [showImportModal, setShowImportModal] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const handleAddCPF = () => {
    setIsAddingCpf(true);
    setNewCpfInput("");
  };

  const handleConfirmAddCPF = () => {
    const res = validateNewCpf(newCpfInput, cpfList);
    if (!res.ok) {
      setNewCpfError(res.error);
      return;
    }
    setCpfList([...cpfList, res.digits]);
    setIsAddingCpf(false);
    setNewCpfInput("");
    setNewCpfError("");
  };

  const handleNewCpfInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewCpfInput(formatCpfInput(e.target.value));
    if (newCpfError) setNewCpfError("");
  };

  const handleImportCSV = () => {
    setShowImportModal(true);
  };

  const processCSVFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = (ev.target?.result as string) ?? "";
      const result = parseCpfCsvText(text, cpfList);
      if (result.newCpfs.length > 0) {
        setCpfList((prev) => [...prev, ...result.newCpfs]);
        setCpfListError("");
      }
      const msg = cpfCsvSummary(result);
      if (msg) toast.success(msg);
      else toast.error("Nenhum CPF válido encontrado no arquivo.");
      setShowImportModal(false);
    };
    reader.onerror = () => toast.error("Erro ao ler o arquivo.");
    reader.readAsText(file);
  };

  const handleCSVFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processCSVFile(file);
    e.target.value = "";
  };

  const handleDropzoneDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingCsv(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    processCSVFile(file);
  };

  const handleRemoveCPF = (index: number) => {
    setCpfList(cpfList.filter((_, i) => i !== index));
  };

  const handleClearList = () => {
    setCpfList([]);
    setCpfSearch("");
  };

  /** Reseta o painel (criação / fechar). */
  const resetCpf = () => {
    setCpfListStatus("DISABLED");
    setCpfList([]);
    setCpfSearch("");
    setCpfListError("");
    setIsAddingCpf(false);
    setNewCpfInput("");
    setNewCpfError("");
  };

  /** Hidrata a partir de um cupom/voucher existente (edição). */
  const hydrateCpf = (status: CpfListStatus, list: string[]) => {
    setCpfListStatus(status);
    setCpfList(list);
  };

  return {
    cpfListStatus, setCpfListStatus,
    cpfList, setCpfList,
    cpfSearch, setCpfSearch,
    isAddingCpf, setIsAddingCpf,
    newCpfInput, setNewCpfInput,
    newCpfError, setNewCpfError,
    isDraggingCsv, setIsDraggingCsv,
    cpfListError, setCpfListError,
    showImportModal, setShowImportModal,
    csvInputRef,
    handleAddCPF,
    handleConfirmAddCPF,
    handleNewCpfInputChange,
    handleImportCSV,
    processCSVFile,
    handleCSVFileChange,
    handleDropzoneDrop,
    handleRemoveCPF,
    handleClearList,
    resetCpf,
    hydrateCpf,
  };
}
