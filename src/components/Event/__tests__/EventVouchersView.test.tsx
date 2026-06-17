import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/services", () => ({
  userService: { isAuthenticated: () => true },
  organizerService: {
    getEventById: vi.fn().mockResolvedValue({ name: "Show" }),
    getVouchers: vi.fn().mockResolvedValue({ groups: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 1 } }),
  },
}));
vi.mock("@/stores/modalStore", () => ({
  useCreateVoucherModal: () => ({ openCreateVoucherModal: vi.fn(), setOnModalSave: vi.fn() }),
  useDeleteVoucherModal: () => ({ openDeleteVoucherModal: vi.fn() }),
  useViewVoucherModal: () => ({ openViewVoucherModal: vi.fn() }),
}));

import { EventVouchersView } from "../EventVouchersView";

describe("EventVouchersView", () => {
  it("renderiza o header injetado, o título e o estado vazio", async () => {
    render(
      <EventVouchersView
        eventId="e1"
        onUnauthenticated={vi.fn()}
        renderHeader={() => <div data-testid="hdr" />}
      />,
    );
    expect((await screen.findAllByText("Vouchers")).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Nenhum voucher criado ainda")).toBeInTheDocument();
    expect(screen.getAllByTestId("hdr").length).toBeGreaterThanOrEqual(1);
  });
});
