import { describe, it, expect } from "vitest";
import type { EditEventFormData } from "@/contexts/EditEventContext";
import {
  validateEventInformation,
  isEventInformationValid,
  eventInformationHasChanges,
  INFORMATION_FIELDS,
} from "../eventEditValidation";

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
    cep: "01001-000",
    street: "Praça da Sé",
    neighborhood: "Sé",
    city: "São Paulo",
    state: "SP",
    googleMapsLink: "https://maps.google.com/?q=se",
    bannerUrl: "",
    cardImageUrl: "",
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
