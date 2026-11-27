import { describe, it, expect } from "vitest";
import type { Ticket } from "@/hooks/useTickets";
import type { Product } from "@/components/Checkout/SubscriptionStep.utils";
import {
  buildParticipantTicketSlots,
  productOffersChoice,
  autoSelectedVariationIds,
  buildAutoSelectedProductsPayload,
  withVariationlessProducts,
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
    expect(productOffersChoice(product({ variations: [{ name: "P" }, { name: "M" }] as never }))).toBe(true);
    expect(productOffersChoice(product({ variations: [{ name: "P" }] as never }))).toBe(false);
    expect(productOffersChoice(product({ variations: [] }))).toBe(false);
  });
  it("opção única + opt-out \"Sem interesse\" também é escolha", () => {
    expect(
      productOffersChoice(product({ variations: [{ name: "Única" }, { name: "Sem interesse" }] as never })),
    ).toBe(true);
  });
  it("várias variações: escolha quando ALGUMA tem mais de uma opção", () => {
    const g = (id: string, names: string[]) => ({
      id,
      name: id,
      variations: names.map((n) => ({ id: `${id}-${n}`, name: n })),
    });
    expect(
      productOffersChoice(product({ variationGroups: [g("camisa", ["U"]), g("short", ["U"])] as never })),
    ).toBe(false);
    expect(
      productOffersChoice(product({ variationGroups: [g("camisa", ["U"]), g("short", ["P", "M"])] as never })),
    ).toBe(true);
  });
});

describe("autoSelectedVariationIds", () => {
  it("vazio quando o produto não exige escolha de variação", () => {
    // não obrigatório E incluído no ingresso → não exige
    expect(
      autoSelectedVariationIds(
        product({ isRequired: false, isIncludedInTicket: true, variations: [{ id: "v1", name: "U" }] as never }),
      ),
    ).toEqual([]);
  });
  it("vazio quando não há exatamente uma variação", () => {
    expect(
      autoSelectedVariationIds(
        product({ isRequired: true, variations: [{ id: "v1", name: "P" }, { id: "v2", name: "M" }] as never }),
      ),
    ).toEqual([]);
  });
  it("auto-seleciona a variação única quando obrigatório", () => {
    expect(
      autoSelectedVariationIds(
        product({ isRequired: true, variations: [{ id: "v1", name: "U" }] as never }),
      ),
    ).toEqual(["v1"]);
  });
  it("auto-seleciona quando NÃO incluído no ingresso", () => {
    expect(
      autoSelectedVariationIds(
        product({ isIncludedInTicket: false, variations: [{ id: "v1", name: "U" }] as never }),
      ),
    ).toEqual(["v1"]);
  });
  it("fallback de id quando a variação não tem id explícito", () => {
    expect(
      autoSelectedVariationIds(
        product({ id: "prod9", isRequired: true, variations: [{ name: "U" }] as never }),
      ),
    ).toEqual(["prod9-0"]);
  });
});

describe("buildAutoSelectedProductsPayload", () => {
  it("inclui variações auto-selecionadas por slot↔participante", () => {
    const slots = buildParticipantTicketSlots([{ tickets: [ticket("t1")] }], [], { t1: 2 });
    const participants = [{ email: "a@x.com" }, { email: "b@x.com" }];
    const prods: Record<string, Product[]> = {
      t1: [product({ id: "kit", isRequired: true, variations: [{ id: "v1", name: "U" }] as never })],
    };
    const payload = buildAutoSelectedProductsPayload(
      slots,
      participants,
      (ticketId) => prods[ticketId] ?? [],
    );
    expect(payload).toEqual([
      { productId: "kit", variationIds: ["v1"], variationId: "v1", quantity: 1, participantEmail: "a@x.com", participantIndex: 0 },
      { productId: "kit", variationIds: ["v1"], variationId: "v1", quantity: 1, participantEmail: "b@x.com", participantIndex: 1 },
    ]);
  });
  it("kit com várias variações de opção única → todas no payload (variationId = a 1ª)", () => {
    const slots = buildParticipantTicketSlots([{ tickets: [ticket("t1")] }], [], { t1: 1 });
    const kit = product({
      id: "kit",
      isRequired: true,
      variationGroups: [
        { id: "g1", name: "Camisa", variations: [{ id: "c-u", name: "U" }] },
        { id: "g2", name: "Short", variations: [{ id: "s-u", name: "U" }] },
      ] as never,
    });
    expect(buildAutoSelectedProductsPayload(slots, [{ email: "a@x.com" }], () => [kit])).toEqual([
      { productId: "kit", variationIds: ["c-u", "s-u"], variationId: "c-u", quantity: 1, participantEmail: "a@x.com", participantIndex: 0 },
    ]);
  });
  it("pula slots sem participante correspondente", () => {
    const slots = buildParticipantTicketSlots([{ tickets: [ticket("t1")] }], [], { t1: 2 });
    const payload = buildAutoSelectedProductsPayload(
      slots,
      [{ email: "a@x.com" }], // só 1 participante p/ 2 slots
      () => [product({ id: "kit", isRequired: true, variations: [{ id: "v1", name: "U" }] as never })],
    );
    expect(payload).toHaveLength(1);
    expect(payload[0].participantEmail).toBe("a@x.com");
  });
  it("ignora produtos sem auto-select (mais de uma variação)", () => {
    const slots = buildParticipantTicketSlots([{ tickets: [ticket("t1")] }], [], { t1: 1 });
    const payload = buildAutoSelectedProductsPayload(
      slots,
      [{ email: "a@x.com" }],
      () => [product({ id: "kit", isRequired: true, variations: [{ id: "v1", name: "P" }, { id: "v2", name: "M" }] as never })],
    );
    expect(payload).toHaveLength(0);
  });
});

describe("withVariationlessProducts", () => {
  const slots = buildParticipantTicketSlots([{ tickets: [ticket("t1")] }], [], { t1: 2 });
  const participants = [{ email: "a@x.com" }, { email: "b@x.com" }];
  const semVariacao = product({ id: "kit", variationGroups: [] as never });
  const opcional = product({
    id: "extra",
    variationGroups: [] as never,
    variations: [{ id: "no", name: "Sem interesse" }, { id: "old", name: "P" }] as never,
  });
  const comVariacao = product({
    id: "camisa",
    variationGroups: [{ id: "g", name: "Tamanho", variations: [{ id: "m", name: "M" }, { id: "g", name: "G" }] }] as never,
  });

  it("produto sem variação vai com variationIds vazio para cada participante (Sim / obrigatório)", () => {
    const out = withVariationlessProducts([], slots, participants, () => [semVariacao, comVariacao]);
    expect(out).toEqual([
      { productId: "kit", variationIds: [], quantity: 1, participantEmail: "a@x.com", participantIndex: 0 },
      { productId: "kit", variationIds: [], quantity: 1, participantEmail: "b@x.com", participantIndex: 1 },
    ]);
  });

  it("'Não' (opt-out já escolhido) não é duplicado nem trocado; outro participante recebe", () => {
    const naoDoA = { productId: "extra", variationIds: ["no"], variationId: "no", quantity: 1, participantEmail: "a@x.com", participantIndex: 0 };
    const out = withVariationlessProducts([naoDoA], slots, participants, () => [opcional]);
    expect(out).toEqual([
      naoDoA,
      { productId: "extra", variationIds: [], quantity: 1, participantEmail: "b@x.com", participantIndex: 1 },
    ]);
  });

  it("participante sem e-mail fica de fora", () => {
    expect(withVariationlessProducts([], slots, [{ email: "" }, {}], () => [semVariacao])).toEqual([]);
  });
});
