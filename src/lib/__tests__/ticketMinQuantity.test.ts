import { describe, expect, it } from "vitest";
import { removalBreaksMinQuantity, stepTicketQuantity } from "../ticketMinQuantity";

describe("stepTicketQuantity", () => {
  it("sem mínimo: anda de 1 em 1", () => {
    expect(stepTicketQuantity(0, 1, null)).toBe(1);
    expect(stepTicketQuantity(1, -1, undefined)).toBe(0);
    expect(stepTicketQuantity(3, 1, 1)).toBe(4);
  });

  it("com mínimo 4: + pula de 0 para 4 e − volta de 4 para 0", () => {
    expect(stepTicketQuantity(0, 1, 4)).toBe(4);
    expect(stepTicketQuantity(4, 1, 4)).toBe(5);
    expect(stepTicketQuantity(5, -1, 4)).toBe(4);
    expect(stepTicketQuantity(4, -1, 4)).toBe(0);
  });
});

describe("removalBreaksMinQuantity", () => {
  it("bloqueia só quando sobra entre 1 e N−1", () => {
    expect(removalBreaksMinQuantity(4, 4)).toBe(true); // sobra 3
    expect(removalBreaksMinQuantity(5, 4)).toBe(false); // sobra 4
    expect(removalBreaksMinQuantity(1, 4)).toBe(false); // zera
    expect(removalBreaksMinQuantity(2, null)).toBe(false);
  });
});
