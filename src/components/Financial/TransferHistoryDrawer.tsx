"use client";
import { useState, useEffect } from "react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { X, CheckCircle, FileText, Search, EyeIcon } from "lucide-react";
import { CalendarIcon } from "@/components/Icons/CalendarIcon";
import { TransferDetailsDrawer } from "./TransferDetailsDrawer";
import { RepasseIcon } from "../Icons/RepasseIcon";
import { ArrowButton } from "../ArrowButton";
import { DetailsIcon } from "../Icons/DetailsIcon";
import { TimerIcon } from "../Icons/Organizer/TimerIcon";
import { Tooltip } from "@/components/Tooltip";
import { organizerService } from "@/services";
import type { Transfer } from "@/services/organizer/OrganizerService";
import toast from "react-hot-toast";
import { Pagination } from "../Pagination";
// createdAt do repasse é INSTANTE real → BRT (America/Sao_Paulo).
import { formatDateBRT, formatTimeBRT } from "@/utils/datetimeBR";
import { formatShortId } from "@/utils/shortId";

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
  const [metrics, setMetrics] = useState<{ totalAmount: number; totalCount: number }>({ totalAmount: 0, totalCount: 0 });
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const itemsPerPage = 10;

  const totalTransferredReais = (metrics.totalAmount || totalTransferred) / 100;

  useEffect(() => {
    if (isOpen && eventId) {
      loadTransfers();
    }
  }, [isOpen, eventId]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const loadTransfers = async () => {
    try {
      setLoading(true);
      const data = await organizerService.getEventTransferHistory(eventId);
      setTransfers(data.transfers);
      setMetrics(data.metrics);
    } catch (error: any) {
      console.error("Error loading transfers:", error);
      toast.error("Erro ao carregar histórico de repasses");
      setTransfers([]);
    } finally {
      setLoading(false);
    }
  };

  const formatTransferForDisplay = (transfer: Transfer) => {
    const formattedDate = formatDateBRT(transfer.createdAt, { day: "2-digit", month: "2-digit", year: "numeric" });
    const formattedTime = formatTimeBRT(transfer.createdAt, { hour: "2-digit", minute: "2-digit" });
    const id = transfer.id
    return {
      id: formatShortId(id),
      requestDate: formattedDate,
      requestTime: formattedTime,
      value: transfer.amount / 100, // Converter de centavos
      status: transfer.status === "COMPLETED" ? "Concluído" :
        transfer.status === "PROCESSING" ? "Processando" :
          transfer.status === "FAILED" ? "Falhou" :
            transfer.status === "CANCELLED" ? "Cancelado" : "Pendente",
    };
  };

  const filteredTransfers = searchQuery.trim()
    ? transfers.filter((t) => {
      const q = searchQuery.toLowerCase();
      const pix = (t.bankAccount?.account || "").toLowerCase();
      const id = (t.id || "").toLowerCase();
      return id.includes(q) || pix.includes(q);
    })
    : transfers;

  const totalPages = Math.ceil(filteredTransfers.length / itemsPerPage);
  const paginatedTransfers = filteredTransfers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Concluído": return "bg-primary-11 text-primary-1";
      case "Processando": return "bg-yellow-11 text-yellow-1";
      case "Cancelado": return "bg-red-11 text-red-1";
      case "Falhou": return "bg-red-3 text-red-11";
      default: return "bg-gray-4 text-gray-12";
    }
  };

  return (
    <>
      <Drawer open={isOpen} onOpenChange={onClose} direction="right">
        <DrawerContent className="bg-gray-2 md:bg-gray-1 h-full border-l border-gray-6">
          <DrawerTitle className="sr-only">Histórico de repasses</DrawerTitle>
          {/* ========== MOBILE Header ========== */}
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
                <span className="font-family-dm-sans font-normal text-sm text-gray-12">Histórico de repasses</span>
              </div>
              <div className="flex gap-2 items-center justify-center px-4 pb-3">
                <div className="size-7 rounded bg-[#EBE4FF] flex items-center justify-center shrink-0">
                  <RepasseIcon className="size-5 text-gray-12" />
                </div>
                <h2 className="font-family-dm-sans font-semibold text-base leading-[1.3] text-gray-12">
                  Histórico de repasses - Detalhes
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

          {/* ========== MOBILE Content (Figma) ========== */}
          <div className="md:hidden flex-1 overflow-y-auto flex flex-col">
            <div className="p-4 flex flex-col gap-4">
              {/* Summary cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-1 border border-gray-6 rounded-xl p-4 flex flex-col gap-3">
                  <div className="flex flex-col gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-4 flex items-center justify-center shrink-0">
                      <CalendarIcon className="size-5 text-blue-12" />
                    </div>
                    <p className="font-family-dm-sans font-normal text-base text-gray-11">Total repassado</p>
                  </div>
                  <p className="font-manrope font-extrabold text-lg text-gray-12">
                    R$ {totalTransferredReais.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="bg-gray-1 border border-gray-6 rounded-xl p-4 flex flex-col gap-3">
                  <div className="flex flex-col gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#EBE4FF] flex items-center justify-center shrink-0">
                      <FileText className="size-5 text-gray-12" />
                    </div>
                    <p className="font-family-dm-sans font-normal text-base text-gray-11">Transações de repasse concluídos</p>
                  </div>
                  <p className="font-manrope font-extrabold text-lg text-gray-12">
                    {metrics.totalCount}
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

              {/* Transfer cards list */}
              <div className="flex flex-col gap-3">
                {loading ? (
                  <div className="py-8 text-center text-gray-11 font-family-dm-sans text-sm">Carregando...</div>
                ) : paginatedTransfers.length === 0 ? (
                  <div className="py-8 text-center text-gray-11 font-family-dm-sans text-sm">Nenhum repasse encontrado</div>
                ) : (
                  paginatedTransfers.map((transfer) => {
                    const d = formatTransferForDisplay(transfer);
                    const isConcluido = d.status === "Concluído";
                    return (
                      <div
                        key={transfer.id}
                        className="bg-gray-1 border border-gray-6 rounded-lg"
                      >
                        <div className="flex flex-col gap-5 px-3 py-4">
                          <div className="flex gap-2 items-center">
                            <div className={`shrink-0 size-9 rounded-lg flex items-center justify-center ${isConcluido ? "bg-primary-4" : "bg-yellow-4"}`}>
                              {isConcluido ? (
                                <CheckCircle className="size-5 text-primary-11" />
                              ) : (
                                <TimerIcon className="size-5 text-yellow-12" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0 flex flex-col gap-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex flex-col min-w-0">
                                  {/* Trigger mostra ID resumido (`d.id` = `#xxxxxx...xxxx`);
                                      tooltip mostra `transfer.id` cru (UUID completo).
                                      `topRight` aqui porque o trigger fica no canto
                                      esquerdo do card — tooltip estende pra direita
                                      sem estourar. `usePortal` + clamp do Tooltip
                                      garantem que o ID longo não vaze a viewport. */}
                                  <Tooltip
                                    position="topRight"
                                    trigger="hover"
                                    usePortal
                                    content={<p className="font-family-dm-sans font-normal text-sm leading-[1.3] text-gray-12 text-left break-all">{transfer.id}</p>}
                                    contentClassName="max-w-[min(320px,calc(100vw-2rem))] w-max min-w-0 px-3 py-2 gap-0 !items-stretch"
                                    className="block min-w-0 max-w-full"
                                  >
                                    <p className="font-family-dm-sans font-medium text-base text-gray-12 truncate cursor-help">ID Repasse: {d.id}</p>
                                  </Tooltip>
                                  <div className="flex items-center gap-2">
                                    <p className="font-family-dm-sans font-normal text-sm text-gray-11">{d.requestDate}</p>
                                  </div>
                                </div>
                                <span className={`shrink-0 px-3 py-2 rounded text-sm font-family-dm-sans font-normal ${getStatusBadge(
                                  d.status
                                )}`}>
                                  {d.status}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col gap-3 border-b border-gray-6 pb-3">
                            <p className="font-manrope font-extrabold text-xl text-gray-12">
                              R$ {d.value.toFixed(2).replace(".", ",")}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-center p-3 pt-0">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTransfer(transfer);
                              setIsDetailsOpen(true);
                            }}
                            className="flex gap-2 items-center justify-center w-full h-11 border border-gray-6 rounded-lg mx-0 mb-0 font-manrope font-bold text-base text-gray-12 hover:bg-gray-3 transition-colors"
                          >
                            <FileText className="size-5" />
                            Ver detalhes
                          </button>
                        </div>
                      </div>
                    );
                  })
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

              <div className="flex gap-3 mb-5">
                <div className="bg-gray-1 border border-gray-6 rounded-[12px] px-4 py-3 flex-1">
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-family-dm-sans font-normal text-[14px] text-gray-11">
                      Total já repassado
                    </p>
                    <div className="w-[28px] h-[28px] p-1 rounded-lg bg-primary-4 flex items-center justify-center">
                      <CalendarIcon className="size-5 text-gray-12" />
                    </div>
                  </div>
                  <p className="font-family-dm-sans font-extrabold text-[20px] text-gray-12">
                    R$ {totalTransferredReais.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>

                <div className="bg-gray-1 border border-gray-6 rounded-[12px] px-4 py-3 flex-1">
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-family-dm-sans font-normal text-[14px] text-gray-11">
                      Transações de repasse concluídos
                    </p>
                    <div className="w-[28px] h-[28px] p-1 rounded-lg bg-[#EBE4FF] flex items-center justify-center">
                      <FileText className="size-4 text-gray-12" />
                    </div>
                  </div>
                  <p className="font-family-dm-sans font-extrabold text-[20px] text-gray-12">
                    {metrics.totalCount}
                  </p>
                </div>
              </div>

              {/* Table */}
              <div className="bg-gray-2 border border-gray-6 rounded-lg overflow-hidden">
                {/* Table Header */}
                <div className="bg-gray-4 border-b border-gray-6 flex h-[44px] items-center">
                  <div className="flex h-full items-center p-4 w-[120px]">
                    <p className="font-inter font-medium leading-[1.3] text-sm text-gray-12">
                      ID repasse
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
                            <Tooltip
                              position="topRight"
                              trigger="hover"
                              content={<p className="font-family-dm-sans font-normal text-sm leading-[1.3] text-gray-12 text-left break-all">{transfer.id}</p>}
                              contentClassName="max-w-[min(320px,calc(100vw-2rem))] w-max min-w-0 px-3 py-2 gap-0 !items-stretch"
                              className="block min-w-0 max-w-full"
                            >
                              <p className="font-inter font-semibold leading-[1.3] text-sm text-gray-12 truncate cursor-help">
                                {displayTransfer.id}
                              </p>
                            </Tooltip>
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
                              <EyeIcon className="size-5 text-gray-11" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
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
          eventId={eventId}
          transfer={{
            id: selectedTransfer.id,
            requestDate: formatDateBRT(selectedTransfer.createdAt, { day: "2-digit", month: "short", year: "numeric" }),
            requestTime: formatTimeBRT(selectedTransfer.createdAt, { hour: "2-digit", minute: "2-digit" }),
            value: selectedTransfer.amount / 100,
            status: selectedTransfer.status === "COMPLETED" ? "Concluído" :
              selectedTransfer.status === "PROCESSING" ? "Processando" :
                selectedTransfer.status === "FAILED" ? "Falhou" :
                  selectedTransfer.status === "CANCELLED" ? "Cancelado" : "Pendente",
          }}
        />
      )}
    </>
  );
}
