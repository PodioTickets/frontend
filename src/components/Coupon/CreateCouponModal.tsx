"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useCreateCouponModal } from "@/stores/modalStore";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Dropdown } from "@/components/Dropdown";
import { Radio } from "@/components/Radio";
import { Checkbox } from "@/components/CheckBox";
import { DatePicker } from "@/components/DatePicker";
import { X, Plus, ChevronDown, ChevronUp, Info, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { TrashIcon } from "../Icons/TrashIcon";
import { InfoIcon } from "../Icons/InfoIcon";
import { organizerService } from "@/services";
import { ArrowButton } from "../ArrowButton";
import { SelectTicketsModal } from "./SelectTicketsModal";

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

  const modalBodyScrollRef = useRef<HTMLDivElement>(null);
  const advancedPanelRef = useRef<HTMLDivElement>(null);

  const minSelectableExpiryDate = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, [isOpen]);

  // Campos específicos por tipo de cupom
  const [minQuantity, setMinQuantity] = useState(""); // Para QUANTITY
  const [ageRule, setAgeRule] = useState<"MIN" | "MAX">("MIN"); // Para AGE
  const [ageValue, setAgeValue] = useState(""); // Para AGE

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
        : `R$ ${Number(c.value).toFixed(2).replace(".", ",")}`;
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
      ageRule !== (c.ageRule || "MIN") ||
      ageValue !== (c.ageValue?.toString() || "")
    );
  }, [
    isEditing, data, couponType, code, note, discountType, value,
    appliesTo, selectedTicketIds, expiryDate, expiryEnabled,
    minCartValue, minCartEnabled, cpfListStatus, cpfList,
    minQuantity, ageRule, ageValue,
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
            const formatted = Number(c.value).toFixed(2).replace(".", ",");
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
        setAgeRule(c.ageRule || "MIN");
        setAgeValue(c.ageValue?.toString() || "");
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
        setAgeRule("MIN");
        setAgeValue("");
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
      ? parseFloat(value.replace("%", "").replace(",", "."))
      : parseFloat(value.replace("R$", "").replace(".", "").replace(",", "."));

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
      if (!ageValue.trim()) {
        toast.error("Digite a idade");
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
        value: numericValue,
        note: note.trim() || undefined,
        expiryDate: expiryEnabled && expiryDate ? expiryDate : undefined,
        minCartValue: minCartEnabled && minCartValue ? parseFloat(minCartValue.replace("R$", "").replace(".", "").replace(",", ".")) : undefined,
        cpfListStatus,
        cpfList: cpfListStatus === "ENABLED" ? cpfList : undefined,
        // Campos específicos por tipo
        minQuantity: couponType === "QUANTITY" ? parseInt(minQuantity) : undefined,
        ageRule: couponType === "AGE" ? ageRule : undefined,
        ageValue: couponType === "AGE" ? ageValue : undefined,
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
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="fixed inset-0 flex items-center justify-center z-50 p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gray-1 rounded-xl border border-gray-6 w-full max-w-[1098px] max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="border-b border-gray-6 flex items-center justify-between px-5 py-3 shrink-0">
                  <h2 className="text-gray-12 text-[20px] font-semibold font-family-dm-sans leading-[1.3]">
                    {isEditing ? "Editar cupom" : "Criar cupom"}
                  </h2>
                  <button
                    onClick={closeCreateCouponModal}
                    className="text-gray-11 hover:text-gray-12 transition-colors p-1 rounded-lg hover:bg-gray-3"
                  >
                    <X className="size-6" />
                  </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden flex">
                  <div
                    ref={modalBodyScrollRef}
                    className="flex-1 overflow-y-auto p-5"
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
                        <div className="flex gap-2 flex-wrap">
                          <button
                            onClick={() => {
                              setCouponType("DISCOUNT");
                              setMinQuantity("");
                              setAgeValue("");
                              setAgeRule("MIN");
                            }}
                            className={`flex items-center gap-2 px-3 py-3 rounded-lg border transition-colors ${couponType === "DISCOUNT"
                              ? "bg-primary-4 border-primary-8"
                              : "border-gray-6 hover:bg-gray-2"
                              }`}
                          >
                            <Checkbox checked={couponType === "DISCOUNT"} />
                            <span className={`text-sm font-family-dm-sans leading-[1.3] ${couponType === "DISCOUNT" ? "text-gray-12" : "text-gray-11"
                              }`}>
                              Cupom de desconto
                            </span>
                          </button>
                          <button
                            onClick={() => {
                              setCouponType("QUANTITY");
                              setAgeValue("");
                              setAgeRule("MIN");
                            }}
                            className={`flex items-center gap-2 px-3 py-3 rounded-lg border transition-colors ${couponType === "QUANTITY"
                              ? "bg-primary-4 border-primary-8"
                              : "border-gray-6 hover:bg-gray-2"
                              }`}
                          >
                            <Checkbox checked={couponType === "QUANTITY"} />
                            <span className={`text-sm font-family-dm-sans leading-[1.3] ${couponType === "QUANTITY" ? "text-gray-12" : "text-gray-11"
                              }`}>
                              Cupom por quantidade
                            </span>
                          </button>
                          <button
                            onClick={() => {
                              setCouponType("AGE");
                              setMinQuantity("");
                            }}
                            className={`flex items-center gap-2 px-3 py-3 rounded-lg border transition-colors ${couponType === "AGE"
                              ? "bg-primary-4 border-primary-8"
                              : "border-gray-6 hover:bg-gray-2"
                              }`}
                          >
                            <Checkbox checked={couponType === "AGE"} />
                            <span className={`text-sm font-family-dm-sans leading-[1.3] ${couponType === "AGE" ? "text-gray-12" : "text-gray-11"
                              }`}>
                              Cupom por idade
                            </span>
                          </button>
                        </div>
                      </div>

                      {/* Renderizar inputs apenas após selecionar um tipo */}
                      {couponType && (
                        <>
                          {/* Título do tipo de cupom selecionado */}
                          {couponType === "DISCOUNT" && (
                            <div className="flex flex-col gap-3">
                              <h3 className="text-gray-12 text-xl font-bold font-manrope leading-[1.1]">
                                Cupom de desconto
                              </h3>
                              <p className="text-gray-11 text-base font-family-dm-sans leading-[1.3]">
                                Crie um código para o participante digitar no pagamento e receber o desconto
                              </p>
                            </div>
                          )}

                          {couponType === "QUANTITY" && (
                            <div className="flex flex-col gap-3">
                              <h3 className="text-gray-12 text-xl font-bold font-manrope leading-[1.1]">
                                Cupom por quantidade (automático)
                              </h3>
                              <p className="text-gray-11 text-base font-family-dm-sans leading-[1.3]">
                                Desconto automático quando o carrinho atingir uma quantidade mínima de ingressos
                              </p>
                            </div>
                          )}

                          {couponType === "AGE" && (
                            <div className="flex flex-col gap-3">
                              <h3 className="text-gray-12 text-xl font-bold font-manrope leading-[1.1]">
                                Cupom por idade (automático)
                              </h3>
                              <p className="text-gray-11 text-base font-family-dm-sans leading-[1.3]">
                                Desconto automático para participantes dentro de uma faixa de idade na data do evento
                              </p>
                            </div>
                          )}

                          {/* Quantidade mínima de ingressos - apenas para QUANTITY */}
                          {couponType === "QUANTITY" && (
                            <div className="flex flex-col gap-2.5 w-[596px]">
                              <div className="flex flex-col gap-2">
                                <label className="text-gray-12 text-base font-family-dm-sans leading-[1.3]">
                                  Quantidade mínima de ingressos
                                </label>
                                <Input
                                  type="text"
                                  placeholder="Ex: 3"
                                  value={minQuantity}
                                  onChange={(e) => {
                                    const val = e.target.value.replace(/[^0-9]/g, "");
                                    setMinQuantity(val);
                                  }}
                                  className="h-12"
                                />
                              </div>
                              <p className="text-gray-11 text-base font-family-dm-sans leading-[1.3]">
                                Ao atingir essa quantidade no carrinho, o cupom é aplicado automaticamente
                              </p>
                            </div>
                          )}

                          {/* Regra de idade - apenas para AGE */}
                          {couponType === "AGE" && (
                            <div className="flex flex-col gap-5 w-full">
                              <div className="flex flex-col gap-3">
                                <h3 className="text-gray-12 text-lg font-semibold font-manrope leading-[1.1]">
                                  Regra de idade
                                </h3>
                                <p className="text-gray-11 text-base font-family-dm-sans leading-[1.3]">
                                  Aplica para participantes com idade a partir de X
                                </p>
                              </div>
                              <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <Checkbox
                                    checked={ageRule === "MIN"}
                                    onCheckedChange={(checked) => {
                                      if (checked) setAgeRule("MIN");
                                    }}
                                  />
                                  <span className="text-sm font-family-dm-sans leading-[1.3] text-gray-12">
                                    Idade mínima
                                  </span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <Checkbox
                                    checked={ageRule === "MAX"}
                                    onCheckedChange={(checked) => {
                                      if (checked) setAgeRule("MAX");
                                    }}
                                  />
                                  <span className="text-sm font-family-dm-sans leading-[1.3] text-gray-12">
                                    Idade máxima
                                  </span>
                                </label>
                              </div>
                              <div className="flex flex-col gap-2 w-[132px]">
                                <label className="text-gray-12 text-base font-family-dm-sans leading-[1.3]">
                                  Nome do cupom
                                </label>
                                <Input
                                  type="text"
                                  placeholder="Ex: 9 anos"
                                  value={ageValue}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (val.length > 30) {
                                      return;
                                    }
                                    setAgeValue(val);
                                  }}
                                  maxLength={30}
                                  className="h-12"
                                />
                              </div>
                            </div>
                          )}

                          {/* Código do cupom - apenas para DISCOUNT */}
                          {couponType === "DISCOUNT" && (
                            <div className="flex flex-col gap-2.5">
                              <div className="flex flex-col gap-2">
                                <label className="text-gray-12 text-base font-family-dm-sans leading-[1.3]">
                                  Nome do cupom
                                </label>
                                <Input
                                  type="text"
                                  placeholder="Ex: PODIO10"
                                  value={code}
                                  onChange={(e) => {
                                    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
                                    if (val.length > 30) {
                                      return;
                                    }
                                    setCode(val);
                                  }}
                                  maxLength={30}
                                  className="h-12"
                                />
                              </div>

                            </div>
                          )}




                          {/* Tipo de desconto */}
                          <div className="flex flex-col gap-4">
                            <div className="flex flex-col gap-3">
                              <h3 className="text-gray-12 text-lg font-medium font-family-dm-sans leading-[1.3]">
                                Tipo de desconto
                              </h3>
                              <p className="text-gray-11 text-base font-family-dm-sans leading-[1.3]">
                                Escolha como o desconto será aplicado
                              </p>
                            </div>
                            <div className="flex gap-2.5">
                              <label className="flex items-center gap-2">
                                <Radio
                                  checked={discountType === "PERCENTAGE"}
                                  onChange={() => { setDiscountType("PERCENTAGE"); setValue(""); }}
                                />
                                <span className="text-sm font-family-dm-sans leading-[1.3] text-gray-12">
                                  Percentual (%)
                                </span>
                              </label>
                              <label className="flex items-center gap-2">
                                <Radio
                                  checked={discountType === "FIXED"}
                                  onChange={() => { setDiscountType("FIXED"); setValue(""); }}
                                />
                                <span className="text-sm font-family-dm-sans leading-[1.3] text-gray-12">
                                  Valor fixo (R$)
                                </span>
                              </label>
                            </div>
                            <div className="flex flex-col gap-2 w-[259px]">
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
                                    if (num === "" || (parseInt(num) >= 0 && parseInt(num) <= 100)) {
                                      setValue(num ? `${num}%` : "");
                                    }
                                  } else {
                                    // Format as currency
                                    const num = val.replace(/[^0-9]/g, "");
                                    if (num === "") {
                                      setValue("");
                                    } else {
                                      const formatted = (parseInt(num) / 100).toFixed(2).replace(".", ",");
                                      setValue(`R$ ${formatted}`);
                                    }
                                  }
                                }}
                                className="h-12"
                              />
                            </div>
                          </div>

                          <div className="flex flex-col gap-4">
                            <div className="flex flex-col gap-3">
                              <h3 className="text-gray-12 text-lg font-medium font-family-dm-sans leading-[1.3]">
                                Aplicar em ingressos
                              </h3>
                              <p className="text-gray-11 text-base font-family-dm-sans leading-[1.3]">
                                Deseja aplicar em todos os ingressos?
                              </p>
                            </div>
                            <div className="flex gap-4">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <Checkbox
                                  checked={appliesTo === "all"}
                                  onCheckedChange={(checked) => {
                                    if (checked) setAppliesTo("all");
                                  }}
                                />
                                <span className="text-sm font-family-dm-sans leading-[1.3] text-gray-12">
                                  Sim
                                </span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <Checkbox
                                  checked={appliesTo === "specific"}
                                  onCheckedChange={(checked) => {
                                    if (checked) setAppliesTo("specific");
                                  }}
                                />
                                <span className="text-sm font-family-dm-sans leading-[1.3] text-gray-12">
                                  Ingressos específicos
                                </span>
                              </label>
                            </div>
                            {appliesTo === "specific" && (
                              <div className="flex flex-col gap-2 w-[276px]">
                                <button
                                  type="button"
                                  onClick={() => setShowSelectTicketsModal(true)}
                                  className="border border-gray-6 rounded-lg h-12 flex items-center justify-between px-3 cursor-pointer hover:bg-gray-3 transition-colors text-left"
                                >
                                  <span className="text-base font-family-dm-sans leading-[1.3] text-gray-11">
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
                                      const parentRect =
                                        scrollEl.getBoundingClientRect();
                                      const panelRect =
                                        panel.getBoundingClientRect();
                                      const padding = 20;
                                      const bottomOverflow =
                                        panelRect.bottom -
                                        (parentRect.bottom - padding);
                                      if (bottomOverflow > 0) {
                                        scrollEl.scrollTop += bottomOverflow;
                                      }
                                    });
                                  }}
                                >
                                  {/* Validade do cupom */}
                                  <div className="flex flex-col gap-5">
                                    <div className="flex flex-col gap-3">
                                      <h3 className="text-gray-12 text-lg font-semibold font-manrope leading-[1.1]">
                                        Validade do cupom
                                      </h3>
                                      <p className="text-gray-11 text-base font-family-dm-sans leading-[1.3]">
                                        Após essa data, o cupom não poderá ser usado
                                      </p>
                                    </div>
                                    <div className="flex gap-4">
                                      <label className="flex items-center gap-2 cursor-pointer">
                                        <Checkbox
                                          checked={!expiryEnabled}
                                          onCheckedChange={(checked) => {
                                            if (checked) {
                                              setExpiryEnabled(false);
                                              setExpiryDate(null);
                                            }
                                          }}
                                        />
                                        <span className="text-sm font-family-dm-sans leading-[1.3] text-gray-12">
                                          Desabilitar
                                        </span>
                                      </label>
                                      <label className="flex items-center gap-2 cursor-pointer">
                                        <Checkbox
                                          checked={expiryEnabled}
                                          onCheckedChange={(checked) => {
                                            if (checked) setExpiryEnabled(true);
                                          }}
                                        />
                                        <span className="text-sm font-family-dm-sans leading-[1.3] text-gray-12">
                                          Habilitar
                                        </span>
                                      </label>
                                    </div>
                                    {expiryEnabled && (
                                      <div className="flex flex-col gap-3">
                                        <label className="text-gray-12 text-base font-family-dm-sans leading-[1.3]">
                                          Expira em:
                                        </label>
                                        <DatePicker
                                          value={expiryDate || undefined}
                                          onChange={setExpiryDate}
                                          minDate={minSelectableExpiryDate}
                                          placeholder="00/00/2026"
                                          className="w-auto"
                                        />
                                      </div>
                                    )}
                                  </div>

                                  {/* Valor mínimo do carrinho */}
                                  <div className="flex flex-col gap-5">
                                    <div className="flex flex-col gap-3">
                                      <h3 className="text-gray-12 text-lg font-semibold font-manrope leading-[1.1]">
                                        Valor mínimo do carrinho
                                      </h3>
                                      <p className="text-gray-11 text-base font-family-dm-sans leading-[1.3]">
                                        O cupom só será aplicado se o carrinho atingir esse valor
                                      </p>
                                    </div>
                                    <div className="flex gap-4">
                                      <label className="flex items-center gap-2 cursor-pointer">
                                        <Checkbox
                                          checked={!minCartEnabled}
                                          onCheckedChange={(checked) => {
                                            if (checked) {
                                              setMinCartEnabled(false);
                                              setMinCartValue("");
                                            }
                                          }}
                                        />
                                        <span className="text-sm font-family-dm-sans leading-[1.3] text-gray-12">
                                          Desabilitar
                                        </span>
                                      </label>
                                      <label className="flex items-center gap-2 cursor-pointer">
                                        <Checkbox
                                          checked={minCartEnabled}
                                          onCheckedChange={(checked) => {
                                            if (checked) setMinCartEnabled(true);
                                          }}
                                        />
                                        <span className="text-sm font-family-dm-sans leading-[1.3] text-gray-12">
                                          Habilitar
                                        </span>
                                      </label>
                                    </div>
                                    {minCartEnabled && (
                                      <div className="flex flex-col gap-2 w-[259px]">
                                        <label className="text-gray-12 text-base font-family-dm-sans leading-[1.3]">
                                          Valor mínimo do carrinho
                                        </label>
                                        <Input
                                          type="text"
                                          placeholder="Ex: 100,00"
                                          value={minCartValue}
                                          onChange={(e) => {
                                            const num = e.target.value.replace(/[^0-9]/g, "");
                                            if (num === "") {
                                              setMinCartValue("");
                                            } else {
                                              const formatted = (parseInt(num) / 100).toFixed(2).replace(".", ",");
                                              setMinCartValue(`R$ ${formatted}`);
                                            }
                                          }}
                                          className="h-12"
                                        />
                                      </div>
                                    )}
                                  </div>

                                  {/* Lista exclusiva por CPF */}
                                  <div className="flex flex-col gap-4">
                                    <div className="flex flex-col gap-3">
                                      <h3 className="text-gray-12 text-lg font-medium font-family-dm-sans leading-[1.3]">
                                        Deseja ativar lista exclusiva por CPF?
                                      </h3>
                                      <p className="text-gray-11 text-base font-family-dm-sans leading-[1.3]">
                                        Restrinja o cupom para uma lista específica de CPFs
                                      </p>
                                    </div>
                                    <div className="flex gap-4">
                                      <label className="flex items-center gap-2 cursor-pointer">
                                        <Checkbox
                                          checked={cpfListStatus === "DISABLED"}
                                          onCheckedChange={(checked) => {
                                            if (checked) setCpfListStatus("DISABLED");
                                          }}
                                        />
                                        <span className="text-sm font-family-dm-sans leading-[1.3] text-gray-12">
                                          Desabilitado
                                        </span>
                                      </label>
                                      <label className="flex items-center gap-2 cursor-pointer">
                                        <Checkbox
                                          checked={cpfListStatus === "ENABLED"}
                                          onCheckedChange={(checked) => {
                                            if (checked) setCpfListStatus("ENABLED");
                                          }}
                                        />
                                        <span className="text-sm font-family-dm-sans leading-[1.3] text-gray-12">
                                          Habilitar
                                        </span>
                                      </label>
                                    </div>

                                    {cpfListStatus === "ENABLED" && (
                                      <div className="bg-gray-2 border-[1.5px] border-gray-6 rounded-lg flex flex-col">
                                        <div className="p-5 flex flex-col gap-3">
                                          <h4 className="text-gray-12 text-lg font-semibold font-manrope leading-[1.1]">
                                            Lista exclusiva
                                          </h4>
                                          <p className="text-gray-11 text-base font-family-dm-sans leading-[1.3]">
                                            Restrinja o cupom para uma lista específica de CPFs. Importe um CSV com 1 CPF por linha (apenas números)
                                          </p>
                                        </div>
                                        <div className="flex flex-col">
                                          <div className="bg-gray-3 border-t border-b border-gray-6 flex h-11 items-center">
                                            <div className="flex-1 px-4">
                                              <p className="text-gray-12 text-sm font-medium font-inter leading-[1.3]">
                                                CPFs autorizados
                                              </p>
                                            </div>
                                            <div className="border-r border-gray-6 px-4">
                                              <p className="text-gray-12 text-sm font-medium font-inter leading-[1.3]">
                                                Ações
                                              </p>
                                            </div>
                                          </div>
                                          {cpfList.length === 0 ? (
                                            <div className="p-8 text-center">
                                              <p className="text-gray-11 text-sm">Nenhum CPF adicionado</p>
                                            </div>
                                          ) : (
                                            cpfList.map((cpf, index) => (
                                              <div
                                                key={index}
                                                className="border-b border-gray-6 flex h-[52px] items-center"
                                              >
                                                <div className="flex-1 px-4">
                                                  <p className="text-gray-12 text-sm font-medium font-inter leading-[1.3]">
                                                    {formatCPF(cpf)}
                                                  </p>
                                                </div>
                                                <div className="px-4">
                                                  <button
                                                    type="button"
                                                    title="Remover CPF"
                                                    onClick={() => handleRemoveCPF(index)}
                                                    className="size-9 rounded-lg bg-red-2 border border-red-6 hover:bg-red-3 flex items-center justify-center transition-colors"
                                                  >
                                                    <TrashIcon className="size-4 text-red-12" />
                                                  </button>
                                                </div>
                                              </div>
                                            ))
                                          )}
                                          <div className="p-4 flex justify-start">
                                            <button
                                              onClick={handleAddCPF}
                                              className="flex items-center gap-2 px-4 py-2 text-gray-11 hover:text-gray-12 transition-colors"
                                            >
                                              <Plus className="size-5" />
                                              <span className="text-base font-semibold font-family-dm-sans leading-[1.3]">
                                                Adicionar campo
                                              </span>
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
                <div className="bg-gray-2 border-t border-gray-6 flex items-center justify-end gap-2 px-4 py-3 shrink-0">
                  <Button
                    onClick={closeCreateCouponModal}
                    variant="outline"
                    className="border-gray-6 text-gray-12 h-11 px-5"
                    disabled={isSubmitting}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSave}
                    variant="default"
                    className="h-11 px-5"
                    disabled={isSubmitting || !hasChanges}
                  >
                    {isSubmitting ? "Salvando..." : isEditing ? "Editar cupom" : "Criar cupom"}
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Modal de seleção de ingressos */}
      <SelectTicketsModal
        isOpen={showSelectTicketsModal}
        onClose={() => setShowSelectTicketsModal(false)}
        onConfirm={(ticketIds) => {
          setSelectedTicketIds(ticketIds);
          if (ticketIds.length > 0) {
            setAppliesTo("specific");
          }
        }}
        eventId={eventId}
        selectedTicketIds={selectedTicketIds}
      />
    </>
  );
}
