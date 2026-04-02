"use client";

import { useState, useEffect } from "react";
import { useCreateVoucherModal } from "@/stores/modalStore";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Checkbox } from "@/components/CheckBox";
import { DatePicker } from "@/components/DatePicker";
import { X, ChevronDown, ChevronUp, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { InfoIcon } from "../Icons/InfoIcon";
import { TrashIcon } from "../Icons/TrashIcon";
import { organizerService } from "@/services";
import { SelectTicketsModal } from "../Coupon/SelectTicketsModal";
import { ArrowButton } from "../ArrowButton";

type CPFListStatus = "DISABLED" | "ENABLED";
type ExpiryStatus = "DISABLED" | "ENABLED";

export function CreateVoucherModal() {
  const { isOpen, closeCreateVoucherModal, data, onModalSave } = useCreateVoucherModal();
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [appliesTo, setAppliesTo] = useState<"all" | "specific">("all");
  const [selectedTicketIds, setSelectedTicketIds] = useState<string[]>([]);
  const [showSelectTicketsModal, setShowSelectTicketsModal] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [expiryStatus, setExpiryStatus] = useState<ExpiryStatus>("DISABLED");
  const [expiryDate, setExpiryDate] = useState<string | null>(null);
  const [cpfListStatus, setCpfListStatus] = useState<CPFListStatus>("DISABLED");
  const [cpfList, setCpfList] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = data?.voucherId !== undefined;
  const eventId = data?.eventId;

  // Initialize form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (isEditing && data?.voucher) {
        // Editing mode - load voucher data
        const v = data.voucher;
        setName(v.name || "");
        setQuantity(v.quantity?.toString() || "");

        // Handle appliesTo - pode ser "all" ou array de objetos com ingressos
        if (v.appliesTo === "all" || !v.appliesTo) {
          setAppliesTo("all");
          setSelectedTicketIds([]);
        } else if (Array.isArray(v.appliesTo)) {
          // Se for array, extrair os IDs dos objetos
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
        setExpiryDate(v.expiryDate || null);
        setCpfListStatus(v.cpfListStatus || "DISABLED");
        setCpfList(v.cpfList || []);
      } else {
        // Create mode - reset form
        setName("");
        setQuantity("");
        setAppliesTo("all");
        setSelectedTicketIds([]);
        setShowAdvanced(false);
        setExpiryStatus("DISABLED");
        setExpiryDate(null);
        setCpfListStatus("DISABLED");
        setCpfList([]);
      }
    }
  }, [isOpen, isEditing, data]);

  const handleImportCSV = () => {
    // TODO: Implementar importação de CSV
    toast.success("Funcionalidade de importar CSV em desenvolvimento");
  };

  const handleRemoveCPF = (index: number) => {
    setCpfList(cpfList.filter((_, i) => i !== index));
  };

  const formatCPF = (cpf: string) => {
    // Remove non-numeric characters
    const numbers = cpf.replace(/\D/g, "");
    // Format as XXX.XXX.XXX-XX
    if (numbers.length === 11) {
      return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9)}`;
    }
    return cpf;
  };

  const handleSave = async () => {
    // Validação do nome
    if (!name.trim()) {
      toast.error("Digite um nome para o voucher");
      return;
    }

    // Validação da quantidade
    if (!quantity.trim()) {
      toast.error("Digite a quantidade de vouchers");
      return;
    }

    const quantityNum = parseInt(quantity);
    if (isNaN(quantityNum) || quantityNum <= 0) {
      toast.error("Digite uma quantidade válida");
      return;
    }

    if (!eventId) {
      toast.error("Evento não encontrado");
      return;
    }

    setIsSubmitting(true);

    try {
      const voucherData: any = {
        name: name.trim(),
        quantity: quantityNum,
        appliesTo: appliesTo === "all" ? "all" : selectedTicketIds.length > 0 ? selectedTicketIds : "all",
        expiryDate: expiryStatus === "ENABLED" && expiryDate ? expiryDate : undefined,
        cpfListStatus,
        cpfList: cpfListStatus === "ENABLED" ? cpfList : undefined,
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
      console.error("Error saving voucher:", error);
      toast.error(error.response?.data?.message || "Erro ao salvar voucher");
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
              onClick={closeCreateVoucherModal}
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
              <div className="bg-gray-1 rounded-xl border border-gray-6 w-full max-w-[1098px] max-h-[90vh] flex flex-col shadow-2xl">
                {/* Header */}
                <div className="border-b border-gray-6 flex items-center justify-between px-5 py-3 shrink-0">
                  <h2 className="text-gray-12 text-[20px] font-semibold font-family-dm-sans leading-[1.3]">
                    Criar voucher
                  </h2>
                  <button
                    onClick={closeCreateVoucherModal}
                    className="text-gray-11 hover:text-gray-12 transition-colors p-1 rounded-lg hover:bg-gray-3"
                  >
                    <X className="size-6" />
                  </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden flex">
                  <div className="flex-1 overflow-y-auto p-5">
                    <div className="flex flex-col gap-9 max-w-full">
                      {/* Nome do voucher */}
                      <div className="flex flex-col gap-2.5">
                        <div className="flex flex-col gap-2">
                          <label className="text-gray-12 text-base font-family-dm-sans leading-[1.3]">
                            Nome do voucher
                          </label>
                          <Input
                            type="text"
                            placeholder="Ex: Corrida paranense"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="h-12"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <InfoIcon className="size-5 text-gray-11 shrink-0" />
                          <p className="text-gray-11 text-base font-family-dm-sans leading-[1.3]">
                            Limite de X caracteres
                          </p>
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
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^0-9]/g, "");
                              setQuantity(val);
                            }}
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
                          className="border border-gray-7 rounded-lg h-12 flex items-center justify-between px-3 cursor-pointer hover:bg-gray-3 transition-colors text-left"
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
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden flex flex-col gap-9"
                            >
                              {/* Validade do voucher */}
                              <div className="flex flex-col gap-5">
                                <div className="flex flex-col gap-3">
                                  <h3 className="text-gray-12 text-lg font-semibold font-manrope leading-[1.1]">
                                    Validade do voucher
                                  </h3>
                                  <p className="text-gray-11 text-base font-family-dm-sans leading-[1.3]">
                                    Após essa data, o voucher não poderá ser usado
                                  </p>
                                </div>
                                <div className="flex gap-4 items-center">
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <Checkbox
                                      checked={expiryStatus === "DISABLED"}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          setExpiryStatus("DISABLED");
                                          setExpiryDate(null);
                                        }
                                      }}
                                    />
                                    <span className="text-sm font-family-dm-sans leading-[1.3] text-gray-12">
                                      Desabilitado
                                    </span>
                                  </label>
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <Checkbox
                                      checked={expiryStatus === "ENABLED"}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          setExpiryStatus("ENABLED");
                                        }
                                      }}
                                    />
                                    <span className="text-sm font-family-dm-sans leading-[1.3] text-gray-12">
                                      Habilitar
                                    </span>
                                  </label>
                                </div>
                                {expiryStatus === "ENABLED" && (
                                  <div className="flex flex-col gap-3">
                                    <label className="text-gray-12 text-base font-family-dm-sans leading-[1.3]">
                                      Expira em:
                                    </label>
                                    <DatePicker
                                      value={expiryDate || undefined}
                                      onChange={setExpiryDate}
                                      placeholder="00/00/2026"
                                      className="w-auto"
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
                                <div className="flex gap-4 items-center">
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <Checkbox
                                      checked={cpfListStatus === "DISABLED"}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          setCpfListStatus("DISABLED");
                                          setCpfList([]);
                                        }
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
                                        if (checked) {
                                          setCpfListStatus("ENABLED");
                                        }
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
                                        Se habilitar, apenas CPFs desta lista poderão usar qualquer voucher deste lote. Importe um CSV com 1 CPF por linha (apenas números)
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
                                      <div className="p-4 flex justify-center">
                                        <button
                                          onClick={handleImportCSV}
                                          className="flex items-center gap-1 px-11 py-2 text-gray-11 hover:text-gray-12 transition-colors"
                                        >
                                          <Plus className="size-6" />
                                          <span className="text-base font-semibold font-family-dm-sans leading-[1.3]">
                                            Importar CSV
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
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-2 border-t border-gray-6 flex items-center justify-end gap-2 px-4 py-3 shrink-0">
                  <Button
                    onClick={closeCreateVoucherModal}
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
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Salvando..." : "Criar vouchers"}
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
      />
    </>
  );
}
