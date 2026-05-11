"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, X } from "lucide-react";
import { Button } from "@/components/Button";
import { cn } from "@/utils/cn";
import type { PixKey } from "@/services/organizer/OrganizerService";

export interface PixAccount {
  id: string;
  bank: string;
  holder: string;
  pixKey: string;
  pixKeyType: string;
  raw: PixKey;
}

const formatDocument = (doc: string) => {
  const d = doc.replace(/\D/g, "");
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  return doc;
};

const formatPhone = (raw: string) => {
  const d = raw.replace(/\D/g, "");
  if (d.length === 11) return d.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  if (d.length === 10) return d.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  return raw;
};

const formatPixKey = (key: string, keyType: string) => {
  const type = keyType?.toUpperCase();
  if (type === "CPF" || type === "CNPJ") return formatDocument(key);
  if (type === "PHONE" || type === "TELEFONE") return formatPhone(key);
  return key;
};

export const mapPixKeyToAccount = (pix: PixKey): PixAccount => ({
  id: pix.id,
  bank: pix.bankName?.trim() || "Conta PIX",
  holder: pix.accountHolderName?.trim() || "—",
  pixKey: formatPixKey(pix.key, pix.keyType),
  pixKeyType: pix.keyType,
  raw: pix,
});

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <span
      className={cn(
        "size-6 rounded-[5.6px] border flex items-center justify-center shrink-0 transition-colors",
        checked ? "border-primary-8 bg-primary-2" : "border-gray-6 bg-gray-1",
      )}
    >
      {checked && (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M2.5 7L5.5 10L11.5 4" stroke="#46a758" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </span>
  );
}

function AccountItem({
  account,
  selected,
  onSelect,
}: {
  account: PixAccount;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex flex-col gap-5 p-4 rounded-lg border text-left transition-colors w-full",
        selected ? "border-primary-8 bg-primary-2" : "border-gray-6 bg-gray-1 hover:bg-gray-2",
      )}
    >
      <div className="flex items-center gap-3">
        <Checkbox checked={selected} />
        <span className="font-manrope font-semibold text-base leading-[1.1] text-gray-12">
          {account.bank}
        </span>
      </div>
      <div className="flex items-center justify-between flex-wrap gap-2 text-base">
        <div className="flex gap-1 items-center">
          <span className="font-family-dm-sans font-normal text-gray-11">Títular:</span>
          <span className="font-manrope font-semibold text-gray-12">{account.holder}</span>
        </div>
        <div className="flex gap-1 items-center">
          <span className="font-family-dm-sans font-normal text-gray-11">Chave pix:</span>
          <span className="font-manrope font-semibold text-gray-12">{account.pixKey}</span>
        </div>
      </div>
    </button>
  );
}

interface ChooseAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (account: PixAccount) => void;
  accounts: PixAccount[];
  loading?: boolean;
  initialSelectedId?: string;
}

export function ChooseAccountModal({
  isOpen,
  onClose,
  onSelect,
  accounts,
  loading = false,
  initialSelectedId,
}: ChooseAccountModalProps) {
  const [selectedId, setSelectedId] = useState<string | null>(
    initialSelectedId ?? accounts[0]?.id ?? null,
  );

  useEffect(() => {
    if (!isOpen) return;
    setSelectedId(initialSelectedId ?? accounts[0]?.id ?? null);
  }, [isOpen, initialSelectedId, accounts]);

  const handleConfirm = () => {
    const account = accounts.find((a) => a.id === selectedId);
    if (account) onSelect(account);
    onClose();
  };

  const hasAccounts = accounts.length > 0;
  const confirmDisabled = !selectedId || !hasAccounts || loading;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="choose-account-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 z-[60]"
            onClick={onClose}
          />

          {/* Mobile */}
          <motion.div
            key="choose-account-mobile"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="md:hidden fixed inset-0 z-[60] flex flex-col bg-gray-2 pt-16"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gray-1 border-b border-gray-6 shrink-0">
              <div className="flex items-center gap-2 h-[52px] px-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="size-8 flex items-center justify-center shrink-0 rounded-full border border-gray-6 hover:bg-gray-3 transition-colors"
                  aria-label="Voltar"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <h2 className="font-family-dm-sans font-semibold text-base leading-[1.3] text-gray-12 flex-1 text-center pr-8">
                  Escolher conta de recebimento
                </h2>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
              <p className="font-family-dm-sans font-medium text-sm text-gray-12">
                Selecione uma das suas chaves PIX cadastradas
              </p>
              <div className="flex flex-col gap-3">
                {loading ? (
                  <p className="text-center text-sm text-gray-11 font-family-dm-sans py-8">
                    Carregando contas...
                  </p>
                ) : !hasAccounts ? (
                  <p className="text-center text-sm text-gray-11 font-family-dm-sans py-8">
                    Nenhuma chave PIX cadastrada.
                  </p>
                ) : (
                  accounts.map((account) => (
                    <AccountItem
                      key={account.id}
                      account={account}
                      selected={selectedId === account.id}
                      onSelect={() => setSelectedId(account.id)}
                    />
                  ))
                )}
              </div>
            </div>
            <div className="shrink-0 flex gap-2 px-4 py-4 border-t border-gray-6 bg-gray-1">
              <Button
                variant="outline"
                onClick={onClose}
                className="flex-1 h-11 border-gray-6 text-gray-12 font-manrope font-bold text-base"
              >
                Voltar
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={confirmDisabled}
                className="flex-1 h-11 font-manrope font-bold text-base"
              >
                Selecionar conta
              </Button>
            </div>
          </motion.div>

          {/* Desktop */}
          <motion.div
            key="choose-account-desktop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="hidden md:flex fixed inset-0 z-[60] items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="flex flex-col bg-gray-1 rounded-xl border border-gray-6 w-full max-w-[745px] shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-6">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="size-8 flex items-center justify-center rounded-full border border-gray-6 hover:bg-gray-3 transition-colors shrink-0"
                    aria-label="Voltar"
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                  <h2 className="font-family-dm-sans font-semibold text-xl leading-[1.3] text-gray-12">
                    Escolher conta de recebimento
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="size-9 flex items-center justify-center rounded-lg hover:bg-gray-3 transition-colors"
                  aria-label="Fechar"
                >
                  <X className="size-5 text-gray-11" />
                </button>
              </div>

              {/* Content */}
              <div className="p-5 flex flex-col gap-4">
                <p className="font-family-dm-sans font-medium text-base text-gray-12">
                  Selecione uma das suas chaves PIX cadastradas
                </p>
                <div className="flex flex-col gap-3">
                  {loading ? (
                    <p className="text-center text-sm text-gray-11 font-family-dm-sans py-8">
                      Carregando contas...
                    </p>
                  ) : !hasAccounts ? (
                    <p className="text-center text-sm text-gray-11 font-family-dm-sans py-8">
                      Nenhuma chave PIX cadastrada.
                    </p>
                  ) : (
                    accounts.map((account) => (
                      <AccountItem
                        key={account.id}
                        account={account}
                        selected={selectedId === account.id}
                        onSelect={() => setSelectedId(account.id)}
                      />
                    ))
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="px-4 py-3 border-t border-gray-6 flex gap-2.5 justify-end">
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="h-[44px] px-8 border-[1.5px] border-gray-6 text-gray-12 font-bold text-base font-manrope hover:bg-gray-2"
                >
                  Voltar
                </Button>
                <Button
                  onClick={handleConfirm}
                  disabled={confirmDisabled}
                  className="h-[44px] px-8 font-bold text-base font-manrope"
                >
                  Selecionar conta
                </Button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
