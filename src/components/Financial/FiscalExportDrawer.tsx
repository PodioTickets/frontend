"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { ChevronDown, FileText, Search, X } from "lucide-react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/Button";
import { Pagination } from "@/components/Pagination";
import { ArrowButton } from "@/components/ArrowButton";
import { BookIcon } from "@/components/Icons/BookIcon";
import { getAvatarUrl } from "@/utils/avatar";
import { organizerService } from "@/services";
import type { FiscalOrder } from "@/services/organizer/OrganizerService";
import {
  FiscalExportFormatModal,
  type FiscalExportFormat,
} from "./FiscalExportFormatModal";
import { PaymentItemDetailsDrawer } from "./PaymentItemDetailsDrawer";
import { Tooltip } from "../Tooltip";
import { ImageWithInitialFallback } from "../ImageWithInitialFallback";
import { isPersonBr, formatDocumentDisplay } from "@/utils/documentDisplay";
import { formatDateBRT, formatTimeBRT } from "@/utils/datetimeBR";
import { formatShortId } from "@/utils/shortId";

type PaymentDetailsItem = {
  orderId: string;
  transactionId: string;
  buyer: { name: string; email: string; avatar: string | null };
  releaseDate: string;
  nextReleaseDate: string;
  paymentMethod: string;
  value: number;
  installment: string | null;
};

const buildPaymentItem = (order: FiscalOrder): PaymentDetailsItem => {
  const date = new Date(order.purchaseDate);
  const formattedDate = Number.isNaN(date.getTime())
    ? order.purchaseDate
    // purchaseDate é INSTANTE real → BRT (America/Sao_Paulo).
    : formatDateBRT(order.purchaseDate, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  return {
    orderId: order.paymentId || order.id,
    transactionId: order.displayId || order.id,
    buyer: {
      name: order.buyer.name,
      email: order.buyer.email,
      avatar: order.buyer.avatarUrl,
    },
    releaseDate: formattedDate,
    nextReleaseDate: formattedDate,
    paymentMethod: order.paymentMethod,
    value: order.amount / 100,
    installment: null,
  };
};

interface FiscalExportDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventName?: string;
}

type PeriodValue = "7d" | "15d" | "30d" | "60d" | "all";
type ValueRange = "all" | "lt100" | "100to500" | "500to1000" | "gt1000";

const PERIOD_OPTIONS: { value: PeriodValue; label: string }[] = [
  { value: "7d", label: "Últimos 7 dias" },
  { value: "15d", label: "Últimos 15 dias" },
  { value: "30d", label: "Últimos 30 dias" },
  { value: "60d", label: "Últimos 60 dias" },
  { value: "all", label: "Todo o período" },
];

const VALUE_OPTIONS: { value: ValueRange; label: string }[] = [
  { value: "all", label: "Tudo" },
  { value: "lt100", label: "Até R$ 100" },
  { value: "100to500", label: "R$ 100 a R$ 500" },
  { value: "500to1000", label: "R$ 500 a R$ 1.000" },
  { value: "gt1000", label: "Acima de R$ 1.000" },
];

const ITEMS_PER_PAGE = 10;

const formatCurrency = (cents: number) =>
  `R$ ${(cents / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatPurchaseDate = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return { day: "—", time: "" };
  // purchaseDate é INSTANTE real → BRT (America/Sao_Paulo).
  const day = formatDateBRT(iso, {
    day: "2-digit",
    month: "short",
  }).replace(".", "");
  const time = formatTimeBRT(iso, {
    hour: "2-digit",
    minute: "2-digit",
  });
  return { day, time };
};

export function FiscalExportDrawer({
  isOpen,
  onClose,
  eventId,
  eventName,
}: FiscalExportDrawerProps) {
  const [orders, setOrders] = useState<FiscalOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [period, setPeriod] = useState<PeriodValue>("30d");
  const [valueRange, setValueRange] = useState<ValueRange>("all");
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showFormatModal, setShowFormatModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentDetailsItem | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const lastRequestRef = useRef(0);

  const openPaymentDetails = (order: FiscalOrder) => {
    setSelectedPayment(buildPaymentItem(order));
    setIsDetailsOpen(true);
  };

  useEffect(() => {
    if (!isOpen) return;
    const handle = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(handle);
  }, [search, isOpen]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, period, valueRange]);

  useEffect(() => {
    if (!isOpen || !eventId) return;

    const requestId = ++lastRequestRef.current;
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        const data = await organizerService.getEventFiscalOrders(eventId, {
          page,
          limit: ITEMS_PER_PAGE,
          search: debouncedSearch || undefined,
          period,
          valueRange,
        });
        if (cancelled || requestId !== lastRequestRef.current) return;
        setOrders(data.orders);
        setTotal(data.pagination.total);
        setTotalPages(Math.max(1, data.pagination.totalPages));
      } catch (error) {
        if (cancelled || requestId !== lastRequestRef.current) return;
        console.error("Error loading fiscal orders:", error);
        toast.error("Erro ao carregar pedidos");
        setOrders([]);
        setTotal(0);
        setTotalPages(1);
      } finally {
        if (!cancelled && requestId === lastRequestRef.current) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, eventId, page, debouncedSearch, period, valueRange]);

  const handleConfirmExport = async ({
    format,
    fields,
  }: {
    format: FiscalExportFormat;
    fields: string[];
  }) => {
    if (exporting) return;
    try {
      setExporting(true);
      const blob = await organizerService.exportEventFiscalData(eventId, {
        search: debouncedSearch || undefined,
        period,
        valueRange,
        format,
        fields,
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const stamp = new Date().toISOString().slice(0, 10);
      const extension = format === "xlsx" ? "xlsx" : format === "pdf" ? "pdf" : "txt";
      link.download = `dados-fiscais-${eventId}-${stamp}.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Exportação iniciada");
      setShowFormatModal(false);
    } catch (error) {
      console.error("Error exporting fiscal data:", error);
      toast.error("Erro ao exportar dados fiscais");
    } finally {
      setExporting(false);
    }
  };

  const periodLabel = useMemo(
    () => PERIOD_OPTIONS.find((p) => p.value === period)?.label ?? "",
    [period],
  );
  const valueLabel = useMemo(
    () => VALUE_OPTIONS.find((v) => v.value === valueRange)?.label ?? "",
    [valueRange],
  );

  return (
    <>
      <Drawer open={isOpen} onOpenChange={onClose} direction="right">
        <DrawerContent className="bg-gray-1 h-full border-l border-gray-6 w-full max-w-[760px]">
          <DrawerTitle className="sr-only">Exportar dados fiscais</DrawerTitle>

          {/* ===== MOBILE Header ===== */}
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
                  Exportar dados fiscais
                </p>
              </div>
              {eventName && (
                <p className="px-4 pb-3 font-family-dm-sans font-normal text-sm text-gray-11 leading-[1.3]">
                  Evento: <span className="text-gray-12">{eventName}</span>
                </p>
              )}
            </div>
          </DrawerHeader>

          {/* ===== DESKTOP Header ===== */}
          <DrawerHeader className="hidden md:block border-b border-gray-6 px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-2 min-w-0">
                <h2 className="font-manrope font-extrabold text-xl leading-[1.1] text-gray-12">
                  Exportar dados fiscais
                </h2>
                <p className="font-family-dm-sans font-normal text-sm text-gray-11 leading-[1.3]">
                  Consulte pedidos, visualize detalhes e exporte os dados para nota
                  fiscal.
                </p>
              </div>
              <DrawerClose asChild>
                <button
                  type="button"
                  className="size-8 flex items-center justify-center shrink-0 rounded-lg hover:bg-gray-3 transition-colors cursor-pointer"
                  aria-label="Fechar"
                >
                  <X className="size-6 text-gray-12" />
                </button>
              </DrawerClose>
            </div>
          </DrawerHeader>

          <div className="flex-1 overflow-y-auto px-4 md:px-5 py-4 flex flex-col gap-4">
            {/* Busca */}
            <div className="border border-gray-6 rounded-lg h-10 flex items-center gap-2 px-3 bg-gray-1">
              <Search className="size-5 text-gray-11 shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por ID do pedido, nome ou cpf"
                className="flex-1 h-10 min-w-0 bg-transparent font-family-dm-sans font-normal text-sm text-gray-12 placeholder:text-gray-11 outline-none"
              />
            </div>

            {/* Filtros + contador */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <FilterDropdown
                  label="Período"
                  value={periodLabel}
                  options={PERIOD_OPTIONS}
                  onChange={(v) => setPeriod(v as PeriodValue)}
                  selected={period}
                />
                <FilterDropdown
                  label="Valor"
                  value={valueLabel}
                  options={VALUE_OPTIONS}
                  onChange={(v) => setValueRange(v as ValueRange)}
                  selected={valueRange}
                />
              </div>
              <Button
                className="md:w-auto w-full md:hidden"
                disabled={!loading && total === 0}
                onClick={() => setShowFormatModal(true)}
              >
                <FileText className="size-4" />
                Exportar dados fiscais
              </Button>
              <p className="font-family-dm-sans font-normal text-sm text-gray-11">
                {total} {total === 1 ? "pedido" : "pedidos"}
              </p>
            </div>

            {/* ===== Desktop: tabela ===== */}
            <div className="hidden md:flex flex-col border border-gray-6 rounded-lg overflow-hidden">
              <div className="bg-gray-4 grid grid-cols-[1fr_1.6fr_1fr_1fr_60px] h-11 items-center">
                <HeaderCell>ID pedido</HeaderCell>
                <HeaderCell>Comprador</HeaderCell>
                <HeaderCell>Data da compra</HeaderCell>
                <HeaderCell>Valor</HeaderCell>
                <HeaderCell className="text-right pr-4">Ações</HeaderCell>
              </div>
              {loading ? (
                <EmptyState text="Carregando..." />
              ) : orders.length === 0 ? (
                <EmptyState text="Nenhum pedido encontrado" />
              ) : (
                orders.map((order) => {
                  const date = formatPurchaseDate(order.purchaseDate);
                  return (
                    <div
                      key={order.id}
                      className="grid grid-cols-[1fr_1.6fr_1fr_1fr_60px] min-h-[56px] items-center border-t border-gray-6 hover:bg-gray-2 transition-colors"
                    >
                      <Cell>
                        <Tooltip
                          position="topRight"
                          trigger="hover"
                          content={<p className="font-family-dm-sans font-normal text-sm leading-[1.3] text-gray-12 text-left break-all">{order.id}</p>}
                          contentClassName="max-w-[min(320px,calc(100vw-2rem))] w-max min-w-0 px-3 py-2 gap-0 !items-stretch"
                          className="block min-w-0 max-w-full"
                        >
                          <p className="font-inter font-semibold leading-[1.3] text-sm text-gray-12 truncate cursor-help">
                            {formatShortId(order.id)}
                          </p>
                        </Tooltip>
                      </Cell>
                      <Cell>
                        <div className="flex items-center gap-2 min-w-0">
                          <ImageWithInitialFallback
                            src={getAvatarUrl(order.buyer.avatarUrl)}
                            alt={order.buyer.name}
                            width={32}
                            height={32}
                            name={order.buyer.name}
                            className="size-8 rounded-full object-cover shrink-0"
                          />
                          <div className="flex flex-col min-w-0">
                            <span className="font-family-dm-sans font-medium text-sm text-gray-12 truncate">
                              {order.buyer.name}
                            </span>
                            <span className="font-family-dm-sans font-normal text-xs text-gray-11 truncate">
                              {formatDocumentDisplay(order.buyer.cpf, isPersonBr({ document: order.buyer.cpf }))}
                            </span>
                          </div>
                        </div>
                      </Cell>
                      <Cell>
                        <div className="flex flex-col">
                          <span className="font-family-dm-sans font-medium text-sm text-gray-12">
                            {date.day}
                          </span>
                          <span className="font-family-dm-sans font-normal text-xs text-gray-11">
                            {date.time}
                          </span>
                        </div>
                      </Cell>
                      <Cell>
                        <span className="font-family-dm-sans font-medium text-sm text-gray-12">
                          {formatCurrency(order.amount)}
                        </span>
                      </Cell>
                      <Cell className="justify-end pr-4">
                        <button
                          type="button"
                          title="Ver comprovante"
                          onClick={() => openPaymentDetails(order)}
                          className="bg-gray-2 border border-gray-6 rounded-lg size-8 flex items-center justify-center hover:bg-gray-3 transition-colors cursor-pointer"
                        >
                          <FileText className="size-4 text-gray-11" />
                        </button>
                      </Cell>
                    </div>
                  );
                })
              )}
            </div>

            {/* ===== Mobile: cards ===== */}
            <div className="md:hidden flex flex-col gap-2">
              {loading ? (
                <EmptyState text="Carregando..." />
              ) : orders.length === 0 ? (
                <EmptyState text="Nenhum pedido encontrado" />
              ) : (
                orders.map((order) => {
                  const date = formatPurchaseDate(order.purchaseDate);
                  return (
                    <div
                      key={order.id}
                      className="border border-gray-6 rounded-lg p-3 flex flex-col gap-3 bg-gray-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-family-dm-sans font-semibold text-sm text-gray-12">
                          #{order.displayId}
                        </span>
                        <span className="font-family-dm-sans font-normal text-xs text-gray-11">
                          {date.day} · {date.time}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 min-w-0">
                        <ImageWithInitialFallback
                          src={getAvatarUrl(order.buyer.avatarUrl)}
                          alt={order.buyer.name}
                          name={order.buyer.name}
                          width={36}
                          height={36}
                          className="size-9 rounded-full object-cover shrink-0"
                        />
                        <div className="flex flex-col min-w-0">
                          <span className="font-family-dm-sans font-medium text-sm text-gray-12 truncate">
                            {order.buyer.name}
                          </span>
                          <span className="font-family-dm-sans font-normal text-xs text-gray-11 truncate">
                            {formatDocumentDisplay(order.buyer.cpf, isPersonBr({ document: order.buyer.cpf }))}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-manrope font-extrabold text-base text-gray-12">
                          {formatCurrency(order.amount)}
                        </span>
                        <button
                          type="button"
                          title="Ver comprovante"
                          onClick={() => openPaymentDetails(order)}
                          className="size-9 flex items-center justify-center rounded-lg border border-gray-6 hover:bg-gray-3 transition-colors cursor-pointer"
                        >
                          <FileText className="size-5 text-gray-12" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer: botão + paginação */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mt-auto pt-2">
              <Button
                className="md:w-auto w-full hidden md:flex"
                disabled={!loading && total === 0}
                onClick={() => setShowFormatModal(true)}
              >
                <FileText className="size-4" />
                Exportar dados fiscais
              </Button>
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
                totalItems={total}
                disabled={loading}
                className="bg-transparent! md:w-auto!"
              />
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      <FiscalExportFormatModal
        isOpen={showFormatModal}
        onClose={() => {
          if (!exporting) setShowFormatModal(false);
        }}
        onConfirm={handleConfirmExport}
        isExporting={exporting}
      />

      {selectedPayment && (
        <PaymentItemDetailsDrawer
          isOpen={isDetailsOpen}
          onClose={() => {
            setIsDetailsOpen(false);
            setSelectedPayment(null);
          }}
          paymentItem={selectedPayment}
          eventName={eventName}
          type="awaiting"
        />
      )}
    </>
  );
}

function HeaderCell({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`px-4 ${className}`}>
      <p className="font-family-dm-sans font-medium text-sm text-gray-12 leading-[1.3]">
        {children}
      </p>
    </div>
  );
}

function Cell({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`px-4 py-3 flex items-center min-w-0 ${className}`}>
      {children}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="py-10 text-center font-family-dm-sans text-sm text-gray-11">
      {text}
    </div>
  );
}

interface FilterDropdownProps<T extends string> {
  label: string;
  value: string;
  selected: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}

function FilterDropdown<T extends string>({
  label,
  value,
  selected,
  options,
  onChange,
}: FilterDropdownProps<T>) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-2 px-3 h-9 rounded-lg border border-gray-6 bg-gray-1 hover:bg-gray-2 transition-colors cursor-pointer"
        >
          <span className="font-family-dm-sans font-normal text-sm text-gray-11">
            {label}:
          </span>
          <span className="font-family-dm-sans font-medium text-sm text-gray-12">
            {value}
          </span>
          <ChevronDown className="size-4 text-gray-12" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-56 p-1 bg-gray-1 border border-gray-6 rounded-lg shadow-md"
      >
        <ul className="flex flex-col">
          {options.map((opt) => {
            const isSelected = opt.value === selected;
            return (
              <li key={opt.value}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-md font-family-dm-sans text-sm transition-colors ${isSelected
                    ? "bg-primary-3 text-primary-12 font-medium"
                    : "text-gray-12 hover:bg-gray-3"
                    }`}
                >
                  {opt.label}
                </button>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
