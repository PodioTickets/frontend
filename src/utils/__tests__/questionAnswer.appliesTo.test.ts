import { describe, it, expect } from "vitest";
import { questionAppliesToTicket } from "../questionAnswer";

/**
 * Regressão do bug "perguntas do organizador aparecem para um ingresso não
 * vinculado" no checkout: a fonte de verdade do vínculo pergunta↔ingresso é o
 * `appliesTo`, que chega do backend em várias formas.
 */
describe("questionAppliesToTicket", () => {
  it('trata "all"/ausente/null como todos os ingressos', () => {
    expect(questionAppliesToTicket({ appliesTo: "all" }, "t1")).toBe(true);
    expect(questionAppliesToTicket({ appliesTo: undefined }, "t1")).toBe(true);
    expect(questionAppliesToTicket({ appliesTo: null }, "t1")).toBe(true);
    expect(questionAppliesToTicket({}, "t1")).toBe(true);
    expect(questionAppliesToTicket(null, "t1")).toBe(true);
  });

  it("restringe a lista de ids (string[])", () => {
    const q = { appliesTo: ["t1", "t2"] };
    expect(questionAppliesToTicket(q, "t1")).toBe(true);
    expect(questionAppliesToTicket(q, "t2")).toBe(true);
    expect(questionAppliesToTicket(q, "t3")).toBe(false);
  });

  it("aceita a forma hidratada (objetos { id })", () => {
    const q = { appliesTo: [{ id: "t1" }, { id: "t2" }] };
    expect(questionAppliesToTicket(q, "t1")).toBe(true);
    expect(questionAppliesToTicket(q, "t3")).toBe(false);
  });

  it("desserializa string JSON legada de um array", () => {
    const q = { appliesTo: JSON.stringify(["t1"]) };
    expect(questionAppliesToTicket(q, "t1")).toBe(true);
    expect(questionAppliesToTicket(q, "t2")).toBe(false);
  });

  it("array vazio equivale a todos (nunca persistido como específico)", () => {
    expect(questionAppliesToTicket({ appliesTo: [] }, "t1")).toBe(true);
  });

  it("forma inesperada cai no seguro: aplica a todos (nunca esconde por engano)", () => {
    expect(questionAppliesToTicket({ appliesTo: "lixo-nao-json" }, "t1")).toBe(true);
    expect(questionAppliesToTicket({ appliesTo: 42 as unknown }, "t1")).toBe(true);
  });
});
