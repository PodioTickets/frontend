"use client";

import { useState, useEffect, useLayoutEffect, useRef, useMemo } from "react";
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
  const [minCartValue, setMinCartValue] = useState("");
  const [minCartEnabled, setMinCartEnabled] = useState(false);
  const [cpfListStatus, setCpfListStatus] = useState<CPFListStatus>("DISABLED");
  const [cpfList, setCpfList] = useState<string[]>([]);
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
      minCartValue !== (c.minCartValue?.toString() || "") ||
      minCartEnabled !== !!c.minCartValue ||
      cpfListStatus !== (c.cpfListStatus || "DISABLED") ||
      JSON.stringify(cpfList) !== JSON.stringify(c.cpfList || []) ||
      minQuantity !== (c.minQuantity?.toString() || "") ||
      minAge !== (c.minAge?.toString() || "") ||
      maxAge !== (c.maxAge?.toString() || "")
    );
  }, [
    isEditing, data, couponType, code, note, discountType, value,
    appliesTo, selectedTicketIds, expiryDate, expiryEnabled,
    minCartValue, minCartEnabled, cpfListStatus, cpfList,
    minQuantity, minAge, maxAge,
  ]);

  // Initialize form when modal opens
  useEffect(() => {
    if (isOpen) {
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
        setMinCartValue(c.minCartValue?.toString() || "");
        setMinCartEnabled(!!c.minCartValue);
        setCpfListStatus(c.cpfListStatus || "DISABLED");
        setCpfList(c.cpfList || []);
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
        setMinCartValue("");
        setMinCartEnabled(false);
        setCpfListStatus("DISABLED");
        setCpfList([]);
        setMinQuantity("");
        setMinAge("");
        setMaxAge("");
      }
    }
  }, [isOpen, isEditing, data]);


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
    // TODO: Implementar adição de CPF individual
    toast.success("Funcionalidade de adicionar CPF individual em desenvolvimento");
  };

  const handleImportCSV = () => {
    // TODO: Implementar importação de CSV
    toast.success("Funcionalidade de importar CSV em desenvolvimento");
  };

  const handleRemoveCPF = (index: number) => {
    setCpfList(cpfList.filter((_, i) => i !== index));
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
      toast.error("Digite um valor para o desconto");
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

    if (!eventId) {
      toast.error("Evento não encontrado");
      return;
    }

    setIsSubmitting(true);

    try {
      const couponData: any = {
        couponType,
        type: discountType,
        value: discountType === "FIXED" ? Math.round(numericValue * 100) : numericValue,
        note: note.trim() || undefined,
        expiryDate: expiryEnabled && expiryDate ? expiryDate : undefined,
        minCartValue: minCartEnabled && minCartValue ? parseInt(minCartValue) : undefined,
        cpfListStatus,
        cpfList: cpfListStatus === "ENABLED" ? cpfList : undefined,
        // Campos específicos por tipo
        minQuantity: couponType === "QUANTITY" ? parseInt(minQuantity) : undefined,
        minAge: couponType === "AGE" && minAge ? parseInt(minAge) : undefined,
        maxAge: couponType === "AGE" && maxAge ? parseInt(maxAge) : undefined,
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
      console.error("Error saving coupon:", error);
      toast.error(error.response?.data?.message || "Erro ao salvar cupom");
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

                      {/* Tipo de cupom */}
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
                                  }}
                                  maxLength={25}
                                  className="h-12 pr-16"
                                />
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
                              <div className="flex gap-4">
                                <div className="flex flex-col gap-2 flex-1 max-w-[130px]">
                                  <label className="text-gray-12 text-base font-family-dm-sans leading-[1.3]">
                                    Idade mínima
                                  </label>
                                  <Input
                                    type="text"
                                    placeholder="Ex: 18"
                                    value={minAge}
                                    onChange={(e) => setMinAge(e.target.value.replace(/[^0-9]/g, ""))}
                                    className="h-12"
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
                                    onChange={(e) => setMaxAge(e.target.value.replace(/[^0-9]/g, ""))}
                                    className="h-12"
                                  />
                                </div>
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
                                }}
                                className="h-12"
                              />
                            </div>
                          </div>

                          {/* Aplicar em quais ingressos */}
                          <div className="flex flex-col gap-2">
                            <label className="text-gray-12 text-base font-family-dm-sans leading-[1.3]">
                              Aplicar em quais ingressos?
                            </label>
                            <button
                              type="button"
                              onClick={() => setShowSelectTicketsModal(true)}
                              className="border border-gray-7 rounded-lg h-12 flex items-center justify-between px-3 cursor-pointer hover:bg-gray-3 transition-colors text-left w-full md:max-w-[276px]"
                            >
                              <span className="text-base font-family-dm-sans leading-[1.3] text-gray-11">
                                {appliesTo === "specific" && selectedTicketIds.length > 0
                                  ? `${selectedTicketIds.length} ingresso${selectedTicketIds.length > 1 ? "s" : ""} selecionado${selectedTicketIds.length > 1 ? "s" : ""}`
                                  : "Todos os ingressos"}
                              </span>
                              <ArrowButton isOpen={false} />
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
                                          checked={!minCartEnabled}
                                          onCheckedChange={(checked) => {
                                            if (checked) { setMinCartEnabled(false); setMinCartValue(""); }
                                          }}
                                        />
                                        <span className="text-sm font-family-dm-sans leading-[1.3] text-gray-12">Desabilitar</span>
                                      </label>
                                      <label className="flex items-center gap-2 cursor-pointer">
                                        <Checkbox
                                          checked={minCartEnabled}
                                          onCheckedChange={(checked) => { if (checked) setMinCartEnabled(true); }}
                                        />
                                        <span className="text-sm font-family-dm-sans leading-[1.3] text-gray-12">Habilitar</span>
                                      </label>
                                    </div>
                                    {minCartEnabled && (
                                      <div className="flex flex-col gap-2 w-full md:w-[259px]">
                                        <label className="text-gray-12 text-base font-family-dm-sans leading-[1.3]">
                                          Limite
                                        </label>
                                        <Input
                                          type="text"
                                          placeholder="Ex: 45"
                                          value={minCartValue}
                                          onChange={(e) => {
                                            const num = e.target.value.replace(/[^0-9]/g, "");
                                            setMinCartValue(num);
                                          }}
                                          className="h-12"
                                        />
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
                                          onCheckedChange={(checked) => { if (checked) setCpfListStatus("DISABLED"); }}
                                        />
                                        <span className="text-sm font-family-dm-sans leading-[1.3] text-gray-12">Desabilitado</span>
                                      </label>
                                      <label className="flex items-center gap-2 cursor-pointer">
                                        <Checkbox
                                          checked={cpfListStatus === "ENABLED"}
                                          onCheckedChange={(checked) => { if (checked) setCpfListStatus("ENABLED"); }}
                                        />
                                        <span className="text-sm font-family-dm-sans leading-[1.3] text-gray-12">Habilitar</span>
                                      </label>
                                    </div>

                                    {cpfListStatus === "ENABLED" && (
                                      <div className="bg-gray-2 border-[1.5px] border-gray-6 rounded-lg overflow-hidden flex flex-col">
                                        <div className="p-5 flex flex-col gap-3">
                                          <h4 className="text-gray-12 text-lg font-semibold font-manrope leading-[1.1]">
                                            Lista exclusiva
                                          </h4>
                                          <p className="text-gray-11 text-base font-family-dm-sans leading-[1.3]">
                                            Restrinja o cupom para uma lista específica de CPFs. Importe um CSV com 1 CPF por linha (apenas números)
                                          </p>
                                          <div className="pt-1">
                                            <button
                                              type="button"
                                              onClick={handleImportCSV}
                                              className="flex items-center gap-2 h-11 px-5 border border-gray-6 rounded-lg text-gray-12 font-bold font-manrope text-base hover:bg-gray-3 transition-colors"
                                            >
                                              <Plus className="size-5" />
                                              Importar CSV
                                            </button>
                                          </div>
                                        </div>
                                        <div className="flex flex-col">
                                          <div className="bg-gray-3 border-t border-b border-gray-6 flex h-11 items-center">
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
                                          ) : (
                                            cpfList.map((cpf, index) => (
                                              <div key={index} className="border-b border-gray-6 h-[52px] flex items-center">
                                                <div className="flex-1 px-4">
                                                  <p className="text-gray-12 text-sm font-medium font-inter leading-[1.3]">
                                                    {formatCPF(cpf)}
                                                  </p>
                                                </div>
                                                <div className="flex items-center justify-center px-4 w-[74px]">
                                                  <button
                                                    type="button"
                                                    title="Remover CPF"
                                                    onClick={() => handleRemoveCPF(index)}
                                                    className="size-9 rounded-lg bg-red-2 border border-red-6 hover:bg-red-3 flex items-center justify-center transition-colors"
                                                  >
                                                    <TrashIcon className="size-5 text-red-12" />
                                                  </button>
                                                </div>
                                              </div>
                                            ))
                                          )}
                                          <div className="p-4 flex justify-center">
                                            <button
                                              onClick={handleAddCPF}
                                              className="flex items-center gap-1 h-11 px-11 text-gray-11 text-base font-semibold font-family-dm-sans hover:text-gray-12 transition-colors"
                                            >
                                              <Plus className="size-6" />
                                              Adicionar campo
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    )}
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
