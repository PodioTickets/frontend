"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/Button";
import { X, Building2, Ticket } from "lucide-react";
import { useRequestTransferModal } from "@/stores/modalStore";
import Image from "next/image";
import { ArrowButton } from "@/components/ArrowButton";
import { Input } from "../Input";
import { FinanceIcon } from "../Icons/Organizer/FinanceIcon";
import { getApiClient } from "@/services/base/ApiClient";
import toast from "react-hot-toast";
import { ChooseAccountModal, mapPixKeyToAccount, type PixAccount } from "./ChooseAccountModal";
import { organizerService } from "@/services";
import { useModalSubmitState } from "@/hooks/useModalSubmitState";

export function RequestTransferModal() {
  const { isOpen, closeRequestTransferModal, data } = useRequestTransferModal();
  const [amount, setAmount] = useState("");
  const [amountFocused, setAmountFocused] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [transferAmount, setTransferAmount] = useState("");
  const { isSubmitting, runSubmit } = useModalSubmitState();
  const [showChooseAccount, setShowChooseAccount] = useState(false);
  const [pixAccounts, setPixAccounts] = useState<PixAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<PixAccount | null>(null);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    (async () => {
      try {
        setLoadingAccounts(true);
        const { organization } = await organizerService.getOrganization();
        if (cancelled) return;
        const accounts = (organization.pixKeys ?? []).map(mapPixKeyToAccount);
        setPixAccounts(accounts);
        const defaultAccount =
          accounts.find((a) => a.raw.isDefault) ?? accounts[0] ?? null;
        setSelectedAccount(defaultAccount);
      } catch (error) {
        if (cancelled) return;
        console.error("Error loading pix keys:", error);
        setPixAccounts([]);
        setSelectedAccount(null);
      } finally {
        if (!cancelled) setLoadingAccounts(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  // O backend SEMPRE envia em CENTAVOS (saldoParaSaque). Converte pra reais p/ exibição.
  // Antes havia uma heurística `> 10000` que NÃO dividia saldos <= R$100,00 (10000 centavos)
  // por 100, mostrando o valor 100x inflado (ex.: 8998 centavos virava "R$ 8.998,00").
  const rawBalance = data?.availableBalance ?? 0;
  const availableBalance = rawBalance / 100;
  const processingAmount = data?.processingAmount != null ? data.processingAmount / 100 : null;
  const displayBankName = selectedAccount?.bank || "Conta PIX";
  const displayPixKey = selectedAccount?.pixKey || data?.pixKey || "—";
  const displayHolder = selectedAccount?.holder || "—";

  const handleUseAll = () => {
    setAmount(availableBalance.toFixed(2).replace(".", ","));
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    value = value.replace(/R\$\s*/g, "").replace(/\s/g, "").replace(/[^\d,]/g, "");

    if (value === "" || value === ",") {
      setAmount(value === "," ? "0," : "");
      return;
    }

    const parts = value.split(",");
    if (parts.length > 2) {
      value = parts[0] + "," + parts.slice(1).join("");
    }
    if (parts.length === 2 && parts[1].length > 2) {
      const dec = parts[1];
      // "1,000" (usuário digitou 0 no inteiro) -> "10,00"
      if (dec.length === 3 && dec.endsWith("00") && dec[0] !== "0") {
        value = parts[0] + dec[0] + ",00";
      } else {
        value = parts[0] + "," + dec.slice(-2);
      }
    }

    const numericValue = value.replace(",", ".");
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

  const displayValue = amountFocused
    ? "R$ " + (amount || "")
    : formatAmount(amount);

  const handleAmountBlur = () => {
    setAmountFocused(false);
    if (!amount) return;
    const normalized = amount.replace(",", ".");
    const num = parseFloat(normalized);
    if (isNaN(num) || num <= 0) {
      setAmount("");
      return;
    }
    setAmount(num.toFixed(2).replace(".", ","));
  };

  const handleConfirm = async () => {
    const numericAmount = parseFloat(amount.replace(",", "."));
    if (!numericAmount) return;
    if (numericAmount > availableBalance) return;

    const eventId = data?.eventId as string | undefined;
    if (!eventId) {
      toast.error("Evento não identificado");
      return;
    }

    if (!selectedAccount?.id) {
      toast.error("Selecione uma conta PIX para recebimento");
      return;
    }

    await runSubmit(async () => {
      try {
        await getApiClient().post(
          `/api/v1/events/${eventId}/repasse/withdrawals`,
          {
            amount: Math.round(numericAmount * 100),
            pixKeyId: selectedAccount.id,
          }
        );
        setTransferAmount(formatAmount(amount));
        setShowSuccess(true);
      } catch (err: any) {
        toast.error(err?.message || "Erro ao solicitar saque");
      }
    });
  };

  const handleClose = () => {
    setShowSuccess(false);
    setAmount("");
    setAmountFocused(false);
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

  if (!isOpen) return null;

  const formatBalance = (val: number) => val.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(".", ",");

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/50 md:bg-black/90 z-50"
              onClick={handleClose}
            />
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 flex flex-col md:flex md:items-center md:justify-center md:p-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Mobile: full-screen layout (Figma) */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="md:hidden flex flex-col flex-1 min-h-0 w-full bg-gray-2 overflow-hidden pt-16"
              >
                {!showSuccess ? (
                  <>
                    <div className="bg-gray-1 border-b border-gray-6 shrink-0">
                      <div className="flex items-center gap-1 h-[52px] px-4">
                        <button
                          type="button"
                          onClick={handleClose}
                          className="size-8 flex items-center justify-center shrink-0 rounded-lg hover:bg-gray-3 transition-colors -rotate-180"
                          aria-label="Voltar"
                        >
                          <ArrowButton isOpen={false} />
                        </button>
                        <h2 className="font-family-dm-sans font-semibold text-base leading-[1.3] text-gray-12 flex-1 text-center pr-8">
                          Solicitar repasse
                        </h2>
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto min-h-0 px-4 py-4">
                      <p className="font-family-dm-sans font-normal text-base leading-[1.3] text-gray-11 mb-6">
                        O valor será enviado para a conta cadastrada.
                      </p>
                      <div className="flex flex-col gap-5 mb-8">
                        <div className="flex flex-col gap-3">
                          <label className="font-family-dm-sans font-medium text-base text-gray-12">
                            Valor do Saque
                          </label>
                          <div className="flex items-center justify-between gap-2 border border-gray-6 rounded-lg px-3 py-4 md:py-6 bg-gray-1">
                            <input
                              type="text"
                              inputMode="decimal"
                              value={displayValue}
                              onChange={handleAmountChange}
                              onFocus={() => setAmountFocused(true)}
                              onBlur={handleAmountBlur}
                              placeholder="R$ 0,00"
                              className="flex-1 min-w-0 text-xl md:text-2xl font-manrope font-extrabold tracking-[1px] text-gray-12 bg-transparent border-none outline-none"
                            />
                            <button
                              type="button"
                              onClick={handleUseAll}
                              className="text-sm font-family-dm-sans font-semibold text-blue-10 hover:text-blue-11 shrink-0"
                            >
                              Sacar tudo
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <div className="w-full h-px bg-gray-6" />
                          <p className="font-family-dm-sans font-normal text-base text-gray-11">
                            Disponível: <span className="font-semibold text-gray-12">R$ {formatBalance(availableBalance)}</span>
                          </p>
                          {processingAmount != null && (
                            <>
                              <div className="w-full h-px bg-gray-6" />
                              <p className="font-family-dm-sans font-normal text-base text-gray-11">
                                Repasse processando: <span className="font-semibold text-gray-12">R$ {formatBalance(processingAmount)}</span>
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="bg-gray-2 border border-gray-6 rounded-lg p-4 flex flex-col gap-5">
                        <div className="flex flex-col gap-4">
                          <div className="flex items-center gap-2">
                            <div className="size-9 rounded-lg bg-[#EBE4FF] flex items-center justify-center shrink-0">
                              <Building2 className="size-6 text-gray-12" />
                            </div>
                            <div className="flex flex-col gap-1 min-w-0">
                              <p className="font-family-dm-sans font-semibold text-base text-gray-12 select-text cursor-text">
                                {displayBankName}
                              </p>
                              <div className="flex items-center gap-3 flex-wrap text-sm">
                                <span className="font-family-dm-sans font-normal text-gray-11">
                                  Titular: <span className="font-semibold text-gray-12 select-text cursor-text">{displayHolder}</span>
                                </span>
                                <span className="font-family-dm-sans font-normal text-gray-11">
                                  Chave: <span className="font-semibold text-gray-12 select-text cursor-text">{displayPixKey}</span>
                                </span>
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowChooseAccount(true)}
                            className="text-sm font-family-dm-sans font-semibold text-blue-10 hover:text-blue-11 text-left"
                          >
                            Precisa alterar conta?
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0 flex gap-2 px-4 py-4 border-t border-gray-6 bg-gray-1">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleClose}
                        className="flex-1 h-11 border-gray-6 text-gray-12"
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="button"
                        onClick={handleConfirm}
                        disabled={isSubmitting || !selectedAccount}
                        className="flex-1 h-11 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSubmitting ? "Aguarde..." : "Confirmar"}
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="bg-gray-1 border-b border-gray-6 shrink-0">
                      <div className="flex items-center gap-1 h-[52px] px-4">
                        <button type="button" onClick={handleClose} className="size-8 flex items-center justify-center shrink-0 rounded-lg hover:bg-gray-3 -rotate-180" aria-label="Voltar">
                          <ArrowButton isOpen={false} />
                        </button>
                        <h2 className="font-family-dm-sans font-semibold text-base text-gray-12 flex-1 text-center pr-8">Saque solicitado</h2>
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col items-center justify-center gap-6">
                      <Image src="/images/money_icon.png" alt="" width={116} height={88} className="w-[116px] h-[88px] object-contain" draggable={false} />
                      <div className="text-center">
                        <p className="font-family-dm-sans font-normal text-base text-gray-11">
                          Seu saque de <span className="font-bold text-gray-12">{transferAmount}</span> foi solicitado e será enviado para a conta cadastrada
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0 flex gap-2 px-4 py-4 border-t border-gray-6 bg-gray-1">
                      <Button variant="outline" onClick={handleClose} className="flex-1 h-11 border-gray-6 text-gray-12 font-manrope font-bold text-base">Fechar</Button>
                      <Button onClick={handleViewHistory} className="flex-1 h-11 bg-primary-11 text-primary-2 font-manrope font-bold text-base">Ver detalhes</Button>
                    </div>
                  </>
                )}
              </motion.div>

              {/* Desktop: centered modal */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="hidden md:flex flex-col bg-gray-1 rounded-xl border border-gray-6 w-full max-w-[745px] shadow-2xl"
              >
                {!showSuccess ? (
                  <>
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
                    <div className="px-5 py-5 flex flex-col gap-6">
                      <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-11">
                        O valor será enviado para a conta cadastrada. Para alterar a conta, fale com o suporte
                      </p>
                      <div className="flex flex-col gap-2">
                        <label className="font-family-dm-sans font-medium text-[18px] leading-[1.3] text-gray-12">
                          Valor do Saque
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={displayValue}
                            onChange={handleAmountChange}
                            onFocus={() => setAmountFocused(true)}
                            onBlur={handleAmountBlur}
                            placeholder="R$ 0,00"
                            className="h-[71px] text-[24px] font-manrope font-extrabold tracking-[1px] border border-gray-6 rounded-lg pl-3 pr-28 py-2 w-full outline-none focus:ring-[3px] focus:ring-gray-4/50 focus:border-gray-4 transition-[color,box-shadow] placeholder:text-gray-11"
                          />
                          <button
                            type="button"
                            onClick={handleUseAll}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[14px] text-blue-10 hover:text-blue-11 transition-colors font-family-dm-sans font-semibold leading-[1.3] whitespace-nowrap"
                          >
                            Sacar tudo
                          </button>
                        </div>
                        <div className="flex items-center gap-2 font-family-dm-sans flex-wrap">
                          <span className="text-[14px] leading-[1.3] text-gray-11">
                            Disponível: <span className="font-semibold text-gray-12">R$ {formatBalance(availableBalance)}</span>
                          </span>
                        </div>
                      </div>
                      <div className="bg-gray-2 border border-gray-6 rounded-lg p-4 flex flex-col gap-5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-[#ebe4ff] flex items-center justify-center shrink-0">
                              <FinanceIcon className="size-6 text-gray-12" />
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <p className="font-family-dm-sans font-semibold text-[16px] leading-[1.3] text-gray-12 select-text cursor-text">{displayBankName}</p>
                              <div className="flex items-center gap-4 flex-wrap text-[16px] leading-[1.3]">
                                <span className="font-family-dm-sans font-normal text-gray-11">
                                  Titular: <span className="font-semibold text-gray-12 select-text cursor-text">{displayHolder}</span>
                                </span>
                                <span className="font-family-dm-sans font-normal text-gray-11">
                                  Chave: <span className="font-semibold text-gray-12 select-text cursor-text">{displayPixKey}</span>
                                </span>
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowChooseAccount(true)}
                            className="text-[16px] text-blue-10 hover:text-blue-11 transition-colors font-family-dm-sans font-semibold leading-[1.3]"
                          >
                            Trocar conta
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="px-4 py-3 border-t border-gray-6 flex gap-2.5 justify-end">
                      <Button variant="outline" onClick={handleClose} className="h-[44px] px-8 border-[1.5px] border-gray-6 text-gray-12 font-bold text-[16px] font-manrope hover:bg-gray-2">
                        Cancelar
                      </Button>
                      <Button variant="default" onClick={handleConfirm} disabled={isSubmitting || !selectedAccount} className="h-[44px] px-8 text-[16px] font-bold font-manrope disabled:opacity-50 disabled:cursor-not-allowed">
                        {isSubmitting ? "Aguarde..." : "Confirmar"}
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex flex-col items-center justify-center px-5 py-5 gap-11">
                      <div className="flex flex-col gap-6 items-center w-full">
                        <Image src="/images/money_icon.png" alt="" width={116} height={88} draggable={false} className="w-[116px] h-[88px] object-contain" />
                        <div className="flex flex-col gap-4 items-center text-center w-full">
                          <h2 className="font-family-dm-sans font-semibold text-[20px] leading-[1.3] text-gray-12">Saque solicitado</h2>
                          <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-11">
                            Seu saque de <span className="font-bold text-gray-12">{transferAmount}</span> foi solicitado e será enviado para a conta cadastrada
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 w-full">
                        <Button variant="outline" onClick={handleClose} className="flex-1 h-[44px] px-8 border-[1.5px] border-gray-6 text-gray-12 font-bold text-[16px] font-manrope hover:bg-gray-2">
                          Fechar
                        </Button>
                        <Button variant="default" onClick={handleViewHistory} className="flex-1 h-[44px] px-8 text-[16px] font-bold font-manrope">
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
      <ChooseAccountModal
        isOpen={showChooseAccount}
        onClose={() => setShowChooseAccount(false)}
        onSelect={(account) => {
          setSelectedAccount(account);
          setShowChooseAccount(false);
        }}
        accounts={pixAccounts}
        loading={loadingAccounts}
        initialSelectedId={selectedAccount?.id}
      />
    </>
  );
}
