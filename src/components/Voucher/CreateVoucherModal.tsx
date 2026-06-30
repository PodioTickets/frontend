"use client";

import { useState, useEffect, useLayoutEffect, useRef, useMemo } from "react";
import { useCreateVoucherModal } from "@/stores/modalStore";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Checkbox } from "@/components/CheckBox";
import { DatePicker } from "@/components/DatePicker";
import { toCivilDayBRT } from "@/utils/datetimeBR";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { InfoIcon } from "../Icons/InfoIcon";
import { TrashIcon } from "../Icons/TrashIcon";
import { organizerService } from "@/services";
import { SelectTicketsModal } from "../Coupon/SelectTicketsModal";
import { ArrowButton } from "../ArrowButton";
import { cn } from "@/utils/cn";
import { useCpfList } from "@/hooks/useCpfList";
import { formatCpf as formatCPF } from "@/lib/cpfList";

type CPFListStatus = "DISABLED" | "ENABLED";
type ExpiryStatus = "DISABLED" | "ENABLED";

export function CreateVoucherModal() {
  const { isOpen, closeCreateVoucherModal, data, onModalSave } = useCreateVoucherModal();
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [appliesTo, setAppliesTo] = useState<"all" | "specific">("specific");
  const [selectedTicketIds, setSelectedTicketIds] = useState<string[]>([]);
  const [showSelectTicketsModal, setShowSelectTicketsModal] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [expiryStatus, setExpiryStatus] = useState<ExpiryStatus>("DISABLED");
  const [expiryDate, setExpiryDate] = useState<string | null>(null);
  const [applyToProducts, setApplyToProducts] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMdUp, setIsMdUp] = useState(true);

  // Estado + handlers da lista de CPF (compartilhado com o modal de Cupom).
  const {
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
    handleAddCPF, handleConfirmAddCPF, handleNewCpfInputChange,
    handleImportCSV, handleCSVFileChange, handleDropzoneDrop,
    handleRemoveCPF, handleClearList,
  } = useCpfList();

  const modalBodyScrollRef = useRef<HTMLDivElement>(null);
  const advancedPanelRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    setIsMdUp(window.matchMedia("(min-width: 768px)").matches);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const onChange = () => setIsMdUp(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const isEditing = data?.voucherId !== undefined;
  const eventId = data?.eventId;

  const minSelectableExpiryDate = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, [isOpen]);

  // Initialize form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (isEditing && data?.voucher) {
        const v = data.voucher;
        setName(v.name || "");
        setQuantity(v.quantity?.toString() || "");

        if (v.appliesTo === "all" || !v.appliesTo) {
          setAppliesTo("all");
          setSelectedTicketIds([]);
        } else if (Array.isArray(v.appliesTo)) {
          const ticketIds = v.appliesTo.map((ticket: any) =>
            typeof ticket === "string" ? ticket : ticket.id
          );
          setAppliesTo("specific");
          setSelectedTicketIds(ticketIds);
        } else {
          setAppliesTo("all");
          setSelectedTicketIds([]);
        }

        setExpiryStatus(v.expiryDate ? "ENABLED" : "DISABLED");
        // Converte o instante de validade (fim do dia BRT) pro dia civil do picker.
        setExpiryDate(v.expiryDate ? toCivilDayBRT(v.expiryDate) : null);
        setCpfListStatus(v.cpfListStatus || "DISABLED");
        setCpfList(v.cpfList || []);
        setApplyToProducts(!!(v as { applyToProducts?: boolean }).applyToProducts);
        // Abre painel avançado automaticamente se houver configurações ativas
        setShowAdvanced(
          !!(v.expiryDate || v.cpfListStatus === "ENABLED" || (v as { applyToProducts?: boolean }).applyToProducts)
        );
      } else {
        setName("");
        setQuantity("");
        setAppliesTo("specific");
        setSelectedTicketIds([]);
        setShowAdvanced(false);
        setExpiryStatus("DISABLED");
        setExpiryDate(null);
        setCpfListStatus("DISABLED");
        setCpfList([]);
        setApplyToProducts(false);
        setCpfSearch("");
        setCpfListError("");
      }
    }
  }, [isOpen, isEditing, data]);

  // Scroll automático ao abrir painel avançado — idêntico ao cupom
  useEffect(() => {
    if (!showAdvanced) return;

    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;
    let rafScroll = 0;
    const timeoutIds: number[] = [];

    const scrollOverflowIntoView = () => {
      const scrollEl = modalBodyScrollRef.current;
      const panel = advancedPanelRef.current;
      if (!scrollEl || !panel || cancelled) return;

      const parentRect = scrollEl.getBoundingClientRect();
      const panelRect = panel.getBoundingClientRect();
      const padding = 20;

      const bottomOverflow = panelRect.bottom - (parentRect.bottom - padding);
      if (bottomOverflow > 0) { scrollEl.scrollTop += bottomOverflow; return; }

      const topOverflow = parentRect.top + padding - panelRect.top;
      if (topOverflow > 0) scrollEl.scrollTop -= topOverflow;
    };

    const scheduleScroll = () => {
      cancelAnimationFrame(rafScroll);
      rafScroll = requestAnimationFrame(scrollOverflowIntoView);
    };

    let attachAttempts = 0;
    const tryAttach = () => {
      if (cancelled) return;
      const scrollEl = modalBodyScrollRef.current;
      const panel = advancedPanelRef.current;
      if (!scrollEl || !panel) {
        attachAttempts += 1;
        if (attachAttempts < 90) requestAnimationFrame(tryAttach);
        return;
      }
      resizeObserver = new ResizeObserver(() => scheduleScroll());
      resizeObserver.observe(panel);
      scheduleScroll();
      timeoutIds.push(
        window.setTimeout(scheduleScroll, 0),
        window.setTimeout(scheduleScroll, 100),
        window.setTimeout(scheduleScroll, 350)
      );
    };

    tryAttach();

    return () => {
      cancelled = true;
      timeoutIds.forEach((id) => window.clearTimeout(id));
      cancelAnimationFrame(rafScroll);
      resizeObserver?.disconnect();
    };
  }, [showAdvanced]);

  const handleSave = async () => {
    if (!isEditing) {
      if (!name.trim()) {
        toast.error("Digite um nome para o voucher");
        return;
      }
      if (!quantity.trim()) {
        toast.error("Digite a quantidade de vouchers");
        return;
      }
      const quantityNum = parseInt(quantity);
      if (isNaN(quantityNum) || quantityNum <= 0) {
        toast.error("Digite uma quantidade válida");
        return;
      }
    }

    if (cpfListStatus === "ENABLED" && cpfList.length === 0) {
      const msg = "Adicione ao menos um CPF à lista ou desabilite a restrição por CPF";
      setCpfListError(msg);
      toast.error(msg);
      return;
    }

    if (!eventId) {
      toast.error("Evento não encontrado");
      return;
    }

    const quantityNum = isEditing ? 0 : parseInt(quantity);
    setIsSubmitting(true);

    try {
      const voucherData: any = {
        name: name.trim(),
        ...(!isEditing && { quantity: quantityNum }),
        appliesTo: appliesTo === "all" ? "all" : selectedTicketIds.length > 0 ? selectedTicketIds : "all",
        expiryDate: expiryStatus === "ENABLED" && expiryDate ? expiryDate : null, // null é serializado, undefined não
        cpfListStatus,
        cpfList: cpfListStatus === "ENABLED" ? cpfList : null,
        applyToProducts,
      };

      if (isEditing && data?.voucherId) {
        await organizerService.updateVoucher(eventId, data.voucherId, voucherData);
        toast.success("Voucher atualizado com sucesso!");
      } else {
        await organizerService.createVoucher(eventId, voucherData);
        toast.success("Voucher criado com sucesso!");
      }

      if (onModalSave) {
        await onModalSave(voucherData);
      }

      closeCreateVoucherModal();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Erro ao salvar voucher");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const panelMotion = isMdUp
    ? { initial: { opacity: 0, scale: 0.95, y: 20 }, animate: { opacity: 1, scale: 1, y: 0 }, exit: { opacity: 0, scale: 0.95, y: 20 } }
    : { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } };

  return (
    <>
      <input
        ref={csvInputRef}
        type="file"
        accept=".csv,.txt"
        className="hidden"
        onChange={handleCSVFileChange}
      />

      {/* Modal de importação de CSV — idêntico ao cupom */}
      <AnimatePresence>
        {showImportModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 bg-black/60 z-[60]"
              onClick={() => setShowImportModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-[61] flex items-center justify-center p-4"
            >
              <div className="bg-gray-1 rounded-xl w-full max-w-[569px] max-h-[90vh] flex flex-col overflow-hidden shadow-xl">
                {/* Header */}
                <div className="flex items-center justify-between px-4 md:px-5 py-3 border-b border-gray-6 gap-3">
                  <span className="text-gray-12 text-base md:text-[20px] font-semibold font-family-dm-sans leading-[1.3] truncate">Importar lista de CPF</span>
                  <button
                    type="button"
                    onClick={() => setShowImportModal(false)}
                    className="w-9 h-9 shrink-0 rounded-lg hover:bg-gray-3 transition-colors inline-flex items-center justify-center overflow-hidden"
                  >
                    <img src="https://podioticket.com.br/images/remove.svg" alt="Fechar" className="w-9 h-9 object-contain" />
                  </button>
                </div>

                {/* Body */}
                <div className="flex flex-col gap-6 md:gap-9 px-4 md:px-5 pt-5 pb-6 md:pb-8 overflow-y-auto">
                  {/* Formato esperado */}
                  <div className="flex flex-col gap-4">
                    <h3 className="text-gray-12 text-base md:text-[18px] font-semibold font-family-manrope leading-[1.3]">Formato esperado do arquivo</h3>
                    <div className="w-full max-w-[290px] bg-gray-2 rounded-lg overflow-hidden flex flex-col" style={{ outline: '1px solid #D9D9D9' }}>
                      {[1, 2, 3].map((n) => (
                        <div key={n} className="flex items-center h-8 border-b border-gray-6">
                          <div className="w-8 h-8 flex items-center justify-center shrink-0" style={{ outline: '1px solid #D9D9D9' }}>
                            <span className="text-[14px] font-normal font-family-dm-sans leading-[18.2px]" style={{ color: '#646464' }}>{n}</span>
                          </div>
                          <span className="text-[14px] font-semibold font-family-dm-sans leading-[18.2px] ml-3" style={{ color: '#308737' }}>111.111.111-11</span>
                        </div>
                      ))}
                      <div className="flex items-center h-8 border-b border-gray-6">
                        <div className="w-8 h-8 flex items-center justify-center shrink-0" style={{ outline: '1px solid #D9D9D9' }}>
                          <span className="text-[14px] font-normal font-family-dm-sans leading-[18.2px]" style={{ color: '#646464' }}>4</span>
                        </div>
                        <span className="text-[14px] font-semibold font-family-dm-sans leading-[18.2px] ml-3" style={{ color: '#646464' }}>...</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <svg className="w-5 h-5 md:w-6 md:h-6 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="7" r="1" fill="#646464" />
                        <path d="M11 10H12V17M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z" stroke="#646464" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <p className="flex-1 min-w-0 text-gray-11 text-sm md:text-[16px] font-normal font-family-dm-sans leading-[1.3]">1 CPF por linha. Pode usar apenas números, com pontuação ou sem pontuação. Duplicadas serão ignoradas automaticamente.</p>
                    </div>
                  </div>

                  {/* Drop zone */}
                  <div className="flex flex-col gap-4">
                    <h3 className="text-gray-12 text-base md:text-[18px] font-semibold font-family-manrope leading-[1.3]">Arquivo CSV</h3>
                    <div
                      onClick={() => csvInputRef.current?.click()}
                      onDragOver={(e) => { e.preventDefault(); setIsDraggingCsv(true); }}
                      onDragLeave={() => setIsDraggingCsv(false)}
                      onDrop={handleDropzoneDrop}
                      className={`flex items-center gap-3 md:gap-4 p-4 md:p-6 rounded-xl cursor-pointer transition-colors ${isDraggingCsv ? "bg-green-2" : "hover:bg-gray-2"}`}
                      style={{ outline: isDraggingCsv ? '2px solid #46A758' : '2px solid #D9D9D9' }}
                    >
                      <div className="w-12 h-12 md:w-16 md:h-16 shrink-0 flex items-center justify-center">
                        <img src="/images/plus.svg" alt="" className="w-full h-full" />
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-center items-start gap-3 md:gap-6">
                        <div className="flex flex-col gap-2 md:gap-4 w-full">
                          <p className="w-full text-sm md:text-[16px] font-bold font-family-dm-sans leading-[1.3]" style={{ color: '#308737' }}>Clique para selecionar ou arraste o arquivo aqui</p>
                          <p className="w-full text-xs md:text-[16px] font-semibold font-family-manrope leading-[1.2]" style={{ color: '#202020' }}>Formato aceito: .CSV e .TXT</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-2 px-4 py-3 bg-gray-2 border-t border-gray-6 max-md:pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                  <button
                    type="button"
                    onClick={() => setShowImportModal(false)}
                    className="h-11 px-5 rounded-lg text-gray-12 text-[16px] font-bold font-family-manrope leading-[17.6px] hover:bg-gray-3 transition-colors max-md:flex-1"
                    style={{ outline: '1px solid #D9D9D9' }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => csvInputRef.current?.click()}
                    className="h-11 px-5 rounded-lg text-[16px] font-bold font-family-manrope leading-[17.6px] transition-colors max-md:flex-1"
                    style={{ background: '#59E373', color: '#141A15' }}
                  >
                    Importar lista
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/90 z-50"
              onClick={closeCreateVoucherModal}
            />

            {/* Modal */}
            <motion.div
              {...panelMotion}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="fixed inset-0 z-50 md:flex md:items-center md:justify-center md:p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className={cn(
                  "flex flex-col overflow-hidden bg-gray-1 shadow-2xl",
                  "max-md:h-full max-md:w-full max-md:pt-14",
                  "md:w-full md:max-w-[1098px] md:max-h-[90vh] md:rounded-xl md:border md:border-gray-6",
                )}
              >
                {/* Header */}
                <div
                  className={cn(
                    "flex shrink-0 items-center justify-between border-b border-gray-6",
                    "max-md:fixed max-md:inset-x-0 max-md:top-0 max-md:z-10 max-md:h-[52px] max-md:bg-gray-1 max-md:px-4",
                    "md:px-5 md:py-3",
                  )}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2 md:contents">
                    <button
                      type="button"
                      onClick={closeCreateVoucherModal}
                      className="flex size-8 shrink-0 items-center justify-center rounded-[52px] md:border border-gray-6 transition-colors hover:bg-gray-3 md:hidden rotate-180"
                      aria-label="Fechar"
                    >
                      <ArrowButton isOpen={false} />
                    </button>
                    <h2
                      className={cn(
                        "truncate leading-[1.3] text-gray-12",
                        "max-md:font-manrope max-md:text-base max-md:font-extrabold",
                        "md:font-family-dm-sans md:text-[20px] md:font-semibold",
                      )}
                    >
                      {isEditing ? "Editar voucher" : "Criar voucher"}
                    </h2>
                  </div>
                  <button
                    onClick={closeCreateVoucherModal}
                    className="hidden p-1 text-gray-11 transition-colors hover:text-gray-12 md:block"
                    aria-label="Fechar"
                  >
                    <X className="size-6" />
                  </button>
                </div>

                {/* Content */}
                <div className="flex flex-1 overflow-hidden">
                  <div
                    ref={modalBodyScrollRef}
                    className="flex-1 overflow-y-auto p-5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-6 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-2"
                  >
                    <div className="flex flex-col gap-9 max-w-full">

                      {/* Descrição */}
                      <div className="flex flex-col gap-2.5">
                        <label className="text-gray-11 font-semibold text-base font-family-dm-sans leading-[1.3] mb-4">
                          Este voucher garante uma inscrição gratuita (cortesia) para o evento.
                        </label>

                        {/* Nome do voucher */}
                        <div className="flex flex-col gap-2">
                          <label className="text-gray-12 text-base font-family-dm-sans leading-[1.3]">
                            Nome do voucher
                          </label>
                          <Input
                            type="text"
                            placeholder="Ex: CONVIDADOS2026"
                            value={name}
                            maxLength={30}
                            onChange={(e) => setName(e.target.value)}
                            disabled={isEditing}
                            className="h-12"
                          />
                        </div>
                      </div>

                      {/* Quantidade de vouchers */}
                      <div className="flex flex-col gap-2.5">
                        <div className="flex flex-col gap-2">
                          <label className="text-gray-12 text-base font-family-dm-sans leading-[1.3]">
                            Quantidade de vouchers
                          </label>
                          <Input
                            type="text"
                            placeholder="Ex: 1"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value.replace(/[^0-9]/g, ""))}
                            disabled={isEditing}
                            className="h-12"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <InfoIcon className="size-5 text-gray-11 shrink-0" />
                          <p className="text-gray-11 text-base font-family-dm-sans leading-[1.3]">
                            Geraremos um código único por voucher.
                          </p>
                        </div>
                      </div>

                      {/* Qual ingresso aplicar */}
                      <div className="flex flex-col gap-2 w-[276px]">
                        <label className="text-gray-12 text-base font-family-dm-sans leading-[1.3]">
                          Qual ingresso aplicar?
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowSelectTicketsModal(true)}
                          className="border border-gray-6 rounded-lg h-12 flex items-center justify-between px-3 transition-colors text-left cursor-pointer hover:bg-gray-3"
                        >
                          <span className="text-base font-family-dm-sans leading-[1.3] text-gray-11">
                            {appliesTo === "all"
                              ? "Todos os ingressos"
                              : selectedTicketIds.length > 0
                                ? `${selectedTicketIds.length} ingresso${selectedTicketIds.length > 1 ? "s" : ""} selecionado${selectedTicketIds.length > 1 ? "s" : ""}`
                                : "Selecione"}
                          </span>
                          <ArrowButton />
                        </button>
                      </div>

                      {/* Conteúdo avançado */}
                      <div className="flex flex-col gap-5">
                        <button
                          onClick={() => setShowAdvanced(!showAdvanced)}
                          className="flex items-center gap-2 text-primary-11 hover:text-primary-12 transition-colors self-start"
                        >
                          <span className="text-base font-medium font-family-dm-sans leading-[1.3]">
                            Mostrar conteúdo avançado opcionais
                          </span>
                          <ArrowButton isOpen={showAdvanced} />
                        </button>

                        <AnimatePresence>
                          {showAdvanced && (
                            <motion.div
                              ref={advancedPanelRef}
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden flex flex-col gap-9"
                              onAnimationComplete={() => {
                                requestAnimationFrame(() => {
                                  const scrollEl = modalBodyScrollRef.current;
                                  const panel = advancedPanelRef.current;
                                  if (!scrollEl || !panel) return;
                                  const bottomOverflow =
                                    panel.getBoundingClientRect().bottom -
                                    (scrollEl.getBoundingClientRect().bottom - 20);
                                  if (bottomOverflow > 0) scrollEl.scrollTop += bottomOverflow;
                                });
                              }}
                            >
                              <div className="flex flex-col gap-4">
                                <div className="flex flex-col gap-2">
                                  <h3 className="text-gray-12 text-lg font-medium font-family-dm-sans leading-[1.3]">
                                    Deseja ativar lista exclusiva por CPF?
                                  </h3>
                                  <p className="text-gray-11 text-base font-family-dm-sans leading-[1.3]">
                                    Restrinja o voucher para uma lista específica de CPFs
                                  </p>
                                </div>
                                <div className="flex gap-6">
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <Checkbox
                                      checked={cpfListStatus === "DISABLED"}
                                      onCheckedChange={(checked) => { if (checked) { setCpfListStatus("DISABLED"); setCpfListError(""); } }}
                                    />
                                    <span className="text-sm font-family-dm-sans leading-[1.3] text-gray-12">Desabilitado</span>
                                  </label>
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <Checkbox
                                      checked={cpfListStatus === "ENABLED"}
                                      onCheckedChange={(checked) => { if (checked) { setCpfListStatus("ENABLED"); setCpfListError(""); } }}
                                    />
                                    <span className="text-sm font-family-dm-sans leading-[1.3] text-gray-12">Habilitar</span>
                                  </label>
                                </div>

                                {cpfListError && (
                                  <p className="text-red-11 text-sm font-family-dm-sans leading-[1.3]">{cpfListError}</p>
                                )}

                                {cpfListStatus === "ENABLED" && (
                                  <div className="bg-gray-2 border-[1.5px] border-gray-6 rounded-lg overflow-hidden flex flex-col">
                                    {/* Campo de busca */}
                                    <div className="p-3 border-b border-gray-6">
                                      <div className="relative">
                                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-10 pointer-events-none" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                          <path d="M7.333 12.667A5.333 5.333 0 1 0 7.333 2a5.333 5.333 0 0 0 0 10.667ZM14 14l-2.9-2.9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                        <input
                                          type="text"
                                          placeholder="Busque um cpf..."
                                          value={cpfSearch}
                                          onChange={(e) => setCpfSearch(e.target.value)}
                                          className="w-full h-10 pl-9 pr-3 bg-gray-1 border border-gray-6 rounded-lg text-sm text-gray-12 placeholder:text-gray-9 focus:outline-none focus:border-gray-8"
                                        />
                                      </div>
                                    </div>
                                    {/* Tabela */}
                                    <div className="flex flex-col">
                                      <div className="bg-gray-3 border-b border-gray-6 flex h-11 items-center">
                                        <div className="flex-1 px-4">
                                          <p className="text-gray-12 text-sm font-medium font-inter leading-[1.3]">CPFs autorizados</p>
                                        </div>
                                        <div className="border-l border-gray-6 h-full flex items-center justify-center px-4 w-[74px]">
                                          <p className="text-gray-12 text-sm font-medium font-inter leading-[1.3]">Ações</p>
                                        </div>
                                      </div>
                                      {cpfList.length === 0 ? (
                                        <div className="p-8 text-center">
                                          <p className="text-gray-11 text-sm">Nenhum CPF adicionado</p>
                                        </div>
                                      ) : (() => {
                                        const filtered = cpfList.filter((cpf) => {
                                          const query = cpfSearch.replace(/\D/g, "");
                                          return formatCPF(cpf).includes(cpfSearch) || cpf.includes(query);
                                        });
                                        return filtered.length === 0 ? (
                                          <div className="p-8 text-center">
                                            <p className="text-gray-11 text-sm">Nenhum CPF encontrado</p>
                                          </div>
                                        ) : (
                                          filtered.map((cpf) => {
                                            const realIndex = cpfList.indexOf(cpf);
                                            return (
                                              <div key={realIndex} className="border-b border-gray-6 h-[52px] flex items-center">
                                                <div className="flex-1 px-4">
                                                  <p className="text-gray-12 text-sm font-medium font-inter leading-[1.3]">
                                                    {formatCPF(cpf)}
                                                  </p>
                                                </div>
                                                <div className="flex items-center justify-center px-4 w-[74px]">
                                                  <button
                                                    type="button"
                                                    title="Remover CPF"
                                                    onClick={() => handleRemoveCPF(realIndex)}
                                                    className="size-9 rounded-lg bg-red-2 border border-red-6 hover:bg-red-3 flex items-center justify-center transition-colors"
                                                  >
                                                    <TrashIcon className="size-5 text-red-12" />
                                                  </button>
                                                </div>
                                              </div>
                                            );
                                          })
                                        );
                                      })()}
                                    </div>
                                    {/* Row de adicionar CPF inline */}
                                    {isAddingCpf && (
                                      <div className="px-4 py-2 border-t border-gray-6 flex flex-col gap-1">
                                        {/* Mobile: input ocupa linha inteira (min-w-full + flex-wrap), botões dividem a 2ª linha; desktop: tudo inline. */}
                                        <div className="flex items-center gap-2 max-md:flex-wrap">
                                          <input
                                            type="text"
                                            value={newCpfInput}
                                            onChange={handleNewCpfInputChange}
                                            onKeyDown={(e) => {
                                              if (e.key === "Enter") { e.preventDefault(); handleConfirmAddCPF(); }
                                              if (e.key === "Escape") { setIsAddingCpf(false); setNewCpfInput(""); setNewCpfError(""); }
                                            }}
                                            autoFocus
                                            placeholder="000.000.000-00"
                                            className={cn("flex-1 h-9 px-3 rounded-lg border bg-gray-1 text-sm text-gray-12 placeholder:text-gray-9 focus:outline-none max-md:min-w-full", newCpfError ? "border-red-8 focus:border-red-8" : "border-gray-6 focus:border-green-8")}
                                          />
                                          <button
                                            type="button"
                                            onClick={handleConfirmAddCPF}
                                            className="h-9 px-3 rounded-lg border border-gray-6 text-gray-12 text-sm font-semibold font-family-dm-sans hover:bg-gray-3 transition-colors max-md:flex-1"
                                          >
                                            Confirmar
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => { setIsAddingCpf(false); setNewCpfInput(""); setNewCpfError(""); }}
                                            className="h-9 px-3 rounded-lg border border-gray-6 text-sm font-semibold font-family-dm-sans text-gray-11 hover:bg-gray-3 transition-colors max-md:flex-1"
                                          >
                                            Cancelar
                                          </button>
                                        </div>
                                        {newCpfError && (
                                          <p className="text-xs text-red-9 px-1">{newCpfError}</p>
                                        )}
                                      </div>
                                    )}
                                    {/* Rodapé de ações — mobile empilha: [Importar | Adicionar] em linha, "Limpar lista" centralizado abaixo. */}
                                    <div className="px-4 py-3 border-t border-gray-6 flex items-center justify-between gap-3 max-md:flex-col max-md:items-stretch">
                                      <div className="flex md:flex-row flex-col items-center gap-2 max-md:w-full">
                                        <button
                                          type="button"
                                          onClick={handleImportCSV}
                                          className="flex h-10 w-full items-center justify-center gap-1.5 px-3 border border-gray-6 rounded-lg text-gray-12 text-sm font-semibold font-family-dm-sans hover:bg-gray-3 transition-colors"
                                        >
                                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M13.333 10v1.333A2 2 0 0 1 11.333 13.333H4.667A2 2 0 0 1 2.667 11.333V10M5.333 6.667 8 9.333m0 0 2.667-2.666M8 9.333V2.667" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                          </svg>
                                          <span className="truncate">Importar arquivo</span>
                                        </button>
                                        {!isAddingCpf && (
                                          <button
                                            type="button"
                                            onClick={handleAddCPF}
                                            className="flex h-10 w-full items-center justify-center gap-1.5 px-3 border border-gray-6 rounded-lg text-gray-12 text-sm font-semibold font-family-dm-sans hover:bg-gray-3 transition-colors"
                                          >
                                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                              <path d="M8 3.333v9.334M3.333 8h9.334" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                            <span className="truncate">Adicionar campo</span>
                                          </button>
                                        )}
                                      </div>
                                      <button
                                        type="button"
                                        onClick={handleClearList}
                                        className="text-sm font-semibold font-family-dm-sans text-gray-11 hover:text-red-11 transition-colors max-md:self-center"
                                      >
                                        Limpar lista
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                              {/* Aplicar voucher nos adicionais */}
                              <div className="flex flex-col gap-5">
                                <div className="flex flex-col gap-2">
                                  <h3 className="text-gray-12 text-lg font-semibold font-manrope leading-[1.1]">
                                    Aplicar voucher nos adicionais?
                                  </h3>
                                  <p className="text-gray-11 text-base font-family-dm-sans leading-[1.3]">
                                    O voucher também cobrirá os produtos adicionais que não estão inclusos no ingresso
                                  </p>
                                </div>
                                <div className="flex gap-6">
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <Checkbox
                                      checked={!applyToProducts}
                                      onCheckedChange={(checked) => { if (checked) setApplyToProducts(false); }}
                                    />
                                    <span className="text-sm font-family-dm-sans leading-[1.3] text-gray-12">Desabilitar</span>
                                  </label>
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <Checkbox
                                      checked={applyToProducts}
                                      onCheckedChange={(checked) => { if (checked) setApplyToProducts(true); }}
                                    />
                                    <span className="text-sm font-family-dm-sans leading-[1.3] text-gray-12">Habilitar</span>
                                  </label>
                                </div>
                              </div>
                              {/* Validade do voucher */}
                              <div className="flex flex-col gap-5">
                                <div className="flex flex-col gap-2">
                                  <h3 className="text-gray-12 text-lg font-semibold font-manrope leading-[1.1]">
                                    Validade do voucher
                                  </h3>
                                  <p className="text-gray-11 text-base font-family-dm-sans leading-[1.3]">
                                    Após essa data, o voucher não poderá ser usado
                                  </p>
                                </div>
                                <div className="flex gap-6">
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <Checkbox
                                      checked={expiryStatus === "DISABLED"}
                                      onCheckedChange={(checked) => {
                                        if (checked) { setExpiryStatus("DISABLED"); setExpiryDate(null); }
                                      }}
                                    />
                                    <span className="text-sm font-family-dm-sans leading-[1.3] text-gray-12">Desabilitar</span>
                                  </label>
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <Checkbox
                                      checked={expiryStatus === "ENABLED"}
                                      onCheckedChange={(checked) => { if (checked) setExpiryStatus("ENABLED"); }}
                                    />
                                    <span className="text-sm font-family-dm-sans leading-[1.3] text-gray-12">Habilitar</span>
                                  </label>
                                </div>
                                {expiryStatus === "ENABLED" && (
                                  <div className="flex flex-col gap-2">
                                    <label className="text-gray-12 text-base font-family-dm-sans leading-[1.3]">
                                      Expira em:
                                    </label>
                                    <DatePicker
                                      value={expiryDate || undefined}
                                      onChange={setExpiryDate}
                                      minDate={minSelectableExpiryDate}
                                      placeholder="00/00/2026"
                                      className="w-full md:w-auto"
                                    />
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div
                  className={cn(
                    "flex shrink-0 items-center gap-3 border-t border-gray-6 bg-gray-1",
                    "max-md:flex-row max-md:p-4 max-md:pb-[max(1rem,env(safe-area-inset-bottom))]",
                    "md:justify-end md:px-5 md:py-3",
                  )}
                >
                  <Button
                    onClick={closeCreateVoucherModal}
                    variant="outline"
                    className="border-gray-6 text-gray-12 h-11 px-5 max-md:flex-1"
                    disabled={isSubmitting}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSave}
                    variant="default"
                    className="h-11 px-5 max-md:flex-1"
                    disabled={isSubmitting || (!isEditing && appliesTo === 'specific' && selectedTicketIds.length === 0)}
                  >
                    {isSubmitting ? "Salvando..." : isEditing ? "Editar voucher" : "Criar voucher"}
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence >

      <SelectTicketsModal
        isOpen={showSelectTicketsModal}
        onClose={() => setShowSelectTicketsModal(false)}
        onConfirm={(ticketIds) => {
          if (ticketIds.length === 0) {
            setAppliesTo("all");
            setSelectedTicketIds([]);
          } else {
            setAppliesTo("specific");
            setSelectedTicketIds(ticketIds);
          }
        }}
        eventId={eventId}
        selectedTicketIds={appliesTo === "specific" ? selectedTicketIds : []}
        singleSelect
        readOnly={isEditing}
      />
    </>
  );
}
