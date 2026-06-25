import { describe, it, expect } from "vitest";
import type { Ticket } from "@/hooks/useTickets";
import type { Product } from "@/components/Checkout/SubscriptionStep.utils";
import {
  buildParticipantTicketSlots,
  productOffersChoice,
  autoSelectedVariationId,
  buildAutoSelectedProductsPayload,
} from "../checkoutProductStep";

/**
 * Caracterização da montagem de slots participante↔ingresso e do auto-select de
 * produtos do checkout. A ORDEM dos slots é canônica (categorias → tickets →
 * repetição por quantidade → avulsos) e precisa ser preservada pelo refactor.
 */

const ticket = (id: string): Ticket => ({ id }) as unknown as Ticket;
const product = (over: Partial<Product> = {}): Product =>
  ({ id: "p", variations: [], ...over }) as unknown as Product;

describe("buildParticipantTicketSlots", () => {
  it("expande cada ticket pela quantidade e indexa participantes em sequência", () => {
    const slots = buildParticipantTicketSlots(
      [{ tickets: [ticket("t1"), ticket("t2")] }],
      [],
      { t1: 2, t2: 1 },
    );
    expect(slots.map((s) => s.ticketId)).toEqual(["t1", "t1", "t2"]);
    expect(slots.map((s) => s.participantIndex)).toEqual([0, 1, 2]);
  });
  it("ordem canônica: categorizados antes dos avulsos", () => {
    const slots = buildParticipantTicketSlots(
      [{ tickets: [ticket("cat")] }],
      [ticket("avulso")],
      { cat: 1, avulso: 1 },
    );
    expect(slots.map((s) => s.ticketId)).toEqual(["cat", "avulso"]);
    expect(slots.map((s) => s.participantIndex)).toEqual([0, 1]);
  });
  it("quantidade ausente/0 não gera slot", () => {
    const slots = buildParticipantTicketSlots([{ tickets: [ticket("t1")] }], [], {});
    expect(slots).toHaveLength(0);
  });
});

describe("productOffersChoice", () => {
  it("true só com mais de uma variação", () => {
    expect(productOffersChoice(product({ variations: [{}, {}] as never }))).toBe(true);
    expect(productOffersChoice(product({ variations: [{}] as never }))).toBe(false);
    expect(productOffersChoice(product({ variations: [] }))).toBe(false);
  });
});

describe("autoSelectedVariationId", () => {
  it("null quando o produto não exige escolha de variação", () => {
    // não obrigatório E incluído no ingresso → não exige
    expect(
      autoSelectedVariationId(
        product({ isRequired: false, isIncludedInTicket: true, variations: [{ id: "v1" }] as never }),
      ),
    ).toBeNull();
  });
  it("null quando não há exatamente uma variação", () => {
    expect(
      autoSelectedVariationId(
        product({ isRequired: true, variations: [{ id: "v1" }, { id: "v2" }] as never }),
      ),
    ).toBeNull();
  });
  it("auto-seleciona a variação única quando obrigatório", () => {
    expect(
      autoSelectedVariationId(
        product({ isRequired: true, variations: [{ id: "v1" }] as never }),
      ),
    ).toBe("v1");
  });
  it("auto-seleciona quando NÃO incluído no ingresso", () => {
    expect(
      autoSelectedVariationId(
        product({ isIncludedInTicket: false, variations: [{ id: "v1" }] as never }),
      ),
    ).toBe("v1");
  });
  it("fallback de id quando a variação não tem id explícito", () => {
    expect(
      autoSelectedVariationId(
        product({ id: "prod9", isRequired: true, variations: [{}] as never }),
      ),
    ).toBe("prod9-0");
  });
});

describe("buildAutoSelectedProductsPayload", () => {
  it("inclui variações auto-selecionadas por slot↔participante", () => {
    const slots = buildParticipantTicketSlots([{ tickets: [ticket("t1")] }], [], { t1: 2 });
    const participants = [{ email: "a@x.com" }, { email: "b@x.com" }];
    const prods: Record<string, Product[]> = {
      t1: [product({ id: "kit", isRequired: true, variations: [{ id: "v1" }] as never })],
    };
    const payload = buildAutoSelectedProductsPayload(
      slots,
      participants,
      (ticketId) => prods[ticketId] ?? [],
    );
    expect(payload).toEqual([
      { productId: "kit", variationId: "v1", quantity: 1, participantEmail: "a@x.com", participantIndex: 0 },
      { productId: "kit", variationId: "v1", quantity: 1, participantEmail: "b@x.com", participantIndex: 1 },
    ]);
  });
  it("pula slots sem participante correspondente", () => {
    const slots = buildParticipantTicketSlots([{ tickets: [ticket("t1")] }], [], { t1: 2 });
    const payload = buildAutoSelectedProductsPayload(
      slots,
      [{ email: "a@x.com" }], // só 1 participante p/ 2 slots
      () => [product({ id: "kit", isRequired: true, variations: [{ id: "v1" }] as never })],
    );
    expect(payload).toHaveLength(1);
    expect(payload[0].participantEmail).toBe("a@x.com");
  });
  it("ignora produtos sem auto-select (mais de uma variação)", () => {
    const slots = buildParticipantTicketSlots([{ tickets: [ticket("t1")] }], [], { t1: 1 });
    const payload = buildAutoSelectedProductsPayload(
      slots,
      [{ email: "a@x.com" }],
      () => [product({ id: "kit", isRequired: true, variations: [{ id: "v1" }, { id: "v2" }] as never })],
    );
    expect(payload).toHaveLength(0);
  });
});
