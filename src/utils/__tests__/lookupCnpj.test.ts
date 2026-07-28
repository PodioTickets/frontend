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

  it("retorna dados no sucesso", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        cnpj: "11222333000181",
        razao_social: "EMPRESA LTDA",
        nome_fantasia: "Meu Evento",
      }),
    } as Response);

    const r = await lookupCnpjDigits("11.222.333/0001-81");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.razao_social).toBe("EMPRESA LTDA");
      expect(r.data.nome_fantasia).toBe("Meu Evento");
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
