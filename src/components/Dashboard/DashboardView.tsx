"use client";

import type { ReactNode } from "react";
import { XCircle } from "lucide-react";
import { Loading } from "@/components/Loading";
import { RevenueChart } from "@/components/Organizer/RevenueChart";
import { SalesHeatmap } from "@/components/Organizer/SalesHeatmap";
import { ArrowButton } from "@/components/ArrowButton";
import { SelectTicketsFilterModal } from "@/components/Registrations/SelectTicketsFilterModal";
import { CartIcon } from "@/components/Icons/CartIcon";
import { CheckIcon } from "@/components/Icons/Organizer/CheckIcon";
import { DolarIcon } from "@/components/Icons/Organizer/DolarIcon";
import { SalesByPaymentMethod } from "@/components/Organizer/SalesByPaymentMethod";
import { QuestionsListing } from "@/components/Organizer/QuestionsListing";
import { QuestionDetailsDrawer } from "@/components/Organizer/QuestionDetailsDrawer";
import { ProductDetailsDrawer } from "@/components/Organizer/ProductDetailsDrawer";
import { TicketsWithLotsList } from "@/components/Financial/TicketsWithLotsList";
import { PurchaseHeatmap } from "./PurchaseHeatmap";
import { DashboardWeekTrend } from "./DashboardWeekTrend";
import { LotsNearDepletionPaginationBar } from "./LotsNearDepletionPaginationBar";
import {
  DashboardRankingCategoryLabel,
  DashboardRankingTicketNameLabel,
} from "./DashboardRankingLabels";
import type { useEventDashboard } from "@/hooks/useEventDashboard";

/**
 * Corpo COMPLETO da página de dashboard, compartilhado entre admin e organizer.
 * Layout canônico = organizer. O cabeçalho é injetado via slot `header`; todo o
 * estado/derivações vêm do `useEventDashboard` (passado como `controller`).
 */

const periodOptions = [
  { value: "geral", label: "Geral" },
  { value: "24h", label: "Hoje" },
  { value: "7d", label: "7D" },
  { value: "15d", label: "15D" },
  { value: "1m", label: "1M" },
  { value: "2m", label: "2M" },
];

export function DashboardView({
  controller,
  header,
}: {
  controller: ReturnType<typeof useEventDashboard>;
  header: ReactNode;
}) {
  const {
    loading,
    eventId,
    event,
    dashboardData,
    tickets,
    periodFilter,
    setPeriodFilter,
    selectedTicketIds,
    setSelectedTicketIds,
    isTicketModalOpen,
    setIsTicketModalOpen,
    paginatedTicketRanking,
    ticketRankingSliceStart,
    ticketRankingPage,
    setTicketRankingPage,
    ticketRankingTotalPages,
    paginatedLotsNearDepletion,
    lotsNearDepletionSliceStart,
    lotsNearDepletionPage,
    setLotsNearDepletionPage,
    lotsNearDepletionTotalPages,
    questionsListing,
    selectedQuestionId,
    setSelectedQuestionId,
    selectedQuestion,
    selectedQuestionIndex,
    totalQuestions,
    selectedQuestionAnswerRows,
    textAnswerRows,
    textAnswersLoading,
    selectedQuestionFromApi,
    apiQuestions,
    sortedQuestions,
    selectedProductName,
    setSelectedProductName,
    selectedProductFromApi,
    selectedProductIndex,
    totalProducts,
    selectedProductQuantitySold,
    selectedProductTotalStock,
    selectedProductTotalRevenueLabel,
    selectedProductVariations,
    uniqueProductNames,
    ticketsWithLotsList,
    ticketsWithLotsExpanded,
    toggleTicketsWithLotsRow,
    ticketsWithLotsPage,
    setTicketsWithLotsPage,
    ticketsWithLotsTotalPages,
  } = controller;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-2 flex items-center justify-center">
        <Loading />
      </div>
    );
  }

  const getTicketButtonLabel = () => {
    if (selectedTicketIds.length === 0) {
      return "Todos os ingressos";
    }
    if (selectedTicketIds.length === 1) {
      const ticket = tickets.find((t) => t.id === selectedTicketIds[0]);
      return ticket?.name || "1 ingresso selecionado";
    }
    return `${selectedTicketIds.length} ingressos selecionados`;
  };

  return (
    <div className="min-h-screen bg-gray-2">
      {header}

      {/* Desktop content */}
      <div className="hidden md:block max-w-7xl mx-auto px-4 lg:px-6 2xl:px-0 py-8">
        {/* Title and Description - conforme Figma */}
        <div className="mb-8 flex flex-col gap-1">
          <h1 className="font-manrope font-bold text-[20px] leading-[1.3] text-gray-12">
            Dashboard
          </h1>
          <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-11">
            Acompanhe o desempenho do seu evento em tempo real
          </p>
        </div>

        {/* Filters - segment + dropdown */}
        <div className="mb-6 flex items-center gap-3 flex-wrap">
          {/* Period Filter - Segment Buttons */}
          <div className="bg-gray-3 flex items-center p-1 rounded-xl h-[48px]">
            {periodOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setPeriodFilter(option.value)}
                className={`px-4 py-2 rounded-xl text-[14px] font-family-dm-sans border transition-all ease-in-out cursor-pointer duration-200 font-medium h-[40px] flex items-center ${periodFilter === option.value
                  ? "bg-gray-1 border-gray-6 text-gray-12"
                  : "text-gray-11 hover:text-gray-12 border-transparent"
                  }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* Ticket Filter Button */}
          <button
            onClick={() => setIsTicketModalOpen(true)}
            className="flex items-center gap-2 px-4 py-3 rounded-xl border border-gray-6 bg-gray-1 text-gray-12 hover:bg-gray-3 transition-colors cursor-pointer min-w-[187px] h-[48px]"
          >
            <span className="text-[14px] font-family-dm-sans font-normal flex-1 text-left">{getTicketButtonLabel()}</span>
            <ArrowButton />
          </button>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-4 gap-3 mb-8 w-full">
          {/* Receita Líquida */}
          <div className="bg-gray-1 border border-gray-6 rounded-xl h-[133px] flex flex-col">
            <div className="flex items-center justify-between px-4 pt-3 pb-2 h-[44px]">
              <p className="font-family-dm-sans font-normal text-[16px] text-gray-11">Receita Líquida</p>
              <div className="w-[28px] h-[28px] p-1 rounded-lg bg-blue-4 flex items-center justify-center">
                <CartIcon className="size-5 text-blue-12" />
              </div>
            </div>
            <div className="px-4 h-[49px] flex items-center">
              <p className="font-manrope font-bold text-[24px] leading-[1.1] text-gray-12">
                R$ {(dashboardData.netRevenue / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <DashboardWeekTrend
              change={dashboardData.netRevenueChange}
              period={periodFilter}
              wrapperClassName="px-4 pb-3 pt-1 h-[40px] flex items-center gap-2"
            />
          </div>

          {/* Ticket Médio */}
          <div className="bg-gray-1 border border-gray-6 rounded-xl h-[133px] flex flex-col">
            <div className="flex items-center justify-between px-4 pt-3 pb-2 h-[44px]">
              <p className="font-family-dm-sans font-normal text-[16px] text-gray-11">Ticket Médio</p>
              <div className="w-[28px] h-[28px] p-1 rounded-lg bg-[#EBE4FF] flex items-center justify-center">
                <DolarIcon className="size-5 text-[#202020]" />
              </div>
            </div>
            <div className="px-4 h-[49px] flex items-center">
              <p className="font-manrope font-bold text-[24px] leading-[1.1] text-gray-12">
                R$ {(dashboardData.averageTicket / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <DashboardWeekTrend
              change={dashboardData.averageTicketChange}
              period={periodFilter}
              wrapperClassName="px-4 pb-3 pt-1 h-[40px] flex items-center gap-2"
            />
          </div>

          {/* Inscrições Confirmadas */}
          <div className="bg-gray-1 border border-gray-6 rounded-xl h-[133px] flex flex-col">
            <div className="flex items-center justify-between px-4 pt-3 pb-2 h-[44px]">
              <p className="font-family-dm-sans font-normal text-[16px] text-gray-11">Inscrições Confirmadas</p>
              <div className="w-[28px] h-[28px] p-1 rounded-lg bg-primary-4 flex items-center justify-center">
                <CheckIcon className="size-5 text-gray-12" />
              </div>
            </div>
            <div className="px-4 h-[49px] flex items-center">
              <p className="font-manrope font-bold text-[24px] leading-[1.1] text-gray-12">
                {dashboardData.totalRegistrations.toLocaleString("pt-BR")}
              </p>
            </div>
            <DashboardWeekTrend
              change={dashboardData.totalRegistrationsChange}
              period={periodFilter}
              wrapperClassName="px-4 pb-3 pt-1 h-[40px] flex items-center gap-2"
            />
          </div>

          {/* Cancelamentos */}
          <div className="bg-gray-1 border border-gray-6 rounded-xl h-[133px] flex flex-col">
            <div className="flex items-center justify-between px-4 pt-3 pb-2 h-[44px]">
              <p className="font-family-dm-sans font-normal text-[16px] text-gray-11">Cancelamentos</p>
              <div className="w-[28px] h-[28px] p-1 rounded-lg bg-red-4 flex items-center justify-center">
                <XCircle className="size-5 text-red-12" />
              </div>
            </div>
            <div className="flex-1 flex">
              <div className="flex-1 flex flex-col border-r border-gray-6">
                <div className="px-4 pt-4 pb-3 h-[49px] flex items-start">
                  <p className="font-manrope font-bold text-[24px] leading-[1.1] text-gray-12">
                    {dashboardData.cancellations}
                  </p>
                </div>
                <div className="px-4 pb-3 pt-1 flex-1 flex items-center">
                  <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-11">
                    Cancelados
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="flex gap-3 mb-8 w-full">
          {/* Tendência de Inscrições */}
          <div className="bg-gray-1 border border-gray-6 rounded-xl p-4 w-3/4">
            <div className="mb-4">
              <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-11">Tendência de inscrições</p>
            </div>
            <div className="flex items-center gap-3 mb-4">
              <p className="font-manrope font-bold text-[24px] leading-[1.1] text-gray-12">
                R$ {(dashboardData.registrationsTrend.amount / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <DashboardWeekTrend
                change={dashboardData.registrationsTrend.change}
                period={periodFilter}
              />
            </div>
            <RevenueChart
              data={{
                labels: dashboardData.registrationsTrend.chartData?.labels ?? [],
                revenue: dashboardData.registrationsTrend.chartData?.revenue?.map((val: number) => val / 100) ?? [],
                dailyData: dashboardData.registrationsTrend.chartData?.dailyData,
              }}
            />
          </div>

          {/* Ranking de Ingressos */}
          <div className="bg-gray-1 border border-gray-6 rounded-xl">
            <div className="px-4 py-5 border-b border-gray-6 flex items-center justify-between">
              <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-11">Ranking de ingressos</p>
            </div>
            <div>
              {/* Header */}
              <div className="grid grid-cols-[199px_81px_112px] border-b border-gray-6 bg-gray-4">
                <div className="px-4 py-4">
                  <p className="font-inter font-medium text-[14px] leading-[1.3] text-gray-12">Nome</p>
                </div>
                <div className="px-4 py-4 flex items-center justify-center">
                  <p className="font-inter font-medium text-[14px] leading-[1.3] text-gray-12">Qt</p>
                </div>
                <div className="px-4 py-4 flex items-center justify-end">
                  <p className="font-inter font-medium text-[14px] leading-[1.3] text-gray-12">Total</p>
                </div>
              </div>
              {/* Rows */}
              {paginatedTicketRanking.map((ticket, index) => (
                <div
                  key={ticketRankingSliceStart + index}
                  className="grid grid-cols-[199px_81px_112px] border-b border-gray-6 last:border-b-0 bg-gray-1"
                >
                  <div className="px-4 py-3 flex flex-col gap-2 justify-center">
                    <DashboardRankingCategoryLabel category={ticket.category} />
                    <DashboardRankingTicketNameLabel name={ticket.name} />
                  </div>
                  <div className="px-4 py-3 flex items-center justify-center">
                    <p className="font-inter font-semibold text-[14px] leading-[1.3] text-gray-12">{ticket.quantity.toLocaleString("pt-BR")}</p>
                  </div>
                  <div className="px-4 py-3 flex items-center justify-end">
                    <p className="font-inter font-semibold text-[14px] leading-[1.3] text-gray-12">
                      R$ {(ticket.total / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <LotsNearDepletionPaginationBar
              page={ticketRankingPage}
              totalPages={ticketRankingTotalPages}
              onPageChange={setTicketRankingPage}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-8 w-full">
          <div className="min-h-[311px]">
            <SalesByPaymentMethod data={dashboardData.salesByPaymentMethod} />
          </div>
          <div className="min-h-[311px]">
            <QuestionsListing
              items={questionsListing}
              onItemClick={(item) => {
                setSelectedQuestionId(item.id);
              }}
            />
          </div>
        </div>

        <QuestionDetailsDrawer
          isOpen={!!selectedQuestionId}
          onClose={() => setSelectedQuestionId(null)}
          question={selectedQuestion}
          questionIndex={selectedQuestionIndex}
          totalQuestions={totalQuestions}
          answerRows={selectedQuestionAnswerRows}
          textAnswerRows={textAnswerRows}
          textAnswersLoading={textAnswersLoading}
          totalParticipants={selectedQuestionFromApi?.participantCount ?? 0}
          responseRate={
            dashboardData.totalRegistrations > 0 && selectedQuestionFromApi
              ? Math.round((selectedQuestionFromApi.participantCount / dashboardData.totalRegistrations) * 100)
              : undefined
          }
          onPrevious={
            selectedQuestionIndex > 1
              ? () => {
                if (apiQuestions.length > 0) {
                  const prev = apiQuestions[selectedQuestionIndex - 2];
                  if (prev) setSelectedQuestionId(prev.questionId);
                } else {
                  const prev = sortedQuestions[selectedQuestionIndex - 2];
                  if (prev) setSelectedQuestionId(prev.id);
                }
              }
              : undefined
          }
          onNext={
            selectedQuestionIndex < totalQuestions && totalQuestions > 0
              ? () => {
                if (apiQuestions.length > 0) {
                  const next = apiQuestions[selectedQuestionIndex];
                  if (next) setSelectedQuestionId(next.questionId);
                } else {
                  const next = sortedQuestions[selectedQuestionIndex];
                  if (next) setSelectedQuestionId(next.id);
                }
              }
              : undefined
          }
        />

        <ProductDetailsDrawer
          isOpen={!!selectedProductName}
          onClose={() => setSelectedProductName(null)}
          productName={selectedProductName ?? ""}
          productImageUrl={selectedProductFromApi?.productImage ?? undefined}
          productIndex={selectedProductIndex}
          totalProducts={totalProducts}
          quantitySold={selectedProductQuantitySold}
          totalStock={selectedProductTotalStock}
          totalRevenue={selectedProductTotalRevenueLabel}
          variationRows={selectedProductVariations}
          onPrevious={
            selectedProductIndex > 1
              ? () => setSelectedProductName(uniqueProductNames[selectedProductIndex - 2] ?? null)
              : undefined
          }
          onNext={
            selectedProductIndex < totalProducts && totalProducts > 0
              ? () => setSelectedProductName(uniqueProductNames[selectedProductIndex] ?? null)
              : undefined
          }
        />


        {/* Bottom Section */}
        <div className="grid grid-cols-[392px_1fr] gap-3 w-full">
          {/* Ingressos Próximos de Esgotamento */}
          <div className="bg-gray-1 border border-gray-6 rounded-xl">
            <div className="px-4 py-5 border-b border-gray-6 flex items-center justify-between">
              <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-11">Ingressos próximos de esgotamento</p>
            </div>
            <div>
              {paginatedLotsNearDepletion.map((lot, index) => {
                const globalIndex = lotsNearDepletionSliceStart + index;
                const percentage = lot.percentageSold;
                const getStatusColor = (status: string) => {
                  if (status === "Crítico") return "bg-red-11";
                  if (status === "Atenção") return "bg-yellow-11";
                  return "bg-gray-11";
                };
                return (
                  <div key={`${globalIndex}-${lot.name}`} className="px-4 py-2 border-b border-gray-6 last:border-b-0">
                    <div className="flex-1 min-w-0 mb-3">
                      <DashboardRankingTicketNameLabel name={`${lot.name}`} />
                    </div>
                    <div className="mb-3">
                      <div className="relative h-3 bg-gray-6 rounded-full overflow-hidden">
                        <div
                          className={`absolute left-0 top-0 h-full rounded-full ${getStatusColor(lot.status)}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className={`px-2 py-1 rounded ${getStatusColor(lot.status)} text-sm font-family-dm-sans font-normal text-gray-1 shrink-0`}>
                        {lot.status}
                      </div>
                      <div>
                        <span className="font-family-dm-sans font-normal text-sm leading-[1.3] text-gray-11">Lote atual: </span>
                        <span className="font-family-dm-sans font-semibold text-sm leading-[1.3] text-gray-12">{lot.activeBatch?.label ?? "—"}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <LotsNearDepletionPaginationBar
              page={lotsNearDepletionPage}
              totalPages={lotsNearDepletionTotalPages}
              onPageChange={setLotsNearDepletionPage}
            />
          </div>

          {/* Heatmap de Dias e Horários */}
          <div className="bg-gray-1 border border-gray-6 rounded-xl">
            <SalesHeatmap data={dashboardData.salesHeatmap} />
          </div>
        </div>

        {/* Cities Section */}
        <div className="grid grid-cols-2 gap-3 mt-8 w-full">
          {dashboardData.topCities.map((city, index) => {
            const isFirst = index === 0;
            return (
              <div
                key={index}
                className={`${isFirst ? "bg-primary-2 border-primary-6" : "bg-blue-2 border-blue-6"} border rounded-lg p-3`}
              >
                <div className={`inline-block px-2 py-1 rounded text-[14px] font-family-dm-sans font-medium mb-2 ${isFirst ? "bg-primary-5 text-primary-12" : "bg-blue-5 text-blue-12"}`}>
                  {isFirst ? "1º Cidade com mais vendas" : "2º Cidade com mais vendas"}
                </div>
                <p className="font-family-dm-sans font-semibold text-[16px] text-gray-12 mb-2">{city.city}</p>
                <p className="font-family-dm-sans font-normal text-[14px] text-gray-11">
                  QT de compradores: <span className="font-family-dm-sans font-semibold text-[14px] leading-[1.3] text-gray-12">{city.participants}</span>
                </p>
              </div>
            )
          })}
        </div>

        {/* Mapa de calor geográfico — logo antes do último gráfico. */}
        <div className="mt-8 w-full">
          <PurchaseHeatmap data={dashboardData.purchaseLocations} pending={dashboardData.purchaseLocationsPending} />
        </div>

        {/* Ingressos de lotes — desktop (componente compartilhado com financeiro). */}
        <div className="mt-8 w-full">
          <TicketsWithLotsList
            tickets={ticketsWithLotsList}
            expandedRows={ticketsWithLotsExpanded}
            onToggleRow={toggleTicketsWithLotsRow}
            page={ticketsWithLotsPage}
            totalPages={ticketsWithLotsTotalPages}
            onPageChange={setTicketsWithLotsPage}
          />
        </div>
      </div>

      {/* Mobile content (Figma) */}
      <div className="md:hidden max-w-7xl mx-auto px-4 pb-8">
        <div className="mb-5 mt-4">
          <h1 className="font-manrope font-bold text-xl leading-[1.1] text-gray-12 mb-1">
            Dashboard
          </h1>
          <p className="font-family-dm-sans font-normal text-base leading-[1.3] text-gray-11">
            Acompanhe o desempenho do seu evento em tempo real
          </p>
        </div>

        {/* Period + ticket filter */}
        <div className="flex flex-col gap-3 mb-5">
          <div className="bg-gray-3 flex items-center p-1 rounded-xl h-12 overflow-x-auto [&::-webkit-scrollbar]:hidden">
            {periodOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setPeriodFilter(option.value)}
                className={`shrink-0 px-4 py-2 rounded-xl text-sm font-family-dm-sans font-medium border transition-all cursor-pointer h-10 flex items-center ${periodFilter === option.value ? "bg-gray-1 border-gray-6 text-gray-12" : "text-gray-11 hover:text-gray-12 border-transparent"}`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setIsTicketModalOpen(true)}
            className="flex items-center gap-2 px-4 py-3 rounded-xl border border-gray-6 bg-gray-1 text-gray-12 hover:bg-gray-3 transition-colors cursor-pointer w-full h-12"
          >
            <span className="text-sm font-family-dm-sans font-normal flex-1 text-left truncate">{getTicketButtonLabel()}</span>
            <ArrowButton />
          </button>
        </div>

        {/* 2x2 metric cards */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-gray-1 border border-gray-6 rounded-xl flex flex-col min-h-[143px]">
            <div className="flex items-center justify-between px-3 pt-3 pb-2">
              <p className="font-family-dm-sans font-normal text-base text-gray-11">Receita Líquida</p>
              <div className="w-7 h-7 p-1 rounded-lg bg-blue-4 flex items-center justify-center shrink-0">
                <CartIcon className="size-5 text-blue-12" />
              </div>
            </div>
            <div className="px-3 flex-1 flex items-center">
              <p className="font-manrope font-bold text-xl leading-[1.1] text-gray-12">
                R$ {(dashboardData.netRevenue / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <DashboardWeekTrend
              change={dashboardData.netRevenueChange}
              period={periodFilter}
              variant="mobile"
              wrapperClassName="px-3 pb-3 pt-1 flex items-center gap-2"
            />
          </div>
          <div className="bg-gray-1 border border-gray-6 rounded-xl flex flex-col min-h-[143px]">
            <div className="flex items-center justify-between px-3 pt-3 pb-2">
              <p className="font-family-dm-sans font-normal text-base text-gray-11">Ticket Médio</p>
              <div className="w-7 h-7 p-1 rounded-lg bg-primary-4 flex items-center justify-center shrink-0">
                <CheckIcon className="size-5 text-gray-12" />
              </div>
            </div>
            <div className="px-3 flex-1 flex items-center">
              <p className="font-manrope font-bold text-xl leading-[1.1] text-gray-12">
                R$ {(dashboardData.averageTicket / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <DashboardWeekTrend
              change={dashboardData.averageTicketChange}
              period={periodFilter}
              variant="mobile"
              wrapperClassName="px-3 pb-3 pt-1 flex items-center gap-2"
            />
          </div>
          <div className="bg-gray-1 border border-gray-6 rounded-xl flex flex-col min-h-[143px]">
            <div className="flex items-center justify-between px-3 pt-3 pb-2">
              <p className="font-family-dm-sans font-normal text-base text-gray-11">Inscrições Confirmadas</p>
              <div className="w-7 h-7 p-1 rounded-lg bg-[#EBE4FF] flex items-center justify-center shrink-0">
                <DolarIcon className="size-5 text-gray-12" />
              </div>
            </div>
            <div className="px-3 flex-1 flex items-center">
              <p className="font-manrope font-bold text-xl leading-[1.1] text-gray-12">
                {dashboardData.totalRegistrations.toLocaleString("pt-BR")}
              </p>
            </div>
            <DashboardWeekTrend
              change={dashboardData.totalRegistrationsChange}
              period={periodFilter}
              variant="mobile"
              wrapperClassName="px-3 pb-3 pt-1 flex items-center gap-2"
            />
          </div>
          <div className="bg-gray-1 border border-gray-6 rounded-xl flex flex-col min-h-[171px]">
            <div className="flex items-center justify-between px-3 pt-3 pb-2">
              <p className="font-family-dm-sans font-normal text-base text-gray-11 leading-tight">Cancelamentos</p>
              <div className="w-7 h-7 p-1 rounded-lg bg-red-4 flex items-center justify-center shrink-0">
                <XCircle className="size-5 text-red-12" />
              </div>
            </div>
            <div className="flex-1 flex">
              <div className="flex-1 flex flex-col justify-center py-3 px-3 border-r border-gray-6">
                <p className="font-manrope font-bold text-xl leading-[1.1] text-gray-12">{dashboardData.cancellations}</p>
                <p className="font-family-dm-sans font-normal text-sm text-gray-11 mt-1 ">Cancelados</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tendência de inscrições - chart */}
        <div className="bg-gray-1 border border-gray-6 rounded-xl p-4 mb-6">
          <p className="font-family-dm-sans font-normal text-base text-gray-11 mb-2">Tendência de inscrições</p>
          <div className="flex items-center gap-2 mb-4">
            <p className="font-manrope font-bold text-xl leading-[1.1] text-gray-12">
              R$ {(dashboardData.registrationsTrend.amount / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <DashboardWeekTrend
              change={dashboardData.registrationsTrend.change}
              period={periodFilter}
              variant="mobile"
            />
          </div>
          <div className="min-h-0 w-full">
            <RevenueChart
              data={{
                labels: dashboardData.registrationsTrend.chartData?.labels ?? [],
                revenue: dashboardData.registrationsTrend.chartData?.revenue?.map((val: number) => val / 100) ?? [],
                dailyData: dashboardData.registrationsTrend.chartData?.dailyData,
              }}
            />
          </div>
        </div>

        {/* Ranking de ingressos - mobile list */}
        <div className="bg-gray-1 border border-gray-6 rounded-xl mb-6">
          <div className="px-4 py-3 border-b border-gray-6 flex items-center justify-between">
            <p className="font-family-dm-sans font-normal text-base text-gray-11">Ranking de ingressos</p>
          </div>
          <div className="divide-y divide-gray-6">
            {paginatedTicketRanking.map((ticket, index) => (
              <div key={ticketRankingSliceStart + index} className="px-4 py-3 flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <DashboardRankingCategoryLabel category={ticket.category} />
                  <DashboardRankingTicketNameLabel name={ticket.name} size="sm" />
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <p className="font-inter font-semibold text-sm text-gray-12">{ticket.quantity.toLocaleString("pt-BR")}</p>
                  <p className="font-inter font-semibold text-sm text-gray-12">
                    R$ {(ticket.total / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <LotsNearDepletionPaginationBar
            page={ticketRankingPage}
            totalPages={ticketRankingTotalPages}
            onPageChange={setTicketRankingPage}
            compact
          />
        </div>

        {/* Vendas por forma de pagamento — mobile */}
        <div className="mb-6">
          <SalesByPaymentMethod data={dashboardData.salesByPaymentMethod} />
        </div>

        {/* Perguntas - mobile */}
        <div className="mb-6">
          <QuestionsListing
            items={questionsListing}
            onItemClick={(item) => setSelectedQuestionId(item.id)}
          />
        </div>

        {/* Ingressos próximos de esgotamento - mobile */}
        <div className="bg-gray-1 border border-gray-6 rounded-xl mb-6">
          <div className="px-4 py-3 border-b border-gray-6">
            <p className="font-family-dm-sans font-normal text-base text-gray-11">Ingressos próximos de esgotamento</p>
          </div>
          <div className="divide-y divide-gray-6">
            {paginatedLotsNearDepletion.map((lot, index) => {
              const globalIndex = lotsNearDepletionSliceStart + index;
              const percentage = (lot.sold / lot.total) * 100;
              const getStatusColor = (status: string) => {
                if (status === "Crítico") return "bg-red-11";
                if (status === "Atenção") return "bg-yellow-11";
                return "bg-gray-11";
              };
              return (
                <div key={`${globalIndex}-${lot.name}`} className="px-4 py-3">
                  <div className="flex items-center justify-between mb-2 gap-2 min-w-0">
                    <div className="flex-1 min-w-0">
                      <DashboardRankingTicketNameLabel name={lot.name} size="sm" />
                    </div>
                    <span className={`px-2 py-0.5 rounded text-xs font-family-dm-sans text-gray-1 shrink-0 ${getStatusColor(lot.status)}`}>{lot.status}</span>
                  </div>
                  <div className="h-2 bg-gray-6 rounded-full overflow-hidden mb-2">
                    <div className={`h-full rounded-full ${getStatusColor(lot.status)}`} style={{ width: `${percentage}%` }} />
                  </div>
                  <div className="flex justify-between text-sm text-gray-11">
                    <span>Status: <span className="font-semibold text-gray-12">{lot.status}</span></span>
                    <span>Lote atual: <span className="font-semibold text-gray-12">{lot.activeBatch?.label ?? "—"}</span></span>
                  </div>
                </div>
              );
            })}
          </div>
          <LotsNearDepletionPaginationBar
            page={lotsNearDepletionPage}
            totalPages={lotsNearDepletionTotalPages}
            onPageChange={setLotsNearDepletionPage}
            compact
          />
        </div>

        {/* Heatmap - mobile */}
        <div className="bg-gray-1 border border-gray-6 rounded-xl mb-6 overflow-hidden">
          <SalesHeatmap data={dashboardData.salesHeatmap} />
        </div>

        {/* Cidades - mobile */}
        <div className="grid grid-cols-1 gap-3">
          {dashboardData.topCities.map((city, index) => {
            const isFirst = index === 0;
            return (
              <div
                key={index}
                className={`${isFirst ? "bg-primary-2 border-primary-6" : "bg-blue-2 border-blue-6"} border rounded-xl p-3`}
              >
                <div className={`inline-block px-2 py-1 rounded text-sm font-family-dm-sans font-medium mb-2 ${isFirst ? "bg-primary-5 text-primary-12" : "bg-blue-5 text-blue-12"}`}>
                  {isFirst ? "1º Cidade com mais vendas" : "2º Cidade com mais vendas"}
                </div>
                <p className="font-family-dm-sans font-semibold text-base text-gray-12 mb-1">{city.city}</p>
                <p className="font-family-dm-sans font-normal text-sm text-gray-11">
                  QT de compradores: <span className="font-semibold text-gray-12">{city.participants}</span>
                </p>
              </div>
            );
          })}
        </div>

        {/* Mapa de calor geográfico — logo antes do último gráfico (mobile). */}
        <div className="mt-6">
          <PurchaseHeatmap data={dashboardData.purchaseLocations} pending={dashboardData.purchaseLocationsPending} />
        </div>

        {/* Ingressos de lotes - mobile (componente compartilhado com financeiro). */}
        <div className="mt-6">
          <TicketsWithLotsList
            tickets={ticketsWithLotsList}
            expandedRows={ticketsWithLotsExpanded}
            onToggleRow={toggleTicketsWithLotsRow}
            page={ticketsWithLotsPage}
            totalPages={ticketsWithLotsTotalPages}
            onPageChange={setTicketsWithLotsPage}
          />
        </div>
      </div>

      {/* Modal de seleção de ingressos */}
      <SelectTicketsFilterModal
        isOpen={isTicketModalOpen}
        onClose={() => setIsTicketModalOpen(false)}
        onConfirm={(ids) => setSelectedTicketIds(ids)}
        eventId={eventId}
        selectedTicketIds={selectedTicketIds}
      />
    </div>
  );
}
