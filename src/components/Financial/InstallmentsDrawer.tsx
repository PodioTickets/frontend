"use client";

import { useState, useEffect } from "react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
} from "@/components/ui/drawer";
import { X, Eye, ChevronLeft, ChevronRight, FileText, ChevronUp } from "lucide-react";
import { CalendarIcon } from "@/components/Icons/CalendarIcon";
import { Hourglass } from "lucide-react";
import { PixIcon } from "@/components/Icons/PixIcon";
import { CardIcon } from "@/components/Icons/CardIcon";
import { PaymentItemDetailsDrawer } from "./PaymentItemDetailsDrawer";
import { ArrowButton } from "../ArrowButton";
import { DetailsIcon } from "../Icons/DetailsIcon";
import { organizerService } from "@/services";
import type { Installment } from "@/services/organizer/OrganizerService";
import toast from "react-hot-toast";

interface InstallmentsDrawerProps {
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

export function InstallmentsDrawer({
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
}: InstallmentsDrawerProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any | null>(null);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [loading, setLoading] = useState(false);
  const [actualData, setActualData] = useState<{
    totalPending: number;
    releaseToday: number;
    totalTransactions: number;
  }>({ totalPending, releaseToday, totalTransactions });
  const itemsPerPage = 10;

  useEffect(() => {
    if (isOpen && eventId) {
      loadInstallments();
    }
  }, [isOpen, eventId]);

  const loadInstallments = async () => {
    try {
      setLoading(true);
      const data = await organizerService.getEventInstallments(eventId);
      setInstallments(data.installments);
      setActualData({
        totalPending: data.totalPending,
        releaseToday: data.releaseToday,
        totalTransactions: data.totalTransactions,
      });
    } catch (error: any) {
      console.error("Error loading installments:", error);
      // Usar dados mockados como fallback
      setInstallments([]);
    } finally {
      setLoading(false);
    }
  };

  // Converter Installment para formato de exibição
  const formatInstallmentForDisplay = (installment: Installment, registrationId?: string) => {
    const date = new Date(installment.dueDate);
    const formattedDate = date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
    
    return {
      orderId: registrationId ? `#${registrationId.slice(0, 6)}...${registrationId.slice(-4)}` : `#${installment.id.slice(0, 6)}...${installment.id.slice(-4)}`,
      transactionId: installment.id.slice(0, 8),
      buyer: {
        name: "Comprador", // TODO: Buscar dados do comprador se disponível
        email: "email@example.com",
        avatar: null,
      },
      releaseDate: formattedDate,
      nextReleaseDate: formattedDate, // TODO: Calcular próxima data se disponível
      paymentMethod: "Pix", // TODO: Buscar método de pagamento se disponível
      value: installment.amount / 100, // Converter de centavos
      installment: "1/1", // TODO: Calcular parcela se disponível
    };
  };

  const displayInstallments = installments.map(i => formatInstallmentForDisplay(i));
  const totalPages = Math.ceil(displayInstallments.length / itemsPerPage);
  
  const paginatedInstallments = displayInstallments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

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
                  <div className="w-[32px] h-[32px] p-1 rounded-lg bg-primary-4 flex items-center justify-center">
                    <CalendarIcon className="size-6 text-gray-12" />
                  </div>
                  <h2 className="font-family-dm-sans font-semibold text-[20px] leading-[1.3] text-gray-12">
                    Parcelados a receber - Detalhes
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
              <div className="mb-5 flex items-center gap-2 text-[12px] text-gray-11 font-family-dm-sans">
                <span>Nome da categoria: {categoryName}</span>
                <span className="w-1 h-1 rounded-full bg-gray-11" />
                <span>Evento: {eventName}</span>
              </div>

              {/* Cards Section */}
              <div className="grid grid-cols-3 gap-4 mb-5">
                {/* Total pendente */}
                <div className="bg-gray-1 border border-gray-6 rounded-[12px] px-4 py-3">
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-family-dm-sans font-normal text-[14px] text-gray-11">
                      Total pendente
                    </p>
                    <div className="w-[28px] h-[28px] p-1 rounded-lg bg-primary-4 flex items-center justify-center">
                      <CalendarIcon className="size-5 text-gray-12" />
                    </div>
                  </div>
                  <p className="font-family-dm-sans font-extrabold text-[14px] text-gray-12">
                    R$ {(actualData.totalPending / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>

                {/* Liberação hoje */}
                <div className="bg-gray-1 border border-gray-6 rounded-[12px] px-4 py-3">
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-family-dm-sans font-normal text-[14px] text-gray-11">
                      Liberação hoje
                    </p>
                    <div className="w-[28px] h-[28px] p-1 rounded-lg bg-primary-4 flex items-center justify-center">
                      <Hourglass className="size-5 text-gray-12" />
                    </div>
                  </div>
                  <p className="font-family-dm-sans font-extrabold text-[14px] text-gray-12">
                    R$ {(actualData.releaseToday / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>

                {/* Transações */}
                <div className="bg-gray-1 border border-gray-6 rounded-[12px] px-4 py-3">
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-family-dm-sans font-normal text-[14px] text-gray-11">
                      Transações
                    </p>
                    <div className="w-[28px] h-[28px] p-1 rounded-lg bg-primary-4 flex items-center justify-center">
                      <FileText className="size-5 text-gray-12" />
                    </div>
                  </div>
                  <p className="font-family-dm-sans font-extrabold text-[14px] text-gray-12">
                    {actualData.totalTransactions}
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
                  <div className="flex flex-1 h-full items-center min-h-px min-w-px p-4">
                    <p className="font-inter font-medium leading-[1.3] text-sm text-gray-12 text-center">
                      Pagamento
                    </p>
                  </div>
                  <div className="flex flex-1 h-full items-center min-h-px min-w-px p-4">
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
                  ) : paginatedInstallments.length === 0 ? (
                    <div className="w-full p-8 text-center text-gray-11">
                      Nenhuma parcela encontrada
                    </div>
                  ) : (
                    paginatedInstallments.map((installment: any, index: number) => (
                    <div
                      key={`${installment.orderId}-${index}`}
                      className="bg-gray-1 border-b border-gray-6 flex items-center justify-between w-full last:border-b-0 hover:bg-gray-2 transition-colors h-[60px]"
                    >
                      {/* ID pedido */}
                      <div className="flex h-full items-center p-4 w-[120px]">
                        <p className="font-inter font-semibold leading-[1.3] text-sm text-gray-12">
                          {installment.orderId}
                        </p>
                      </div>

                      {/* ID transação */}
                      <div className="flex h-full items-center p-4 w-[120px]">
                        <p className="font-inter font-semibold leading-[1.3] text-sm text-gray-12">
                          {installment.transactionId}
                        </p>
                      </div>

                      {/* Comprador */}
                      <div className="flex flex-1 h-full items-center gap-3 min-h-px min-w-px p-4">
                        <div className="size-9 rounded-full bg-gray-6 flex items-center justify-center shrink-0">
                          <span className="text-gray-12 font-semibold text-sm">
                            {installment.buyer.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex flex-col gap-0 min-w-0">
                          <p className="font-inter font-semibold leading-[1.3] text-sm text-gray-12 truncate">
                            {installment.buyer.name}
                          </p>
                          <p className="font-inter font-normal leading-[1.3] text-sm text-gray-11 truncate">
                            {installment.buyer.email}
                          </p>
                        </div>
                      </div>

                      {/* Previsão liberação */}
                      <div className="flex flex-1 h-full items-center min-h-px min-w-px p-4">
                        <div className="flex flex-col items-center w-full">
                          <p className="font-inter font-semibold leading-[1.3] text-sm text-gray-12">
                            Lib. {installment.releaseDate}
                          </p>
                          <p className="font-inter font-normal leading-[1.3] text-sm text-gray-11">
                            Próx. {installment.nextReleaseDate}
                          </p>
                        </div>
                      </div>

                      {/* Pagamento */}
                      <div className="flex flex-1 h-full items-center min-h-px min-w-px p-4">
                        <div className="flex items-center gap-2 justify-center w-full">
                          {installment.paymentMethod === "Pix" ? (
                            <PixIcon className="size-5 text-gray-12" />
                          ) : (
                            <CardIcon className="size-5 text-gray-12" />
                          )}
                          <p className="font-inter font-semibold leading-[1.3] text-sm text-gray-12">
                            {installment.paymentMethod}
                          </p>
                        </div>
                      </div>

                      {/* Valor pendente */}
                      <div className="flex flex-1 h-full items-center min-h-px min-w-px p-4">
                        <div className="flex flex-col items-center w-full">
                          <div className="flex items-center gap-1">
                            <span className="font-inter font-semibold leading-[1.3] text-sm text-gray-12">
                              R$
                            </span>
                            <span className="font-inter font-semibold leading-[1.3] text-sm text-gray-12">
                              {installment.value.toFixed(2).replace(".", ",")}
                            </span>
                          </div>
                          <p className="font-inter font-normal leading-[1.3] text-sm text-gray-11">
                            Parcelado: {installment.installment}
                          </p>
                        </div>
                      </div>

                      {/* Ações */}
                      <div className="flex gap-1 h-full items-center justify-center px-4 py-2 w-[64px]">
                        <button
                          onClick={() => {
                            setSelectedPayment(installment);
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

      {/* Payment Details Drawer */}
      {selectedPayment && (
        <PaymentItemDetailsDrawer
          isOpen={isDetailsOpen}
          onClose={() => {
            setIsDetailsOpen(false);
            setSelectedPayment(null);
          }}
          paymentItem={selectedPayment}
          eventName={eventName}
          categoryName={categoryName}
          type="installment"
        />
      )}
    </>
  );
}
