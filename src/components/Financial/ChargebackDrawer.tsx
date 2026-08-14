"use client";

import { useState, useEffect } from "react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { X, FileText } from "lucide-react";
import { Pagination } from "../Pagination";
import { PaymentItemDetailsDrawer } from "./PaymentItemDetailsDrawer";
import { ArrowButton } from "../ArrowButton";
import { PixIcon } from "@/components/Icons/PixIcon";
import { CreditCardIcon } from "@/components/Icons/CreditCardIcon";
import { organizerService } from "@/services";
import toast from "react-hot-toast";
import Image from "next/image";
import { getAvatarUrl } from "@/utils/avatar";
import { ChargeBackIcon } from "../Icons/ChargeBackIcon";
import { Tooltip } from "../Tooltip";
import { FinancialDetailsMobile, type FinancialDetailsItem } from "./FinancialDetailsMobile";
import { formatDateBRT, formatTimeBRT } from "@/utils/datetimeBR";
import { formatShortId } from "@/utils/shortId";

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
  transferredAmount?: number;
  compensatedAmount?: number;
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
  // Busca server-side (todos os registros). `search` = input controlado;
  // `debouncedSearch` = valor que dispara o fetch (evita request por tecla).
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const itemsPerPage = 10;

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  // Novo termo → página 1 (senão ficaria numa página inexistente do resultado).
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  // Limpa a busca ao fechar (não reabrir com termo/resultado obsoleto).
  useEffect(() => {
    if (!isOpen) {
      setSearch("");
      setDebouncedSearch("");
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && eventId) {
      loadChargebackItems();
    }
  }, [isOpen, eventId, currentPage, debouncedSearch]);

  const loadChargebackItems = async () => {
    try {
      setLoading(true);
      const data = await organizerService.getEventChargebacks(eventId, {
        page: currentPage,
        limit: itemsPerPage,
        search: debouncedSearch || undefined,
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
    // chargebackDate é INSTANTE real → BRT (America/Sao_Paulo).
    const formattedDate = formatDateBRT(item.chargebackDate, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const formattedTime = formatTimeBRT(item.chargebackDate, {
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
      value: item.amount / 100,
      transferredAmount: item.transferredAmount != null ? item.transferredAmount / 100 : 0,
      compensatedAmount: item.compensatedAmount != null ? item.compensatedAmount / 100 : 0,
    };
  };

  /* Mesma normalização do RefundedDrawer pra reusar `FinancialDetailsMobile`. */
  const mobileItems: FinancialDetailsItem[] = chargebackItems.map((item) => {
    const d = formatChargebackForDisplay(item);
    return {
      id: item.id,
      orderId: d.orderId,
      buyer: d.buyer,
      paymentMethod: d.paymentMethod,
      value: d.value,
    };
  });

  const handleMobileItemClick = (mobile: FinancialDetailsItem) => {
    const original = chargebackItems.find((i) => i.id === mobile.id);
    if (!original) return;
    const displayItem = formatChargebackForDisplay(original);
    setSelectedPayment({
      ...displayItem,
      releaseDate: displayItem.date,
      nextReleaseDate: displayItem.date,
      installment: null,
    });
    setIsDetailsOpen(true);
  };

  return (
    <>
      {/* disablePreventScroll={false}: desliga o preventScroll iOS do vaul (default
          `true` o mantém ATIVO — semântica invertida) que travava o scroll do
          ViewRegistrationModal aberto pelo detalhe do pedido (fora do drawer). */}
      <Drawer open={isOpen} onOpenChange={onClose} direction="right" disablePreventScroll={false}>
        {/* data-vaul-no-drag: destrava o scroll interno (vaul right-drawer trata
            swipe vertical como arraste-pra-fechar). Fecha pelos botões/overlay. */}
        <DrawerContent data-vaul-no-drag className="bg-gray-1 h-full w-full sm:max-w-[969px] border-l border-gray-6">
          <DrawerTitle className="sr-only">Chargebacks - Detalhes</DrawerTitle>

          {/* Mobile body — fiel ao Figma 2680:110005 (mesmo template do Refunded) */}
          <FinancialDetailsMobile
            eventName={eventName}
            title="Chargebacks - Detalhes"
            titleIconBgClass="bg-red-4"
            titleIcon={<ChargeBackIcon className="size-5 text-red-12" />}
            onClose={onClose}
            totalLabel="Total em chargeback"
            totalAmount={totalChargebacks / 100}
            countLabel={
              <>
                <p className="leading-[1.2] mb-0">Transações em</p>
                <p className="leading-[1.2]">chargeback</p>
              </>
            }
            count={pagination.total}
            pageSize={itemsPerPage}
            items={mobileItems}
            loading={loading}
            emptyMessage="Nenhum chargeback encontrado"
            valueColorClass="text-orange-11"
            onItemClick={handleMobileItemClick}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            searchValue={search}
            onSearchChange={setSearch}
          />

          {/* Desktop header */}
          <DrawerHeader className="hidden md:block border-b border-gray-6 px-5 py-3">
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

          {/* Desktop content (tabela) */}
          <div className="hidden md:block flex-1 overflow-y-auto">
            <div className="p-5">
              {/* Info Header */}
              <div className="mb-5 flex items-center gap-2 text-base text-gray-11 font-family-dm-sans">
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
                            <Tooltip
                              position="topRight"
                              trigger="hover"
                              content={<p className="font-family-dm-sans font-normal text-sm leading-[1.3] text-gray-12 text-left break-all">{displayItem.orderId}</p>}
                              contentClassName="max-w-[min(320px,calc(100vw-2rem))] w-max min-w-0 px-3 py-2 gap-0 !items-stretch"
                              className="block min-w-0 max-w-full"
                            >
                              <p className="font-inter font-semibold leading-[1.3] text-sm text-gray-12 truncate cursor-help">
                                {formatShortId(displayItem.orderId)}
                              </p>
                            </Tooltip>
                            <p className="font-inter font-semibold leading-[1.3] text-sm text-gray-12">

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
                                <CreditCardIcon className="w-8" />
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
                              <FileText className="size-4 text-gray-11" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    totalItems={pagination.total}
                    pageSize={itemsPerPage}
                    className="border-t border-gray-6 px-5 py-4"
                  />
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
