"use client";

import { useState, useEffect } from "react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { X, ChevronLeft, ChevronRight, FileText, Search } from "lucide-react";
import { CalendarIcon } from "@/components/Icons/CalendarIcon";
import { PixIcon } from "@/components/Icons/PixIcon";
import { CardIcon } from "@/components/Icons/CardIcon";
import { PaymentItemDetailsDrawer } from "./PaymentItemDetailsDrawer";
import { ArrowButton } from "../ArrowButton";
import { DetailsIcon } from "../Icons/DetailsIcon";
import { organizerService } from "@/services";
import type { PendingRelease } from "@/services/organizer/OrganizerService";
import { TimerIcon } from "../Icons/Organizer/TimerIcon";
import { getAvatarUrl } from "@/utils/avatar";
import Image from "next/image";
import { Button } from "../Button";
import { Tooltip } from "../Tooltip";
import { Pagination } from "../Pagination";
import { formatDateBR } from "@/utils/datetimeBR";
import { formatShortId } from "@/utils/shortId";

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
  const [searchQuery, setSearchQuery] = useState("");
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

  // Formatar data para exibição (UTC, sem shift de fuso)
  const formatDate = (dateString: string) =>
    formatDateBR(dateString, { day: "2-digit", month: "2-digit", year: "numeric" });

  // Usar paginação do servidor
  const totalPages = pagination.totalPages;
  const paginatedItems = pendingReleases; // Já vem paginado do servidor

  const filteredItems = searchQuery.trim()
    ? paginatedItems.filter((item) => {
      const q = searchQuery.toLowerCase();
      const orderId = (item.orderId || "").toLowerCase();
      const fullName = (item.buyer?.fullName || `${item.buyer?.firstName || ""} ${item.buyer?.lastName || ""}`.trim()).toLowerCase();
      const email = (item.buyer?.email || "").toLowerCase();
      return orderId.includes(q) || fullName.includes(q) || email.includes(q);
    })
    : paginatedItems;

  return (
    <>
      <Drawer open={isOpen} onOpenChange={onClose} direction="right">
        <DrawerContent className="bg-gray-2 md:bg-gray-1 h-full w-full sm:max-w-[969px] border-l border-gray-6">
          <DrawerTitle className="sr-only">Aguardando liberação - Detalhes</DrawerTitle>
          {/* ========== MOBILE Header (Figma) ========== */}
          <DrawerHeader className="md:hidden border-b border-gray-6 p-0">
            <div className="flex flex-col">
              <div className="flex items-center gap-1 h-[52px] px-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="size-8 flex items-center justify-center shrink-0 rounded-lg hover:bg-gray-3 transition-colors rotate-180"
                  aria-label="Voltar"
                >
                  <ArrowButton isOpen={false} />
                </button>
                <p className="font-manrope font-extrabold text-base leading-[1.1] text-gray-12 truncate flex-1 min-w-0">
                  {eventName}
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 px-4 py-2 flex-wrap text-gray-11">
                <span className="font-family-dm-sans font-normal text-sm text-gray-11">Eventos</span>
                <ArrowButton />
                <span className="font-family-dm-sans font-normal text-sm text-gray-11">Financeiro</span>
                <ArrowButton />
                <span className="font-family-dm-sans font-normal text-sm text-gray-12">Aguardando liberação</span>
              </div>
              <div className="flex gap-2 items-center justify-center px-4 pb-3">
                <div className="size-7 rounded-lg bg-yellow-4 flex items-center justify-center shrink-0">
                  <TimerIcon className="size-5 text-yellow-12" />
                </div>
                <h2 className="font-family-dm-sans font-semibold text-base leading-[1.3] text-gray-12">
                  Aguardando liberação - Detalhes
                </h2>
              </div>
            </div>
          </DrawerHeader>

          {/* ========== DESKTOP Header ========== */}
          <DrawerHeader className="hidden md:block border-b border-gray-6 px-5 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-5">
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

          {/* ========== MOBILE Content (Figma) ========== */}
          <div className="md:hidden flex-1 overflow-y-auto flex flex-col">
            <div className="p-4 flex flex-col gap-4">
              {/* Summary cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-1 border border-gray-6 rounded-xl p-4 flex flex-col justify-between gap-3">
                  <div className="flex flex-col gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-4 flex items-center justify-center shrink-0">
                      <CalendarIcon className="size-5 text-blue-12" />
                    </div>
                    <p className="font-family-dm-sans font-normal text-base text-gray-11">Aguardando liberação</p>
                  </div>
                  <p className="font-manrope font-extrabold text-lg text-gray-12">
                    R$ {(actualData.totalPending / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="bg-gray-1 border border-gray-6 rounded-xl p-4 flex flex-col justify-between gap-3">
                  <div className="flex flex-col gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#EBE4FF] flex items-center justify-center shrink-0">
                      <FileText className="size-5 text-[#2F265F]" />
                    </div>
                    <p className="font-family-dm-sans font-normal text-base text-gray-11">Transações aguardando liberação</p>
                  </div>
                  <p className="font-manrope font-extrabold text-lg text-gray-12">
                    {pagination.totalOrders}
                  </p>
                </div>

              </div>

              {/* Search */}
              <div className="border border-gray-6 rounded-lg h-10 flex items-center gap-2 px-3 bg-gray-1">
                <Search className="size-5 text-gray-11 shrink-0" />
                <input
                  type="text"
                  placeholder="Nome, CPF, IDs.."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 min-w-0 bg-transparent font-family-dm-sans font-normal text-sm text-gray-12 placeholder:text-gray-11 outline-none"
                />
              </div>

              {/* Transaction cards list */}
              <div className="flex flex-col gap-3">
                {loading ? (
                  <div className="py-8 text-center text-gray-11 font-family-dm-sans text-sm">Carregando...</div>
                ) : filteredItems.length === 0 ? (
                  <div className="py-8 text-center text-gray-11 font-family-dm-sans text-sm">Nenhum item aguardando liberação</div>
                ) : (
                  filteredItems.map((item, index) => (
                    <div
                      key={`${item.orderId}-${index}`}
                      className="bg-gray-1 border border-gray-6 rounded-lg overflow-hidden"
                    >
                      <div className="flex flex-col gap-5 px-3 py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex gap-2 items-center min-w-0 flex-1">
                            {item.buyer?.avatarUrl ? (
                              <Image
                                src={getAvatarUrl(item.buyer.avatarUrl)}
                                alt={item.buyer.fullName || ""}
                                width={36}
                                height={36}
                                className="size-9 rounded-full object-cover shrink-0"
                              />
                            ) : (
                              <div className="size-9 rounded-full bg-gray-6 flex items-center justify-center shrink-0">
                                <span className="text-gray-12 font-semibold text-sm">
                                  {(item.buyer?.firstName || item.buyer?.fullName || "?")?.charAt(0)?.toUpperCase()}
                                </span>
                              </div>
                            )}
                            <div className="flex flex-col gap-1 min-w-0">
                              <p className="font-family-dm-sans font-medium text-base text-gray-12 truncate">
                                {item.buyer?.fullName || `${item.buyer?.firstName || ""} ${item.buyer?.lastName || ""}`.trim()}
                              </p>
                              <p className="font-family-dm-sans font-normal text-sm text-gray-11 truncate">{item.buyer?.email}</p>
                            </div>
                          </div>
                          <div className="shrink-0">
                            {item.paymentMethod === "PIX" ? (
                              <PixIcon className="size-5 text-gray-12" />
                            ) : (
                              <CardIcon className="size-5 text-gray-12" />
                            )}
                          </div>
                        </div>
                        <p className="font-family-dm-sans font-medium text-sm text-gray-12">ID Pedido: {formatShortId(item.orderId)}</p>
                        <div className="bg-gray-2 border border-gray-6 rounded-lg h-[34px] flex items-center px-3">
                          <p className="font-family-dm-sans font-medium text-sm text-gray-12">Previsão de liberação: {formatDate(item.releaseDate)}</p>
                        </div>
                        <div className="flex items-center justify-between border-b border-gray-6 pb-3">
                          <p className="font-manrope font-extrabold text-xl text-gray-12">
                            R$ {(item.amount / 100).toFixed(2).replace(".", ",")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-center p-3 pt-0">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setSelectedPayment(item);
                            setIsDetailsOpen(true);
                          }}
                          className="w-full font-manrope font-bold text-base border-gray-6 text-gray-12"
                        >
                          <FileText className="size-5" />
                          Ver detalhes
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Mobile pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={!pagination.hasPreviousPage || loading}
                    className="size-8 flex items-center justify-center rounded-lg border border-gray-6 disabled:opacity-50"
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
                        disabled={loading}
                        className={`size-8 flex items-center justify-center rounded-lg text-sm font-family-dm-sans font-medium transition-colors ${isActive ? "bg-primary-11 border-primary-11 text-primary-2" : "border border-gray-6 bg-gray-4 text-gray-12"}`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={!pagination.hasNextPage || loading}
                    className="size-8 flex items-center justify-center rounded-lg border border-gray-6 disabled:opacity-50"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ========== DESKTOP Content ========== */}
          <div className="hidden md:block flex-1 overflow-y-auto">
            <div className="p-5">
              <div className="mb-5 flex items-center gap-2 text-base text-gray-11 font-family-dm-sans">
                <span>Evento: <span className="text-gray-12">{eventName}</span></span>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-5">
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
                  <div className="flex flex-1 h-full items-center min-h-px min-w-px p-4">
                    <p className="font-inter font-medium leading-[1.3] text-sm text-gray-12">
                      Comprador
                    </p>
                  </div>
                  <div className="flex flex-1 h-full items-center justify-center min-h-px min-w-px p-4">
                    <p className="font-inter font-medium leading-[1.3] text-sm text-gray-12 text-center">
                      Previsão de liberação
                    </p>
                  </div>
                  <div className="flex flex-1 h-full items-center justify-end min-h-px min-w-px p-4">
                    <p className="font-inter font-medium leading-[1.3] text-sm text-gray-12 text-right">
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
                          <Tooltip
                            position="topRight"
                            trigger="hover"
                            content={<p className="font-family-dm-sans font-normal text-sm leading-[1.3] text-gray-12 text-left break-all">{item.orderId}</p>}
                            contentClassName="max-w-[min(320px,calc(100vw-2rem))] w-max min-w-0 px-3 py-2 gap-0 !items-stretch"
                            className="block min-w-0 max-w-full"
                          >
                            <p className="font-inter font-semibold leading-[1.3] text-sm text-gray-12 truncate cursor-help">
                              {formatShortId(item.orderId)}
                            </p>
                          </Tooltip>
                          <p className="font-inter font-semibold leading-[1.3] text-sm text-gray-12">

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

                        {/* Previsão de liberação */}
                        <div className="flex flex-1 h-full items-center min-h-px min-w-px p-4">
                          <div className="flex items-center justify-center w-full">
                            <p className="font-inter font-semibold leading-[1.3] text-sm text-gray-12">
                              Lib. {formatDate(item.releaseDate)}
                            </p>
                          </div>
                        </div>

                        {/* Valor pendente */}
                        <div className="flex flex-1 h-full items-center justify-end min-h-px min-w-px p-4">
                          <div className="flex items-center gap-1 justify-end w-full">
                            <span className="font-inter font-semibold leading-[1.3] text-sm text-gray-12">
                              R$ {(item.amount / 100).toFixed(2).replace(".", ",")}
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

                <Pagination onPageChange={setCurrentPage} currentPage={pagination.page} totalPages={pagination.totalPages} />
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
