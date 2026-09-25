import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useState } from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Mapa/geolocalização não participam do fluxo do PDF.
vi.mock("@/components/Organizer/LocationPickerModal", () => ({
  LocationPickerModal: () => null,
}));
vi.mock("@/hooks/useGoogleMaps", () => ({ hasGoogleMapsApiKey: () => false }));
vi.mock("@/hooks/useIpLocation", () => ({ useIpLocation: () => ({ data: null }) }));
vi.mock("@/hooks/useBrowserGeolocation", () => ({
  useBrowserGeolocation: () => ({ request: vi.fn(), loading: false }),
}));
vi.mock("react-hot-toast", () => ({ default: { success: vi.fn(), error: vi.fn() } }));

import { InformationForm, type InformationFormValues } from "../InformationForm";

const UPLOADED_URL = "https://cdn.example.com/regulamento.pdf";

/**
 * Espelha a página de edição: baseline + `hasPendingPdf` alimentam o dirty check,
 * e o save re-fixa o baseline com a URL resolvida (`commitInitialFormData`).
 */
function EditHarness({ onDirty }: { onDirty: (dirty: boolean) => void }) {
  const [values, setValues] = useState<InformationFormValues>({ name: "Evento" } as InformationFormValues);
  const [baseline, setBaseline] = useState(values);
  const [hasPendingPdf, setHasPendingPdf] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  onDirty(hasPendingPdf || values.regulationUrl !== baseline.regulationUrl);

  return (
    <InformationForm
      formId="f"
      values={values}
      onChange={(u) => setValues((p) => ({ ...p, ...u }))}
      errors={errors}
      onErrorsChange={setErrors}
      onHasPendingPdfChange={setHasPendingPdf}
      onSubmit={async (_e, url) => {
        setValues((p) => {
          const next = url ? { ...p, regulationUrl: url } : p;
          setBaseline(next);
          return next;
        });
      }}
    />
  );
}

/**
 * Regressão: depois de salvar com um PDF novo, o `pdfFile` ficava preso no form →
 * `hasPendingPdf` seguia `true` (modal de "alterações não salvas" ao sair) e a tela
 * mostrava "Arquivo selecionado" em vez do link do PDF salvo.
 */
describe("InformationForm — PDF do regulamento após salvar", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({ url: UPLOADED_URL }),
      }),
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  it("não fica pendente e mostra o link do PDF salvo", async () => {
    let dirty = false;
    const { container } = render(<EditHarness onDirty={(d) => (dirty = d)} />);

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["%PDF-1.4"], "regulamento.pdf", { type: "application/pdf" });
    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByText(/Arquivo selecionado: regulamento.pdf/)).toBeInTheDocument();
    expect(dirty).toBe(true);

    fireEvent.submit(container.querySelector("form#f") as HTMLFormElement);

    const link = await screen.findByRole("link", { name: "Ver PDF" });
    expect(link).toHaveAttribute("href", UPLOADED_URL);
    expect(screen.queryByText(/Arquivo selecionado/)).not.toBeInTheDocument();
    await waitFor(() => expect(dirty).toBe(false));
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
