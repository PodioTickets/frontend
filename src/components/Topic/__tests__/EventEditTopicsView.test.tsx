import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Deps com side-effects / contexto — stubadas para um smoke test de design.
vi.mock("@/hooks/useWizardAuth", () => ({ useWizardAuth: () => ({ authChecked: true }) }));
vi.mock("@/hooks/useUnsavedLeaveGuard", () => ({
  useUnsavedLeaveGuard: () => ({
    leavePromptOpen: false,
    handleBack: vi.fn(),
    confirmLeaveWithoutSaving: vi.fn(),
    beginNavigationAfterSave: vi.fn(),
    dismissLeavePrompt: vi.fn(),
  }),
}));
vi.mock("@/stores/modalStore", () => ({
  useTopicModal: () => ({ openTopicModal: vi.fn(), setOnModalSave: vi.fn(), setOnModalDelete: vi.fn() }),
}));
vi.mock("@/services", () => ({
  organizerService: { getEventById: vi.fn().mockResolvedValue({ topics: [] }) },
}));
vi.mock("@/components/Topic/SortableTopicsList", () => ({
  SortableTopicsList: () => <div data-testid="sortable-topics" />,
}));

import { EventEditTopicsView } from "../EventEditTopicsView";

describe("EventEditTopicsView", () => {
  it("renderiza a etapa de Tópicos (título + ações)", async () => {
    render(
      <EventEditTopicsView
        eventId="e1"
        navigate={vi.fn()}
        eventBasePath="/admin/events/e1"
      />,
    );
    // Carrega de forma assíncrona (getEventById) e então renderiza o layout.
    // O título aparece 2x (h1 mobile + desktop) → findAllByText.
    expect((await screen.findAllByText("Tópicos")).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Adicionar tópico")).toBeInTheDocument();
    expect(screen.getByText("Prévia")).toBeInTheDocument();
  });
});
