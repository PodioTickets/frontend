"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { X, Lock, Building2 } from "lucide-react";
import { useRequestTransferModal } from "@/stores/modalStore";
import Image from "next/image";

export function RequestTransferModal() {
  const { isOpen, closeRequestTransferModal, data } = useRequestTransferModal();
  const [amount, setAmount] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [transferAmount, setTransferAmount] = useState("");

  const availableBalance = data?.availableBalance || 1250;
  const minAmount = 50;
  const maskedPixKey = data?.pixKey || "34.***.***.0001.**";
  const organizationName = data?.organizationName || "Grupo Max atacadista";
  const organizationCnpj = data?.organizationCnpj || "27.912.458/0001-73";
  const organizationAvatar = data?.organizationAvatar || null;

  const handleUseAll = () => {
    setAmount(availableBalance.toFixed(2).replace(".", ","));
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    // Remove "R$" e espaços, mantém apenas números e vírgula
    value = value.replace(/R\$\s*/g, "").replace(/[^\d,]/g, "");

    // Se o valor estiver vazio ou for apenas "0", permite edição
    if (value === "" || value === "0") {
      setAmount(value);
      return;
    }

    // Limita a duas casas decimais
    const parts = value.split(",");
    if (parts.length > 2) {
      // Se houver mais de uma vírgula, mantém apenas a primeira
      value = parts[0] + "," + parts.slice(1).join("");
    }
    if (parts.length === 2 && parts[1].length > 2) {
      // Limita a 2 casas decimais
      value = parts[0] + "," + parts[1].substring(0, 2);
    }

    // Substitui vírgula por ponto para processamento
    const numericValue = value.replace(",", ".");
    // Valida se é um número válido
    if (numericValue === "" || (!isNaN(parseFloat(numericValue)) && parseFloat(numericValue) >= 0)) {
      setAmount(value);
    }
  };

  const formatAmount = (value: string) => {
    if (!value || value === "0") return "R$ 0,00";
    const numericValue = value.replace(",", ".");
    const num = parseFloat(numericValue) || 0;
    return `R$ ${num.toFixed(2).replace(".", ",")}`;
  };

  const handleConfirm = () => {
    const numericAmount = parseFloat(amount.replace(",", "."));
    if (!numericAmount || numericAmount < minAmount) {
      return;
    }
    if (numericAmount > availableBalance) {
      return;
    }
    setTransferAmount(formatAmount(amount));
    setShowSuccess(true);
  };

  const handleClose = () => {
    setShowSuccess(false);
    setAmount("");
    setTransferAmount("");
    closeRequestTransferModal();
  };

  const handleViewHistory = () => {
    handleClose();
    // O drawer será aberto pela página financeira através do callback
    if (data?.onViewHistory) {
      data.onViewHistory();
    }
  };

  const numericAmount = parseFloat(amount.replace(",", ".") || "0");
  const isValidAmount = numericAmount >= minAmount && numericAmount <= availableBalance;

  if (!isOpen) return null;

  return (
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
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="bg-gray-1 rounded-xl border border-gray-6 w-full max-w-[745px] flex flex-col shadow-2xl"
            >
              {!showSuccess ? (
                <>
                  {/* Header */}
                  <div className="flex items-center justify-between px-5 py-3 border-b border-gray-6">
                    <h2 className="font-family-dm-sans font-semibold text-[20px] leading-[1.3] text-gray-12">
                      Solicitar Saque
                    </h2>
                    <button
                      onClick={handleClose}
                      className="size-8 flex items-center justify-center rounded-lg hover:bg-gray-3 transition-colors cursor-pointer"
                    >
                      <X className="size-6 text-gray-11" />
                    </button>
                  </div>

                  {/* Content */}
                  <div className="px-5 py-5 flex flex-col gap-6">
                    {/* Info Text */}
                    <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-11">
                      O valor será enviado para a conta cadastrada. Para alterar a conta, fale com o suporte
                    </p>

                    {/* Amount Input */}
                    <div className="flex flex-col gap-2">
                      <label className="font-family-dm-sans font-medium text-[18px] leading-[1.3] text-gray-12">
                        Valor do Saque
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={formatAmount(amount)}
                          onChange={handleAmountChange}
                          placeholder="R$ 0,00"
                          className="h-[71px] text-[24px] font-manrope font-extrabold tracking-[1px] border border-gray-6 rounded-lg px-3 py-6 w-full"
                        />
                      </div>
                      <div className="flex items-center justify-between h-5 font-family-dm-sans">
                        <div className="flex items-center gap-2">
                          <span className="text-[16px] leading-[1.3] text-gray-11">
                            Mínimo: <span className="font-semibold text-gray-12">R${minAmount.toFixed(2).replace(".", ",")}</span>
                          </span>
                          <span className="w-px h-5 bg-gray-6" />
                          <span className="text-[16px] leading-[1.3] text-gray-11">
                            Disponível: <span className="font-semibold text-gray-12">R${availableBalance.toFixed(2).replace(".", ",")}</span>
                          </span>
                        </div>
                        <button
                          onClick={handleUseAll}
                          className="text-[16px] text-blue-10 hover:text-blue-11 transition-colors font-family-dm-sans font-semibold leading-[1.3]"
                        >
                          Sacar tudo
                        </button>
                      </div>
                    </div>

                    {/* Account Info Card */}
                    <div className="bg-gray-2 border border-gray-6 rounded-lg p-4 flex flex-col gap-5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-[#ebe4ff] flex items-center justify-center shrink-0">
                            <Building2 className="size-6 text-gray-12" />
                          </div>
                          <div className="flex flex-col gap-2">
                            <p className="font-family-dm-sans font-semibold text-[16px] leading-[1.3] text-gray-12">
                              Banco Nubank
                            </p>
                            <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-11">
                              Chave: {maskedPixKey}
                            </p>
                          </div>
                        </div>
                        <button className="text-[16px] text-blue-10 hover:text-blue-11 transition-colors font-family-dm-sans font-semibold leading-[1.3]">
                          Precisa alterar a conta?
                        </button>
                      </div>
                      <div className="h-px bg-gray-6" />
                      <div className="flex flex-col gap-3">
                        <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-11">
                          Organização
                        </p>
                        <div className="flex items-center gap-2">
                          {organizationAvatar ? (
                            <img
                              src={organizationAvatar}
                              alt={organizationName}
                              className="size-8 rounded-full shrink-0 object-cover"
                            />
                          ) : (
                            <div className="size-8 rounded-full bg-gray-6 flex items-center justify-center shrink-0">
                              <span className="text-gray-12 font-semibold text-sm">
                                {organizationName.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                          <div className="flex flex-col gap-3">
                            <p className="font-family-dm-sans font-semibold text-[16px] leading-[1.3] text-gray-12">
                              {organizationName}
                            </p>
                            <p className="font-family-dm-sans font-normal text-[14px] leading-[1.3] text-gray-11">
                              CNPJ: {organizationCnpj}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="px-4 py-3 border-t border-gray-6 flex gap-2.5 justify-end">
                    <Button
                      variant="outline"
                      onClick={handleClose}
                      className="h-[44px] px-8 border-[1.5px] border-gray-6 text-gray-12 font-bold text-[16px] font-manrope hover:bg-gray-2"
                    >
                      Cancelar
                    </Button>
                    <Button
                      variant="default"
                      onClick={handleConfirm}
                      disabled={!isValidAmount}
                      className="h-[44px] px-8 text-[16px] font-bold font-manrope disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Confirmar
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  {/* Success View */}
                  <div className="flex flex-col items-center justify-center px-5 py-5 gap-11">
                    <div className="flex flex-col gap-6 items-center w-full">
                      {/* Lock Icon */}
                      <Image src="/images/money_icon.png" alt="Success Lock" width={116} height={88} draggable={false} className="w-[116px] h-[88px] object-contain" />

                      {/* Success Message */}
                      <div className="flex flex-col gap-4 items-center text-center w-full">
                        <h2 className="font-family-dm-sans font-semibold text-[20px] leading-[1.3] text-gray-12">
                          Saque solicitado
                        </h2>
                        <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-11">
                          Seu saque de{" "}
                          <span className="font-bold text-gray-12">{transferAmount}</span>{" "}
                          foi solicitado e será enviado para a conta cadastrada
                        </p>
                      </div>
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-2 w-full">
                      <Button
                        variant="outline"
                        onClick={handleClose}
                        className="flex-1 h-[44px] px-8 border-[1.5px] border-gray-6 text-gray-12 font-bold text-[16px] font-manrope hover:bg-gray-2"
                      >
                        Fechar
                      </Button>
                      <Button
                        variant="default"
                        onClick={handleViewHistory}
                        className="flex-1 h-[44px] px-8 text-[16px] font-bold font-manrope"
                      >
                        Ver detalhes
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
