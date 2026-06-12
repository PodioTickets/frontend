import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/services", () => ({
  userService: { isAuthenticated: () => true },
  organizerService: {
    getEventById: vi.fn().mockResolvedValue({ name: "Show" }),
    getEventTracking: vi.fn().mockResolvedValue({ metaPixelId: "", googleAnalyticsId: "", googleAdsId: "" }),
  },
}));

import { EventAdsView } from "../EventAdsView";

describe("EventAdsView", () => {
  it("renderiza o header injetado e o formulário de rastreamento", async () => {
    render(
      <EventAdsView
        eventId="e1"
        onUnauthenticated={vi.fn()}
        renderHeader={() => <div data-testid="hdr" />}
      />,
    );
    // setTimeout(300) do auth + load assíncrono → findBy aguarda.
    expect(await screen.findByText("Rastreamento e Conversões")).toBeInTheDocument();
    expect(screen.getByText("Meta - Facebook/Instagram")).toBeInTheDocument();
    expect(screen.getByText("Google Analytics 4 (GA4)")).toBeInTheDocument();
    expect(screen.getByText("Google Ads")).toBeInTheDocument();
    expect(screen.getByText("Salvar")).toBeInTheDocument();
    expect(screen.getAllByTestId("hdr").length).toBeGreaterThanOrEqual(1);
  });
});
