import { describe, expect, it } from "vitest";
import {
  hasDisplayableDistance,
  ticketNameHasDistance,
} from "../checkoutModalityDisplay";

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

describe("hasDisplayableDistance", () => {
  it.each([5, "5", "5 km", "14", "21.1", "21,1", 0.5])(
    "exibe quando distância > 0 (%p)",
    (value) => {
      expect(hasDisplayableDistance(value)).toBe(true);
    },
  );

  it.each([0, "0", "0.0", "0,0", "", "   ", null, undefined, "abc"])(
    "oculta quando 0/ausente/não-numérico (%p)",
    (value) => {
      expect(hasDisplayableDistance(value)).toBe(false);
    },
  );
});
