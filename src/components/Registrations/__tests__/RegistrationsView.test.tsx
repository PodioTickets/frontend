import { describe, it, expect, vi } from "vitest";
import type { ReactElement } from "react";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { RegistrationsView, type RegistrationsViewProps } from "../RegistrationsView";
import {
  getRegistrationStatusBadge,
  type RegistrationListRow,
} from "@/lib/registrations";
import type { RegistrationStats } from "@/services/organizer/OrganizerService";

// O SelectTicketsFilterModal (renderizado mesmo fechado) usa React Query via
// useTickets → precisa de um QueryClientProvider (na app real existe no root).
function renderWithQuery(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

const stats: RegistrationStats = {
  total: 0, paid: 0, cancelled: 0, totalCollected: 0, refunded: 0, refundedChange: 0,
};

function makeProps(over: Partial<RegistrationsViewProps> = {}): RegistrationsViewProps {
  return {
    header: <div data-testid="hdr">HEADER</div>,
    event: { id: "e1", name: "Show" },
    eventId: "e1",
    registrations: [],
    stats,
    pagination: { page: 1, limit: 20, total: 0, totalPages: 1 },
    setPagination: vi.fn(),
    searchTerm: "",
    setSearchTerm: vi.fn(),
    statusFilter: "all",
    setStatusFilter: vi.fn(),
    selectedTicketIds: [],
    setSelectedTicketIds: vi.fn(),
    isTicketModalOpen: false,
    setIsTicketModalOpen: vi.fn(),
    dateRange: undefined,
    setDateRange: vi.fn(),
    appliedDateRange: undefined,
    setAppliedDateRange: vi.fn(),
    mobileFiltersOpen: false,
    setMobileFiltersOpen: vi.fn(),
    loadingList: false,
    hasActiveFilters: false,
    handleClearFilters: vi.fn(),
    getStatusBadge: getRegistrationStatusBadge,
    openViewRegistrationModal: vi.fn(),
    openPaymentDetailsModal: vi.fn(),
    openExportDataModal: vi.fn(),
    ...over,
  };
}

describe("RegistrationsView", () => {
  it("renderiza o header injetado (slot)", () => {
    renderWithQuery(<RegistrationsView {...makeProps()} />);
    expect(screen.getByTestId("hdr")).toBeInTheDocument();
  });

  it("estado vazio sem filtros → 'Nenhuma inscrição ainda'", () => {
    renderWithQuery(<RegistrationsView {...makeProps()} />);
    expect(screen.getByText("Nenhuma inscrição ainda")).toBeInTheDocument();
  });

  it("estado vazio com filtros ativos → 'Nenhuma inscrição encontrada'", () => {
    renderWithQuery(<RegistrationsView {...makeProps({ hasActiveFilters: true })} />);
    expect(screen.getByText("Nenhuma inscrição encontrada")).toBeInTheDocument();
  });

  it("com inscrições: renderiza tabela (cabeçalho), o inscrito e o botão de exportar", () => {
    const registrations: RegistrationListRow[] = [
      {
        id: "abc123def456",
        status: "CONFIRMED",
        user: { firstName: "Ana", lastName: "Lima", email: "ana@ex.com" },
        ticket: { name: "Pista", category: { name: "Lote 1" } },
        order: { finalAmount: 5000 },
      } as RegistrationListRow,
    ];
    renderWithQuery(<RegistrationsView {...makeProps({ registrations })} />);
    expect(screen.getByText("Participante")).toBeInTheDocument(); // cabeçalho da tabela
    expect(screen.getAllByText(/Ana/).length).toBeGreaterThanOrEqual(1); // card mobile + linha desktop
    expect(screen.getAllByText("Exportar CSV").length).toBeGreaterThanOrEqual(1);
  });
});
