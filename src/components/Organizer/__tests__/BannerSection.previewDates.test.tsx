import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// `ImageUploadWithCrop` arrasta canvas/upload — irrelevante pro card da prévia.
vi.mock("@/components/ImageUploadWithCrop", () => ({
  ImageUploadWithCrop: () => <div data-testid="upload" />,
}));

import { BannerSection } from "../BannerSection";
import { composeRegistrationDateTime } from "@/lib/createEventDraftSync";

const organizer = { name: "Org Teste", logoSrc: "" };

/**
 * No fluxo NOVO não existe `previewEvent`, então o card da prévia só enxerga o que
 * `BannerSection` repassa. O card (mobile e desktop) mostra a data do evento como
 * "Domingo, 20 de setembro às 08:00" e NÃO tem mais a linha "Inscrições até".
 */
describe("BannerSection — datas na prévia do card (fluxo novo)", () => {
  it("mostra data + horário do evento, sem 'Acontece' e sem 'Inscrições até'", () => {
    render(
      <BannerSection
        eventName="Maratona"
        eventDate="2026-09-20T08:00:00.000Z"
        registrationStartDate={composeRegistrationDateTime("2026-08-01", "10:00")}
        registrationEndDate={composeRegistrationDateTime("2026-09-10", "23:59")}
        city="São Paulo"
        state="SP"
        organizer={organizer}
        onBannerUploaded={vi.fn()}
      />,
    );

    // Horário em UTC (wall-clock do evento), sem shift de fuso.
    expect(screen.getByText("Domingo, 20 de setembro às 08:00")).toBeInTheDocument();
    expect(screen.queryByText(/Acontece n/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Inscrições até/i)).not.toBeInTheDocument();
  });
});

describe("composeRegistrationDateTime", () => {
  it("junta data + hora como instante UTC explícito (Z)", () => {
    expect(composeRegistrationDateTime("2026-08-01", "10:00")).toBe(
      "2026-08-01T10:00:00.000Z",
    );
  });

  it("hora ausente vira 00:00 (e o Z se mantém)", () => {
    expect(composeRegistrationDateTime("2026-08-01")).toBe(
      "2026-08-01T00:00:00.000Z",
    );
    expect(composeRegistrationDateTime("2026-08-01", "  ")).toBe(
      "2026-08-01T00:00:00.000Z",
    );
  });

  it("sem data → undefined (campo some do payload em vez de virar data inválida)", () => {
    expect(composeRegistrationDateTime(undefined, "10:00")).toBeUndefined();
    expect(composeRegistrationDateTime("   ", "10:00")).toBeUndefined();
  });
});
