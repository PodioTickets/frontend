"use client";

import { useState, useMemo, useEffect } from "react";
import { getApiClient } from "@/services/base/ApiClient";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { X, ChevronRight, Ticket, Building2, FileText, Search } from "lucide-react";
import { PixIcon } from "@/components/Icons/PixIcon";
import { CardIcon } from "@/components/Icons/CardIcon";
import { ArrowButton } from "../ArrowButton";
import { Pagination } from "@/components/Pagination";
import { FinanceIcon } from "../Icons/Organizer/FinanceIcon";

interface TransferDetail {
  id: string;
  eventId: string;
  amount: number;
  feeRate: number;
  feeAmount: number;
  netAmount: number;
  status: "PENDING" | "COMPLETED" | "CANCELLED";
  notes: string | null;
  createdAt: string;
  completedAt: string | null;
}

interface TransferDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  transfer: {
    id: string;
    pixKey: string;
    requestDate: string;
    requestTime: string;
    value: number;
    status: string;
  };
  eventName?: string;
  categoryName?: string;
}

// Mock data - substituir com dados reais da API
const mockTransferDetails = {
  id: "999ef0df-a1a3-4e10-95eb-7b2b8df6f0c7",
  date: "24 outubro, 2025",
  time: "14:30",
  status: "Concluído",
  event: {
    name: "Nome do evento",
    organizer: {
      name: "Organizer Text",
      email: "Organizer Text",
      avatar: null,
    },
  },
  account: {
    bank: "Banco Nubank",
    pixKey: "25.300.324/0001-76",
    type: "Conta PJ",
  },
  values: {
    netValue: 145200.0,
    grossValue: 150000.0,
    fee: 4800.0,
    otherDiscounts: 0.0,
  },
  orders: [
    {
      orderId: "#6b82...51d6",
      transactionId: "1240-2414",
      buyer: { name: "Ahmad Ballard", email: "NoahSilva@gmail.com", avatar: null },
      date: "18/10/2026",
      value: 100.0,
      installment: "1/4",
      paymentMethod: "Pix",
    },
    {
      orderId: "#6b82...51d6",
      transactionId: "1240-2414",
      buyer: { name: "Ahmad Ballard", email: "NoahSilva@gmail.com", avatar: null },
      date: "18/10/2026",
      value: 150.0,
      installment: null,
      paymentMethod: "Pix",
    },
    {
      orderId: "#6b82...51d6",
      transactionId: "1240-2414",
      buyer: { name: "Ahmad Ballard", email: "NoahSilva@gmail.com", avatar: null },
      date: "18/10/2026",
      value: 100.0,
      installment: "1/4",
      paymentMethod: "Pix",
    },
    {
      orderId: "#6b82...51d6",
      transactionId: "1240-2414",
      buyer: { name: "Ahmad Ballard", email: "NoahSilva@gmail.com", avatar: null },
      date: "18/10/2026",
      value: 150.0,
      installment: null,
      paymentMethod: "Pix",
    },
    {
      orderId: "#6b82...51d6",
      transactionId: "1240-2414",
      buyer: { name: "Ahmad Ballard", email: "NoahSilva@gmail.com", avatar: null },
      date: "18/10/2026",
      value: 100.0,
      installment: "1/2",
      paymentMethod: "Pix",
    },
    {
      orderId: "#6b82...51d6",
      transactionId: "1240-2414",
      buyer: { name: "Ahmad Ballard", email: "NoahSilva@gmail.com", avatar: null },
      date: "18/10/2026",
      value: 150.0,
      installment: null,
      paymentMethod: "Pix",
    },
  ],
};

export function TransferDetailsDrawer({
  isOpen,
  onClose,
  eventId,
  transfer,
  eventName = "Maratona 2024",
  categoryName = "Nome da categoria",
}: TransferDetailsDrawerProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState<TransferDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const itemsPerPage = 10;

  useEffect(() => {
    if (!isOpen || !eventId || !transfer?.id) return;
    let cancelled = false;
    setDetail(null);
    setLoadingDetail(true);
    getApiClient()
      .get<{ data: { transfer: TransferDetail } }>(
        `/api/v1/events/${eventId}/financial/transfers/${transfer.id}`
      )
      .then((res) => {
        if (!cancelled) setDetail(res.data.data.transfer);
      })
      .catch(() => { })
      .finally(() => {
        if (!cancelled) setLoadingDetail(false);
      });
    return () => { cancelled = true; };
  }, [isOpen, eventId, transfer?.id]);

  const formatValue = (v: number) => v.toFixed(2).replace(".", ",");

  const statusLabel = (s: string) => {
    if (s === "COMPLETED" || s === "Concluído") return "Concluído";
    if (s === "CANCELLED") return "Cancelado";
    return "Pendente";
  };

  const resolvedStatus = detail ? statusLabel(detail.status) : transfer.status;
  const resolvedId = detail?.id ?? transfer.id;
  const resolvedDate = detail
    ? new Date(detail.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
    : transfer.requestDate;
  const resolvedTime = detail
    ? new Date(detail.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    : transfer.requestTime;
  const grossValue = detail ? detail.amount / 100 : transfer.value;
  const feeValue = detail ? detail.feeAmount / 100 : 0;
  const netValue = detail ? detail.netAmount / 100 : transfer.value;

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return mockTransferDetails.orders;
    return mockTransferDetails.orders.filter((o) => {
      const valueStr = formatValue(o.value);
      return (
        o.orderId.toLowerCase().includes(q) ||
        o.transactionId.toLowerCase().includes(q) ||
        o.date.toLowerCase().includes(q) ||
        valueStr.includes(q) ||
        `r$${valueStr}`.includes(q)
      );
    });
  }, [search]);

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const safePage = Math.min(currentPage, Math.max(1, totalPages));

  const paginatedOrders = filteredOrders.slice(
    (safePage - 1) * itemsPerPage,
    safePage * itemsPerPage
  );

  const handleSearch = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const getStatusBadge = (status: string) => {
    if (status === "Concluído" || status === "COMPLETED") return "bg-primary-11 text-primary-2";
    if (status === "Cancelado" || status === "CANCELLED") return "bg-red-3 text-red-11";
    return "bg-yellow-10/20 text-yellow-11";
  };

  const { event, account } = mockTransferDetails;

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
                <span className="text-gray-12 font-manrope font-semibold">{resolvedId}</span>
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
                  ID: {resolvedId}
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
                        {account.bank}
                      </p>
                      <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-11">
                        Chave: {transfer.pixKey}
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center justify-center px-3 py-2 rounded bg-[#ebe4ff] text-[16px] font-family-dm-sans font-normal text-[#2f265f]">
                    {account.type}
                  </span>
                </div>
              </div>

              {/* Mobile */}
              <div className="md:hidden bg-gray-2 border border-gray-6 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="size-9 rounded-lg bg-[#ebe4ff] flex items-center justify-center shrink-0">
                    <FinanceIcon className="size-6 text-gray-12" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <p className="font-family-dm-sans font-semibold text-[15px] leading-[1.3] text-gray-12">
                      {account.bank}
                    </p>
                    <p className="font-family-dm-sans font-normal text-[13px] leading-[1.3] text-gray-11">
                      Chave: {transfer.pixKey}
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center justify-center px-3 py-1.5 rounded bg-[#ebe4ff] text-[13px] font-family-dm-sans font-normal text-[#2f265f]">
                  {account.type}
                </span>
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
                  <div className="h-full w-px bg-gray-6" />
                  <div className="flex flex-1 flex-col gap-4">
                    <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-11">
                      Outros abatimentos
                    </p>
                    <p className="font-manrope font-extrabold text-[18px] leading-[1.1] text-gray-12">
                      - R$ {(0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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

                <hr className="border-gray-6 mb-4" />

                <div className="flex flex-col items-start">
                  <p className="font-family-dm-sans font-normal text-[13px] text-gray-11">
                    Total de transações deste repasse
                  </p>
                  <p className="font-manrope font-bold text-[15px] text-gray-12">
                    {mockTransferDetails.orders.length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
