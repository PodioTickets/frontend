import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/services", () => ({
  userService: { isAuthenticated: () => true },
  organizerService: { getEventById: vi.fn().mockResolvedValue({ name: "Show" }) },
}));
vi.mock("@/components/Organizer/EventNotificationsPanel", () => ({
  EventNotificationsPanel: () => <div data-testid="panel" />,
}));
vi.mock("@/components/Organizer/CreateNotificationDrawer", () => ({
  CreateNotificationDrawer: () => null,
}));

import { EventNotificationsView } from "../EventNotificationsView";

describe("EventNotificationsView", () => {
  it("renderiza o header injetado, o título e o painel", async () => {
    render(
      <EventNotificationsView
        eventId="e1"
        onUnauthenticated={vi.fn()}
        renderHeader={() => <div data-testid="hdr" />}
      />,
    );
    expect(await screen.findByText("Central de Comunicação")).toBeInTheDocument();
    expect(screen.getByText("Nova notificação")).toBeInTheDocument();
    expect(screen.getByTestId("panel")).toBeInTheDocument();
  });
});
