import { describe, it, expect } from "vitest";
import {
  translateBackendMessage,
  getFriendlyBackendError,
} from "@/lib/backendErrorMessage";

describe("translateBackendMessage", () => {
  it("traduz a mensagem de nome/data de evento duplicado", () => {
    expect(
      translateBackendMessage(
        "An event with the same name and date already exists for this organization",
      ),
    ).toBe(
      "Já existe um evento com o mesmo nome e data nesta organização. Altere o nome ou a data.",
    );
  });

  it("é case-insensitive e ignora espaços nas bordas", () => {
    expect(
      translateBackendMessage(
        "  AN EVENT WITH THE SAME NAME AND DATE ALREADY EXISTS FOR THIS ORGANIZATION  ",
      ),
    ).toContain("Já existe um evento");
  });

  it("traduz mensagens de publicação/análise", () => {
    expect(
      translateBackendMessage(
        "Event must have at least one active ticket before submitting for review",
      ),
    ).toBe(
      "O evento precisa ter ao menos um ingresso ativo antes de ser enviado para análise.",
    );
    expect(
      translateBackendMessage(
        "Event must have complete location information before submitting for review",
      ),
    ).toBe(
      "O evento precisa ter as informações de local completas antes de ser enviado para análise.",
    );
  });

  it("trata o padrão `Missing permission: <key>`", () => {
    expect(translateBackendMessage("Missing permission: create_event")).toBe(
      "Você não tem permissão para realizar esta ação.",
    );
  });

  it("passa mensagens em PT (já amigáveis) direto", () => {
    const pt = "Usuário não é membro de nenhuma organização";
    expect(translateBackendMessage(pt)).toBe(pt);
  });

  it("mantém mensagens desconhecidas intactas (sem inventar texto)", () => {
    const unknown = "Some unmapped backend detail";
    expect(translateBackendMessage(unknown)).toBe(unknown);
  });
});

describe("getFriendlyBackendError", () => {
  it("extrai e traduz de response.data.message (string)", () => {
    const err = {
      response: {
        data: {
          message:
            "An event with the same name and date already exists for this organization",
        },
      },
    };
    expect(getFriendlyBackendError(err)).toContain("Já existe um evento");
  });

  it("junta e traduz array de mensagens (class-validator)", () => {
    const err = {
      response: { data: { message: ["Slug is required", "Topic not found"] } },
    };
    expect(getFriendlyBackendError(err)).toBe(
      "O identificador (slug) do evento é obrigatório., Tópico não encontrado.",
    );
  });

  it("usa response.data.errors[].message quando não há message", () => {
    const err = {
      response: { data: { errors: [{ message: "Location not found" }] } },
    };
    expect(getFriendlyBackendError(err)).toBe("Local não encontrado.");
  });

  it("cai para error.message quando não há payload de response", () => {
    expect(getFriendlyBackendError({ message: "Network Error" })).toBe(
      "Network Error",
    );
  });

  it("usa o fallback quando o erro não tem mensagem alguma", () => {
    expect(getFriendlyBackendError({}, "Erro ao salvar evento")).toBe(
      "Erro ao salvar evento",
    );
    expect(getFriendlyBackendError(null, "Erro ao salvar evento")).toBe(
      "Erro ao salvar evento",
    );
  });
});
