import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/services", () => ({
  userService: { isAuthenticated: () => true },
  organizerService: {
    getEventById: vi.fn().mockResolvedValue({ name: "Show" }),
    getCoupons: vi.fn().mockResolvedValue({ coupons: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 1 } }),
  },
}));
vi.mock("@/hooks/useClipboard", () => ({ useClipboard: () => ({ copyToClipboard: vi.fn() }) }));
vi.mock("@/stores/modalStore", () => ({
  useCreateCouponModal: () => ({ openCreateCouponModal: vi.fn(), setOnModalSave: vi.fn() }),
  useDeleteCouponModal: () => ({ openDeleteCouponModal: vi.fn() }),
}));

import { EventCouponsView } from "../EventCouponsView";

describe("EventCouponsView", () => {
  it("renderiza o header injetado, o título e o estado vazio", async () => {
    render(
      <EventCouponsView
        eventId="e1"
        onUnauthenticated={vi.fn()}
        renderHeader={() => <div data-testid="hdr" />}
      />,
    );
    expect(await screen.findByText("Cupons de desconto")).toBeInTheDocument();
    expect(screen.getByText("Nenhum cupom criado ainda")).toBeInTheDocument();
    expect(screen.getAllByTestId("hdr").length).toBeGreaterThanOrEqual(1);
  });
});
