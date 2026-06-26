import { describe, it, expect } from "vitest";
import {
  mapParticipantForBackend,
  buildParticipantsPatchPayload,
  buildProductsPatchPayload,
} from "../checkoutParticipants";

/**
 * Caracterização dos builders de payload de participantes/produtos do checkout.
 * Trava o shape exato enviado ao backend antes de refatorar o InformationStep.
 */

describe("mapParticipantForBackend", () => {
  it("brasileiro: documentType CPF + CPF limpo (só dígitos)", () => {
    const r = mapParticipantForBackend({
      name: "Fulano",
      cpf: "123.456.789-09",
      email: "f@x.com",
      birthDate: "1990-01-01",
      nationality: "Brasil",
    });
    expect(r.documentType).toBe("CPF");
    expect(r.documentNumber).toBe("12345678909");
    expect(r.country).toBe("Brasil");
  });
  it("nacionalidade ausente é tratada como brasileiro", () => {
    const r = mapParticipantForBackend({ cpf: "11122233344" });
    expect(r.documentType).toBe("CPF");
    expect(r.country).toBeUndefined();
  });
  it("estrangeiro: documentType PASSPORT + documento CRU (preserva letras)", () => {
    const r = mapParticipantForBackend({
      name: "John",
      cpf: "AB-12345",
      nationality: "Estados Unidos",
    });
    expect(r.documentType).toBe("PASSPORT");
    expect(r.documentNumber).toBe("AB-12345");
    expect(r.country).toBe("Estados Unidos");
  });
  it("telefone vai apenas com dígitos", () => {
    const r = mapParticipantForBackend({
      phone: "(41) 99999-8888",
      nationality: "Brasil",
    });
    expect(r.phone).toMatch(/^\d+$/);
    expect(r.phone).toContain("99999");
  });
  it("campos vazios viram strings vazias (não undefined)", () => {
    const r = mapParticipantForBackend({});
    expect(r).toMatchObject({ name: "", documentNumber: "", email: "", birthDate: "", phone: "" });
  });
  // Hoje a UI só oferece Masculino / Feminino / Outro (PREFER_NOT_TO_SAY foi
  // descontinuado). mapGender: começa com "m" → MALE, "f" → FEMALE, resto → OTHER.
  it("mapeia gênero PT → enum do backend (3 opções atuais)", () => {
    expect(mapParticipantForBackend({ gender: "Masculino" }).gender).toBe("MALE");
    expect(mapParticipantForBackend({ gender: "Feminino" }).gender).toBe("FEMALE");
    expect(mapParticipantForBackend({ gender: "Outro" }).gender).toBe("OTHER");
  });
  it("qualquer valor fora de m/f cai em OTHER", () => {
    expect(mapParticipantForBackend({ gender: "Outro" }).gender).toBe("OTHER");
    expect(mapParticipantForBackend({ gender: "xyz" }).gender).toBe("OTHER");
  });
  it("gênero ausente não inclui a chave", () => {
    expect("gender" in mapParticipantForBackend({})).toBe(false);
  });
  it("contato de emergência só entra quando preenchido (com trim)", () => {
    const r = mapParticipantForBackend({
      emergencyContactName: "  Mãe  ",
      emergencyPhone: "(41) 98888-7777",
      hasEmergencyContact: true,
      nationality: "Brasil",
    });
    expect(r.emergencyContactName).toBe("Mãe");
    expect(r.emergencyPhone).toMatch(/^\d+$/);
    expect(r.hasEmergencyContact).toBe(true);
  });
  it("emergência em branco não inclui as chaves", () => {
    const r = mapParticipantForBackend({ emergencyContactName: "   " });
    expect("emergencyContactName" in r).toBe(false);
    expect("hasEmergencyContact" in r).toBe(false);
  });
  it("respostas: array vira JSON string; escalar fica como está", () => {
    const r = mapParticipantForBackend({
      questionAnswers: { q1: ["A", "B"], q2: "única" },
    });
    expect(r.questionAnswers).toEqual([
      { questionId: "q1", answer: '["A","B"]' },
      { questionId: "q2", answer: "única" },
    ]);
  });
  it("questionAnswers vazio não inclui a chave", () => {
    expect("questionAnswers" in mapParticipantForBackend({ questionAnswers: {} })).toBe(false);
  });
});

describe("buildParticipantsPatchPayload", () => {
  const list = [
    { name: "A", cpf: "1" },
    { name: "B", cpf: "2" },
    { name: "C", cpf: "3" },
  ];
  it("envia a lista limitada ao totalNeeded (reserva completa)", () => {
    const r = buildParticipantsPatchPayload(list, 2);
    expect(r.participants).toHaveLength(2);
    expect(r.participants[0].name).toBe("A");
    expect(r.participants[1].name).toBe("B");
  });
  it("totalNeeded negativo → lista vazia (não estoura slice)", () => {
    expect(buildParticipantsPatchPayload(list, -1).participants).toHaveLength(0);
  });
  it("totalNeeded maior que a lista → manda só o que tem", () => {
    expect(buildParticipantsPatchPayload(list, 10).participants).toHaveLength(3);
  });
});

describe("buildProductsPatchPayload", () => {
  it("agrega variações não-nulas por participante (quantity 1)", () => {
    const r = buildProductsPatchPayload([
      { email: "a@x.com", productVariations: { p1: "v1", p2: "v2" } },
      { email: "b@x.com", productVariations: { p1: "v9" } },
    ]);
    expect(r.products).toEqual([
      { productId: "p1", variationId: "v1", quantity: 1, participantEmail: "a@x.com", participantIndex: 0 },
      { productId: "p2", variationId: "v2", quantity: 1, participantEmail: "a@x.com", participantIndex: 0 },
      { productId: "p1", variationId: "v9", quantity: 1, participantEmail: "b@x.com", participantIndex: 1 },
    ]);
  });
  it("ignora variação nula (produto recusado / sem interesse)", () => {
    const r = buildProductsPatchPayload([
      { email: "a@x.com", productVariations: { p1: null, p2: "v2" } },
    ]);
    expect(r.products).toEqual([
      { productId: "p2", variationId: "v2", quantity: 1, participantEmail: "a@x.com", participantIndex: 0 },
    ]);
  });
  it("participante sem productVariations é ignorado; email ausente vira ''", () => {
    const r = buildProductsPatchPayload([
      { email: "a@x.com" },
      { productVariations: { p1: "v1" } },
    ]);
    expect(r.products).toEqual([
      { productId: "p1", variationId: "v1", quantity: 1, participantEmail: "", participantIndex: 1 },
    ]);
  });
  it("2 participantes com o MESMO e-mail → participantIndex distingue os slots (bug do produto colapsado)", () => {
    // Mesma pessoa em 2 ingressos: o e-mail é idêntico, mas o slot (participantIndex)
    // separa os produtos — o finalize vincula cada produto à inscrição certa.
    const r = buildProductsPatchPayload([
      { email: "same@x.com", productVariations: { p1: "v1" } },
      { email: "same@x.com", productVariations: { p2: "v2" } },
    ]);
    expect(r.products).toEqual([
      { productId: "p1", variationId: "v1", quantity: 1, participantEmail: "same@x.com", participantIndex: 0 },
      { productId: "p2", variationId: "v2", quantity: 1, participantEmail: "same@x.com", participantIndex: 1 },
    ]);
  });
});
