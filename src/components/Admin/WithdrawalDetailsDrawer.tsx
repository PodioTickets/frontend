"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { X, Info } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import toast from "react-hot-toast";
import { getApiClient } from "@/services/base/ApiClient";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { cn } from "@/utils/cn";
import { Button } from "../Button";

// ─── Types ────────────────────────────────────────────────────────────────────

export type WithdrawalStatus = "PENDING" | "COMPLETED" | "CANCELLED";

export interface WithdrawalItem {
  id: string;
  eventId: string;
  requestedById: string;
  amount: number;
  feeRate: number;
  feeAmount: number;
  netAmount: number;
  status: WithdrawalStatus;
  notes?: string | null;
  receiptUrl?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  event: {
    id: string;
    name: string;
    slug?: string;
    logoUrl: string;
    organizationId: string;
    organization: {
      id: string;
      name: string;
      tradeName?: string;
      document?: string;
      logoUrl: string;
      email: string;
      phone?: string;
      whatsapp?: string;
      siteUrl?: string;
      instagram?: string;
      zipCode?: string;
      street?: string;
      number?: string;
      neighborhood?: string;
      city?: string;
      state?: string;
      pix?: string;
      bankName?: string;
      bankCode?: string;
      accountHolderName?: string;
      accountHolderDocument?: string;
    };
  };
  requestedBy: {
    id: string;
    firstName: string;
    lastName?: string;
    email: string;
  };
}

export interface WithdrawalDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  item: WithdrawalItem | null;
  onStatusChange: (id: string, newStatus: WithdrawalStatus) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

function formatPhone(value?: string): string {
  if (!value) return "—";
  const d = value.replace(/\D/g, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return value;
}

function formatDocument(value?: string): string {
  if (!value) return "—";
  const d = value.replace(/\D/g, "");
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  return value;
}

function fullName(item: WithdrawalItem): string {
  return `${item.requestedBy.firstName} ${item.requestedBy.lastName ?? ""}`.trim();
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between w-full gap-4">
      <p className="text-base font-normal leading-[1.3] text-gray-11 font-family-dm-sans shrink-0">
        {label}
      </p>
      <div className="text-base font-semibold leading-[1.3] text-gray-12 font-family-dm-sans text-right min-w-0 break-words">
        {value}
      </div>
    </div>
  );
}

function DrawerSeparator() {
  return <div className="w-full h-px bg-gray-6 shrink-0" />;
}

function BankGrid({ item }: { item: WithdrawalItem }) {
  const org = item.event.organization;
  const banco = [org.bankName, org.bankCode ? `(${org.bankCode})` : null].filter(Boolean).join(" ");
  const fields = [
    { label: "Banco", value: banco || "—" },
    { label: "PIX", value: org.pix ?? "—" },
    { label: "Titular", value: org.accountHolderName ?? "—" },
    { label: "CPF/CNPJ", value: formatDocument(org.accountHolderDocument) },
  ];

  return (
    <div className="border border-gray-6 rounded-lg w-full flex flex-wrap">
      {fields.map((f, i) => {
        const cols = 2;
        return (
          <div
            key={f.label}
            className={cn(
              "flex flex-col gap-3 p-4 flex-[1_0_0] min-w-[175px] border-r border-gray-6 last:border-0"
            )}
          >
            <p className="text-base font-normal leading-[1.3] text-gray-11 font-family-dm-sans">
              {f.label}
            </p>
            <p className="text-base font-semibold leading-[1.3] text-gray-12 font-family-dm-sans">
              {f.value}
            </p>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function WithdrawalDetailsDrawer({
  isOpen,
  onClose,
  item,
  onStatusChange,
}: WithdrawalDetailsDrawerProps) {
  const [isApproving, setIsApproving] = useState(false);
  const [isDenying, setIsDenying] = useState(false);
  const [showDenyModal, setShowDenyModal] = useState(false);
  const [denyNotes, setDenyNotes] = useState("");
  const [detail, setDetail] = useState<WithdrawalItem | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen || !item) return;
    let cancelled = false;
    setDetail(null);
    setLoadingDetail(true);
    getApiClient()
      .get<{ data: { withdrawal: WithdrawalItem } }>(
        `/api/v1/admin/withdrawals/${item.id}`
      )
      .then((res) => {
        if (!cancelled) setDetail(res.data.data.withdrawal);
      })
      .catch(() => { /* usa item da lista como fallback */ })
      .finally(() => {
        if (!cancelled) setLoadingDetail(false);
      });
    return () => { cancelled = true; };
  }, [isOpen, item?.id]);

  if (!item) return null;

  const resolved = detail ?? item;

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo 10MB.");
      return;
    }
    const allowed = ["image/png", "image/jpeg", "application/pdf"];
    if (!allowed.includes(file.type)) {
      toast.error("Formato inválido. Use PNG, JPG ou PDF.");
      return;
    }

    setIsUploadingReceipt(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await getApiClient().patch<{ data: { receiptUrl: string } }>(
        `/api/v1/admin/withdrawals/${item.id}/receipt`,
        form,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      const receiptUrl = res.data.data.receiptUrl;
      setDetail((prev) => (prev ? { ...prev, receiptUrl } : { ...item, receiptUrl }));
      toast.success("Comprovante enviado com sucesso!");
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Erro ao enviar comprovante.");
    } finally {
      setIsUploadingReceipt(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleApprove = async () => {
    if (isApproving || isDenying) return;
    setIsApproving(true);
    try {
      await getApiClient().post(
        `/api/v1/admin/withdrawals/${item.id}/approve`
      );
      toast.success("Repasse aprovado com sucesso!");
      onStatusChange(item.id, "COMPLETED");
      onClose();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? e?.message ?? "Erro ao aprovar repasse.");
    } finally {
      setIsApproving(false);
    }
  };

  const handleDeny = () => {
    if (isApproving || isDenying) return;
    setDenyNotes("");
    setShowDenyModal(true);
  };

  const handleConfirmDeny = async () => {
    if (isDenying) return;
    setIsDenying(true);
    try {
      await getApiClient().post(
        `/api/v1/admin/withdrawals/${item.id}/reject`,
        { notes: denyNotes.trim() || undefined }
      );
      toast.success("Repasse negado.");
      onStatusChange(item.id, "CANCELLED");
      setShowDenyModal(false);
      onClose();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? e?.message ?? "Erro ao negar repasse.");
    } finally {
      setIsDenying(false);
    }
  };

  const org = resolved.event.organization;
  const orgName = org.name;
  const orgLogo = org.logoUrl;
  const requesterName = fullName(resolved);
  const requesterEmail = resolved.requestedBy.email;

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()} direction="right">
      <DrawerContent className="flex flex-col h-full bg-gray-1 sm:max-w-[720px] border-l border-gray-6">

        {/* Header */}
        <DrawerHeader className="flex items-center justify-between shrink-0 border-b border-gray-6 px-5 py-3">
          <DrawerTitle className="text-xl font-semibold leading-[1.3] text-gray-12 font-family-dm-sans sr-only">
            Detalhes do repasse
          </DrawerTitle>
          <div className="flex items-center w-full justify-between">
            <div className="text-xl font-semibold leading-[1.3] text-gray-12 font-family-dm-sans ">
              Detalhes do repasse
            </div>
            <DrawerClose asChild>
              <button
                type="button"
                className="size-9 rounded-lg hover:bg-gray-3 flex items-center justify-center transition-colors"
                aria-label="Fechar"
              >
                <X className="size-5 text-gray-11" />
              </button>
            </DrawerClose>
          </div>
        </DrawerHeader>

        {/* Body */}
        <div className="overflow-y-auto flex-1 flex flex-col gap-7 pt-5 pb-13">
          {loadingDetail && (
            <div className="flex items-center justify-center py-10">
              <div className="size-6 border-2 border-gray-6 border-t-primary-11 rounded-full animate-spin" />
            </div>
          )}
          {!loadingDetail && <>

            {/* Organização */}
            <div className="flex flex-col gap-4 px-4">
              <p className="text-base font-semibold leading-[1.3] text-gray-11 font-family-dm-sans">
                Organização
              </p>
              <div className="flex items-center gap-2.5">
                <div className="size-12 rounded-lg bg-gray-4 shrink-0 overflow-hidden flex items-center justify-center">
                  {orgLogo ? (
                    <Image src={orgLogo} alt={orgName} width={48} height={48} className="size-full object-cover" />
                  ) : (
                    <span className="text-base font-semibold text-gray-12 font-manrope">
                      {getInitials(orgName)}
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-2 min-w-0">
                  <p className="text-base font-semibold leading-[1.1] text-gray-12 font-manrope truncate">
                    {orgName}
                  </p>
                  <p className="text-base font-normal leading-[1.3] text-gray-11 font-family-dm-sans truncate">
                    {org.email}
                  </p>
                </div>
              </div>
            </div>

            <DrawerSeparator />

            {/* Dados do organizador */}
            <div className="flex flex-col gap-4 px-4">
              <p className="text-base font-semibold leading-[1.3] text-gray-11 font-family-dm-sans">
                Dados do organizador
              </p>
              <div className="flex flex-col gap-4">
                <SectionRow label="Nome:" value={requesterName} />
                <SectionRow label="E-mail:" value={requesterEmail} />
                {org.phone && <SectionRow label="Telefone:" value={formatPhone(org.phone)} />}
                {org.whatsapp && <SectionRow label="WhatsApp:" value={formatPhone(org.whatsapp)} />}
                {org.document && <SectionRow label="CNPJ:" value={formatDocument(org.document)} />}
                {resolved.notes && <SectionRow label="Observação:" value={resolved.notes} />}
              </div>
            </div>

            <DrawerSeparator />

            {/* Valores do Repasse */}
            <div className="flex flex-col gap-4 px-4">
              <p className="text-base font-semibold leading-[1.3] text-gray-11 font-family-dm-sans">
                Valores do Repasse
              </p>
              <div className="bg-gray-3 rounded-lg p-5 flex flex-col gap-5">
                <div className="flex items-center justify-between text-lg leading-[1.3]">
                  <p className="font-normal text-gray-11 font-family-dm-sans">Total arrecadado:</p>
                  <p className="font-semibold text-gray-12 font-family-dm-sans">{formatCurrency(resolved.amount)}</p>
                </div>
                <div className="w-full h-px bg-gray-8" />
                <div className="flex items-center justify-between">
                  <p className="text-lg font-normal leading-[1.3] text-gray-12 font-family-dm-sans">
                    Valor a repassar:
                  </p>
                  <p className="text-2xl font-extrabold leading-[1.1] text-primary-11 font-manrope">
                    {formatCurrency(resolved.netAmount)}
                  </p>
                </div>
              </div>
            </div>

            <DrawerSeparator />

            {/* Dados Bancários */}
            <div className="flex flex-col gap-4 px-4">
              <p className="text-base font-semibold leading-[1.3] text-gray-11 font-family-dm-sans">
                Dados Bancários
              </p>
              <BankGrid item={resolved} />
            </div>

            <DrawerSeparator />

            {/* Comprovante de Transferência */}
            <div className="flex flex-col gap-4 px-4">
              <p className="text-base font-semibold leading-[1.3] text-gray-11 font-family-dm-sans">
                Comprovante de Transferência
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,application/pdf"
                className="hidden"
                onChange={handleReceiptUpload}
              />

              {resolved.receiptUrl ? (
                <div className="border border-gray-6 rounded-xl overflow-hidden flex flex-col">
                  {resolved.receiptUrl.match(/\.(png|jpe?g|webp)(\?|$)/i) ? (
                    <div className="relative w-full aspect-video bg-gray-3">
                      <Image
                        src={resolved.receiptUrl}
                        alt="Comprovante"
                        fill
                        className="object-contain"
                        unoptimized
                      />
                    </div>
                  ) : (
                    <a
                      href={resolved.receiptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-4 hover:bg-gray-3 transition-colors"
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary-11 shrink-0">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14,2 14,8 20,8" />
                      </svg>
                      <span className="text-base font-semibold text-primary-11 font-family-dm-sans underline">
                        Ver comprovante (PDF)
                      </span>
                    </a>
                  )}
                  <div className="border-t border-gray-6 px-4 py-3 flex items-center justify-between bg-gray-2">
                    <p className="text-sm font-normal text-gray-11 font-family-dm-sans">
                      Comprovante anexado
                    </p>
                    <button
                      type="button"
                      disabled={isUploadingReceipt}
                      onClick={() => fileInputRef.current?.click()}
                      className="text-sm font-semibold text-primary-11 font-family-dm-sans hover:text-primary-10 transition-colors disabled:opacity-50"
                    >
                      {isUploadingReceipt ? "Enviando..." : "Substituir"}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={isUploadingReceipt}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-6 rounded-xl flex flex-col items-center justify-center gap-4 py-9 px-6 w-full hover:border-primary-11 hover:bg-primary-3/10 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isUploadingReceipt ? (
                    <div className="size-8 border-2 border-gray-6 border-t-primary-11 rounded-full animate-spin" />
                  ) : (
                    <div className="size-16 flex items-center justify-center text-primary-11">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                    </div>
                  )}
                  <div className="flex flex-col items-center gap-2 w-full">
                    <p className="text-lg font-bold leading-[1.1] text-primary-11 font-manrope text-center">
                      {isUploadingReceipt ? "Enviando comprovante..." : "Anexar comprovante"}
                    </p>
                    {!isUploadingReceipt && (
                      <p className="text-base font-semibold leading-[1.1] text-gray-12 font-manrope text-center">
                        PNG, JPG ou PDF — máx. 10MB
                      </p>
                    )}
                  </div>
                </button>
              )}
            </div>
          </>}
        </div>

        {/* Footer — only for PENDING */}
        {resolved.status === "PENDING" && (
          <div className="shrink-0 border-t border-gray-6 bg-gray-2 flex items-center justify-end gap-2 px-4 py-3">
            <Button
              type="button"
              onClick={handleDeny}
              variant={"destructive"}
              disabled={isApproving || isDenying}
            >
              {isDenying ? "Negando..." : "Negar repasse"}
            </Button>
            <Button
              type="button"
              onClick={handleApprove}
              disabled={isApproving || isDenying}
            >
              {isApproving ? "Aprovando..." : "Aprovar repasse"}
            </Button>
          </div>
        )}

        {/* Deny modal — rendered inside DrawerContent so it inherits the vaul portal */}
        <AnimatePresence>
          {showDenyModal && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 bg-black/10 z-[200]"
                onClick={() => !isDenying && setShowDenyModal(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 8 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="fixed inset-0 z-[201] flex items-center justify-center p-4 pointer-events-none"
              >
                <div
                  className="bg-gray-1 rounded-xl w-full max-w-[540px] flex flex-col gap-11 px-5 pt-6 pb-5 pointer-events-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Content */}
                  <div className="flex flex-col gap-5">
                    <p className="text-xl font-semibold leading-[1.3] text-gray-12 font-family-dm-sans text-center">
                      Motivo da negação
                    </p>

                    {/* Warning box */}
                    <div className="bg-yellow-3 rounded-lg p-3 flex gap-2 items-start">
                      <Info className="size-6 text-yellow-11 shrink-0 mt-0.5" />
                      <p className="text-base font-normal leading-[1.3] text-yellow-12 font-family-dm-sans">
                        Este motivo será visível para o organizador e{" "}
                        <span className="font-bold">não poderá ser alterado</span>{" "}
                        após a confirmação. Certifique-se de que a justificativa está clara e correta.
                      </p>
                    </div>

                    {/* Textarea */}
                    <div className="flex flex-col gap-2">
                      <label className="text-base font-normal leading-[1.3] text-gray-12 font-family-dm-sans">
                        Motivo da negação
                      </label>
                      <textarea
                        rows={6}
                        value={denyNotes}
                        onChange={(e) => setDenyNotes(e.target.value)}
                        placeholder="Ex: Os dados bancários informados estão incorretos. Por favor, atualize as informações e solicite um novo repasse"
                        className="w-full border border-gray-6 rounded-lg px-3 py-4 text-base font-normal leading-[1.3] text-gray-12 font-family-dm-sans placeholder:text-gray-11 bg-gray-1 resize-none outline-none focus:border-primary-11 transition-colors"
                        disabled={isDenying}
                      />
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowDenyModal(false)}
                      disabled={isDenying}
                      className="flex-1 h-12 border border-gray-6 rounded-lg font-bold text-base leading-[1.1] text-gray-12 font-manrope hover:bg-gray-3 transition-colors disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmDeny}
                      disabled={isDenying}
                      className="flex-1 h-12 bg-red-11 rounded-lg font-bold text-base leading-[1.1] text-red-2 font-manrope hover:bg-red-10 transition-colors disabled:opacity-70"
                    >
                      {isDenying ? "Negando..." : "Confirmar negação"}
                    </button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </DrawerContent>
    </Drawer>
  );
}
