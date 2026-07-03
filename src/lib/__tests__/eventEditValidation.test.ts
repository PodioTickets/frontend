import { describe, it, expect } from "vitest";
import type { EditEventFormData } from "@/contexts/EditEventContext";
import {
  validateEventInformation,
  isEventInformationValid,
  eventInformationHasChanges,
  mapEventBackendErrors,
  INFORMATION_FIELDS,
} from "../eventEditValidation";

/** Monta um erro estilo axios (`error.response.data`). */
function axiosError(status: number, data: Record<string, unknown>) {
  return { response: { status, data } };
}

/** Form base 100% válido — cada teste invalida só um campo. */
function validForm(): EditEventFormData {
  return {
    eventId: "evt_1",
    name: "Corrida da Cidade",
    eventDate: "2026-08-10",
    registrationStartDate: "2026-06-01",
    registrationStartTime: "08:00",
    registrationEndDate: "2026-07-01",
    registrationEndTime: "18:00",
    maxParticipants: "500",
    cep: "01001-000",
    street: "Praça da Sé",
    neighborhood: "Sé",
    city: "São Paulo",
    state: "SP",
    googleMapsLink: "https://maps.google.com/?q=se",
    bannerUrl: "",
    regulationUrl: "",
    description: "",
    contactEmail: "contato@evento.com",
    instagram: "",
    facebook: "",
    youtube: "",
    tiktok: "",
    website: "",
  };
}

describe("validateEventInformation", () => {
  it("não retorna erros para um formulário válido", () => {
    expect(validateEventInformation(validForm())).toEqual({});
  });

  it("exige nome, data e datas de inscrição", () => {
    const errors = validateEventInformation({
      ...validForm(),
      name: "  ",
      eventDate: "",
      registrationStartDate: "",
      registrationEndDate: "",
    });
    expect(errors.name).toBeDefined();
    expect(errors.eventDate).toBeDefined();
    expect(errors.registrationStartDate).toBeDefined();
    expect(errors.registrationEndDate).toBeDefined();
  });

  it("bloqueia encerramento antes do início das inscrições", () => {
    const errors = validateEventInformation({
      ...validForm(),
      registrationStartDate: "2026-07-01",
      registrationEndDate: "2026-06-01",
    });
    expect(errors.registrationPeriod).toBeDefined();
  });

  it("data do evento ANTES do encerramento das inscrições → erro em eventDate", () => {
    const errors = validateEventInformation({
      ...validForm(),
      eventDate: "2026-06-20",
      registrationStartDate: "2026-06-01",
      registrationEndDate: "2026-07-01", // encerra DEPOIS do evento → inválido
    });
    expect(errors.eventDate).toBe(
      "A data do evento não pode ser anterior ao encerramento das inscrições.",
    );
  });

  it("encerramento das inscrições NO mesmo dia do evento → sem erro de data", () => {
    const errors = validateEventInformation({
      ...validForm(),
      eventDate: "2026-08-10",
      registrationStartDate: "2026-06-01",
      registrationEndDate: "2026-08-10", // mesmo dia é permitido
      registrationEndTime: "10:00",
    });
    expect(errors.eventDate).toBeUndefined();
    expect(errors.registrationPeriod).toBeUndefined();
  });

  it("início das inscrições NA data do evento → erro (deve ser ANTES)", () => {
    const errors = validateEventInformation({
      ...validForm(),
      eventDate: "2026-08-10",
      registrationStartDate: "2026-08-10",
    });
    expect(errors.registrationStartDate).toBe(
      "A data de início das inscrições deve ser antes da data do evento.",
    );
  });

  it("início das inscrições DEPOIS do evento → erro", () => {
    const errors = validateEventInformation({
      ...validForm(),
      eventDate: "2026-08-10",
      registrationStartDate: "2026-08-11",
      registrationEndDate: "2026-08-12",
    });
    expect(errors.registrationStartDate).toBe(
      "A data de início das inscrições deve ser antes da data do evento.",
    );
  });

  it("início depois do evento E depois do encerramento → só UM erro (no início, sem período)", () => {
    // Início tardio viola as duas regras (antes do evento + antes do encerramento).
    // Deve exibir apenas o erro específico do input de início, não os dois juntos.
    const errors = validateEventInformation({
      ...validForm(),
      eventDate: "2026-08-10",
      registrationStartDate: "2026-08-15",
      registrationEndDate: "2026-08-12", // encerra ANTES do início tardio
    });
    expect(errors.registrationStartDate).toBe(
      "A data de início das inscrições deve ser antes da data do evento.",
    );
    expect(errors.registrationPeriod).toBeUndefined();
  });

  it("início das inscrições ANTES do evento → sem erro de início", () => {
    const errors = validateEventInformation({
      ...validForm(),
      eventDate: "2026-08-10",
      registrationStartDate: "2026-08-09",
      registrationEndDate: "2026-08-09",
    });
    expect(errors.registrationStartDate).toBeUndefined();
  });

  it("por HORAS: véspera às 23:59 → ok; dia do evento às 00:00 → erro", () => {
    const vespera = validateEventInformation({
      ...validForm(),
      eventDate: "2026-08-10",
      registrationStartDate: "2026-08-09",
      registrationStartTime: "23:59",
      registrationEndDate: "2026-08-09",
      registrationEndTime: "23:59",
    });
    expect(vespera.registrationStartDate).toBeUndefined();

    const meiaNoiteDoEvento = validateEventInformation({
      ...validForm(),
      eventDate: "2026-08-10",
      registrationStartDate: "2026-08-10",
      registrationStartTime: "00:00",
    });
    expect(meiaNoiteDoEvento.registrationStartDate).toBe(
      "A data de início das inscrições deve ser antes da data do evento.",
    );
  });

  it("exige vagas do evento (obrigatório e ≥ 1)", () => {
    expect(validateEventInformation({ ...validForm(), maxParticipants: "" }).maxParticipants).toBe(
      "Vagas do evento é obrigatório",
    );
    expect(validateEventInformation({ ...validForm(), maxParticipants: "0" }).maxParticipants).toBe(
      "As vagas do evento devem ser ao menos 1.",
    );
    expect(validateEventInformation({ ...validForm(), maxParticipants: "500" }).maxParticipants).toBeUndefined();
  });

  it("valida CEP: obrigatório e 8 dígitos", () => {
    expect(validateEventInformation({ ...validForm(), cep: "" }).cep).toBe("CEP é obrigatório");
    expect(validateEventInformation({ ...validForm(), cep: "123" }).cep).toBe("CEP inválido");
  });

  it("só exige endereço quando o CEP é válido", () => {
    // CEP inválido → não cobra rua/cidade/estado/maps (espelha a UI condicional).
    const semCep = validateEventInformation({ ...validForm(), cep: "", street: "", city: "" });
    expect(semCep.street).toBeUndefined();
    expect(semCep.city).toBeUndefined();
    // CEP válido + endereço vazio → cobra.
    const comCep = validateEventInformation({ ...validForm(), street: "", city: "", state: "", googleMapsLink: "" });
    expect(comCep.street).toBeDefined();
    expect(comCep.city).toBeDefined();
    expect(comCep.state).toBeDefined();
    expect(comCep.googleMapsLink).toBeDefined();
  });

  it("valida formato de email de atendimento", () => {
    expect(validateEventInformation({ ...validForm(), contactEmail: "" }).contactEmail).toBe("Email de atendimento é obrigatório");
    expect(validateEventInformation({ ...validForm(), contactEmail: "invalido" }).contactEmail).toBe("Email inválido");
  });
});

describe("isEventInformationValid", () => {
  it("true para form válido, false faltando obrigatório", () => {
    expect(isEventInformationValid(validForm())).toBe(true);
    expect(isEventInformationValid({ ...validForm(), name: "" })).toBe(false);
    expect(isEventInformationValid({ ...validForm(), cep: "123" })).toBe(false);
    expect(isEventInformationValid({ ...validForm(), contactEmail: "" })).toBe(false);
  });

  it("não exige googleMapsLink (diferente da validação com mensagens)", () => {
    // O gate do botão é mais leve: maps não entra no `canSave`.
    expect(isEventInformationValid({ ...validForm(), googleMapsLink: "" })).toBe(true);
  });
});

describe("eventInformationHasChanges", () => {
  it("false quando idêntico ao baseline e sem PDF pendente", () => {
    const f = validForm();
    expect(eventInformationHasChanges(f, { ...f }, false)).toBe(false);
  });

  it("true quando um campo monitorado muda", () => {
    const f = validForm();
    expect(eventInformationHasChanges({ ...f, name: "Outro" }, f, false)).toBe(true);
  });

  it("true quando há PDF de regulamento pendente, mesmo sem outras mudanças", () => {
    const f = validForm();
    expect(eventInformationHasChanges(f, { ...f }, true)).toBe(true);
  });

  it("ignora campos fora de INFORMATION_FIELDS (ex.: description)", () => {
    const f = validForm();
    expect(INFORMATION_FIELDS).not.toContain("description");
    expect(eventInformationHasChanges({ ...f, description: "nova" }, f, false)).toBe(false);
  });
});

describe("mapEventBackendErrors", () => {
  it("mapeia validação por campo (details[].property) → chaves do form", () => {
    const { fieldErrors } = mapEventBackendErrors(
      axiosError(400, {
        message: "Validation failed",
        details: [
          { property: "contactEmail", message: "contactEmail must be an email" },
          { property: "googleMapsLink", message: "googleMapsLink must be a valid URL" },
        ],
      }),
    );
    expect(fieldErrors.contactEmail).toBeTruthy();
    expect(fieldErrors.googleMapsLink).toBeTruthy();
  });

  it("traduz nomes de endereço do backend (zipCode→cep, location→street)", () => {
    const { fieldErrors } = mapEventBackendErrors(
      axiosError(400, {
        message: "Validation failed",
        details: [
          { property: "zipCode", message: "zipCode must be a string" },
          { property: "location", message: "location must be a string" },
        ],
      }),
    );
    expect(fieldErrors.cep).toBeTruthy();
    expect(fieldErrors.street).toBeTruthy();
    expect(fieldErrors.zipCode).toBeUndefined();
    expect(fieldErrors.location).toBeUndefined();
  });

  it("fallback: extrai o campo do prefixo das strings de errors[]", () => {
    const { fieldErrors } = mapEventBackendErrors(
      axiosError(400, {
        message: "Validation failed",
        errors: ["eventDate must be a valid ISO 8601 date string"],
      }),
    );
    expect(fieldErrors.eventDate).toBeTruthy();
  });

  it("erro de negócio com { field, message } → mapeia msg do servidor no campo", () => {
    // Ex.: vagas do evento abaixo dos inscritos atuais (update valida no backend).
    const { fieldErrors, generalMessage } = mapEventBackendErrors(
      axiosError(400, {
        code: "MAX_PARTICIPANTS_BELOW_CURRENT",
        field: "maxParticipants",
        message:
          "As vagas do evento (50) não podem ser menores que o número de inscritos atuais (80).",
      }),
    );
    expect(fieldErrors.maxParticipants).toBe(
      "As vagas do evento (50) não podem ser menores que o número de inscritos atuais (80).",
    );
    // Campo destacado → sem toast geral.
    expect(generalMessage).toBeUndefined();
  });

  it("slug duplicado (DUPLICATE_VALUE) → erro no campo name", () => {
    const { fieldErrors } = mapEventBackendErrors(
      axiosError(409, {
        code: "DUPLICATE_VALUE",
        message: "Valor já cadastrado para: slug. Verifique os dados e tente novamente.",
      }),
    );
    expect(fieldErrors.name).toBeTruthy();
  });

  it("campo sem slot inline (instagram) → sem fieldErrors, vai pro toast", () => {
    const { fieldErrors, generalMessage } = mapEventBackendErrors(
      axiosError(400, {
        message: "Validation failed",
        details: [{ property: "instagram", message: "instagram must be a string" }],
      }),
    );
    expect(Object.keys(fieldErrors)).toHaveLength(0);
    expect(generalMessage).toBeTruthy();
  });

  it("erro de negócio (403 permissão) → mensagem geral, sem fieldErrors", () => {
    const { fieldErrors, generalMessage } = mapEventBackendErrors(
      axiosError(403, { message: "Missing permission: edit_event" }),
    );
    expect(Object.keys(fieldErrors)).toHaveLength(0);
    expect(generalMessage).toContain("edit_event");
  });

  it("404 não encontrado → mensagem geral", () => {
    const { fieldErrors, generalMessage } = mapEventBackendErrors(
      axiosError(404, { message: "Evento não encontrado", code: "RECORD_NOT_FOUND" }),
    );
    expect(Object.keys(fieldErrors)).toHaveLength(0);
    expect(generalMessage).toBe("Evento não encontrado");
  });
});
