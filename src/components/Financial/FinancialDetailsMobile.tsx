"use client";

import { ReactNode } from "react";
import Image from "next/image";
import { X, Search, FileText } from "lucide-react";
import { Pagination } from "../Pagination";
import { PixIcon } from "@/components/Icons/PixIcon";
import { CreditCardIcon } from "@/components/Icons/CreditCardIcon";
import { ArrowButton } from "../ArrowButton";
import { getAvatarUrl } from "@/utils/avatar";
import { formatShortId } from "@/utils/shortId";

/**
 * Body mobile compartilhado entre os drawers de Estornados / Chargebacks.
 *
 * Layout (igual ao Figma 2680:110005):
 * - Header: back + nome do evento + close
 * - Pill central com ícone + título
 * - 2 cards de stats (Total + Quantidade)
 * - Search bar (server-side: o caller passa searchValue/onSearchChange e faz o
 *   fetch com debounce; sem esses props o input fica readOnly/desabilitado)
 * - Lista vertical de cards de transação (avatar + nome/email + bandeira,
 *   ID pedido, valor em destaque, divider, botão "Ver detalhes")
 * - Paginação
 * - Botão "Exportar CSV" primary full-width
 *
 * Os 2 drawers (RefundedDrawer, ChargebackDrawer) reusam este body trocando
 * só cor do ícone/valor, label e callback de fetch — evita duplicar ~200
 * linhas de markup mobile.
 */

export interface FinancialDetailsItem {
  /** ID único da row pra `key`. */
  id: string;
  orderId: string;
  buyer: {
    name: string;
    email: string;
    avatar: string | null;
  };
  paymentMethod: string;
  /** Valor em reais (já dividido por 100). */
  value: number;
}

interface FinancialDetailsMobileProps {
  /* Header */
  eventName: string;
  title: string;
  titleIconBgClass: string;
  titleIcon: ReactNode;
  onClose: () => void;

  /* Stats */
  totalLabel: string;
  totalAmount: number;
  countLabel: ReactNode;
  count: number;

  /* List */
  items: FinancialDetailsItem[];
  loading: boolean;
  emptyMessage: string;
  /** Cor do valor (text-red-11 pra estornado, text-orange-11 pra chargeback). */
  valueColorClass: string;
  onItemClick: (item: FinancialDetailsItem) => void;

  /* Pagination */
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;

  /* Search (server-side; sem onSearchChange o input fica readOnly) */
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;

  /* Export */
  onExportCSV?: () => void;
  exporting?: boolean;
}

const formatBRL = (value: number) =>
  value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export function FinancialDetailsMobile({
  eventName,
  title,
  titleIconBgClass,
  titleIcon,
  onClose,
  totalLabel,
  totalAmount,
  countLabel,
  count,
  items,
  loading,
  emptyMessage,
  valueColorClass,
  onItemClick,
  currentPage,
  totalPages,
  onPageChange,
  searchPlaceholder = "Nome, CPF, IDs..",
  searchValue,
  onSearchChange,
  onExportCSV,
  exporting,
}: FinancialDetailsMobileProps) {
  return (
    <div className="md:hidden flex flex-col h-full bg-gray-2">
      {/* Header: back + nome do evento + close */}
      <div className="border-b border-gray-6 flex h-[52px] items-center gap-1 px-4 shrink-0 w-full">
        <button
          onClick={onClose}
          className="flex items-center justify-center rounded-lg shrink-0 size-8 transition-colors rotate-90 cursor-pointer hover:bg-gray-3"
          aria-label="Voltar"
        >
          <ArrowButton isOpen={true} />
        </button>
        <p className="font-manrope font-extrabold text-base leading-[1.1] text-gray-12 truncate flex-1">
          {eventName}
        </p>
        <button
          onClick={onClose}
          className="flex items-center justify-center rounded-lg size-8 transition-colors cursor-pointer hover:bg-gray-3 shrink-0"
          aria-label="Fechar"
        >
          <X className="size-5 text-gray-12" />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        {/* Pill central com título */}
        <div className="flex items-center justify-center pt-6 pb-6">
          <div className="flex items-center gap-2">
            <div className={`${titleIconBgClass} rounded-lg size-7 p-1 flex items-center justify-center`}>
              {titleIcon}
            </div>
            <p className="font-family-dm-sans font-semibold text-base leading-[1.3] text-gray-12 whitespace-nowrap">
              {title}
            </p>
          </div>
        </div>

        {/* Stats cards */}
        <div className="px-4 flex gap-2 items-stretch justify-center">
          <div className="flex-1 min-w-[165px] bg-gray-1 border border-gray-6 rounded-xl px-4 pt-4 pb-5 flex flex-col gap-6">
            <div className="flex flex-col gap-3 items-start">
              <div className="bg-blue-4 rounded-lg size-8 p-1 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-blue-12">
                  <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M8 3v4M16 3v4M3 10h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              <p className="font-family-dm-sans text-base leading-[1.3] text-gray-11">
                {totalLabel}
              </p>
            </div>
            <p className="font-manrope font-extrabold text-lg leading-[1.1] text-gray-12">
              R$ {formatBRL(totalAmount)}
            </p>
          </div>

          <div className="flex-1 min-w-[165px] bg-gray-1 border border-gray-6 rounded-xl px-4 pt-4 pb-5 flex flex-col gap-6">
            <div className="flex flex-col gap-3 items-start">
              <div className="bg-violet-4 rounded-lg size-8 p-1 flex items-center justify-center">
                <FileText className="size-5 text-violet-12" />
              </div>
              <div className="font-family-dm-sans text-base leading-[1.2] text-gray-11">
                {countLabel}
              </div>
            </div>
            <p className="font-manrope font-extrabold text-lg leading-[1.1] text-gray-12">
              {count}
            </p>
          </div>
        </div>

        {/* Search bar */}
        <div className="px-4 pt-3 flex flex-col gap-4">
          <div className="bg-gray-1 border border-gray-6 rounded-lg h-10 flex items-center gap-2 px-3">
            <Search className="size-5 text-gray-11 shrink-0" />
            <input
              type="text"
              value={searchValue ?? ""}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder={searchPlaceholder}
              readOnly={!onSearchChange}
              className="flex-1 bg-transparent outline-none font-family-dm-sans text-sm leading-[1.3] text-gray-12 placeholder:text-gray-11 min-w-0"
            />
          </div>

          {/* Lista de cards */}
          <div className="flex flex-col gap-3 items-center justify-center w-full">
            {loading ? (
              <div className="w-full p-8 text-center text-gray-11 font-family-dm-sans">
                Carregando...
              </div>
            ) : items.length === 0 ? (
              <div className="w-full p-8 text-center text-gray-11 font-family-dm-sans">
                {emptyMessage}
              </div>
            ) : (
              items.map((item) => (
                <article
                  key={item.id}
                  className="bg-gray-1 border border-gray-6 rounded-lg px-3 py-4 w-full flex flex-col gap-5"
                >
                  <div className="flex flex-col gap-5 items-start w-full">
                    {/* Avatar + nome + email + bandeira */}
                    <div className="flex items-center justify-between gap-2 w-full">
                      <div className="flex gap-2 items-center min-w-0 flex-1">
                        {item.buyer.avatar ? (
                          <Image
                            src={getAvatarUrl(item.buyer.avatar) as string}
                            alt={item.buyer.name}
                            width={36}
                            height={36}
                            className="size-9 rounded-full object-cover shrink-0"
                          />
                        ) : (
                          <div className="size-9 rounded-full bg-gray-6 flex items-center justify-center shrink-0">
                            <span className="text-gray-12 font-semibold text-sm font-family-dm-sans">
                              {item.buyer.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div className="flex flex-col gap-2 min-w-0">
                          <p className="font-family-dm-sans font-medium text-base leading-[1.3] text-gray-12 truncate">
                            {item.buyer.name}
                          </p>
                          <p className="font-family-dm-sans text-sm leading-[1.3] text-gray-11 truncate">
                            {item.buyer.email}
                          </p>
                        </div>
                      </div>
                      {/* Bandeira do cartão (ou Pix) */}
                      <div className="shrink-0">
                        {item.paymentMethod === "Pix" || item.paymentMethod === "PIX" ? (
                          <PixIcon className="size-6 text-gray-12" />
                        ) : (
                          <CreditCardIcon className="h-4" />
                        )}
                      </div>
                    </div>

                    {/* ID Pedido */}
                    <p className="font-family-dm-sans font-medium text-sm leading-[1.3] text-gray-12 truncate w-full">
                      ID Pedido: {formatShortId(item.orderId)}
                    </p>

                    {/* Valor */}
                    <p className={`font-manrope font-extrabold text-xl leading-[1.1] ${valueColorClass}`}>
                      -R$ {formatBRL(item.value)}
                    </p>
                  </div>

                  <div className="h-px bg-gray-6 w-full" />

                  {/* Botão Ver detalhes */}
                  <button
                    onClick={() => onItemClick(item)}
                    className="border border-gray-6 rounded-lg h-11 flex items-center justify-center gap-2 w-full hover:bg-gray-3 transition-colors cursor-pointer"
                  >
                    <FileText className="size-5 text-gray-12" />
                    <span className="font-manrope font-bold text-base leading-[1.1] text-gray-12">
                      Ver detalhes
                    </span>
                  </button>
                </article>
              ))
            )}
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={onPageChange}
              totalItems={count}
              className="p-4"
            />
          )}

          {/* Botão Exportar CSV */}
          {onExportCSV && (
            <button
              onClick={onExportCSV}
              disabled={exporting || items.length === 0}
              className="bg-primary-11 rounded-lg h-11 flex items-center justify-center w-full font-manrope font-bold text-base leading-[1.1] text-primary-2 hover:bg-primary-10 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2 mb-6"
            >
              {exporting ? "Exportando..." : "Exportar CSV"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
