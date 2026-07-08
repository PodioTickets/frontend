"use client";

import { useState, useEffect } from "react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { X, FileText, Search } from "lucide-react";
import { Pagination } from "../Pagination";
import { CalendarIcon } from "@/components/Icons/CalendarIcon";
import { PixIcon } from "@/components/Icons/PixIcon";
import { PaymentIcon } from "react-svg-credit-card-payment-icons";
import { PaymentItemDetailsDrawer } from "./PaymentItemDetailsDrawer";
import { ArrowButton } from "../ArrowButton";
import { DetailsIcon } from "../Icons/DetailsIcon";
import { organizerService } from "@/services";
import type { Installment } from "@/services/organizer/OrganizerService";
import toast from "react-hot-toast";
import { TimerIcon } from "../Icons/Organizer/TimerIcon";
import Image from "next/image";
import { getAvatarUrl } from "@/utils/avatar";
import { Tooltip } from "../Tooltip";
import { formatDateBR } from "@/utils/datetimeBR";
import { formatShortId } from "@/utils/shortId";

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
  const [searchQuery, setSearchQuery] = useState("");
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

  // Agrupa as parcelas pendentes por pedido → 1 linha por pedido (e não 1 por
  // parcela). Previsão = só a PRÓXIMA liberação (parcela pendente mais antiga).
  // "Parcelado" = nº dessa próxima parcela / total. Valor = total pendente.
  const groupInstallmentsByOrder = (items: Installment[]) => {
    const fmt = (d: string) =>
      formatDateBR(d, { day: "2-digit", month: "2-digit", year: "numeric" });

    const byOrder = new Map<string, Installment[]>();
    for (const inst of items) {
      const key = inst.orderId || inst.paymentId || inst.id;
      const group = byOrder.get(key);
      if (group) group.push(inst);
      else byOrder.set(key, [inst]);
    }

    return Array.from(byOrder.values()).map((group) => {
      const sorted = [...group].sort(
        (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
      );
      const next = sorted[0]; // próxima liberação = parcela pendente mais antiga
      const totalAmount = sorted.reduce((sum, i) => sum + i.amount, 0);
      const totalInstallments = next.totalInstallments ?? sorted.length;
      const installmentNumber = next.installmentNumber ?? 1;
      // Mantém o id completo (pagamento/pedido) p/ o lookup de detalhes — o
      // encurtamento é só visual na renderização.
      const lookupId = next.paymentId || next.orderId || "";

      return {
        orderId: lookupId,
        transactionId: next.id,
        buyer: {
          name: `${next.buyer.firstName} ${next.buyer.lastName}`,
          email: next.buyer.email,
          avatar: next.buyer.avatarUrl,
        },
        releaseDate: fmt(next.dueDate),
        // Parcela é sempre cartão de crédito (PIX/boleto não parcelam).
        paymentMethod: "CREDIT_CARD",
        value: totalAmount / 100, // Converter de centavos
        installment: `${installmentNumber}/${totalInstallments}`,
      };
    });
  };

  const displayInstallments = groupInstallmentsByOrder(installments);

  const filteredInstallments = searchQuery.trim()
    ? displayInstallments.filter((d) => {
      const q = searchQuery.toLowerCase();
      return (
        (d.orderId || "").toLowerCase().includes(q) ||
        (d.buyer?.name || "").toLowerCase().includes(q) ||
        (d.buyer?.email || "").toLowerCase().includes(q)
      );
    })
    : displayInstallments;

  const totalPages = Math.ceil(filteredInstallments.length / itemsPerPage);
  const paginatedInstallments = filteredInstallments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  return (
    <>
      <Drawer open={isOpen} onOpenChange={onClose} direction="right">
        <DrawerContent className="bg-gray-2 md:bg-gray-1 h-full w-full sm:max-w-[969px] border-l border-gray-6">
          <DrawerTitle className="sr-only">Parcelados a receber - Detalhes</DrawerTitle>
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
                <ArrowButton isOpen={false} />
                <span className="font-family-dm-sans font-normal text-sm text-gray-11">Financeiro</span>
                <ArrowButton isOpen={false} />
                <span className="font-family-dm-sans font-normal text-sm text-gray-12">Parcelados a receber</span>
              </div>
              <div className="flex gap-2 items-center justify-center px-4 pb-3">
                <div className="size-7 rounded-lg bg-blue-4 flex items-center justify-center shrink-0">
                  <CalendarIcon className="size-5 text-gray-12" />
                </div>
                <h2 className="font-family-dm-sans font-semibold text-base leading-[1.3] text-gray-12">
                  Parcelados a receber - Detalhes
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
                  <div className="w-[32px] h-[32px] p-1 rounded-lg bg-[#CAF1F6] flex items-center justify-center">
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

          {/* ========== MOBILE Content (Figma) ========== */}
          <div className="md:hidden flex-1 overflow-y-auto flex flex-col">
            <div className="p-4 flex flex-col gap-4">
              {/* Summary cards: Total a receber, Receber hoje, Transações parcelas a receber */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-1 border border-gray-6 rounded-xl p-4 flex flex-col justify-between gap-3">
                  <div className="flex flex-col gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-4 flex items-center justify-center shrink-0">
                      <CalendarIcon className="size-5 text-blue-12" />
                    </div>
                    <p className="font-family-dm-sans font-normal text-base text-gray-11">Total a receber</p>
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
                    <p className="font-family-dm-sans font-normal text-base text-gray-11">Transações parcelas a receber</p>
                  </div>
                  <p className="font-manrope font-extrabold text-lg text-gray-12">
                    {actualData.totalTransactions}
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

              {/* Installment cards list */}
              <div className="flex flex-col gap-3">
                {loading ? (
                  <div className="py-8 text-center text-gray-11 font-family-dm-sans text-sm">Carregando...</div>
                ) : paginatedInstallments.length === 0 ? (
                  <div className="py-8 text-center text-gray-11 font-family-dm-sans text-sm">Nenhuma parcela encontrada</div>
                ) : (
                  paginatedInstallments.map((installment: any, index: number) => (
                    <div
                      key={`${installment.orderId}-${index}`}
                      className="bg-gray-1 border border-gray-6 rounded-lg overflow-hidden"
                    >
                      <div className="flex flex-col gap-5 px-3 py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex gap-2 items-center min-w-0 flex-1">
                            <div className="size-9 rounded-full bg-gray-6 flex items-center justify-center shrink-0 overflow-hidden">
                              {installment.buyer?.avatar ? (
                                <Image src={getAvatarUrl(installment.buyer.avatar)} alt={installment.buyer.name} width={36} height={36} className="rounded-full object-cover" draggable={false} />
                              ) : (
                                <span className="text-gray-12 font-semibold text-sm">
                                  {installment.buyer?.name?.charAt(0)?.toUpperCase() || "?"}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-col gap-1 min-w-0">
                              <p className="font-family-dm-sans font-medium text-base text-gray-12 truncate">{installment.buyer?.name}</p>
                              <p className="font-family-dm-sans font-normal text-sm text-gray-11 truncate">{installment.buyer?.email}</p>
                            </div>
                          </div>
                          <div className="shrink-0">
                            {installment.paymentMethod === "PIX" ? (
                              <PixIcon className="size-5 text-gray-12" />
                            ) : (
                              <PaymentIcon type="Generic" format="flatRounded" className="size-8 text-gray-12" />
                            )}
                          </div>
                        </div>
                        <p className="font-family-dm-sans font-medium text-sm text-gray-12">ID Pedido: {formatShortId(installment.orderId)}</p>
                        <div className="bg-gray-2 border border-gray-6 rounded-lg h-[34px] flex items-center px-3">
                          <p className="font-family-dm-sans font-medium text-sm text-gray-12">Próxima liberação: {installment.releaseDate}</p>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="font-manrope font-extrabold text-xl text-gray-12">
                            R$ {installment.value.toFixed(2).replace(".", ",")}
                          </p>
                          <p className="font-family-dm-sans font-medium text-sm text-gray-12">Parcelado: {installment.installment}</p>
                        </div>
                      </div>
                      <div className="h-px bg-gray-6" />
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPayment(installment);
                          setIsDetailsOpen(true);
                        }}
                        className="flex gap-2 items-center justify-center w-full h-11 border border-gray-6 rounded-lg font-manrope font-bold text-base text-gray-12 hover:bg-gray-3 transition-colors"
                      >
                        <FileText className="size-5" />
                        Ver detalhes
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Mobile pagination */}
              {totalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  className="pt-2"
                />
              )}
            </div>
          </div>

          {/* ========== DESKTOP Content ========== */}
          <div className="hidden md:block flex-1 overflow-y-auto">
            <div className="p-5">
              <div className="mb-5 flex items-center gap-2 text-base text-gray-11 font-family-dm-sans">
                <span>Evento: <span className="text-gray-12">{eventName}</span></span>
              </div>

              {/* Cards Section */}
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

                {/* Transações */}
                <div className="bg-gray-1 border border-gray-6 rounded-[12px] px-4 py-3">
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-family-dm-sans font-normal text-gray-11">
                      Transações
                    </p>
                    <div className="w-[28px] h-[28px] p-1 rounded-lg bg-[#EBE4FF] flex items-center justify-center">
                      <FileText className="size-5 text-[#2F265F]" />
                    </div>
                  </div>
                  <p className="font-family-dm-sans font-extrabold text-xl text-gray-12">
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
                  <div className="flex flex-1 h-full items-center min-h-px min-w-px p-4">
                    <p className="font-inter font-medium leading-[1.3] text-sm text-gray-12">
                      Comprador
                    </p>
                  </div>
                  <div className="flex flex-1 h-full items-center justify-center min-h-px min-w-px p-4">
                    <p className="font-inter font-medium leading-[1.3] text-sm text-gray-12 text-center">
                      Previsão liberação
                    </p>
                  </div>
                  <div className="flex flex-1 h-full items-center justify-center min-h-px min-w-px p-4 px-0">
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
                          <Tooltip
                            position="topRight"
                            trigger="hover"
                            content={<p className="font-family-dm-sans font-normal text-sm leading-[1.3] text-gray-12 text-left break-all">{installment.orderId}</p>}
                            contentClassName="max-w-[min(320px,calc(100vw-2rem))] w-max min-w-0 px-3 py-2 gap-0 !items-stretch"
                            className="block min-w-0 max-w-full"
                          >
                            <p className="font-inter font-semibold leading-[1.3] text-sm text-gray-12 truncate cursor-help">
                              {formatShortId(installment.orderId)}
                            </p>
                          </Tooltip>
                          <p className="font-inter font-semibold leading-[1.3] text-sm text-gray-12">

                          </p>
                        </div>
                        {/* Comprador */}
                        <div className="flex flex-1 h-full items-center gap-3 min-h-px min-w-px p-4">
                          <div className="size-9 rounded-full bg-gray-6 flex items-center justify-center shrink-0">

                            {installment.buyer.avatar ? (
                              <Image src={getAvatarUrl(installment.buyer.avatar)} alt={installment.buyer.name} width={32} height={32} className="rounded-full object-cover" draggable={false} />
                            ) : (
                              <span className="text-gray-12 font-semibold text-sm">
                                {installment.buyer.name.charAt(0).toUpperCase()}
                              </span>
                            )}
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

                        {/* Previsão liberação — só a próxima liberação */}
                        <div className="flex flex-1 h-full items-center min-h-px min-w-px p-4">
                          <div className="flex items-center justify-center w-full">
                            <p className="font-inter font-semibold leading-[1.3] text-sm text-gray-12">
                              Próx. {installment.releaseDate}
                            </p>
                          </div>
                        </div>

                        {/* Pagamento — ícone real do cartão (ou PIX), igual aos
                            outros painéis. */}
                        <div className="flex flex-1 h-full items-center min-h-px min-w-px p-4 px-0">
                          <div className="flex items-center gap-2 justify-center w-full">
                            {installment.paymentMethod === "PIX" ? (
                              <PixIcon className="size-5 text-gray-12" />
                            ) : (
                              <PaymentIcon type="Generic" format="flatRounded" className="size-8 text-gray-12" />
                            )}
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
                            <FileText className="size-4 text-gray-11" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
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
          type="installment"
        />
      )}
    </>
  );
}
