"use client";

import { useState, useEffect } from "react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
} from "@/components/ui/drawer";
import { X, ChevronLeft, ChevronRight, FileText } from "lucide-react";
import { CalendarIcon } from "@/components/Icons/CalendarIcon";
import { PixIcon } from "@/components/Icons/PixIcon";
import { PaymentItemDetailsDrawer } from "./PaymentItemDetailsDrawer";
import { ArrowButton } from "../ArrowButton";
import { DetailsIcon } from "../Icons/DetailsIcon";
import { PaymentIcon } from "react-svg-credit-card-payment-icons";
import { organizerService } from "@/services";
import type { PendingRelease } from "@/services/organizer/OrganizerService";
import { TimerIcon } from "../Icons/Organizer/TimerIcon";
import { getAvatarUrl } from "@/utils/avatar";
import Image from "next/image";

interface AwaitingReleaseDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  totalPending: number;
  releaseToday: number;
  totalTransactions: number;
  eventId: string;
  eventName?: string;
  categoryName?: string;
  onNavigatePrev?: () => void;
  onNavigateNext?: () => void;
}

export function AwaitingReleaseDrawer({
  isOpen,
  onClose,
  totalPending,
  releaseToday,
  totalTransactions,
  eventId,
  eventName = "Maratona 2024",
  categoryName = "Nome da categoria",
  onNavigatePrev,
  onNavigateNext,
}: AwaitingReleaseDrawerProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PendingRelease | null>(null);
  const [pendingReleases, setPendingReleases] = useState<PendingRelease[]>([]);
  const [loading, setLoading] = useState(false);
  const [actualData, setActualData] = useState<{
    totalPending: number;
    releaseToday: number;
  }>({ totalPending, releaseToday });
  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    totalOrders: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  }>({
    page: 1,
    limit: 20,
    totalOrders: totalTransactions,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  });
  const itemsPerPage = 20;

  useEffect(() => {
    if (isOpen && eventId) {
      loadPendingReleases(1);
    }
  }, [isOpen, eventId]);

  useEffect(() => {
    if (isOpen && eventId && currentPage > 0) {
      loadPendingReleases(currentPage);
    }
  }, [currentPage]);

  const loadPendingReleases = async (page: number) => {
    try {
      setLoading(true);
      const data = await organizerService.getEventPendingReleases(eventId, page, itemsPerPage);
      setPendingReleases(data.pending || []);
      setActualData({
        totalPending: data.totalPending || 0,
        releaseToday: data.releaseToday || 0,
      });
      if (data.pagination) {
        setPagination({
          page: data.pagination.page || page,
          limit: data.pagination.limit || itemsPerPage,
          totalOrders: data.pagination.totalOrders || 0,
          totalPages: data.pagination.totalPages || 1,
          hasNextPage: data.pagination.hasNextPage || false,
          hasPreviousPage: data.pagination.hasPreviousPage || false,
        });
      }
    } catch (error: any) {
      console.error("Error loading pending releases:", error);
      setPendingReleases([]);
    } finally {
      setLoading(false);
    }
  };

  // Formatar data para exibição
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  // Usar paginação do servidor
  const totalPages = pagination.totalPages;
  const paginatedItems = pendingReleases; // Já vem paginado do servidor

  return (
    <>
      <Drawer open={isOpen} onOpenChange={onClose} direction="right">
        <DrawerContent className="bg-gray-1 h-full w-full sm:max-w-[969px] border-l border-gray-6">
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
                  <div className="w-[32px] h-[32px] p-1 rounded-lg bg-yellow-3 flex items-center justify-center">
                    <TimerIcon className="size-6 text-yellow-12" />
                  </div>
                  <h2 className="font-family-dm-sans font-semibold text-[20px] leading-[1.3] text-gray-12">
                    Aguardando liberação - Detalhes
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

              <div className="grid grid-cols-3 gap-4 mb-5">
                {/* Total pendente */}
                <div className="bg-gray-1 border border-gray-6 rounded-[12px] px-4 py-3">
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-family-dm-sans font-normal text-gray-11">
                      Total pendente
                    </p>
                    <div className="w-[28px] h-[28px] p-1 rounded-lg bg-[#CAF1F6] flex items-center justify-center">
                      <CalendarIcon className="size-5 text-gray-12" />
                    </div>
                  </div>
                  <p className="font-family-dm-sans font-extrabold text-xl text-gray-12">
                    R$ {(actualData.totalPending / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>

                {/* Liberação hoje */}
                <div className="bg-gray-1 border border-gray-6 rounded-[12px] px-4 py-3">
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-family-dm-sans font-normal text-gray-11">
                      Liberação hoje
                    </p>
                    <div className="w-[28px] h-[28px] p-1 rounded-lg bg-primary-3 flex items-center justify-center">
                      <TimerIcon className="size-5 text-primary-12" />
                    </div>
                  </div>
                  <p className="font-family-dm-sans font-extrabold text-xl text-gray-12">
                    R$ {(actualData.releaseToday / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>

                {/* Pedidos */}
                <div className="bg-gray-1 border border-gray-6 rounded-[12px] px-4 py-3">
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-family-dm-sans font-normal text-gray-11">
                      Pedidos
                    </p>
                    <div className="w-[28px] h-[28px] p-1 rounded-lg bg-[#EBE4FF] flex items-center justify-center">
                      <FileText className="size-5 text-[#2F265F]" />
                    </div>
                  </div>
                  <p className="font-family-dm-sans font-extrabold text-xl text-gray-12">
                    {pagination.totalOrders}
                  </p>
                </div>
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
                  <div className="flex h-full items-center p-4 w-[120px]">
                    <p className="font-inter font-medium leading-[1.3] text-sm text-gray-12">
                      ID transação
                    </p>
                  </div>
                  <div className="flex flex-1 h-full items-center min-h-px min-w-px p-4">
                    <p className="font-inter font-medium leading-[1.3] text-sm text-gray-12">
                      Comprador
                    </p>
                  </div>
                  <div className="flex flex-1 h-full items-center min-h-px min-w-px p-4">
                    <p className="font-inter font-medium leading-[1.3] text-sm text-gray-12 text-center">
                      Previsão liberação
                    </p>
                  </div>
                  <div className="flex flex-1 h-full items-center justify-center min-h-px min-w-px p-4">
                    <p className="font-inter font-medium leading-[1.3] text-sm text-gray-12 text-center">
                      Pagamento
                    </p>
                  </div>
                  <div className="flex flex-1 h-full items-center justify-center min-h-px min-w-px p-4">
                    <p className="font-inter font-medium leading-[1.3] text-sm text-gray-12 text-center">
                      Valor pendente
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
                  ) : paginatedItems.length === 0 ? (
                    <div className="w-full p-8 text-center text-gray-11">
                      Nenhum item aguardando liberação
                    </div>
                  ) : (
                    paginatedItems.map((item, index) => (
                      <div
                        key={`${item.orderId}-${index}`}
                        className="bg-gray-1 border-b border-gray-6 flex items-center justify-between w-full last:border-b-0 hover:bg-gray-2 transition-colors h-[60px]"
                      >
                        {/* ID pedido */}
                        <div className="flex h-full items-center p-4 w-[120px]">
                          <p className="font-inter font-semibold leading-[1.3] text-sm text-gray-12">
                            #{item.orderId.slice(0, 6)}...{item.orderId.slice(-4)}
                          </p>
                        </div>

                        {/* ID transação */}
                        <div className="flex h-full items-center p-4 w-[120px]">
                          <p className="font-inter font-semibold leading-[1.3] text-sm text-gray-12">
                            {item.transactionId.length > 8 ? item.transactionId.slice(0, 8) : item.transactionId}
                          </p>
                        </div>

                        {/* Comprador */}
                        <div className="flex flex-1 h-full items-center gap-3 min-h-px min-w-px p-4">
                          {item.buyer.avatarUrl ? (
                            <Image
                              src={getAvatarUrl(item.buyer.avatarUrl)}
                              alt={item.buyer.fullName}
                              width={36}
                              height={36}
                              className="size-9 rounded-full object-cover shrink-0"
                            />
                          ) : (
                            <div className="size-9 rounded-full bg-gray-6 flex items-center justify-center shrink-0">
                              <span className="text-gray-12 font-semibold text-sm">
                                {item.buyer.firstName?.charAt(0).toUpperCase() || "?"}
                              </span>
                            </div>
                          )}
                          <div className="flex flex-col gap-0 min-w-0">
                            <p className="font-inter font-semibold leading-[1.3] text-sm text-gray-12 truncate">
                              {item.buyer.fullName || `${item.buyer.firstName} ${item.buyer.lastName}`}
                            </p>
                            <p className="font-inter font-normal leading-[1.3] text-sm text-gray-11 truncate">
                              {item.buyer.email}
                            </p>
                          </div>
                        </div>

                        {/* Previsão liberação */}
                        <div className="flex flex-1 h-full items-center min-h-px min-w-px p-4">
                          <div className="flex items-center justify-center w-full">
                            <p className="font-inter font-semibold leading-[1.3] text-sm text-gray-12">
                              Lib. {formatDate(item.releaseDate)}
                            </p>
                          </div>
                        </div>

                        {/* Pagamento */}
                        <div className="flex flex-1 h-full items-center justify-center min-h-px min-w-px p-4">
                          <div className="flex items-center gap-2 justify-center w-full">
                            {item.paymentMethod === "PIX" ? (
                              <PixIcon className="size-5 text-gray-12" />
                            ) : (
                              <PaymentIcon type="Generic" className="size-8 text-gray-12" />
                            )}
                          </div>
                        </div>

                        {/* Valor pendente */}
                        <div className="flex flex-1 h-full items-center justify-center min-h-px min-w-px p-4">
                          <div className="flex items-center gap-1 justify-center w-full">
                            <span className="font-inter font-semibold leading-[1.3] text-sm text-gray-12">
                              R$
                            </span>
                            <span className="font-inter font-semibold leading-[1.3] text-sm text-gray-12">
                              {(item.amount / 100).toFixed(2).replace(".", ",")}
                            </span>
                          </div>
                        </div>

                        {/* Ações */}
                        <div className="flex gap-1 h-full items-center justify-center px-4 py-2 w-[64px]">
                          <button
                            onClick={() => {
                              setSelectedPayment(item);
                              setIsDetailsOpen(true);
                            }}
                            className="bg-gray-2 border border-gray-6 rounded-lg size-8 flex items-center justify-center hover:bg-gray-3 transition-colors cursor-pointer"
                          >
                            <DetailsIcon className="size-5 text-gray-12" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 py-4 px-5 border-t border-gray-6">
                    <button
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={!pagination.hasPreviousPage || loading}
                      className="size-8 flex items-center justify-center border border-gray-6 rounded-lg hover:bg-gray-3 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="size-4" />
                    </button>
                    {(() => {
                      // Calcular quais páginas mostrar
                      const maxVisible = 8;
                      let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
                      let endPage = Math.min(totalPages, startPage + maxVisible - 1);
                      
                      // Ajustar se estiver perto do final
                      if (endPage - startPage + 1 < maxVisible) {
                        startPage = Math.max(1, endPage - maxVisible + 1);
                      }
                      
                      return Array.from({ length: endPage - startPage + 1 }, (_, i) => {
                        const pageNum = startPage + i;
                        const isActive = pageNum === currentPage;
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            disabled={loading}
                            className={`size-8 flex items-center justify-center border rounded-lg text-sm font-inter font-normal transition-colors ${isActive
                              ? "bg-[#59E373] border-[#59E373] text-gray-12"
                              : "border-gray-6 hover:bg-gray-3 text-gray-12"
                              } disabled:opacity-50`}
                          >
                            {pageNum}
                          </button>
                        );
                      });
                    })()}
                    <button
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={!pagination.hasNextPage || loading}
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

      {/* Payment Details Drawer */}
      {selectedPayment && (
        <PaymentItemDetailsDrawer
          isOpen={isDetailsOpen}
          onClose={() => {
            setIsDetailsOpen(false);
            setSelectedPayment(null);
          }}
          paymentItem={{
            orderId: selectedPayment.orderId,
            transactionId: selectedPayment.transactionId,
            buyer: {
              name: selectedPayment.buyer.fullName || `${selectedPayment.buyer.firstName} ${selectedPayment.buyer.lastName}`,
              email: selectedPayment.buyer.email,
              avatar: selectedPayment.buyer.avatarUrl,
            },
            releaseDate: formatDate(selectedPayment.releaseDate),
            paymentMethod: selectedPayment.paymentMethod === "PIX" ? "Pix" : "Cartão de Crédito",
            value: selectedPayment.amount / 100,
          }}
          eventName={eventName}
          categoryName={categoryName}
          type="awaiting"
        />
      )}
    </>
  );
}
