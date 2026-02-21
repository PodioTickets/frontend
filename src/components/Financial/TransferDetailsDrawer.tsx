"use client";

import { useState } from "react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
} from "@/components/ui/drawer";
import { X, Eye, ChevronLeft, ChevronRight, ArrowLeft, Ticket, Building2 } from "lucide-react";
import { PixIcon } from "@/components/Icons/PixIcon";
import { CardIcon } from "@/components/Icons/CardIcon";

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
  id: "REP_9231",
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
    pixKey: "34.***.***.0001.**",
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
      buyer: {
        name: "Ahmad Ballard",
        email: "NoahSilva@gmail.com",
        avatar: null,
      },
      date: "18/10/2026",
      value: 100.0,
      installment: "1/4",
      paymentMethod: "Pix",
    },
    {
      orderId: "#6b82...51d6",
      transactionId: "1240-2414",
      buyer: {
        name: "Ahmad Ballard",
        email: "NoahSilva@gmail.com",
        avatar: null,
      },
      date: "18/10/2026",
      value: 150.0,
      installment: null,
      paymentMethod: "Pix",
    },
    {
      orderId: "#6b82...51d6",
      transactionId: "1240-2414",
      buyer: {
        name: "Ahmad Ballard",
        email: "NoahSilva@gmail.com",
        avatar: null,
      },
      date: "18/10/2026",
      value: 100.0,
      installment: "1/4",
      paymentMethod: "Pix",
    },
    {
      orderId: "#6b82...51d6",
      transactionId: "1240-2414",
      buyer: {
        name: "Ahmad Ballard",
        email: "NoahSilva@gmail.com",
        avatar: null,
      },
      date: "18/10/2026",
      value: 150.0,
      installment: null,
      paymentMethod: "Pix",
    },
    {
      orderId: "#6b82...51d6",
      transactionId: "1240-2414",
      buyer: {
        name: "Ahmad Ballard",
        email: "NoahSilva@gmail.com",
        avatar: null,
      },
      date: "18/10/2026",
      value: 100.0,
      installment: "1/2",
      paymentMethod: "Pix",
    },
    {
      orderId: "#6b82...51d6",
      transactionId: "1240-2414",
      buyer: {
        name: "Ahmad Ballard",
        email: "NoahSilva@gmail.com",
        avatar: null,
      },
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
  const itemsPerPage = 10;
  const totalPages = Math.ceil(mockTransferDetails.orders.length / itemsPerPage);

  const getStatusBadge = (status: string) => {
    if (status === "Concluído") {
      return "bg-[#59E373] text-[#141414]";
    }
    return "bg-yellow-10/20 text-yellow-11";
  };

  const paginatedOrders = mockTransferDetails.orders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <Drawer open={isOpen} onOpenChange={onClose} direction="right">
      <DrawerContent className="bg-gray-1 h-full w-full sm:max-w-[970px] border-l border-gray-6">
        {/* Header */}
        <DrawerHeader className="border-b border-gray-6 px-5 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="size-9 flex items-center justify-center border border-gray-6 rounded-full hover:bg-gray-3 transition-colors cursor-pointer"
              >
                <ArrowLeft className="size-6 text-gray-12" />
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
        </DrawerHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-5">
            {/* Breadcrumb */}
            <div className="mb-7 flex items-center gap-1 text-[16px] font-family-dm-sans">
              <span className="text-gray-11">Eventos</span>
              <ChevronRight className="size-4 text-gray-11" />
              <span className="text-gray-11">Total a ser repassado</span>
              <ChevronRight className="size-4 text-gray-11" />
              <span className="text-gray-12">Detalhes do repasse</span>
            </div>

            {/* Info Header */}
            <div className="mb-7 flex items-center gap-3 text-[16px]">
              <div className="flex items-center gap-1">
                <span className="text-gray-11 font-family-dm-sans font-normal">Data:</span>
                <span className="text-gray-12 font-manrope font-semibold">
                  {mockTransferDetails.date} às {mockTransferDetails.time}
                </span>
              </div>
              <span className="w-1 h-1 rounded-full bg-gray-11" />
              <div className="flex items-center gap-1">
                <span className="text-gray-11 font-family-dm-sans font-normal">ID do repasse:</span>
                <span className="text-gray-12 font-manrope font-semibold">{mockTransferDetails.id}</span>
              </div>
              <span className="w-1 h-1 rounded-full bg-gray-11" />
              <span className="inline-flex items-center justify-center px-3 py-2 rounded bg-primary-11 text-[14px] font-family-dm-sans font-normal text-primary-1">
                {mockTransferDetails.status}
              </span>
            </div>

            {/* Event Section */}
            <div className="mb-7">
              <p className="text-[18px] text-gray-12 font-manrope font-bold mb-3">Evento</p>
              <div className="bg-gray-2 border border-gray-6 rounded-lg p-4 flex items-center gap-6">
                <div className="flex flex-1 flex-col gap-3">
                  <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-11">
                    Nome do evento
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-4 flex items-center justify-center shrink-0">
                      <Ticket className="size-6 text-gray-12" />
                    </div>
                    <p className="font-family-dm-sans font-semibold text-[16px] leading-[1.3] text-gray-12">
                      {mockTransferDetails.event.name}
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
                        {mockTransferDetails.event.organizer.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex flex-col gap-3">
                      <p className="font-family-dm-sans font-semibold text-[16px] leading-[1.3] text-gray-12">
                        {mockTransferDetails.event.organizer.name}
                      </p>
                      <p className="font-family-dm-sans font-normal text-[14px] leading-[1.3] text-gray-11">
                        CNPJ: 27.912.458/0001-73
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Account Section */}
            <div className="mb-7">
              <p className="text-[18px] text-gray-12 font-manrope font-bold mb-3">
                Conta de destino (PIX)
              </p>
              <div className="bg-gray-2 border border-gray-6 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#ebe4ff] flex items-center justify-center shrink-0">
                      <Building2 className="size-6 text-gray-12" />
                    </div>
                    <div className="flex flex-col gap-2">
                      <p className="font-family-dm-sans font-semibold text-[16px] leading-[1.3] text-gray-12">
                        {mockTransferDetails.account.bank}
                      </p>
                      <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-11">
                        Chave: {mockTransferDetails.account.pixKey}
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center justify-center px-3 py-2 rounded bg-[#ebe4ff] text-[16px] font-family-dm-sans font-normal text-[#2f265f]">
                    {mockTransferDetails.account.type}
                  </span>
                </div>
              </div>
            </div>

            {/* Values Cards */}
            <div className="mb-7">
              <div className="bg-gray-2 border border-gray-6 rounded-lg p-5 flex flex-col gap-8">
                <div className="flex flex-col gap-4">
                  <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-11">
                    Valor repassado (líquido)
                  </p>
                  <p className="font-manrope font-extrabold text-[36px] leading-[1.1] tracking-[1px] text-gray-12">
                    R$ {mockTransferDetails.values.netValue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="flex gap-6 items-center">
                  <div className="flex flex-1 flex-col gap-4">
                    <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-11">
                      Total bruto
                    </p>
                    <p className="font-manrope font-extrabold text-[18px] leading-[1.1] text-gray-12">
                      R$ {mockTransferDetails.values.grossValue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="h-full w-px bg-gray-6" />
                  <div className="flex flex-1 flex-col gap-4">
                    <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-11">
                      Taxas de processamento
                    </p>
                    <p className="font-manrope font-extrabold text-[18px] leading-[1.1] text-red-11">
                      - R$ {mockTransferDetails.values.fee.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="h-full w-px bg-gray-6" />
                  <div className="flex flex-1 flex-col gap-4">
                    <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-11">
                      Outros abatimentos
                    </p>
                    <p className="font-manrope font-extrabold text-[18px] leading-[1.1] text-gray-12">
                      - R$ {mockTransferDetails.values.otherDiscounts.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Orders Table */}
            <div>
              <div className="bg-gray-2 border-[1.5px] border-gray-6 rounded-lg overflow-hidden">
                {/* Table Header */}
                <div className="px-4 py-5 border-b border-gray-6">
                  <p className="font-manrope font-bold text-[18px] leading-[1.1] text-gray-12">
                    342 transações deste lote
                  </p>
                </div>
                <div className="bg-gray-3 border-b border-t border-gray-6 flex h-[44px] items-center">
                  <div className="flex h-full items-center px-4 py-4 w-[120px]">
                    <p className="font-inter font-medium leading-[1.3] text-[14px] text-gray-12">
                      ID pedido
                    </p>
                  </div>
                  <div className="flex h-full items-center px-4 py-4 w-[120px]">
                    <p className="font-inter font-medium leading-[1.3] text-[14px] text-gray-12">
                      ID transação
                    </p>
                  </div>
                  <div className="flex flex-1 h-full items-start min-h-px min-w-px px-4 py-4">
                    <p className="font-inter font-medium leading-[1.3] text-[14px] text-gray-12">
                      Comprador
                    </p>
                  </div>
                  <div className="flex flex-1 h-full items-center justify-center min-h-px min-w-px px-4 py-4">
                    <p className="font-inter font-medium leading-[1.3] text-[14px] text-gray-12">
                      Data
                    </p>
                  </div>
                  <div className="flex flex-1 h-full items-center justify-center min-h-px min-w-px px-4 py-4">
                    <p className="font-inter font-medium leading-[1.3] text-[14px] text-gray-12">
                      Valor
                    </p>
                  </div>
                  <div className="flex flex-1 h-full items-center justify-center min-h-px min-w-px px-4 py-4">
                    <p className="font-inter font-medium leading-[1.3] text-[14px] text-gray-12">
                      Pagamento
                    </p>
                  </div>
                  <div className="flex h-full items-center justify-end px-4 py-4 w-[74px]">
                    <p className="font-inter font-medium leading-[1.3] text-[14px] text-gray-12">
                      Ações
                    </p>
                  </div>
                </div>

                {/* Table Rows */}
                <div className="flex flex-col items-start w-full">
                  {paginatedOrders.map((order, index) => (
                    <div
                      key={`${order.orderId}-${index}`}
                      className="bg-gray-1 border-b border-gray-6 flex items-center justify-between w-full last:border-b-0"
                    >
                      {/* ID pedido */}
                      <div className="flex h-full items-center px-4 py-3 w-[120px]">
                        <p className="font-family-dm-sans font-semibold leading-[1.3] text-[14px] text-gray-12 truncate">
                          {order.orderId}
                        </p>
                      </div>

                      {/* ID transação */}
                      <div className="flex h-full items-center px-4 py-3 w-[120px]">
                        <p className="font-family-dm-sans font-semibold leading-[1.3] text-[14px] text-gray-12 truncate">
                          {order.transactionId}
                        </p>
                      </div>

                      {/* Comprador */}
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

                      {/* Data */}
                      <div className="flex flex-1 h-full items-center justify-center min-h-px min-w-px px-4 py-3">
                        <p className="font-inter font-semibold leading-[1.3] text-[14px] text-gray-12">
                          {order.date}
                        </p>
                      </div>

                      {/* Valor */}
                      <div className="flex flex-1 h-full items-center justify-center min-h-px min-w-px px-4 py-3">
                        <div className="flex flex-col items-center gap-3">
                          <div className="flex items-center gap-0.5">
                            <span className="font-inter font-semibold leading-[1.3] text-[14px] text-gray-12">
                              R$
                            </span>
                            <span className="font-inter font-semibold leading-[1.3] text-[14px] text-gray-12">
                              {order.value.toFixed(2).replace(".", ",")}
                            </span>
                          </div>
                          {order.installment && (
                            <div className="flex items-center gap-0.5">
                              <span className="font-family-dm-sans font-normal leading-[1.3] text-[14px] text-gray-11">
                                Parcelado:
                              </span>
                              <span className="font-family-dm-sans font-normal leading-[1.3] text-[14px] text-gray-11">
                                {order.installment}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Pagamento */}
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

                      {/* Ações */}
                      <div className="flex h-full items-center justify-end px-4 py-3 w-[74px]">
                        <button className="bg-gray-2 border border-gray-6 rounded-lg size-8 flex items-center justify-center hover:bg-gray-3 transition-colors cursor-pointer">
                          <Eye className="size-6 text-gray-11" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-end gap-1 px-4 py-5 border-t border-gray-6">
                    <button
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="size-8 flex items-center justify-center rounded-lg hover:bg-gray-3 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="size-6" />
                    </button>
                    {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                      const pageNum = i + 1;
                      const isActive = pageNum === currentPage;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`size-8 flex items-center justify-center rounded-lg text-[14px] font-family-dm-sans font-medium transition-colors ${isActive
                            ? "bg-primary-11 text-primary-1"
                            : "bg-gray-4 hover:bg-gray-5 text-gray-12"
                            }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={currentPage >= totalPages}
                      className="size-8 flex items-center justify-center rounded-lg hover:bg-gray-3 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="size-6" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
