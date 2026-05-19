"use client";

import React, { useState, useEffect, useLayoutEffect, useRef, useMemo } from "react";
import { useCreateCouponModal } from "@/stores/modalStore";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Radio } from "@/components/Radio";
import { Checkbox } from "@/components/CheckBox";
import { DatePicker } from "@/components/DatePicker";
import { X, Plus, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { TrashIcon } from "../Icons/TrashIcon";
import { organizerService } from "@/services";
import { ArrowButton } from "../ArrowButton";
import { SelectTicketsModal } from "./SelectTicketsModal";
import { cn } from "@/utils/cn";
import { isValidCPF } from "@/utils/cpf";

type CouponType = "DISCOUNT" | "QUANTITY" | "AGE";
type DiscountType = "PERCENTAGE" | "FIXED";
type CPFListStatus = "DISABLED" | "ENABLED";

export function CreateCouponModal() {
  const { isOpen, closeCreateCouponModal, data, onModalSave } = useCreateCouponModal();
  const [couponType, setCouponType] = useState<CouponType | null>(null);
  const [code, setCode] = useState("");
  const [note, setNote] = useState("");
  const [discountType, setDiscountType] = useState<DiscountType>("PERCENTAGE");
  const [value, setValue] = useState("");
  const [appliesTo, setAppliesTo] = useState<"all" | "specific">("all");
  const [selectedTicketIds, setSelectedTicketIds] = useState<string[]>([]);
  const [showSelectTicketsModal, setShowSelectTicketsModal] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [expiryDate, setExpiryDate] = useState<string | null>(null);
  const [expiryEnabled, setExpiryEnabled] = useState(false);
  const [usageLimit, setUsageLimit] = useState("");
  const [usageLimitEnabled, setUsageLimitEnabled] = useState(false);
  const [usageLimitError, setUsageLimitError] = useState("");
  const [codeError, setCodeError] = useState("");
  const [valueError, setValueError] = useState("");
  const [apiError, setApiError] = useState("");
  const [cpfListStatus, setCpfListStatus] = useState<CPFListStatus>("DISABLED");
  const [cpfList, setCpfList] = useState<string[]>([]);
  const [cpfSearch, setCpfSearch] = useState("");
  const [applyToProducts, setApplyToProducts] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMdUp, setIsMdUp] = useState(true);

  useLayoutEffect(() => {
    setIsMdUp(window.matchMedia("(min-width: 768px)").matches);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const onChange = () => setIsMdUp(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const modalBodyScrollRef = useRef<HTMLDivElement>(null);
  const advancedPanelRef = useRef<HTMLDivElement>(null);
  // Guarda se o toggle do painel avançado partiu de clique do usuário.
  // Sem isso, a abertura automática em modo de edição (data sync) dispararia
  // o scroll-into-view e o modal abriria já rolado pra baixo.
  const userToggledAdvancedRef = useRef(false);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [isAddingCpf, setIsAddingCpf] = useState(false);
  const [newCpfInput, setNewCpfInput] = useState("");
  const [newCpfError, setNewCpfError] = useState("");
  const [showImportModal, setShowImportModal] = useState(false);
  const [isDraggingCsv, setIsDraggingCsv] = useState(false);
  const [cpfListError, setCpfListError] = useState("");

  const minSelectableExpiryDate = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, [isOpen]);

  // Campos específicos por tipo de cupom
  const [minQuantity, setMinQuantity] = useState(""); // Para QUANTITY
  const [minAge, setMinAge] = useState(""); // Para AGE
  const [maxAge, setMaxAge] = useState(""); // Para AGE

  const isEditing = data?.couponId !== undefined;
  const eventId = data?.eventId;

  const hasChanges = useMemo(() => {
    if (!isEditing) {
      return !!(couponType || code || value || note);
    }
    const c = data?.coupon;
    if (!c) return false;
    const originalType: DiscountType = c.type || "PERCENTAGE";
    let originalValue = "";
    if (c.value != null) {
      originalValue = originalType === "PERCENTAGE"
        ? `${c.value}%`
        : `R$ ${Number(c.value / 100).toFixed(2).replace(".", ",")}`;
    }
    const originalAppliesTo = (c.appliesTo === "all" || !c.appliesTo) ? "all" : "specific";
    const originalTicketIds = Array.isArray(c.appliesTo)
      ? c.appliesTo.map((t: any) => (typeof t === "string" ? t : t.id)).sort()
      : [];

    return (
      couponType !== (c.couponType || "DISCOUNT") ||
      code !== (c.code || "") ||
      note !== (c.note || "") ||
      discountType !== originalType ||
      value !== originalValue ||
      appliesTo !== originalAppliesTo ||
      JSON.stringify([...selectedTicketIds].sort()) !== JSON.stringify(originalTicketIds) ||
      expiryDate !== (c.expiryDate || null) ||
      expiryEnabled !== !!c.expiryDate ||
      usageLimit !== (c.maxUsage?.toString() || "") ||
      usageLimitEnabled !== !!c.maxUsage ||
      cpfListStatus !== (c.cpfListStatus || "DISABLED") ||
      JSON.stringify(cpfList) !== JSON.stringify(c.cpfList || []) ||
      minQuantity !== (c.minQuantity?.toString() || "") ||
      minAge !== (c.minAge?.toString() || "") ||
      maxAge !== (c.maxAge?.toString() || "") ||
      applyToProducts !== !!c.applyToProducts
    );
  }, [
    isEditing, data, couponType, code, note, discountType, value,
    appliesTo, selectedTicketIds, expiryDate, expiryEnabled,
    usageLimit, usageLimitEnabled, cpfListStatus, cpfList,
    minQuantity, minAge, maxAge, applyToProducts,
  ]);

  // Initialize form when modal opens
  useEffect(() => {
    if (isOpen) {
      // Reseta o intent — qualquer scroll precisa vir de clique explícito do usuário
      // após esta abertura do modal.
      userToggledAdvancedRef.current = false;
      if (isEditing && data?.coupon) {
        // Editing mode - load coupon data
        const c = data.coupon;
        setCouponType(c.couponType || "DISCOUNT");
        setCode(c.code || "");
        setNote(c.note || "");
        const type: DiscountType = c.type || "PERCENTAGE";
        setDiscountType(type);
        if (c.value != null) {
          if (type === "PERCENTAGE") {
            setValue(`${c.value}%`);
          } else {
            const formatted = Number(c.value / 100).toFixed(2).replace(".", ",");
            setValue(`R$ ${formatted}`);
          }
        } else {
          setValue("");
        }

        // Handle appliesTo - pode ser "all" ou array de objetos com ingressos
        if (c.appliesTo === "all" || !c.appliesTo) {
          setAppliesTo("all");
          setSelectedTicketIds([]);
        } else if (Array.isArray(c.appliesTo)) {
          // Se for array, extrair os IDs dos objetos
          const ticketIds = c.appliesTo.map((ticket: any) =>
            typeof ticket === "string" ? ticket : ticket.id
          );
          setAppliesTo("specific");
          setSelectedTicketIds(ticketIds);
        } else {
          setAppliesTo("all");
          setSelectedTicketIds([]);
        }

        setExpiryDate(c.expiryDate || null);
        setExpiryEnabled(!!c.expiryDate);
        setUsageLimit(c.maxUsage?.toString() || "");
        setUsageLimitEnabled(!!c.maxUsage);
        setCpfListStatus(c.cpfListStatus || "DISABLED");
        setCpfList(c.cpfList || []);
        setApplyToProducts(!!c.applyToProducts);
        // Abre painel avançado automaticamente se houver configurações ativas.
        // IMPORTANTE: minQuantity/minAge/maxAge NÃO entram aqui — esses campos
        // ficam no formulário principal (obrigatórios pros tipos QUANTITY/AGE),
        // não no painel avançado, então usá-los como gatilho abria o painel
        // indevidamente em todo cupom desses tipos.
        setShowAdvanced(
          !!(
            c.expiryDate ||
            c.maxUsage ||
            c.cpfListStatus === "ENABLED" ||
            c.applyToProducts
          )
        );
        setMinQuantity(c.minQuantity?.toString() || "");
        setMinAge(c.minAge?.toString() || "");
        setMaxAge(c.maxAge?.toString() || "");
      } else {
        // Create mode - reset form
        setCouponType(null);
        setCode("");
        setNote("");
        setDiscountType("PERCENTAGE");
        setValue("");
        setAppliesTo("all");
        setSelectedTicketIds([]);
        setShowAdvanced(false);
        setExpiryDate(null);
        setExpiryEnabled(false);
        setUsageLimit("");
        setUsageLimitEnabled(false);
        setUsageLimitError("");
        setCodeError("");
        setValueError("");
        setApiError("");
        setCpfListStatus("DISABLED");
        setCpfList([]);
        setApplyToProducts(false);
        setMinQuantity("");
        setMinAge("");
        setMaxAge("");
      }
    }
  }, [isOpen, isEditing, data]);


  useEffect(() => {
    if (!showAdvanced) return;
    // Só rola pra mostrar o painel quando o usuário pediu (clicou no toggle).
    // Abertura automática em modo de edição não deve mexer no scroll.
    if (!userToggledAdvancedRef.current) return;

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

      const bottomOverflow =
        panelRect.bottom - (parentRect.bottom - padding);
      if (bottomOverflow > 0) {
        scrollEl.scrollTop += bottomOverflow;
        return;
      }

      const topOverflow = parentRect.top + padding - panelRect.top;
      if (topOverflow > 0) {
        scrollEl.scrollTop -= topOverflow;
      }
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
        if (attachAttempts < 90) {
          requestAnimationFrame(tryAttach);
        }
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

  const handleAddCPF = () => {
    setIsAddingCpf(true);
    setNewCpfInput("");
  };

  const handleConfirmAddCPF = () => {
    const digits = newCpfInput.replace(/\D/g, "");
    if (digits.length !== 11 || !isValidCPF(digits)) {
      setNewCpfError("CPF inválido.");
      return;
    }
    if (cpfList.includes(digits)) {
      setNewCpfError("CPF já está na lista.");
      return;
    }
    setCpfList([...cpfList, digits]);
    setIsAddingCpf(false);
    setNewCpfInput("");
    setNewCpfError("");
  };

  const handleNewCpfInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 11);
    let formatted = raw;
    if (raw.length > 9) formatted = `${raw.slice(0, 3)}.${raw.slice(3, 6)}.${raw.slice(6, 9)}-${raw.slice(9)}`;
    else if (raw.length > 6) formatted = `${raw.slice(0, 3)}.${raw.slice(3, 6)}.${raw.slice(6)}`;
    else if (raw.length > 3) formatted = `${raw.slice(0, 3)}.${raw.slice(3)}`;
    setNewCpfInput(formatted);
    if (newCpfError) setNewCpfError("");
  };

  const handleImportCSV = () => {
    setShowImportModal(true);
  };

  const processCSVFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split(/[\r\n,;]+/);
      const newCpfs: string[] = [];
      let duplicates = 0;
      let invalid = 0;
      for (const line of lines) {
        const digits = line.replace(/\D/g, "");
        if (digits.length !== 11 || !isValidCPF(digits)) { if (digits.length > 0) invalid++; continue; }
        if (cpfList.includes(digits) || newCpfs.includes(digits)) { duplicates++; continue; }
        newCpfs.push(digits);
      }
      if (newCpfs.length > 0) {
        setCpfList((prev) => [...prev, ...newCpfs]);
        setCpfListError("");
      }
      const parts: string[] = [];
      if (newCpfs.length > 0) parts.push(`${newCpfs.length} CPF(s) importado(s)`);
      if (duplicates > 0) parts.push(`${duplicates} duplicado(s) ignorado(s)`);
      if (invalid > 0) parts.push(`${invalid} inválido(s) ignorado(s)`);
      if (parts.length > 0) toast.success(parts.join(", "));
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

  const formatCPF = (cpf: string) => {
    const numbers = cpf.replace(/\D/g, "");
    if (numbers.length === 11) {
      return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9)}`;
    }
    return cpf;
  };

  const handleSave = async () => {
    if (!couponType) {
      toast.error("Selecione um tipo de cupom");
      return;
    }

    // Validação do código (obrigatório apenas para DISCOUNT, opcional para outros)
    if (couponType === "DISCOUNT") {
      if (!code.trim()) {
        toast.error("Digite um código para o cupom");
        return;
      }
      if (code.length > 25) {
        toast.error("O código deve ter no máximo 25 caracteres");
        return;
      }
      if (!/^[A-Za-z0-9]+$/.test(code)) {
        toast.error("O código deve conter apenas letras e números, sem espaços");
        return;
      }
    } else if (code.trim()) {
      // Se código foi preenchido para outros tipos, validar formato
      if (code.length > 25) {
        toast.error("O código deve ter no máximo 25 caracteres");
        return;
      }
      if (!/^[A-Za-z0-9]+$/.test(code)) {
        toast.error("O código deve conter apenas letras e números, sem espaços");
        return;
      }
    }

    if (!value.trim()) {
      setValueError("Digite um valor para o desconto");
      return;
    }

    const numericValue = discountType === "PERCENTAGE"
      ? parseFloat(value.replace(/[^0-9]/g, ""))
      : parseFloat(value.replace(/[^0-9,]/g, "").replace(",", "."));

    if (isNaN(numericValue) || numericValue <= 0) {
      toast.error("Digite um valor válido");
      return;
    }

    if (discountType === "PERCENTAGE" && numericValue > 100) {
      toast.error("O desconto percentual não pode ser maior que 100%");
      return;
    }

    // Validações específicas por tipo de cupom
    if (couponType === "QUANTITY") {
      if (!minQuantity.trim() || parseInt(minQuantity) <= 0) {
        toast.error("Digite uma quantidade mínima válida");
        return;
      }
    }

    if (couponType === "AGE") {
      if (!minAge.trim() && !maxAge.trim()) {
        toast.error("Digite ao menos uma idade (mínima ou máxima)");
        return;
      }
      if (minAge && maxAge && parseInt(minAge) >= parseInt(maxAge)) {
        toast.error("A idade mínima deve ser menor que a máxima");
        return;
      }
    }

    if (usageLimitEnabled && usageLimit) {
      const currentUsageCount = data?.coupon?.usageCount ?? 0;
      if (parseInt(usageLimit) < currentUsageCount) {
        const msg = `O limite não pode ser menor que o uso atual (${currentUsageCount})`;
        setUsageLimitError(msg);
        toast.error(msg);
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

    setIsSubmitting(true);

    try {
      // Backend usa PATCH semantics: campo ausente = sem alteração.
      // `undefined` é stripado pelo JSON.stringify → precisaria mandar `null`
      // explicitamente pra LIMPAR um valor anteriormente setado (a interface do
      // backend declara esses campos como `number | null` / `string | null`).
      const couponData: any = {
        couponType,
        type: discountType,
        value: discountType === "FIXED" ? Math.round(numericValue * 100) : numericValue,
        note: note.trim() || null,
        expiryDate: expiryEnabled && expiryDate ? expiryDate : null,
        maxUsage: usageLimitEnabled && usageLimit ? parseInt(usageLimit) : null,
        cpfListStatus,
        cpfList: cpfListStatus === "ENABLED" ? cpfList : null,
        applyToProducts,
        // Campos específicos por tipo — quando o tipo do cupom muda, os campos
        // dos outros tipos precisam ser limpos no backend.
        minQuantity: couponType === "QUANTITY" ? parseInt(minQuantity) : null,
        minAge: couponType === "AGE" && minAge ? parseInt(minAge) : null,
        maxAge: couponType === "AGE" && maxAge ? parseInt(maxAge) : null,
      };

      // Código é obrigatório apenas para DISCOUNT, opcional para outros tipos
      if (couponType === "DISCOUNT") {
        couponData.code = code.trim().toUpperCase();
      } else if (code.trim()) {
        // Se código foi preenchido para outros tipos, enviar
        couponData.code = code.trim().toUpperCase();
      }

      // appliesTo: 'all' ou array de IDs de ingressos específicos
      if (appliesTo === "all") {
        couponData.appliesTo = "all";
      } else {
        // Se ingressos específicos foram selecionados, enviar array de IDs
        couponData.appliesTo = selectedTicketIds.length > 0 ? selectedTicketIds : "all";
      }

      if (isEditing && data?.couponId) {
        await organizerService.updateCoupon(eventId, data.couponId, couponData);
        toast.success("Cupom atualizado com sucesso!");
      } else {
        await organizerService.createCoupon(eventId, couponData);
        toast.success("Cupom criado com sucesso!");
      }

      if (onModalSave) {
        await onModalSave(couponData);
      }

      closeCreateCouponModal();
    } catch (error: any) {
      const raw = error.response?.data?.message ?? error?.message ?? "";
      const message = Array.isArray(raw) ? raw[0] : String(raw);
      const code = error.response?.data?.code ?? error.response?.data?.error ?? "";
      // Detecta colisão de código tanto pelo error code do backend quanto por
      // pattern matching nas mensagens (PT-BR e EN), pra não depender de um
      // único idioma/formato.
      const normalized = message.toLowerCase();
      const isDuplicateCode =
        String(code).toUpperCase().includes("DUPLICATE") ||
        String(code).toUpperCase().includes("ALREADY_EXISTS") ||
        normalized.includes("already exists") ||
        normalized.includes("já existe");
      if (isDuplicateCode) {
        setCodeError(message || "Esse código já existe para este evento");
      } else {
        setApiError(message || "Erro ao salvar cupom");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const panelMotion = isMdUp
    ? {
      initial: { opacity: 0, scale: 0.95, y: 20 },
      animate: { opacity: 1, scale: 1, y: 0 },
      exit: { opacity: 0, scale: 0.95, y: 20 },
    }
    : {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
    };

  const couponTypeLabel =
    couponType === "DISCOUNT"
      ? "Cupom de desconto"
      : couponType === "QUANTITY"
        ? "Cupom por quantidade (automático)"
        : couponType === "AGE"
          ? "Cupom por idade (automático)"
          : null;

  const couponTypeDescription =
    couponType === "DISCOUNT"
      ? "Crie um código para o participante digitar no pagamento e receber o desconto"
      : couponType === "QUANTITY"
        ? "Desconto automático quando o carrinho atingir uma quantidade mínima de ingressos"
        : couponType === "AGE"
          ? "Desconto automático para participantes dentro de uma faixa de idade na data do evento"
          : null;

  return (
    <>
      <input
        ref={csvInputRef}
        type="file"
        accept=".csv,.txt"
        className="hidden"
        onChange={handleCSVFileChange}
      />

      {/* Modal de importação de CSV */}
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
              <div className="bg-gray-1 rounded-xl w-full max-w-[569px] flex flex-col overflow-hidden shadow-xl">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-6">
                  <span className="text-gray-12 text-[20px] font-semibold font-family-dm-sans leading-[26px]">Importar lista de CPF</span>
                  <button
                    type="button"
                    onClick={() => setShowImportModal(false)}
                    className="w-9 h-9 rounded-lg hover:bg-gray-3 transition-colors inline-flex items-center justify-center overflow-hidden"
                  >
                    <img src="https://podioticket.com.br/images/remove.svg" alt="Fechar" className="w-9 h-9 object-contain" />
                  </button>
                </div>

                {/* Body */}
                <div className="flex flex-col gap-9 px-5 pt-5 pb-8 overflow-y-auto">
                  {/* Formato esperado */}
                  <div className="flex flex-col gap-4">
                    <h3 className="text-gray-12 text-[18px] font-semibold font-family-manrope leading-[19.8px]">Formato esperado do arquivo</h3>
                    <div className="w-[290px] bg-gray-2 rounded-lg overflow-hidden flex flex-col" style={{ outline: '1px solid #D9D9D9' }}>
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
                      <svg className="w-6 h-6 shrink-0" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="7" r="1" fill="#646464" />
                        <path d="M11 10H12V17M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z" stroke="#646464" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <p className="flex-1 text-gray-11 text-[16px] font-normal font-family-dm-sans leading-[20.8px]">1 CPF por linha. Pode usar apenas números, com pontuação ou sem pontuação. Duplicadas serão ignoradas automaticamente.</p>
                    </div>
                  </div>

                  {/* Drop zone */}
                  <div className="flex flex-col gap-4">
                    <h3 className="text-gray-12 text-[18px] font-semibold font-family-manrope leading-[19.8px]">Arquivo CSV</h3>
                    <div
                      onClick={() => csvInputRef.current?.click()}
                      onDragOver={(e) => { e.preventDefault(); setIsDraggingCsv(true); }}
                      onDragLeave={() => setIsDraggingCsv(false)}
                      onDrop={handleDropzoneDrop}
                      className={`flex items-center gap-4 p-6 rounded-xl cursor-pointer transition-colors ${isDraggingCsv ? "bg-green-2" : "hover:bg-gray-2"}`}
                      style={{ outline: isDraggingCsv ? '2px solid #46A758' : '2px solid #D9D9D9' }}
                    >
                      <div className="w-16 h-16 shrink-0 flex items-center justify-center">
                        <img src="/images/plus.svg" alt="" className="w-16 h-16" />
                      </div>
                      <div className="flex-1 flex flex-col justify-center items-start gap-6">
                        <div className="flex flex-col gap-4 w-full">
                          <p className="w-full text-[16px] font-bold font-family-dm-sans leading-[20.8px]" style={{ color: '#308737' }}>Clique para selecionar ou arraste o arquivo aqui</p>
                          <p className="w-full text-[16px] font-semibold font-family-manrope leading-[17.6px]" style={{ color: '#202020' }}>Formato aceito: .CSV e .TXT</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-2 px-4 py-3 bg-gray-2 border-t border-gray-6">
                  <button
                    type="button"
                    onClick={() => setShowImportModal(false)}
                    className="h-11 px-5 rounded-lg text-gray-12 text-[16px] font-bold font-family-manrope leading-[17.6px] hover:bg-gray-3 transition-colors"
                    style={{ outline: '1px solid #D9D9D9' }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => csvInputRef.current?.click()}
                    className="h-11 px-5 rounded-lg text-[16px] font-bold font-family-manrope leading-[17.6px] transition-colors"
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
              onClick={closeCreateCouponModal}
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
                      onClick={closeCreateCouponModal}
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
                      {isEditing ? "Editar cupom" : "Criar cupom"}
                    </h2>
                  </div>
                  <button
                    onClick={closeCreateCouponModal}
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

                      {/* Tipo de cupom — só na criação. Na edição o tipo é imutável. */}
                      {!isEditing && (
                        <div className="flex flex-col gap-4">
                          <div className="flex flex-col gap-3">
                            <h3 className="text-gray-12 text-lg font-semibold font-manrope leading-[1.1]">
                              O que você quer criar?
                            </h3>
                            <p className="text-gray-11 text-base font-family-dm-sans leading-[1.3]">
                              Escolha um tipo de desconto para configurar
                            </p>
                          </div>
                          <div className="flex flex-col gap-2 md:flex-row md:flex-wrap">
                            {(
                              [
                                { key: "DISCOUNT" as CouponType, label: "Cupom de desconto", onSelect: () => { setCouponType("DISCOUNT"); setMinQuantity(""); setMinAge(""); setMaxAge(""); } },
                                { key: "QUANTITY" as CouponType, label: "Cupom por quantidade", onSelect: () => { setCouponType("QUANTITY"); setMinAge(""); setMaxAge(""); } },
                                { key: "AGE" as CouponType, label: "Cupom por idade", onSelect: () => { setCouponType("AGE"); setMinQuantity(""); } },
                              ] as const
                            ).map(({ key, label, onSelect }) => (
                              <button
                                key={key}
                                onClick={onSelect}
                                className={cn(
                                  "flex items-center gap-2 px-3 py-3 rounded-lg border transition-colors w-full md:w-auto",
                                  couponType === key
                                    ? "bg-primary-4 border-primary-8"
                                    : "border-gray-6 hover:bg-gray-2",
                                )}
                              >
                                <Checkbox checked={couponType === key} />
                                <span className={cn(
                                  "text-sm font-family-dm-sans leading-[1.3]",
                                  couponType === key ? "text-gray-12" : "text-gray-11",
                                )}>
                                  {label}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {couponType && (
                        <>
                          {/* Título do tipo de cupom selecionado */}
                          <div className="flex flex-col gap-3">
                            <h3 className="text-gray-12 text-xl font-bold font-manrope leading-[1.1]">
                              {couponTypeLabel}
                            </h3>
                            <p className="text-gray-11 text-base font-family-dm-sans leading-[1.3]">
                              {couponTypeDescription}
                            </p>
                          </div>

                          {/* Código do cupom — apenas DISCOUNT */}
                          {couponType === "DISCOUNT" && (
                            <div className="flex flex-col gap-2">
                              <label className="text-gray-12 text-base font-family-dm-sans leading-[1.3]">
                                Código do cupom
                              </label>
                              <div className="relative">
                                <Input
                                  type="text"
                                  placeholder="Ex: PODIO10"
                                  value={code}
                                  onChange={(e) => {
                                    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
                                    if (val.length <= 25) setCode(val);
                                    if (codeError) setCodeError("");
                                  }}
                                  maxLength={25}
                                  className={cn("h-12 pr-16", codeError && "border-red-9 focus-visible:border-red-9")}
                                />
                                {codeError && (
                                  <p className="text-sm text-red-9 font-family-dm-sans">{codeError}</p>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Quantidade mínima — QUANTITY */}
                          {couponType === "QUANTITY" && (
                            <div className="flex flex-col gap-2.5 md:w-[596px]">
                              <div className="flex flex-col gap-2">
                                <label className="text-gray-12 text-base font-family-dm-sans leading-[1.3]">
                                  Quantidade mínima de ingressos
                                </label>
                                <Input
                                  type="text"
                                  placeholder="Ex: 3"
                                  value={minQuantity}
                                  onChange={(e) => setMinQuantity(e.target.value.replace(/[^0-9]/g, ""))}
                                  className="h-12"
                                />
                              </div>
                              <p className="text-gray-11 text-base font-family-dm-sans leading-[1.3]">
                                Ao atingir essa quantidade no carrinho, o cupom é aplicado automaticamente
                              </p>
                            </div>
                          )}

                          {/* Faixa de idade — AGE */}
                          {couponType === "AGE" && (
                            <div className="flex flex-col gap-5 w-full">
                              <div className="flex flex-col gap-3">
                                <h3 className="text-gray-12 text-lg font-semibold font-manrope leading-[1.1]">
                                  Regra de idade
                                </h3>
                                <p className="text-gray-11 text-base font-family-dm-sans leading-[1.3]">
                                  O cupom será aplicado automaticamente para participantes dentro da faixa de idade definida. Preencha ao menos um campo.
                                </p>
                              </div>
                              <div className="flex flex-col gap-2">
                                <div className="flex gap-4">
                                  <div className="flex flex-col gap-2 flex-1 max-w-[130px]">
                                    <label className="text-gray-12 text-base font-family-dm-sans leading-[1.3]">
                                      Idade mínima
                                    </label>
                                    <Input
                                      type="text"
                                      placeholder="Ex: 18"
                                      value={minAge}
                                      onChange={(e) => { setMinAge(e.target.value.replace(/[^0-9]/g, "")); if (apiError) setApiError(""); }}
                                      className={cn("h-12", apiError && "border-red-9 focus-visible:border-red-9")}
                                    />
                                  </div>
                                  <div className="flex flex-col gap-2 flex-1 max-w-[130px]">
                                    <label className="text-gray-12 text-base font-family-dm-sans leading-[1.3]">
                                      Idade máxima
                                    </label>
                                    <Input
                                      type="text"
                                      placeholder="Ex: 65"
                                      value={maxAge}
                                      onChange={(e) => { setMaxAge(e.target.value.replace(/[^0-9]/g, "")); if (apiError) setApiError(""); }}
                                      className={cn("h-12", apiError && "border-red-9 focus-visible:border-red-9")}
                                    />
                                  </div>
                                </div>
                                {apiError && (
                                  <p className="text-sm text-red-11 font-family-dm-sans leading-[1.3]">{apiError}</p>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Tipo de desconto */}
                          <div className="flex flex-col gap-4">
                            <div className="flex flex-col gap-2">
                              <h3 className="text-gray-12 text-lg font-medium font-family-dm-sans leading-[1.3]">
                                Tipo de desconto
                              </h3>
                              <p className="text-gray-11 text-base font-family-dm-sans leading-[1.3]">
                                Escolha como o desconto será aplicado
                              </p>
                            </div>
                            <div className="flex gap-6">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <Radio
                                  checked={discountType === "PERCENTAGE"}
                                  onChange={() => { setDiscountType("PERCENTAGE"); setValue(""); }}
                                />
                                <span className="text-sm font-family-dm-sans leading-[1.3] text-gray-12">
                                  Percentual (%)
                                </span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <Radio
                                  checked={discountType === "FIXED"}
                                  onChange={() => { setDiscountType("FIXED"); setValue(""); }}
                                />
                                <span className="text-sm font-family-dm-sans leading-[1.3] text-gray-12">
                                  Valor fixo (R$)
                                </span>
                              </label>
                            </div>
                            <div className="flex flex-col gap-2 w-full md:w-[259px]">
                              <label className="text-gray-12 text-base font-family-dm-sans leading-[1.3]">
                                Valor
                              </label>
                              <Input
                                type="text"
                                placeholder={discountType === "PERCENTAGE" ? "Ex: 10%" : "Ex: 20,00"}
                                value={value}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (discountType === "PERCENTAGE") {
                                    const num = val.replace(/[^0-9]/g, "");
                                    if (num === "" || parseInt(num) <= 100) setValue(num ? `${num}%` : "");
                                  } else {
                                    const raw = val.replace(/[^0-9,]/g, "");
                                    if (!raw) {
                                      setValue("");
                                    } else {
                                      setValue(`R$ ${raw}`);
                                    }
                                  }
                                  if (valueError) setValueError("");
                                  if (apiError) setApiError("");
                                }}
                                className={cn("h-12", valueError && "border-red-9 focus-visible:border-red-9")}
                              />
                              {valueError && (
                                <p className="text-sm text-red-11 font-family-dm-sans">{valueError}</p>
                              )}
                            </div>
                          </div>

                          {/* Aplicar em quais ingressos */}
                          <div className="flex flex-col gap-3">
                            <label className="font-family-dm-sans text-base font-normal leading-[1.3] text-gray-12">
                              Quer aplicar esse cupom a todos os ingressos?
                            </label>
                            <div className="flex flex-wrap gap-6 max-md:gap-10">
                              <label className="flex cursor-pointer items-center gap-2">
                                <Radio
                                  checked={appliesTo === "all"}
                                  onChange={() => {
                                    setAppliesTo("all");
                                    setSelectedTicketIds([]);
                                  }}
                                  name="apply-coupon-tickets"
                                  className="size-6"
                                />
                                <span className="font-family-dm-sans text-sm font-normal leading-[1.3] text-gray-12">
                                  Sim
                                </span>
                              </label>
                              <label className="flex cursor-pointer items-center gap-2">
                                <Radio
                                  checked={appliesTo === "specific"}
                                  onChange={() => setAppliesTo("specific")}
                                  name="apply-coupon-tickets"
                                  className="size-6"
                                />
                                <span className="font-family-dm-sans text-sm font-normal leading-[1.3] text-gray-12">
                                  Não
                                </span>
                              </label>
                            </div>
                            {appliesTo === "specific" && (
                              <div className="flex w-full max-w-none flex-col gap-2 md:max-w-[276px]">
                                <label className="font-family-dm-sans text-base font-normal leading-[1.3] text-gray-12">
                                  Aplicar em quais ingressos?
                                </label>
                                <button
                                  type="button"
                                  onClick={() => setShowSelectTicketsModal(true)}
                                  className="flex h-12 w-full cursor-pointer items-center justify-between rounded-lg border border-gray-6 px-3 text-left transition-colors hover:bg-gray-3"
                                >
                                  <span className="font-family-dm-sans text-base font-normal text-gray-11">
                                    {selectedTicketIds.length > 0
                                      ? `${selectedTicketIds.length} ingresso${selectedTicketIds.length > 1 ? "s" : ""} selecionado${selectedTicketIds.length > 1 ? "s" : ""}`
                                      : "Selecione os ingressos"}
                                  </span>
                                  <ArrowButton isOpen={false} />
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Conteúdo avançado */}
                          <div className="flex flex-col gap-5">
                            <button
                              onClick={() => {
                                userToggledAdvancedRef.current = true;
                                setShowAdvanced(!showAdvanced);
                              }}
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
                                    // Mesma guarda: não scrollar quando o painel
                                    // foi aberto automaticamente em modo de edição.
                                    if (!userToggledAdvancedRef.current) return;
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
                                  {/* Validade do cupom */}
                                  <div className="flex flex-col gap-5">
                                    <div className="flex flex-col gap-2">
                                      <h3 className="text-gray-12 text-lg font-semibold font-manrope leading-[1.1]">
                                        Validade do cupom
                                      </h3>
                                      <p className="text-gray-11 text-base font-family-dm-sans leading-[1.3]">
                                        Após essa data, o cupom não poderá ser usado
                                      </p>
                                    </div>
                                    <div className="flex gap-6">
                                      <label className="flex items-center gap-2 cursor-pointer">
                                        <Checkbox
                                          checked={!expiryEnabled}
                                          onCheckedChange={(checked) => {
                                            if (checked) { setExpiryEnabled(false); setExpiryDate(null); }
                                          }}
                                        />
                                        <span className="text-sm font-family-dm-sans leading-[1.3] text-gray-12">Desabilitar</span>
                                      </label>
                                      <label className="flex items-center gap-2 cursor-pointer">
                                        <Checkbox
                                          checked={expiryEnabled}
                                          onCheckedChange={(checked) => { if (checked) setExpiryEnabled(true); }}
                                        />
                                        <span className="text-sm font-family-dm-sans leading-[1.3] text-gray-12">Habilitar</span>
                                      </label>
                                    </div>
                                    {expiryEnabled && (
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

                                  {/* Limite por cupom */}
                                  <div className="flex flex-col gap-5">
                                    <div className="flex flex-col gap-2">
                                      <h3 className="text-gray-12 text-lg font-semibold font-manrope leading-[1.1]">
                                        Limite por cupom
                                      </h3>
                                      <p className="text-gray-11 text-base font-family-dm-sans leading-[1.3]">
                                        Número máximo de vezes que esse cupom pode ser utilizado
                                      </p>
                                    </div>
                                    <div className="flex gap-6">
                                      <label className="flex items-center gap-2 cursor-pointer">
                                        <Checkbox
                                          checked={!usageLimitEnabled}
                                          onCheckedChange={(checked) => {
                                            if (checked) { setUsageLimitEnabled(false); setUsageLimit(""); setUsageLimitError(""); }
                                          }}
                                        />
                                        <span className="text-sm font-family-dm-sans leading-[1.3] text-gray-12">Desabilitar</span>
                                      </label>
                                      <label className="flex items-center gap-2 cursor-pointer">
                                        <Checkbox
                                          checked={usageLimitEnabled}
                                          onCheckedChange={(checked) => { if (checked) setUsageLimitEnabled(true); }}
                                        />
                                        <span className="text-sm font-family-dm-sans leading-[1.3] text-gray-12">Habilitar</span>
                                      </label>
                                    </div>
                                    {usageLimitEnabled && (
                                      <div className="flex flex-col gap-2 w-full md:w-[259px]">
                                        <label className="text-gray-12 text-base font-family-dm-sans leading-[1.3]">
                                          Limite
                                        </label>
                                        <Input
                                          type="text"
                                          placeholder="Ex: 45"
                                          value={usageLimit}
                                          onChange={(e) => {
                                            const num = e.target.value.replace(/[^0-9]/g, "");
                                            setUsageLimit(num);
                                            const currentUsageCount = data?.coupon?.usageCount ?? 0;
                                            if (num && parseInt(num) < currentUsageCount) {
                                              setUsageLimitError(`O limite não pode ser menor que o uso atual (${currentUsageCount})`);
                                            } else {
                                              setUsageLimitError("");
                                            }
                                          }}
                                          className={`h-12 ${usageLimitError ? "border-red-6 focus:border-red-10" : ""}`}
                                        />
                                        {usageLimitError && (
                                          <p className="text-sm text-red-11">{usageLimitError}</p>
                                        )}
                                      </div>
                                    )}
                                  </div>

                                  {/* Lista exclusiva por CPF */}
                                  <div className="flex flex-col gap-4">
                                    <div className="flex flex-col gap-2">
                                      <h3 className="text-gray-12 text-lg font-medium font-family-dm-sans leading-[1.3]">
                                        Deseja ativar lista exclusiva por CPF?
                                      </h3>
                                      <p className="text-gray-11 text-base font-family-dm-sans leading-[1.3]">
                                        Restrinja o cupom para uma lista específica de CPFs
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
                                        {/* Search field */}
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
                                        {/* Table */}
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
                                        {/* Inline add CPF row */}
                                        {isAddingCpf && (
                                          <div className="px-4 py-2 border-t border-gray-6 flex flex-col gap-1">
                                            <div className="flex items-center gap-2">
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
                                                className={cn("flex-1 h-9 px-3 rounded-lg border bg-gray-1 text-sm text-gray-12 placeholder:text-gray-9 focus:outline-none", newCpfError ? "border-red-8 focus:border-red-8" : "border-gray-6 focus:border-green-8")}
                                              />
                                              <button
                                                type="button"
                                                onClick={handleConfirmAddCPF}
                                                className="h-9 px-3 rounded-lg border border-gray-6 text-gray-12 text-sm font-semibold font-family-dm-sans hover:bg-gray-3 transition-colors"
                                              >
                                                Confirmar
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => { setIsAddingCpf(false); setNewCpfInput(""); setNewCpfError(""); }}
                                                className="h-9 px-3 rounded-lg border border-gray-6 text-sm font-semibold font-family-dm-sans text-gray-11 hover:bg-gray-3 transition-colors"
                                              >
                                                Cancelar
                                              </button>
                                            </div>
                                            {newCpfError && (
                                              <p className="text-xs text-red-9 px-1">{newCpfError}</p>
                                            )}
                                          </div>
                                        )}
                                        {/* Footer actions */}
                                        <div className="px-4 py-3 border-t border-gray-6 flex items-center justify-between">
                                          <div className="flex items-center gap-2">
                                            <button
                                              type="button"
                                              onClick={handleImportCSV}
                                              className="flex items-center gap-1.5 h-9 px-3 border border-gray-6 rounded-lg text-gray-12 text-sm font-semibold font-family-dm-sans hover:bg-gray-3 transition-colors"
                                            >
                                              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M13.333 10v1.333A2 2 0 0 1 11.333 13.333H4.667A2 2 0 0 1 2.667 11.333V10M5.333 6.667 8 9.333m0 0 2.667-2.666M8 9.333V2.667" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                              </svg>
                                              Importar arquivo
                                            </button>
                                            <button
                                              type="button"
                                              onClick={handleAddCPF}
                                              className="flex items-center gap-1.5 h-9 px-3 border border-gray-6 rounded-lg text-gray-12 text-sm font-semibold font-family-dm-sans hover:bg-gray-3 transition-colors"
                                            >
                                              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M8 3.333v9.334M3.333 8h9.334" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                              </svg>
                                              Adicionar campo
                                            </button>
                                          </div>
                                          <button
                                            type="button"
                                            onClick={handleClearList}
                                            className="text-sm font-semibold font-family-dm-sans text-gray-11 hover:text-red-11 transition-colors"
                                          >
                                            Limpar lista
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {/* Aplicar cupom nos adicionais */}
                                  <div className="flex flex-col gap-5">
                                    <div className="flex flex-col gap-2">
                                      <h3 className="text-gray-12 text-lg font-semibold font-manrope leading-[1.1]">
                                        Aplicar cupom nos adicionais?
                                      </h3>
                                      <p className="text-gray-11 text-base font-family-dm-sans leading-[1.3]">
                                        O desconto também será aplicado aos produtos adicionais que não estão inclusos no ingresso
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
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </>
                      )}
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
                    onClick={closeCreateCouponModal}
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
                    disabled={isSubmitting || !hasChanges}
                  >
                    {isSubmitting ? "Salvando..." : isEditing ? "Salvar alterações" : "Criar cupom"}
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <SelectTicketsModal
        isOpen={showSelectTicketsModal}
        onClose={() => setShowSelectTicketsModal(false)}
        onConfirm={(ticketIds) => {
          setSelectedTicketIds(ticketIds);
          setAppliesTo(ticketIds.length > 0 ? "specific" : "all");
        }}
        eventId={eventId}
        selectedTicketIds={selectedTicketIds}
      />
    </>
  );
}
