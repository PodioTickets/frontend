"use client";

import { useState, useEffect } from "react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
} from "@/components/ui/drawer";
import { X, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { PaymentItemDetailsDrawer } from "./PaymentItemDetailsDrawer";
import { ArrowButton } from "../ArrowButton";
import { DetailsIcon } from "../Icons/DetailsIcon";
import { PixIcon } from "@/components/Icons/PixIcon";
import { PaymentIcon } from "react-svg-credit-card-payment-icons";
import { organizerService } from "@/services";
import toast from "react-hot-toast";
import Image from "next/image";
import { getAvatarUrl } from "@/utils/avatar";
import { ChargeBackIcon } from "../Icons/ChargeBackIcon";

interface ChargebackDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  totalChargebacks: number;
  eventId: string;
  eventName?: string;
  categoryName?: string;
  onNavigatePrev?: () => void;
  onNavigateNext?: () => void;
}

interface ChargebackItem {
  id: string;
  orderId: string;
  registrationId: string;
  paymentId?: string;
  amount: number;
  chargebackDate: string;
  purchaseDate: string;
  paymentMethod: string;
  buyer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl: string | null;
  };
  participant?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl: string | null;
  };
  reason?: string;
}

export function ChargebackDrawer({
  isOpen,
  onClose,
  totalChargebacks,
  eventId,
  eventName = "Maratona 2024",
  categoryName = "Nome da categoria",
  onNavigatePrev,
  onNavigateNext,
}: ChargebackDrawerProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any | null>(null);
  const [chargebackItems, setChargebackItems] = useState<ChargebackItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const itemsPerPage = 10;

  useEffect(() => {
    if (isOpen && eventId) {
      loadChargebackItems();
    }
  }, [isOpen, eventId, currentPage]);

  const loadChargebackItems = async () => {
    try {
      setLoading(true);
      const data = await organizerService.getEventChargebacks(eventId, {
        page: currentPage,
        limit: itemsPerPage,
      });
      setChargebackItems(data.chargebacks);
      setPagination(data.pagination);
    } catch (error: any) {
      console.error("Error loading chargeback items:", error);
      toast.error("Erro ao carregar chargebacks");
      setChargebackItems([]);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = pagination.totalPages;

  const formatChargebackForDisplay = (item: ChargebackItem) => {
    const date = new Date(item.chargebackDate);
    const formattedDate = date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const formattedTime = date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });

    // Usar paymentId para buscar detalhes (GET /api/v1/payments/payment/{paymentId}/details)
    // Se não tiver paymentId, usar orderId como fallback
    const paymentId = item.paymentId || item.orderId;

    return {
      orderId: paymentId || "", // Usar paymentId para buscar os detalhes via /api/v1/payments/payment/{paymentId}/details
      transactionId: item.id, // ID do chargeback (apenas para exibição visual)
      buyer: {
        name: `${item.buyer.firstName} ${item.buyer.lastName}`,
        email: item.buyer.email,
        avatar: item.buyer.avatarUrl,
      },
      date: formattedDate,
      time: formattedTime,
      paymentMethod: item.paymentMethod,
      value: item.amount / 100, // Converter de centavos
    };
  };

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
                  <div className="w-[32px] h-[32px] p-1 rounded-lg bg-red-4 flex items-center justify-center">
                    <ChargeBackIcon className="size-6 text-red-12" />
                  </div>
                  <h2 className="font-family-dm-sans font-semibold text-[20px] leading-[1.3] text-gray-12">
                    Chargebacks - Detalhes
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
                      Data
                    </p>
                  </div>
                  <div className="flex flex-1 h-full items-center justify-center min-h-px min-w-px p-4">
                    <p className="font-inter font-medium leading-[1.3] text-sm text-gray-12 text-center">
                      Pagamento
                    </p>
                  </div>
                  <div className="flex flex-1 h-full items-center justify-center min-h-px min-w-px p-4">
                    <p className="font-inter font-medium leading-[1.3] text-sm text-gray-12 text-center">
                      Valor
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
                  ) : chargebackItems.length === 0 ? (
                    <div className="w-full p-8 text-center text-gray-11">
                      Nenhum chargeback encontrado
                    </div>
                  ) : (
                    chargebackItems.map((item) => {
                      const displayItem = formatChargebackForDisplay(item);
                      return (
                        <div
                          key={item.id}
                          className="bg-gray-1 border-b border-gray-6 flex items-center justify-between w-full last:border-b-0 hover:bg-gray-2 transition-colors h-[60px]"
                        >
                          {/* ID pedido */}
                          <div className="flex h-full items-center p-4 w-[120px]">
                            <p className="font-inter font-semibold leading-[1.3] text-sm text-gray-12">
                              {displayItem.orderId && displayItem.orderId.length > 10
                                ? `#${displayItem.orderId.slice(0, 6)}...${displayItem.orderId.slice(-4)}`
                                : displayItem.orderId || "—"}
                            </p>
                          </div>

                          {/* ID transação */}
                          <div className="flex h-full items-center p-4 w-[120px]">
                            <p className="font-inter font-semibold leading-[1.3] text-sm text-gray-12">
                              {displayItem.transactionId && displayItem.transactionId.length > 8
                                ? displayItem.transactionId.slice(0, 8)
                                : displayItem.transactionId || "—"}
                            </p>
                          </div>

                          {/* Comprador */}
                          <div className="flex flex-1 h-full items-center gap-3 min-h-px min-w-px p-4">
                            {displayItem.buyer.avatar ? (
                              <div className="size-9 rounded-full overflow-hidden bg-gray-6 flex items-center justify-center shrink-0">
                                <Image
                                  src={getAvatarUrl(displayItem.buyer.avatar)}
                                  alt={displayItem.buyer.name}
                                  width={36}
                                  height={36}
                                  className="rounded-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="size-9 rounded-full bg-gray-6 flex items-center justify-center shrink-0">
                                <span className="text-gray-12 font-semibold text-sm">
                                  {displayItem.buyer.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                            <div className="flex flex-col gap-0 min-w-0">
                              <p className="font-inter font-semibold leading-[1.3] text-sm text-gray-12 truncate">
                                {displayItem.buyer.name}
                              </p>
                              <p className="font-inter font-normal leading-[1.3] text-sm text-gray-11 truncate">
                                {displayItem.buyer.email}
                              </p>
                            </div>
                          </div>

                          {/* Data */}
                          <div className="flex flex-1 h-full items-center min-h-px min-w-px p-4">
                            <div className="flex flex-col items-center w-full">
                              <p className="font-inter font-semibold leading-[1.3] text-sm text-gray-12">
                                {displayItem.date}
                              </p>
                              <p className="font-inter font-normal leading-[1.3] text-sm text-gray-11">
                                {displayItem.time}
                              </p>
                            </div>
                          </div>

                          {/* Pagamento */}
                          <div className="flex flex-1 h-full items-center justify-center min-h-px min-w-px p-4">
                            <div className="flex items-center gap-2 justify-center w-full">
                              {displayItem.paymentMethod === "Pix" || displayItem.paymentMethod === "PIX" ? (
                                <PixIcon className="size-5 text-gray-12" />
                              ) : (
                                <PaymentIcon
                                  type={displayItem.paymentMethod as any}
                                  className="size-8 text-gray-12"
                                />
                              )}
                              {displayItem.paymentMethod !== "Pix" &&
                                displayItem.paymentMethod !== "PIX" && (
                                  <p className="font-inter font-semibold leading-[1.3] text-sm text-gray-12">
                                    {displayItem.paymentMethod}
                                  </p>
                                )}
                            </div>
                          </div>

                          {/* Valor */}
                          <div className="flex flex-1 h-full items-center justify-center min-h-px min-w-px p-4">
                            <div className="flex items-center gap-1 justify-center w-full">
                              <span className="font-inter font-semibold leading-[1.3] text-sm text-gray-12">
                                R$
                              </span>
                              <span className="font-inter font-semibold leading-[1.3] text-sm text-orange-11">
                                -{displayItem.value.toFixed(2).replace(".", ",")}
                              </span>
                            </div>
                          </div>

                          {/* Ações */}
                          <div className="flex gap-1 h-full items-center justify-center px-4 py-2 w-[64px]">
                            <button
                              onClick={() => {
                                setSelectedPayment({
                                  ...displayItem,
                                  releaseDate: displayItem.date,
                                  nextReleaseDate: displayItem.date,
                                  installment: null,
                                });
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
          type="awaiting"
        />
      )}
    </>
  );
}
