import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ isAuthenticated: true, isLoading: false }) }));
vi.mock("@/services", () => ({
  userService: { isAuthenticated: () => true },
  organizerService: {
    getEventById: vi.fn().mockResolvedValue({ name: "Show" }),
    getEventFinancial: vi.fn().mockResolvedValue({
      summary: {
        availableBalance: 0, installmentsToReceive: 0, pendingRelease: 0, totalWithdrawn: 0,
        totalRefunded: 0, totalChargebacks: 0, grossRevenue: 0, paymentMethodStats: undefined,
      },
      revenueChart: { labels: [], revenue: [] },
      tickets: { data: { tickets: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 1 } } },
    }),
  },
}));
vi.mock("@/stores/modalStore", () => ({ useRequestTransferModal: () => ({ openRequestTransferModal: vi.fn() }) }));
// Drawers stubados (têm deps próprias) — não interessam ao smoke da estrutura.
vi.mock("@/components/Financial/TransferHistoryDrawer", () => ({ TransferHistoryDrawer: () => null }));
vi.mock("@/components/Financial/InstallmentsDrawer", () => ({ InstallmentsDrawer: () => null }));
vi.mock("@/components/Financial/AwaitingReleaseDrawer", () => ({ AwaitingReleaseDrawer: () => null }));
vi.mock("@/components/Financial/RefundedDrawer", () => ({ RefundedDrawer: () => null }));
vi.mock("@/components/Financial/ChargebackDrawer", () => ({ ChargebackDrawer: () => null }));
vi.mock("@/components/Financial/FiscalExportDrawer", () => ({ FiscalExportDrawer: () => null }));

import { EventFinancialView } from "../EventFinancialView";

describe("EventFinancialView", () => {
  it("renderiza o header + título + as features (exportar fiscal / solicitar repasse)", async () => {
    render(
      <EventFinancialView
        eventId="e1"
        onUnauthenticated={vi.fn()}
        renderHeader={() => <div data-testid="hdr" />}
      />,
    );
    expect(await screen.findByText("Financeiro")).toBeInTheDocument();
    // Features que o admin passa a ter (vêm do organizer): aparecem desktop + mobile.
    expect(screen.getAllByText("Exportar dados fiscais").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Solicitar repasse").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByTestId("hdr")).toBeInTheDocument();
  });
});
