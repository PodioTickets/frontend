import { describe, expect, it } from "vitest";
import { ticketNameHasDistance } from "../checkoutModalityDisplay";

describe("ticketNameHasDistance", () => {
  it.each([
    "10 KM teste",
    "5 Km",
    "5 km",
    "5km",
    "5 kM",
    "Corrida 21,1km",
    "Meia maratona 21.1 KM",
    "10KM",
  ])("detecta distância em %p", (name) => {
    expect(ticketNameHasDistance(name)).toBe(true);
  });

  it.each([
    "Kit atleta",
    "Caminhada",
    "Ingresso VIP",
    "5kms extra", // "kms" não é a unidade isolada
    "km 5", // unidade antes do número não é padrão de distância
    "",
  ])("não detecta em %p", (name) => {
    expect(ticketNameHasDistance(name)).toBe(false);
  });

  it("trata null/undefined sem lançar", () => {
    expect(ticketNameHasDistance(null)).toBe(false);
    expect(ticketNameHasDistance(undefined)).toBe(false);
  });
});
