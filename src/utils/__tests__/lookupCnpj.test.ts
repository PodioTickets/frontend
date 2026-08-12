import { describe, it, expect, vi, afterEach } from "vitest";
import { lookupCnpjDigits } from "@/utils/lookupCnpj";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("lookupCnpjDigits", () => {
  it("rejeita CNPJ com tamanho inválido sem chamar a rede", async () => {
    const fetchSpy = vi.spyOn(global, "fetch");
    const r = await lookupCnpjDigits("123");
    expect(r).toEqual({ ok: false, message: "CNPJ inválido" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("retorna dados normalizados no sucesso", async () => {
    // A rota `/api/cnpj` já normaliza o provedor (cnpj.ws/BrasilAPI) para o
    // shape estável `CnpjLookupData`; o cliente apenas repassa.
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        legalName: "EMPRESA LTDA",
        tradeName: "Meu Evento",
        responsibleName: "Fulano de Tal",
        zipCode: "01001000",
        street: "RUA TESTE",
        number: "100",
        neighborhood: "Centro",
        city: "São Paulo",
        state: "SP",
        email: "contato@empresa.com",
        phone: "11987654321",
      }),
    } as Response);

    const r = await lookupCnpjDigits("11.222.333/0001-81");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.legalName).toBe("EMPRESA LTDA");
      expect(r.data.tradeName).toBe("Meu Evento");
      expect(r.data.responsibleName).toBe("Fulano de Tal");
      expect(r.data.city).toBe("São Paulo");
      expect(r.data.phone).toBe("11987654321");
    }
  });

  it("mapeia 404 para mensagem amigável", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: false,
      status: 404,
    } as Response);

    const r = await lookupCnpjDigits("11222333000181");
    expect(r).toEqual({ ok: false, message: "CNPJ não encontrado" });
  });

  it("trata falha de rede", async () => {
    vi.spyOn(global, "fetch").mockRejectedValue(new Error("network"));
    const r = await lookupCnpjDigits("11222333000181");
    expect(r).toEqual({ ok: false, message: "Erro ao consultar CNPJ" });
  });
});
