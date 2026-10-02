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
function EditHarness({
  onDirty,
  initial = { name: "Evento" } as InformationFormValues,
  onValues,
}: {
  onDirty: (dirty: boolean) => void;
  initial?: InformationFormValues;
  onValues?: (v: InformationFormValues) => void;
}) {
  const [values, setValues] = useState<InformationFormValues>(initial);
  const [baseline, setBaseline] = useState(values);
  const [hasPendingPdf, setHasPendingPdf] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  onDirty(hasPendingPdf || values.regulationUrl !== baseline.regulationUrl);
  onValues?.(values);

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

    // Card do arquivo (Figma 6993:135496): nome + tamanho, ainda sem link (não subiu).
    expect(screen.getByText("regulamento.pdf")).toBeInTheDocument();
    expect(screen.getByText("1 KB")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(dirty).toBe(true);

    fireEvent.submit(container.querySelector("form#f") as HTMLFormElement);

    const link = await screen.findByRole("link", { name: "regulamento.pdf" });
    expect(link).toHaveAttribute("href", UPLOADED_URL);
    expect(screen.queryByText("1 KB")).not.toBeInTheDocument(); // agora é o PDF salvo
    await waitFor(() => expect(dirty).toBe(false));
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("lixeira no PDF JÁ SALVO marca a remoção e volta a área de upload", () => {
    let last: InformationFormValues | null = null;
    render(
      <EditHarness
        onDirty={() => {}}
        initial={{ name: "Evento", regulationUrl: UPLOADED_URL } as InformationFormValues}
        onValues={(v) => (last = v)}
      />,
    );
    expect(screen.getByRole("link", { name: "regulamento.pdf" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Remover PDF" }));

    expect(last!.regulationUrl).toBe("");
    expect(last!.regulationRemoved).toBe(true);
    expect(screen.queryByRole("link", { name: "regulamento.pdf" })).not.toBeInTheDocument();
    expect(screen.getByText(/Arraste um arquivo PDF/)).toBeInTheDocument();
  });

  it("lixeira no arquivo recém-escolhido só descarta (PDF salvo continua)", () => {
    let last: InformationFormValues | null = null;
    const { container } = render(
      <EditHarness
        onDirty={() => {}}
        initial={{ name: "Evento", regulationUrl: UPLOADED_URL } as InformationFormValues}
        onValues={(v) => (last = v)}
      />,
    );
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(["%PDF"], "novo.pdf", { type: "application/pdf" })] } });
    expect(screen.getByText("novo.pdf")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Remover PDF" }));

    expect(screen.getByRole("link", { name: "regulamento.pdf" })).toBeInTheDocument();
    expect(last!.regulationUrl).toBe(UPLOADED_URL);
    expect(last!.regulationRemoved).toBeFalsy();
  });
});
