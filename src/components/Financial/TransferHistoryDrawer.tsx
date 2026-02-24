"use client";

import { PaymentIcon } from 'react-svg-credit-card-payment-icons';
import { useState, useEffect } from "react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
} from "@/components/ui/drawer";
import { X, Eye, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react";
import { Coins } from "lucide-react";
import { CalendarIcon } from "@/components/Icons/CalendarIcon";
import { TransferDetailsDrawer } from "./TransferDetailsDrawer";
import { RepasseIcon } from "../Icons/RepasseIcon";
import { ArrowButton } from "../ArrowButton";
import { DetailsIcon } from "../Icons/DetailsIcon";
import { organizerService } from "@/services";
import type { Transfer } from "@/services/organizer/OrganizerService";
import toast from "react-hot-toast";

interface TransferHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  totalTransferred: number;
  eventId: string;
  eventName?: string;
  categoryName?: string;
  onNavigatePrev?: () => void;
  onNavigateNext?: () => void;
}

export function TransferHistoryDrawer({
  isOpen,
  onClose,
  totalTransferred,
  eventId,
  eventName = "Maratona 2024",
  categoryName = "Nome da categoria",
  onNavigatePrev,
  onNavigateNext,
}: TransferHistoryDrawerProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(false);
  const itemsPerPage = 10;
  
  useEffect(() => {
    if (isOpen && eventId) {
      loadTransfers();
    }
  }, [isOpen, eventId]);

  const loadTransfers = async () => {
    try {
      setLoading(true);
      const data = await organizerService.getEventTransferHistory(eventId);
      setTransfers(data.transfers);
    } catch (error: any) {
      console.error("Error loading transfers:", error);
      toast.error("Erro ao carregar histórico de repasses");
      setTransfers([]);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(transfers.length / itemsPerPage);

  const getStatusBadge = (status: string) => {
    if (status === "Concluído") {
      return "bg-primary-11 text-primary-1";
    }
    return "bg-yellow-11 text-yellow-1";
  };

  const paginatedTransfers = transfers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const formatTransferForDisplay = (transfer: Transfer) => {
    const date = new Date(transfer.requestedAt);
    const formattedDate = date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
    const formattedTime = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    
    return {
      id: transfer.id,
      pixKey: transfer.bankAccount?.account || "N/A",
      requestDate: formattedDate,
      requestTime: formattedTime,
      value: transfer.amount / 100, // Converter de centavos
      status: transfer.status === "COMPLETED" ? "Concluído" : 
              transfer.status === "PROCESSING" ? "Processando" :
              transfer.status === "FAILED" ? "Falhou" : "Pendente",
    };
  };

  return (
    <>
      <Drawer open={isOpen} onOpenChange={onClose} direction="right">
        <DrawerContent className="bg-gray-1 h-full border-l border-gray-6">
          {/* Header */}
          <DrawerHeader className="border-b border-gray-6 px-5 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-5">
                {/* Navigation Buttons */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={onNavigatePrev}
                    disabled={!onNavigatePrev}
                    className="size-9 flex items-center justify-center border border-gray-6 rounded-full hover:bg-gray-3 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed rotate-180"
                  >
                    <ArrowButton isOpen={false} />
                  </button>
                  <button
                    onClick={onNavigateNext}
                    disabled={!onNavigateNext}
                    className="size-9 flex items-center justify-center border border-gray-6 rounded-full hover:bg-gray-3 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ArrowButton isOpen={false} />
                  </button>
                </div>

                {/* Title with Icon */}
                <div className="flex items-center gap-2">
                  <div className="w-[32px] h-[32px] p-1 rounded-lg bg-[#EBE4FF] flex items-center justify-center">
                    <RepasseIcon className="size-6 text-gray-12" />
                  </div>
                  <h2 className="font-family-dm-sans font-semibold text-[20px] leading-[1.3] text-gray-12">
                    Histórico de repasses - Detalhes
                  </h2>
                </div>
              </div>
              <DrawerClose asChild>
                <button className="size-8 flex items-center justify-center rounded-lg hover:bg-gray-3 transition-colors cursor-pointer">
                  <X className="size-6 text-gray-12" />
                </button>
              </DrawerClose>
            </div>
          </DrawerHeader>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-5">
              {/* Info Header */}
              <div className="mb-5 flex items-center gap-2 text-base text-gray-11 font-family-dm-sans">
                <span>Nome da categoria: <span className="text-gray-12">{categoryName}</span></span>
                <span className="w-1 h-1 rounded-full bg-gray-11" />
                <span>Evento: <span className="text-gray-12">{eventName}</span></span>
              </div>

              {/* Total Card */}
              <div className="bg-gray-1 border border-gray-6 rounded-[12px] px-4 py-3 mb-5 w-1/3">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-family-dm-sans font-normal text-[14px] text-gray-11">
                    Total já repassado
                  </p>
                  <div className="w-[28px] h-[28px] p-1 rounded-lg bg-primary-4 flex items-center justify-center">
                    <CalendarIcon className="size-5 text-gray-12" />
                  </div>
                </div>
                <p className="font-family-dm-sans font-extrabold text-[20px] text-gray-12">
                  R$ {totalTransferred.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>

              {/* Table */}
              <div className="bg-gray-2 border border-gray-6 rounded-lg overflow-hidden">
                {/* Table Header */}
                <div className="bg-gray-4 border-b border-gray-6 flex h-[44px] items-center">
                  <div className="flex h-full items-center p-4 w-[120px]">
                    <p className="font-inter font-medium leading-[1.3] text-sm text-gray-12">
                      ID pedido
                    </p>
                  </div>
                  <div className="flex flex-1 h-full items-center justify-center min-h-px min-w-px p-4">
                    <p className="font-inter font-medium leading-[1.3] text-sm text-gray-12 text-center">
                      Chave pix
                    </p>
                  </div>
                  <div className="flex flex-1 h-full items-center justify-center min-h-px min-w-px p-4">
                    <p className="font-inter font-medium leading-[1.3] text-sm text-gray-12 text-center">
                      Data da solicitação
                    </p>
                  </div>
                  <div className="flex flex-1 h-full items-center justify-center min-h-px min-w-px p-4">
                    <p className="font-inter font-medium leading-[1.3] text-sm text-gray-12 text-center">
                      Valor
                    </p>
                  </div>
                  <div className="flex flex-1 h-full items-center justify-center min-h-px min-w-px p-4">
                    <p className="font-inter font-medium leading-[1.3] text-sm text-gray-12 text-center">
                      Status
                    </p>
                  </div>
                  <div className="flex h-full items-center justify-center p-4 w-[64px]">
                    <p className="font-inter font-medium leading-[1.3] text-sm text-gray-12">
                      Ações
                    </p>
                  </div>
                </div>

                {/* Table Rows */}
                <div className="flex flex-col items-start w-full">
                  {loading ? (
                    <div className="w-full p-8 text-center text-gray-11">
                      Carregando...
                    </div>
                  ) : paginatedTransfers.length === 0 ? (
                    <div className="w-full p-8 text-center text-gray-11">
                      Nenhum repasse encontrado
                    </div>
                  ) : (
                    paginatedTransfers.map((transfer) => {
                      const displayTransfer = formatTransferForDisplay(transfer);
                      return (
                    <div
                      key={transfer.id}
                      className="bg-gray-1 border-b border-gray-6 flex items-center justify-between w-full last:border-b-0 hover:bg-gray-2 transition-colors h-[56px]"
                    >
                      {/* ID pedido */}
                      <div className="flex h-full items-center p-4 w-[120px]">
                        <p className="font-inter font-semibold leading-[1.3] text-sm text-gray-12">
                          {displayTransfer.id}
                        </p>
                      </div>

                      {/* Chave pix */}
                      <div className="flex flex-1 h-full items-center min-h-px min-w-px p-4">
                        <p className="font-inter font-semibold leading-[1.3] text-sm text-gray-12 text-center w-full">
                          {displayTransfer.pixKey}
                        </p>
                      </div>

                      {/* Data da solicitação */}
                      <div className="flex flex-1 h-full items-center min-h-px min-w-px p-4">
                        <div className="flex flex-col items-center w-full">
                          <p className="font-inter font-semibold leading-[1.3] text-sm text-gray-12">
                            {displayTransfer.requestDate}
                          </p>
                          <p className="font-inter font-normal leading-[1.3] text-sm text-gray-11">
                            {displayTransfer.requestTime}
                          </p>
                        </div>
                      </div>

                      {/* Valor */}
                      <div className="flex flex-1 h-full items-center min-h-px min-w-px p-4">
                        <div className="flex items-center gap-1 justify-center w-full">
                          <span className="font-inter font-semibold leading-[1.3] text-sm text-gray-12">
                            R$
                          </span>
                          <span className="font-inter font-semibold leading-[1.3] text-sm text-gray-12">
                            {displayTransfer.value.toFixed(2).replace(".", ",")}
                          </span>
                        </div>
                      </div>

                      {/* Status */}
                      <div className="flex flex-1 h-full items-center min-h-px min-w-px p-4">
                        <div className="flex justify-center w-full">
                          <span
                            className={`inline-flex items-center justify-center px-3 py-1 rounded text-[10px] font-medium ${getStatusBadge(
                              displayTransfer.status
                            )}`}
                          >
                            {displayTransfer.status}
                          </span>
                        </div>
                      </div>

                      {/* Ações */}
                      <div className="flex gap-1 h-full items-center justify-center px-4 py-2 w-[64px]">
                        <button
                          onClick={() => {
                            setSelectedTransfer(transfer as Transfer);
                            setIsDetailsOpen(true);
                          }}
                          className="bg-gray-2 border border-gray-6 rounded-lg size-8 flex items-center justify-center hover:bg-gray-3 transition-colors cursor-pointer"
                        >
                          <DetailsIcon className="size-5 text-gray-12" />
                        </button>
                      </div>
                    </div>
                      );
                    })
                  )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 py-4 px-5 border-t border-gray-6">
                    <button
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="size-8 flex items-center justify-center border border-gray-6 rounded-lg hover:bg-gray-3 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="size-4" />
                    </button>
                    {Array.from({ length: Math.min(totalPages, 8) }, (_, i) => {
                      const pageNum = i + 1;
                      const isActive = pageNum === currentPage;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`size-8 flex items-center justify-center border rounded-lg text-sm font-inter font-normal transition-colors ${isActive
                            ? "bg-[#59E373] border-[#59E373] text-gray-12"
                            : "border-gray-6 hover:bg-gray-3 text-gray-12"
                            }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={currentPage >= totalPages}
                      className="size-8 flex items-center justify-center border border-gray-6 rounded-lg hover:bg-gray-3 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="size-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Transfer Details Drawer */}
      {selectedTransfer && (
        <TransferDetailsDrawer
          isOpen={isDetailsOpen}
          onClose={() => {
            setIsDetailsOpen(false);
            setSelectedTransfer(null);
          }}
          transfer={{
            id: selectedTransfer.id,
            pixKey: selectedTransfer.bankAccount?.account || "N/A",
            requestDate: new Date(selectedTransfer.requestedAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }),
            requestTime: new Date(selectedTransfer.requestedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
            value: selectedTransfer.amount / 100,
            status: selectedTransfer.status === "COMPLETED" ? "Concluído" : 
                    selectedTransfer.status === "PROCESSING" ? "Processando" :
                    selectedTransfer.status === "FAILED" ? "Falhou" : "Pendente",
          }}
          eventName={eventName}
          categoryName={categoryName}
        />
      )}
    </>
  );
}
