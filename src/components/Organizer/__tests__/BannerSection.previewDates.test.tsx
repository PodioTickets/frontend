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
 * Regressão: no fluxo NOVO não existe `previewEvent`, então o card da prévia só
 * enxerga o que `BannerSection` repassa. Antes, `registrationEndDate` não era
 * repassado → o card caía no `undefined` e ESCONDIA a linha "Inscrições até",
 * deixando só a linha da data do evento.
 */
describe("BannerSection — datas na prévia do card (fluxo novo)", () => {
  it("mostra a data do evento E a linha 'Inscrições até' sem previewEvent", () => {
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

    // Linha 2 do bloco de metadados — a que sumia.
    expect(screen.getByText(/Inscrições até/i)).toBeInTheDocument();
    // Data de ENCERRAMENTO das inscrições: 10/set (exibida em UTC).
    expect(screen.getByText(/10 de set/i)).toBeInTheDocument();
  });

  it("sem as datas de inscrição, a linha 'Inscrições até' não aparece (comportamento do card)", () => {
    render(
      <BannerSection
        eventName="Maratona"
        eventDate="2026-09-20T08:00:00.000Z"
        city="São Paulo"
        state="SP"
        organizer={organizer}
        onBannerUploaded={vi.fn()}
      />,
    );

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
