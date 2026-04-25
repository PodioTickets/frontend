"use client";

import { useState, useMemo } from "react";
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

interface TransferDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
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
  transfer,
  eventName = "Maratona 2024",
  categoryName = "Nome da categoria",
}: TransferDetailsDrawerProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const itemsPerPage = 10;

  const formatValue = (v: number) => v.toFixed(2).replace(".", ",");

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
    if (status === "Concluído") return "bg-primary-11 text-primary-2";
    return "bg-yellow-10/20 text-yellow-11";
  };

  const { event, account, values } = mockTransferDetails;

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
                <span className="text-gray-12 font-manrope font-semibold">{mockTransferDetails.id}</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <span className="text-gray-11 font-family-dm-sans font-normal">Data:</span>
                  <span className="text-gray-12 font-manrope font-semibold">
                    {mockTransferDetails.date} às {mockTransferDetails.time}
                  </span>
                </div>
                <span className="w-1 h-1 rounded-full bg-gray-11" />
                <span className={`inline-flex items-center justify-center px-3 py-2 rounded text-[14px] font-family-dm-sans font-normal ${getStatusBadge(mockTransferDetails.status)}`}>
                  {mockTransferDetails.status}
                </span>
              </div>
            </div>

            {/* Mobile info card */}
            <div className="md:hidden mb-4 rounded-xl border border-gray-6 p-3 flex flex-col items-center gap-2">
              <div className="flex items-center gap-1 text-[13px]">
                <span className="text-gray-11 font-family-dm-sans">Data:</span>
                <span className="text-gray-12 font-manrope font-semibold">
                  {mockTransferDetails.date} às {mockTransferDetails.time}
                </span>
              </div>
              <div className="flex items-center gap-6 text-[13px]">
                <span className="text-gray-11 font-family-dm-sans">
                  ID: {mockTransferDetails.id}
                </span>
                <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded text-[12px] font-family-dm-sans font-normal ${getStatusBadge(mockTransferDetails.status)}`}>
                  {mockTransferDetails.status}
                </span>
              </div>
            </div>

            {/* ── Evento Section ── */}
            <div className="mb-5 md:mb-7">
              <p className="text-[16px] md:text-[18px] text-gray-12 font-manrope font-bold mb-3">Evento</p>

              {/* Desktop: side-by-side */}
              <div className="hidden md:flex bg-gray-2 border border-gray-6 rounded-lg p-4 items-center gap-6">
                <div className="flex flex-1 flex-col gap-3">
                  <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-11">
                    Nome do evento
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-4 flex items-center justify-center shrink-0">
                      <Ticket className="size-6 text-gray-12" />
                    </div>
                    <p className="font-family-dm-sans font-semibold text-[16px] leading-[1.3] text-gray-12">
                      {event.name}
                    </p>
                  </div>
                </div>
                <div className="h-full w-px bg-gray-6" />
                <div className="flex flex-1 flex-col gap-3">
                  <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-11">
                    Organização
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="size-8 rounded-full bg-gray-6 flex items-center justify-center shrink-0">
                      <span className="text-gray-12 font-semibold text-sm">
                        {event.organizer.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex flex-col gap-3">
                      <p className="font-family-dm-sans font-semibold text-[16px] leading-[1.3] text-gray-12">
                        {event.organizer.name}
                      </p>
                      <p className="font-family-dm-sans font-normal text-[14px] leading-[1.3] text-gray-11">
                        CNPJ: 27.912.458/0001-73
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mobile: stacked */}
              <div className="md:hidden bg-gray-2 border border-gray-6 rounded-lg p-4">
                <p className="font-family-dm-sans font-normal text-[13px] leading-[1.3] text-gray-11 mb-2">
                  Nome do evento
                </p>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-blue-4 flex items-center justify-center shrink-0">
                    <Ticket className="size-5 text-gray-12" />
                  </div>
                  <p className="font-family-dm-sans font-semibold text-[15px] leading-[1.3] text-gray-12">
                    {event.name}
                  </p>
                </div>
                <hr className="border-gray-6 mb-4" />
                <p className="font-family-dm-sans font-normal text-[13px] leading-[1.3] text-gray-11 mb-2">
                  Organização
                </p>
                <div className="flex items-center gap-2">
                  <div className="size-8 rounded-full bg-gray-6 flex items-center justify-center shrink-0">
                    <span className="text-gray-12 font-semibold text-sm">
                      {event.organizer.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <p className="font-family-dm-sans font-semibold text-[15px] leading-[1.3] text-gray-12">
                      {event.organizer.name}
                    </p>
                    <p className="font-family-dm-sans font-normal text-[13px] leading-[1.3] text-gray-11">
                      CNPJ: 27.912.458/0001-73
                    </p>
                  </div>
                </div>
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
                      <Building2 className="size-6 text-gray-12" />
                    </div>
                    <div className="flex flex-col gap-2">
                      <p className="font-family-dm-sans font-semibold text-[16px] leading-[1.3] text-gray-12">
                        {account.bank}
                      </p>
                      <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-11">
                        Chave: {account.pixKey}
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
                      Chave: {account.pixKey}
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
                    R$ {values.netValue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="flex gap-6 items-center">
                  <div className="flex flex-1 flex-col gap-4">
                    <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-11">
                      Total bruto
                    </p>
                    <p className="font-manrope font-extrabold text-[18px] leading-[1.1] text-gray-12">
                      R$ {values.grossValue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="h-full w-px bg-gray-6" />
                  <div className="flex flex-1 flex-col gap-4">
                    <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-11">
                      Taxas de processamento
                    </p>
                    <p className="font-manrope font-extrabold text-[18px] leading-[1.1] text-red-11">
                      - R$ {values.fee.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="h-full w-px bg-gray-6" />
                  <div className="flex flex-1 flex-col gap-4">
                    <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-11">
                      Outros abatimentos
                    </p>
                    <p className="font-manrope font-extrabold text-[18px] leading-[1.1] text-gray-12">
                      - R$ {values.otherDiscounts.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                  R$ {values.netValue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>

                <div className="flex flex-col items-start mb-2">
                  <p className="font-family-dm-sans font-normal text-[13px] text-gray-11">
                    Valor recebido
                  </p>
                  <p className="font-manrope font-bold text-[15px] text-gray-12">
                    R$ {values.grossValue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>

                <hr className="border-gray-6 mb-2" />

                <div className="flex flex-col items-start mb-2">
                  <p className="font-family-dm-sans font-normal text-[13px] text-gray-11">
                    Taxas de processamento
                  </p>
                  <p className="font-manrope font-bold text-[15px] text-red-11">
                    - R$ {values.fee.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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

            {/* ── Orders ── */}
            <div>
              {/* ── Desktop: table ── */}
              <div className="hidden md:block bg-gray-2 border-[1.5px] border-gray-6 rounded-lg overflow-hidden">
                {/* Table Header + Search */}
                <div className="px-4 py-5 border-b border-gray-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="font-manrope font-bold text-[18px] leading-[1.1] text-gray-12 shrink-0">
                    {filteredOrders.length} transaç{filteredOrders.length !== 1 ? "ões" : "ão"}{search.trim() ? " encontrada" + (filteredOrders.length !== 1 ? "s" : "") : " deste lote"}
                  </p>
                  <div className="relative w-full sm:max-w-[300px]">
                    <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-11" />
                    <input
                      type="search"
                      value={search}
                      onChange={(e) => handleSearch(e.target.value)}
                      placeholder="Buscar por ID, data ou valor"
                      className="h-9 w-full rounded-lg border border-gray-6 bg-gray-1 pl-9 pr-3 text-sm text-gray-12 placeholder:text-gray-11 font-family-dm-sans outline-none focus-visible:border-gray-8 focus-visible:ring-[2px] focus-visible:ring-gray-6"
                    />
                  </div>
                </div>

                {/* Column headers */}
                <div className="bg-gray-3 border-b border-t border-gray-6 flex h-[44px] items-center">
                  <div className="flex h-full items-center px-4 py-4 w-[120px]">
                    <p className="font-inter font-medium leading-[1.3] text-[14px] text-gray-12">ID pedido</p>
                  </div>
                  <div className="flex flex-1 h-full items-start min-h-px min-w-px px-4 py-4">
                    <p className="font-inter font-medium leading-[1.3] text-[14px] text-gray-12">Comprador</p>
                  </div>
                  <div className="flex flex-1 h-full items-center justify-center min-h-px min-w-px px-4 py-4">
                    <p className="font-inter font-medium leading-[1.3] text-[14px] text-gray-12">Data</p>
                  </div>
                  <div className="flex flex-1 h-full items-center justify-center min-h-px min-w-px px-4 py-4">
                    <p className="font-inter font-medium leading-[1.3] text-[14px] text-gray-12">Valor</p>
                  </div>
                  <div className="flex flex-1 h-full items-center justify-center min-h-px min-w-px px-4 py-4">
                    <p className="font-inter font-medium leading-[1.3] text-[14px] text-gray-12">Pagamento</p>
                  </div>
                  <div className="flex h-full items-center justify-end px-4 py-4 w-[74px]">
                    <p className="font-inter font-medium leading-[1.3] text-[14px] text-gray-12">Ações</p>
                  </div>
                </div>

                {/* Table Rows */}
                <div className="flex flex-col items-start w-full">
                  {paginatedOrders.length === 0 && (
                    <div className="w-full py-12 flex items-center justify-center">
                      <p className="text-sm text-gray-11 font-family-dm-sans">
                        Nenhuma transação encontrada para &quot;{search}&quot;.
                      </p>
                    </div>
                  )}
                  {paginatedOrders.map((order, index) => (
                    <div
                      key={`${order.orderId}-${index}`}
                      className="bg-gray-1 border-b border-gray-6 flex items-center justify-between w-full last:border-b-0"
                    >
                      <div className="flex h-full items-center px-4 py-3 w-[120px]">
                        <p className="font-family-dm-sans font-semibold leading-[1.3] text-[14px] text-gray-12 truncate">
                          {order.orderId}
                        </p>
                      </div>
                      <div className="flex flex-1 h-full items-center gap-2.5 min-h-px min-w-px px-4 py-3 w-[197px]">
                        <div className="size-9 rounded-lg bg-gray-6 flex items-center justify-center shrink-0 overflow-hidden">
                          {order.buyer.avatar ? (
                            <img src={order.buyer.avatar} alt={order.buyer.name} className="size-full object-cover" />
                          ) : (
                            <span className="text-gray-12 font-semibold text-sm">
                              {order.buyer.name.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-col gap-2 min-w-0">
                          <p className="font-family-dm-sans font-semibold leading-[1.3] text-[14px] text-gray-12 truncate">
                            {order.buyer.name}
                          </p>
                          <p className="font-family-dm-sans font-normal leading-[1.3] text-[14px] text-gray-11 truncate whitespace-nowrap">
                            {order.buyer.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-1 h-full items-center justify-center min-h-px min-w-px px-4 py-3">
                        <p className="font-inter font-semibold leading-[1.3] text-[14px] text-gray-12">
                          {order.date}
                        </p>
                      </div>
                      <div className="flex flex-1 h-full items-center justify-center min-h-px min-w-px px-4 py-3">
                        <div className="flex flex-col items-center gap-3">
                          <div className="flex items-center gap-0.5">
                            <span className="font-inter font-semibold leading-[1.3] text-[14px] text-gray-12">R$</span>
                            <span className="font-inter font-semibold leading-[1.3] text-[14px] text-gray-12">
                              {order.value.toFixed(2).replace(".", ",")}
                            </span>
                          </div>
                          {order.installment && (
                            <div className="flex items-center gap-0.5">
                              <span className="font-family-dm-sans font-normal leading-[1.3] text-[14px] text-gray-11">{order.installment}</span>
                              <span className="font-family-dm-sans font-normal leading-[1.3] text-[14px] text-gray-11">de R${order.value}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-1 h-full items-center justify-center gap-2 min-h-px min-w-px px-4 py-3">
                        {order.paymentMethod === "Pix" ? (
                          <PixIcon className="size-5 text-gray-12" />
                        ) : (
                          <CardIcon className="size-5 text-gray-12" />
                        )}
                        <p className="font-inter font-semibold leading-[1.3] text-[14px] text-gray-12">
                          {order.paymentMethod}
                        </p>
                      </div>
                      <div className="flex h-full items-center justify-end px-4 py-3 w-[74px]">
                        <button className="bg-gray-2 border border-gray-6 rounded-lg size-8 flex items-center justify-center hover:bg-gray-3 transition-colors cursor-pointer">
                          <FileText className="size-4 text-gray-11" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="px-4 py-4 border-t border-gray-6">
                    <Pagination
                      currentPage={safePage}
                      totalPages={totalPages}
                      onPageChange={setCurrentPage}
                    />
                  </div>
                )}
              </div>

              {/* ── Mobile: card list ── */}
              <div className="md:hidden flex flex-col gap-4">
                {/* Search */}
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-11" />
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder="Nome, CPF, IDs.."
                    className="h-10 w-full rounded-lg border border-gray-6 bg-gray-2 pl-9 pr-3 text-sm text-gray-12 placeholder:text-gray-11 font-family-dm-sans outline-none focus-visible:border-gray-8 focus-visible:ring-[2px] focus-visible:ring-gray-6"
                  />
                </div>

                {/* Count */}
                <p className="font-family-dm-sans text-[13px] text-gray-11">
                  {filteredOrders.length} transaç{filteredOrders.length !== 1 ? "ões" : "ão"}{search.trim() ? " encontrada" + (filteredOrders.length !== 1 ? "s" : "") : " deste lote"}
                </p>

                {/* Cards */}
                {paginatedOrders.length === 0 ? (
                  <div className="py-12 flex items-center justify-center">
                    <p className="text-sm text-gray-11 font-family-dm-sans">
                      Nenhuma transação encontrada para &quot;{search}&quot;.
                    </p>
                  </div>
                ) : (
                  paginatedOrders.map((order, index) => (
                    <div
                      key={`mob-${order.orderId}-${index}`}
                      className="bg-gray-2 border border-gray-6 rounded-xl p-4 flex flex-col gap-3"
                    >
                      {/* Buyer row + payment icon */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="size-9 rounded-lg bg-gray-6 flex items-center justify-center shrink-0 overflow-hidden">
                            {order.buyer.avatar ? (
                              <img src={order.buyer.avatar} alt={order.buyer.name} className="size-full object-cover" />
                            ) : (
                              <span className="text-gray-12 font-semibold text-sm">
                                {order.buyer.name.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-col gap-0.5 min-w-0">
                            <p className="font-family-dm-sans font-semibold text-[14px] text-gray-12 truncate">
                              {order.buyer.name}
                            </p>
                            <p className="font-family-dm-sans font-normal text-[12px] text-gray-11 truncate">
                              {order.buyer.email}
                            </p>
                          </div>
                        </div>
                        {order.paymentMethod === "Pix" ? (
                          <PixIcon className="size-5 text-gray-12 shrink-0" />
                        ) : (
                          <CardIcon className="size-5 text-gray-12 shrink-0" />
                        )}
                      </div>

                      {/* Value */}
                      <p className="font-manrope font-extrabold text-[22px] leading-[1.1] text-gray-12">
                        R$ {order.value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>

                      <hr className="border-gray-6" />

                      {/* Ver detalhes */}
                      <button className="w-full h-9 rounded-lg border border-gray-6 bg-transparent text-[14px] font-family-dm-sans font-medium text-gray-12 hover:bg-gray-3 transition-colors cursor-pointer">
                        Ver detalhes
                      </button>
                    </div>
                  ))
                )}

                {/* Pagination */}
                <Pagination
                  currentPage={safePage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  className="justify-center"
                />
              </div>
            </div>

          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
