import { describe, expect, it } from "vitest";
import {
  createGroup,
  groupsFromApiProduct,
  optionStockLabel,
  optionStockToPersist,
  validateGroups,
  variationGroupsPayload,
  type KitVariationOption,
} from "../kitVariationGroups";

const opt = (over: Partial<KitVariationOption> = {}): KitVariationOption => ({
  key: "k",
  name: "M",
  stockLimited: false,
  available: "",
  soldCount: 0,
  ...over,
});

describe("groupsFromApiProduct", () => {
  it("usa variationGroups na ordem e esconde 'Sem interesse'", () => {
    const groups = groupsFromApiProduct({
      variationGroups: [
        { id: "g2", name: "Short", sortOrder: 1, variations: [{ id: "s1", name: "P", stock: 0 }] },
        {
          id: "g1",
          name: "Camisa",
          sortOrder: 0,
          variations: [
            { id: "c2", name: "G", sortOrder: 1, stock: 10, availableStock: 7, soldCount: 3 },
            { id: "c1", name: "P", sortOrder: 0, stock: 0, soldCount: 2 },
            { id: "x", name: "Sem interesse", sortOrder: 2 },
          ],
        },
      ],
    });
    expect(groups.map((g) => g.name)).toEqual(["Camisa", "Short"]);
    expect(groups[0].options.map((o) => o.name)).toEqual(["P", "G"]);
    expect(groups[0].options[1]).toMatchObject({ id: "c2", stockLimited: true, available: "7", soldCount: 3 });
    expect(groups[0].options[0]).toMatchObject({ stockLimited: false, available: "" });
  });

  it("resposta antiga vira 1 variação com o nome do variationType", () => {
    const groups = groupsFromApiProduct({
      variationType: "Tamanhos",
      variations: [{ id: "a", name: "M" }, { id: "b", name: "Sem interesse" }],
    });
    expect(groups).toHaveLength(1);
    expect(groups[0].name).toBe("Tamanhos");
    expect(groups[0].options.map((o) => o.id)).toEqual(["a"]);
  });

  it("sem variações = kit sem variação", () => {
    expect(groupsFromApiProduct({ variationGroups: [] })).toEqual([]);
    expect(groupsFromApiProduct({ variations: [{ name: "Sem interesse" }] })).toEqual([]);
  });
});

describe("optionStockToPersist", () => {
  it("sem limite grava 0", () => {
    expect(optionStockToPersist(opt({ persistedStock: 10, persistedAvailable: 7 }), false)).toBe(0);
  });
  it("passou a limitar: o restante vira o limite", () => {
    expect(optionStockToPersist(opt({ stockLimited: true, available: "50", persistedStock: 0 }), false)).toBe(50);
  });
  it("já limitada: aplica o delta do restante ao limite salvo", () => {
    // limite 10, restante 7 (3 vendidos) → restante 12 = limite 15
    expect(
      optionStockToPersist(opt({ stockLimited: true, available: "12", persistedStock: 10, persistedAvailable: 7 }), false),
    ).toBe(15);
  });
  it("kit incluso mantém o limite salvo", () => {
    expect(optionStockToPersist(opt({ stockLimited: true, available: "3", persistedStock: 40 }), true)).toBe(40);
    expect(optionStockToPersist(opt(), true)).toBe(0);
  });
});

describe("optionStockLabel", () => {
  it("sem venda e sem limite não mostra nada", () => {
    expect(optionStockLabel(opt(), false).text).toBe("");
  });
  it("vendas e disponíveis", () => {
    expect(optionStockLabel(opt({ soldCount: 3 }), false).text).toBe("3 vendidos");
    expect(optionStockLabel(opt({ soldCount: 0, stockLimited: true, available: "50" }), false).text).toBe(
      "0 vendidos · 50 disponíveis",
    );
    expect(optionStockLabel(opt({ soldCount: 1, stockLimited: true, available: "1" }), false).text).toBe(
      "1 vendido · 1 disponível",
    );
  });
  it("esgotado", () => {
    expect(optionStockLabel(opt({ soldCount: 8, stockLimited: true, available: "0" }), false)).toEqual({
      text: "8 vendidos · Esgotado",
      soldOut: true,
    });
  });
  it("kit incluso só mostra vendas", () => {
    expect(optionStockLabel(opt({ soldCount: 2, stockLimited: true, available: "5" }), true).text).toBe("2 vendidos");
  });
});

describe("validateGroups", () => {
  it("variação sem opção, nome repetido e sem nome", () => {
    const a = createGroup("Camisa", ["P"]);
    const b = createGroup("Cor da garrafa");
    const c = createGroup("camisa ", ["M"]);
    const d = createGroup("  ", ["M"]);
    const errors = validateGroups([a, b, c, d], false);
    expect(errors[a.key]).toBeUndefined();
    expect(errors[b.key]).toBe("Cor da garrafa: adicione pelo menos uma opção.");
    expect(errors[c.key]).toMatch(/Já existe uma variação/);
    expect(errors[d.key]).toBe("Dê um nome para a variação.");
  });
  it("estoque limitado com zero é erro (0 no back = sem limite)", () => {
    const g = createGroup("Camisa", ["P"]);
    g.options[0] = { ...g.options[0], stockLimited: true, available: "0" };
    expect(validateGroups([g], false)[g.key]).toMatch(/maior que zero/);
    expect(validateGroups([g], true)[g.key]).toBeUndefined();
  });
});

describe("variationGroupsPayload", () => {
  it("preserva ids, devolve preço legado e calcula o estoque", () => {
    const g = createGroup("Camisa");
    g.id = "g1";
    g.options = [
      opt({ id: "o1", name: " P ", price: 1500, stockLimited: true, available: "5", persistedStock: 0 }),
      opt({ name: "Nova" }),
    ];
    expect(variationGroupsPayload([g], false)).toEqual([
      {
        id: "g1",
        name: "Camisa",
        variations: [
          { id: "o1", name: "P", price: 1500, stock: 5 },
          { name: "Nova", stock: 0 },
        ],
      },
    ]);
  });
});
