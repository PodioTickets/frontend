import { describe, it, expect } from "vitest";
import {
  translateBackendMessage,
  getFriendlyBackendError,
  isDuplicateEventNameError,
  DUPLICATE_EVENT_NAME_MESSAGE,
} from "@/lib/backendErrorMessage";

describe("translateBackendMessage", () => {
  it("traduz a mensagem de nome de evento duplicado (name-only)", () => {
    expect(
      translateBackendMessage(
        "An event with the same name already exists for this organization",
      ),
    ).toBe(DUPLICATE_EVENT_NAME_MESSAGE);
  });

  it("mantém a mensagem antiga (name+date) mapeada durante a transição de deploy", () => {
    expect(
      translateBackendMessage(
        "An event with the same name and date already exists for this organization",
      ),
    ).toBe(DUPLICATE_EVENT_NAME_MESSAGE);
  });

  it("é case-insensitive e ignora espaços nas bordas", () => {
    expect(
      translateBackendMessage(
        "  AN EVENT WITH THE SAME NAME ALREADY EXISTS FOR THIS ORGANIZATION  ",
      ),
    ).toBe(DUPLICATE_EVENT_NAME_MESSAGE);
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
            "An event with the same name already exists for this organization",
        },
      },
    };
    expect(getFriendlyBackendError(err)).toBe(DUPLICATE_EVENT_NAME_MESSAGE);
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

describe("isDuplicateEventNameError", () => {
  it("detecta a partir da mensagem inglesa do backend (name-only e a antiga name+date)", () => {
    for (const message of [
      "An event with the same name already exists for this organization",
      "An event with the same name and date already exists for this organization",
    ]) {
      expect(isDuplicateEventNameError({ response: { data: { message } } })).toBe(true);
    }
  });

  it("detecta quando o backend já manda o texto PT", () => {
    const err = { response: { data: { message: DUPLICATE_EVENT_NAME_MESSAGE } } };
    expect(isDuplicateEventNameError(err)).toBe(true);
  });

  it("é false para outros erros e para erro vazio", () => {
    expect(isDuplicateEventNameError({ message: "Network Error" })).toBe(false);
    expect(isDuplicateEventNameError({})).toBe(false);
    expect(isDuplicateEventNameError(null)).toBe(false);
  });
});
