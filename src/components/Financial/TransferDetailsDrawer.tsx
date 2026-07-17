"use client";

import { useState, useEffect } from "react";
import { getApiClient } from "@/services/base/ApiClient";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { X, ChevronRight } from "lucide-react";
import { ArrowButton } from "../ArrowButton";
import { FinanceIcon } from "../Icons/Organizer/FinanceIcon";
import Image from "next/image";
import { formatDateBRT, formatTimeBRT } from "@/utils/datetimeBR";
import { formatShortId } from "@/utils/shortId";

// ── Formatação do destino PIX (espelha WithdrawalDetailsDrawer, fonte única) ──
const formatDocumentBr = (value: string) => {
  const d = value.replace(/\D/g, "");
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  return value;
};

const formatPhoneBr = (value: string) => {
  const d = value.replace(/\D/g, "");
  if (d.length === 11) return d.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  if (d.length === 10) return d.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  return value;
};

/** Formata a chave conforme o tipo (CPF/CNPJ e telefone ganham máscara; e-mail/aleatória cruas). */
const formatPixKey = (key?: string | null, keyType?: string | null): string => {
  if (!key) return "—";
  const type = keyType?.toUpperCase();
  if (type === "CPF" || type === "CNPJ") return formatDocumentBr(key);
  if (type === "PHONE" || type === "TELEFONE") return formatPhoneBr(key);
  return key;
};

/** Snapshot imutável da chave PIX no momento do saque (fonte de verdade do destino). */
interface PixSnapshot {
  key: string;
  keyType: string;
  bankName?: string | null;
  accountHolderName?: string | null;
  accountHolderDocument?: string | null;
}

interface PixKeyLive extends PixSnapshot {
  id: string;
}

interface TransferDetail {
  id: string;
  eventId: string;
  amount: number;
  feeRate: number;
  feeAmount: number;
  netAmount: number;
  receiptUrl: string;
  status: "PENDING" | "COMPLETED" | "CANCELLED";
  notes: string | null;
  createdAt: string;
  completedAt: string | null;
  pixKeyId: string | null;
  pixKeySnapshot: PixSnapshot | null;
  pixKey: PixKeyLive | null;
}

interface Organization {
  id: string;
  name: string;
  tradeName: string | null;
  document: string;
  email: string;
  phone: string | null;
  ownerName: string;
  pix: string | null;
  bankName: string | null;
  bankCode: string | null;
  agency: string | null;
  account: string | null;
  accountType: string | null;
  accountHolderName: string | null;
  accountHolderDocument: string | null;
}

interface TransferDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  transfer: {
    id: string;
    requestDate: string;
    requestTime: string;
    value: number;
    status: string;
  };
}

export function TransferDetailsDrawer({
  isOpen,
  onClose,
  eventId,
  transfer,
}: TransferDetailsDrawerProps) {
  const [data, setData] = useState<{ transfer: TransferDetail; organization: Organization } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !eventId || !transfer?.id) return;
    let cancelled = false;
    setData(null);
    setLoading(true);
    getApiClient()
      .get<{ data: { transfer: TransferDetail; organization: Organization } }>(
        `/api/v1/events/${eventId}/financial/transfers/${transfer.id}`
      )
      .then((res) => {
        if (!cancelled) setData(res.data.data);
      })
      .catch(() => { })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [isOpen, eventId, transfer?.id]);

  const statusLabel = (s: string) => {
    if (s === "COMPLETED") return "Concluído";
    if (s === "CANCELLED") return "Cancelado";
    return "Pendente";
  };

  const resolvedStatus = data ? statusLabel(data.transfer.status) : transfer.status;
  const resolvedId = data?.transfer.id ?? transfer.id;
  // createdAt do repasse é INSTANTE real → BRT (America/Sao_Paulo).
  const resolvedDate = data
    ? formatDateBRT(data.transfer.createdAt, { day: "2-digit", month: "long", year: "numeric" })
    : transfer.requestDate;
  const resolvedTime = data
    ? formatTimeBRT(data.transfer.createdAt, { hour: "2-digit", minute: "2-digit" })
    : transfer.requestTime;
  const grossValue = data ? data.transfer.amount / 100 : transfer.value;
  const feeValue = data ? data.transfer.feeAmount / 100 : 0;
  const netValue = data ? data.transfer.netAmount / 100 : transfer.value;

  const org = data?.organization;
  // Fonte de verdade do destino: snapshot imutável do saque → chave viva → legado da org.
  // Os campos org.bankName/org.pix são LEGADOS (chaves migraram p/ tabela PixKey por saque)
  // e hoje vêm vazios — por isso o destino aparecia como "—".
  const dest = data?.transfer.pixKeySnapshot ?? data?.transfer.pixKey ?? null;
  const bankDisplay = dest?.bankName?.trim() || org?.bankName?.trim() || "Conta PIX";
  const pixKeyDisplay = dest
    ? formatPixKey(dest.key, dest.keyType)
    : org?.pix?.trim() || "—";
  const holderDisplay = dest?.accountHolderName?.trim() || org?.accountHolderName?.trim() || null;

  const getStatusBadge = (status: string) => {
    if (status === "Concluído" || status === "COMPLETED") return "bg-primary-11 text-primary-2";
    if (status === "Cancelado" || status === "CANCELLED") return "bg-red-3 text-red-11";
    return "bg-yellow-10/20 text-yellow-11";
  };

  return (
    <Drawer open={isOpen} onOpenChange={onClose} direction="right">
      <DrawerContent className="bg-gray-1 h-full w-full sm:max-w-[970px] border-l border-gray-6">
        <DrawerTitle className="sr-only">Detalhes do repasse</DrawerTitle>
        {/* ── Header ── */}
        <DrawerHeader className="border-b border-gray-6 px-5 py-3">
          {/* Desktop */}
          <div className="hidden md:flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="size-9 -rotate-180 flex items-center justify-center border border-gray-6 rounded-full hover:bg-gray-3 transition-colors cursor-pointer"
              >
                <ArrowButton isOpen={false} />
              </button>
              <h2 className="font-family-dm-sans font-semibold text-[20px] leading-[1.3] text-gray-12">
                Detalhes do repasse
              </h2>
            </div>
            <DrawerClose asChild>
              <button className="size-8 flex items-center justify-center rounded-lg hover:bg-gray-3 transition-colors cursor-pointer">
                <X className="size-6 text-gray-11" />
              </button>
            </DrawerClose>
          </div>

          {/* Mobile */}
          <div className="flex md:hidden items-center gap-3">
            <button
              onClick={onClose}
              className="size-9 -rotate-180 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            >
              <ArrowButton isOpen={false} />
            </button>
            <h2 className="flex-1 text-center font-family-dm-sans font-semibold text-[18px] leading-[1.3] text-gray-12">
              Detalhes do repasse
            </h2>
            {/* Spacer to keep title centered */}
            <div className="size-9 shrink-0" />
          </div>
        </DrawerHeader>

        {/* ── Content ── */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-5">

            {/* ── Breadcrumb ── */}
            {/* Desktop */}
            <div className="hidden md:flex mb-7 items-center gap-1 text-[16px] font-family-dm-sans">
              <span className="text-gray-11">Eventos</span>
              <ChevronRight className="size-4 text-gray-11" />
              <span className="text-gray-11">Total a ser repassado</span>
              <ChevronRight className="size-4 text-gray-11" />
              <span className="text-gray-12">Detalhes do repasse</span>
            </div>

            {/* Mobile */}
            <div className="flex md:hidden flex-wrap items-center justify-center gap-1 mb-4 text-[13px] font-family-dm-sans">
              <span className="text-gray-11">Eventos</span>
              <ChevronRight className="size-3 text-gray-11 shrink-0" />
              <span className="text-gray-11">Financeiro</span>
              <ChevronRight className="size-3 text-gray-11 shrink-0" />
              <span className="text-gray-11">Histórico de repasses</span>
              <ChevronRight className="size-3 text-gray-11 shrink-0" />
              <span className="text-gray-12">Detalhes do repasse</span>
            </div>

            {/* ── Info Header ── */}
            {/* Desktop */}
            <div className="hidden md:flex mb-7 items-start flex-col gap-3 text-[16px]">
              <div className="flex items-center gap-1">
                <span className="text-gray-11 font-family-dm-sans font-normal">ID do repasse:</span>
                <span className="text-gray-12 font-manrope font-semibold">{formatShortId(resolvedId)}</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <span className="text-gray-11 font-family-dm-sans font-normal">Data:</span>
                  <span className="text-gray-12 font-manrope font-semibold">
                    {resolvedDate} às {resolvedTime}
                  </span>
                </div>
                <span className="w-1 h-1 rounded-full bg-gray-11" />
                <span className={`inline-flex items-center justify-center px-3 py-2 rounded text-[14px] font-family-dm-sans font-normal ${getStatusBadge(resolvedStatus)}`}>
                  {resolvedStatus}
                </span>
              </div>
            </div>

            {/* Mobile info card */}
            <div className="md:hidden mb-4 rounded-xl border border-gray-6 p-3 flex flex-col items-center gap-2">
              <div className="flex items-center gap-1 text-[13px]">
                <span className="text-gray-11 font-family-dm-sans">Data:</span>
                <span className="text-gray-12 font-manrope font-semibold">
                  {resolvedDate} às {resolvedTime}
                </span>
              </div>
              <div className="flex items-center gap-6 text-[13px]">
                <span className="text-gray-11 font-family-dm-sans">
                  ID: {formatShortId(resolvedId)}
                </span>
                <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded text-[12px] font-family-dm-sans font-normal ${getStatusBadge(resolvedStatus)}`}>
                  {resolvedStatus}
                </span>
              </div>
            </div>


            {/* ── Account Section ── */}
            <div className="mb-5 md:mb-7">
              <p className="text-[16px] md:text-[18px] text-gray-12 font-manrope font-bold mb-3">
                Conta de destino (PIX)
              </p>

              {/* Desktop */}
              <div className="hidden md:block bg-gray-2 border border-gray-6 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#ebe4ff] flex items-center justify-center shrink-0">
                      <FinanceIcon className="size-6 text-gray-12" />
                    </div>
                    <div className="flex flex-col">
                      <p className="font-family-dm-sans font-semibold text-[16px] leading-[1.3] text-gray-12">
                        {loading ? "Carregando..." : bankDisplay}
                      </p>
                      {!loading && holderDisplay && (
                        <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-11">
                          Titular: {holderDisplay}
                        </p>
                      )}
                      <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-11">
                        Chave: {loading ? "..." : pixKeyDisplay}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mobile */}
              <div className="md:hidden bg-gray-2 border border-gray-6 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="size-9 rounded-lg bg-[#ebe4ff] flex items-center justify-center shrink-0">
                    <FinanceIcon className="size-6 text-gray-12" />
                  </div>
                  <div className="flex flex-col gap-1 min-w-0">
                    <p className="font-family-dm-sans font-semibold text-[15px] leading-[1.3] text-gray-12 wrap-break-word">
                      {loading ? "Carregando..." : bankDisplay}
                    </p>
                    {!loading && holderDisplay && (
                      <p className="font-family-dm-sans font-normal text-[13px] leading-[1.3] text-gray-11 wrap-break-word">
                        Titular: {holderDisplay}
                      </p>
                    )}
                    <p className="font-family-dm-sans font-normal text-[13px] leading-[1.3] text-gray-11 wrap-break-word">
                      Chave: {loading ? "..." : pixKeyDisplay}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Values Cards ── */}
            <div className="mb-5 md:mb-7">
              {/* Desktop */}
              <div className="hidden md:flex bg-gray-2 border border-gray-6 rounded-lg p-5 flex-col gap-8">
                <div className="flex flex-col gap-4">
                  <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-11">
                    Valor repassado (líquido)
                  </p>
                  <p className="font-manrope font-extrabold text-[36px] leading-[1.1] tracking-[1px] text-gray-12">
                    R$ {netValue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="flex gap-6 items-center">
                  <div className="flex flex-1 flex-col gap-4">
                    <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-11">
                      Total bruto
                    </p>
                    <p className="font-manrope font-extrabold text-[18px] leading-[1.1] text-gray-12">
                      R$ {grossValue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="h-full w-px bg-gray-6" />
                  <div className="flex flex-1 flex-col gap-4">
                    <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-11">
                      Taxas de processamento
                    </p>
                    <p className="font-manrope font-extrabold text-[18px] leading-[1.1] text-red-11">
                      - R$ {feeValue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>


              {/* Mobile */}
              <div className="md:hidden bg-gray-2 border border-gray-6 rounded-lg p-4">
                <p className="font-family-dm-sans font-normal text-[13px] leading-[1.3] text-gray-11 mb-1">
                  Valor do repasse
                </p>
                <p className="font-manrope font-extrabold text-[28px] leading-[1.1] tracking-[0.5px] text-gray-12 mb-4">
                  R$ {netValue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>

                <div className="flex flex-col items-start mb-2">
                  <p className="font-family-dm-sans font-normal text-[13px] text-gray-11">
                    Valor recebido
                  </p>
                  <p className="font-manrope font-bold text-[15px] text-gray-12">
                    R$ {grossValue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>

                <hr className="border-gray-6 mb-2" />

                <div className="flex flex-col items-start mb-2">
                  <p className="font-family-dm-sans font-normal text-[13px] text-gray-11">
                    Taxas de processamento
                  </p>
                  <p className="font-manrope font-bold text-[15px] text-red-11">
                    - R$ {feeValue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>

            {/* ── Cancellation reason ── */}
            {resolvedStatus === "Cancelado" && data?.transfer.notes && (
              <div className="mb-5 md:mb-7 rounded-lg border border-red-6 bg-red-2 p-4 flex flex-col gap-1">
                <p className="text-[13px] md:text-[14px] font-family-dm-sans font-semibold text-red-11">
                  Motivo do cancelamento
                </p>
                <p className="text-[13px] md:text-[15px] font-family-dm-sans font-normal text-red-12">
                  {data.transfer.notes}
                </p>
              </div>
            )}

            {data?.transfer.receiptUrl && (
              <div className="border border-gray-6 rounded-lg overflow-hidden flex flex-col">
                {data?.transfer.receiptUrl.match(/\.(png|jpe?g|webp)(\?|$)/i) ? (
                  <div className="relative w-full aspect-video bg-gray-3">
                    <Image
                      src={data?.transfer.receiptUrl}
                      alt="Comprovante"
                      fill
                      className="object-contain"
                      unoptimized
                    />
                  </div>
                ) : (
                  <a
                    href={data?.transfer.receiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-4 hover:bg-gray-3 transition-colors"
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary-11 shrink-0">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14,2 14,8 20,8" />
                    </svg>
                    <span className="text-base font-semibold text-primary-11 font-family-dm-sans underline">
                      Ver comprovante
                    </span>
                  </a>
                )}
              </div>)}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
