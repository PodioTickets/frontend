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
import { organizerService } from "@/services";

const baseCoupon = {
  id: "c1",
  code: "PROMO10",
  couponType: "DISCOUNT" as const,
  type: "PERCENTAGE" as const,
  value: 10,
  expiryDate: "",
  eventId: "e1",
  createdAt: "",
  updatedAt: "",
};

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

  it("cupom ACTIVE que atingiu o maxUsage aparece como 'Esgotado' (não 'Ativo')", async () => {
    vi.mocked(organizerService.getCoupons).mockResolvedValueOnce({
      coupons: [{ ...baseCoupon, status: "ACTIVE", usageCount: 5, maxUsage: 5 }],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
    } as never);

    render(
      <EventCouponsView
        eventId="e1"
        onUnauthenticated={vi.fn()}
        renderHeader={() => <div data-testid="hdr" />}
      />,
    );

    // Desktop + mobile renderizam o badge → pelo menos 1 "Esgotado", nenhum "Ativo".
    expect((await screen.findAllByText("Esgotado")).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("Ativo")).not.toBeInTheDocument();
  });

  it("cupom ACTIVE ainda com usos disponíveis continua 'Ativo'", async () => {
    vi.mocked(organizerService.getCoupons).mockResolvedValueOnce({
      coupons: [{ ...baseCoupon, status: "ACTIVE", usageCount: 2, maxUsage: 5 }],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
    } as never);

    render(
      <EventCouponsView
        eventId="e1"
        onUnauthenticated={vi.fn()}
        renderHeader={() => <div data-testid="hdr" />}
      />,
    );

    expect((await screen.findAllByText("Ativo")).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("Esgotado")).not.toBeInTheDocument();
  });
});
