import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { DashboardView } from "../DashboardView";
import type { useEventDashboard } from "@/hooks/useEventDashboard";

// Filhos pesados (charts/heatmap/drawers/modal) usam canvas / react-query —
// stubados para um smoke test da estrutura do View no jsdom.
vi.mock("@/components/Organizer/RevenueChart", () => ({ RevenueChart: () => <div data-testid="revenue-chart" /> }));
vi.mock("@/components/Organizer/SalesHeatmap", () => ({ SalesHeatmap: () => <div data-testid="heatmap" /> }));
vi.mock("@/components/Organizer/SalesByPaymentMethod", () => ({ SalesByPaymentMethod: () => <div data-testid="sales-by-pm" /> }));
vi.mock("@/components/Organizer/QuestionsListing", () => ({ QuestionsListing: () => <div data-testid="questions" /> }));
vi.mock("@/components/Organizer/QuestionDetailsDrawer", () => ({ QuestionDetailsDrawer: () => null }));
vi.mock("@/components/Organizer/ProductDetailsDrawer", () => ({ ProductDetailsDrawer: () => null }));
vi.mock("@/components/Financial/TicketsWithLotsList", () => ({ TicketsWithLotsList: () => <div data-testid="tickets-with-lots" /> }));
vi.mock("@/components/Registrations/SelectTicketsFilterModal", () => ({ SelectTicketsFilterModal: () => null }));

type Controller = ReturnType<typeof useEventDashboard>;

function makeController(over: Partial<Controller> = {}): Controller {
  const dashboardData = {
    netRevenue: 0, netRevenueChange: 0, averageTicket: 0, averageTicketChange: 0,
    totalRegistrations: 0, totalRegistrationsChange: 0, cancellations: 0, cancellationsStatus: "Normal",
    refunds: 0, refundsStatus: "Normal",
    registrationsTrend: { amount: 0, change: 0, confirmed: 0, canceled: 0, refunded: 0, chartData: { labels: [], revenue: [] } },
    ticketRanking: [], topCities: [], lotsNearDepletion: [], salesHeatmap: [], dailyData: [],
    topProductVariations: [], mostAnsweredQuestions: [],
    salesByPaymentMethod: { items: [], totals: { salesCount: 0, totalAmount: 0 } },
  };
  return {
    loading: false,
    eventId: "e1",
    event: { id: "e1", name: "Show" },
    dashboardData,
    tickets: [],
    periodFilter: "geral",
    setPeriodFilter: vi.fn(),
    selectedTicketIds: [],
    setSelectedTicketIds: vi.fn(),
    isTicketModalOpen: false,
    setIsTicketModalOpen: vi.fn(),
    paginatedTicketRanking: [],
    ticketRankingSliceStart: 0,
    ticketRankingPage: 1,
    setTicketRankingPage: vi.fn(),
    ticketRankingTotalPages: 1,
    paginatedLotsNearDepletion: [],
    lotsNearDepletionSliceStart: 0,
    lotsNearDepletionPage: 1,
    setLotsNearDepletionPage: vi.fn(),
    lotsNearDepletionTotalPages: 1,
    questionsListing: [],
    selectedQuestionId: null,
    setSelectedQuestionId: vi.fn(),
    selectedQuestion: null,
    selectedQuestionIndex: 0,
    totalQuestions: 0,
    selectedQuestionAnswerRows: undefined,
    textAnswerRows: undefined,
    textAnswersLoading: false,
    selectedQuestionFromApi: null,
    apiQuestions: [],
    sortedQuestions: [],
    selectedProductName: null,
    setSelectedProductName: vi.fn(),
    selectedProductFromApi: null,
    selectedProductIndex: 0,
    totalProducts: 0,
    selectedProductQuantitySold: 0,
    selectedProductTotalStock: undefined,
    selectedProductTotalRevenueLabel: "—",
    selectedProductVariations: [],
    uniqueProductNames: [],
    ticketsWithLotsList: [],
    ticketsWithLotsExpanded: new Set<string>(),
    toggleTicketsWithLotsRow: vi.fn(),
    ticketsWithLotsPage: 1,
    setTicketsWithLotsPage: vi.fn(),
    ticketsWithLotsTotalPages: 1,
    ...over,
  } as unknown as Controller;
}

describe("DashboardView", () => {
  it("loading → mostra só o Loading (sem header)", () => {
    render(
      <DashboardView
        controller={makeController({ loading: true })}
        header={<div data-testid="hdr" />}
      />,
    );
    expect(screen.queryByTestId("hdr")).not.toBeInTheDocument();
  });

  it("renderiza o header injetado e o título do dashboard", () => {
    render(
      <DashboardView
        controller={makeController()}
        header={<div data-testid="hdr">HEADER</div>}
      />,
    );
    expect(screen.getByTestId("hdr")).toBeInTheDocument();
    expect(screen.getAllByText("Dashboard").length).toBeGreaterThanOrEqual(1);
  });

  it("renderiza os filtros de período e o card de Receita Líquida", () => {
    render(
      <DashboardView controller={makeController()} header={null} />,
    );
    expect(screen.getAllByText("Geral").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Receita Líquida").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Todos os ingressos").length).toBeGreaterThanOrEqual(1);
  });
});
