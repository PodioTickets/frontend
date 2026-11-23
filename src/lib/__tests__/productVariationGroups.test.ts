import { describe, expect, it } from "vitest";
import {
  LEGACY_VARIATION_GROUP_ID,
  autoSelectedVariationIds,
  buildVariationLabel,
  getOptOutOption,
  getVariationGroups,
  isSelectionComplete,
  normalizeSelection,
  productOffersChoice,
  registrationItemChosenVariations,
  registrationItemVariationLabel,
  resolveSelection,
  selectionIds,
  selectionLabel,
  setGroupSelection,
  topVariationProductTotals,
  topVariationRowLabel,
} from "../productVariationGroups";

const opt = (id: string, name = id, groupId: string | null = null) => ({ id, name, groupId });

/** Kit "Camisa + Short" com opt-out (opcional, não incluso). */
const kit = {
  id: "kit",
  isRequired: false,
  isIncludedInTicket: false,
  variationType: "Tamanho da camisa",
  variations: [
    opt("c-p", "P", "camisa"),
    opt("c-m", "M", "camisa"),
    opt("s-g", "G", "short"),
    opt("no", "Sem interesse"),
  ],
  variationGroups: [
    // fora de ordem de propósito: a ordem vem do sortOrder
    { id: "short", name: "Tamanho do short", sortOrder: 1, variations: [opt("s-g", "G", "short")] },
    {
      id: "camisa",
      name: "Tamanho da camisa",
      sortOrder: 0,
      variations: [opt("c-p", "P", "camisa"), opt("c-m", "M", "camisa")],
    },
  ],
};

describe("getVariationGroups", () => {
  it("usa variationGroups na ordem do sortOrder, sem o opt-out", () => {
    const groups = getVariationGroups(kit);
    expect(groups.map((g) => g.name)).toEqual(["Tamanho da camisa", "Tamanho do short"]);
    expect(groups[0].options.map((o) => o.id)).toEqual(["c-p", "c-m"]);
  });
  it("resposta antiga (sem variationGroups) → 1 grupo com variationType", () => {
    const legacy = {
      id: "p",
      variationType: "Tamanho",
      variations: [{ id: "v1", name: "P" }, { name: "M" }, { id: "x", name: "Sem interesse" }],
    };
    const groups = getVariationGroups(legacy);
    expect(groups).toHaveLength(1);
    expect(groups[0].id).toBe(LEGACY_VARIATION_GROUP_ID);
    expect(groups[0].name).toBe("Tamanho");
    // fallback de id pelo índice plano (mesmo do checkout antigo)
    expect(groups[0].options.map((o) => o.id)).toEqual(["v1", "p-1"]);
    expect(getOptOutOption(legacy)?.id).toBe("x");
  });
  it("variationGroups vazio + só opt-out → nenhum grupo; sem variações → nada", () => {
    expect(getVariationGroups({ id: "p", variationGroups: [], variations: [opt("no", "Sem interesse")] })).toEqual([]);
    expect(getVariationGroups({ id: "p", variations: [] })).toEqual([]);
  });
});

describe("seleção por variação", () => {
  it("setGroupSelection mantém uma opção por variação, na ordem dos grupos", () => {
    let ids = setGroupSelection(kit, [], "short", "s-g");
    expect(ids).toEqual(["s-g"]);
    ids = setGroupSelection(kit, ids, "camisa", "c-p");
    expect(ids).toEqual(["c-p", "s-g"]);
    ids = setGroupSelection(kit, ids, "camisa", "c-m");
    expect(ids).toEqual(["c-m", "s-g"]);
  });
  it("opt-out limpa as outras variações; opção real tira o opt-out", () => {
    const optedOut = setGroupSelection(kit, ["c-m", "s-g"], "camisa", "no");
    expect(optedOut).toEqual(["no"]);
    expect(isSelectionComplete(kit, optedOut)).toBe(true);
    const back = setGroupSelection(kit, optedOut, "camisa", "c-p");
    expect(back).toEqual(["c-p"]);
    expect(isSelectionComplete(kit, back)).toBe(false);
  });
  it("isSelectionComplete exige uma opção por variação", () => {
    expect(isSelectionComplete(kit, ["c-p"])).toBe(false);
    expect(isSelectionComplete(kit, ["c-p", "s-g"])).toBe(true);
    expect(isSelectionComplete({ id: "sem", variations: [] }, [])).toBe(true);
  });
  it("normalizeSelection descarta ids estranhos e ordena", () => {
    expect(normalizeSelection(kit, ["s-g", "lixo", "c-m"])).toEqual(["c-m", "s-g"]);
    expect(normalizeSelection(kit, ["c-m", "no"])).toEqual(["no"]);
  });
  it("selectionIds aceita o valor legado (string) do sessionStorage", () => {
    expect(selectionIds("v1")).toEqual(["v1"]);
    expect(selectionIds(null)).toEqual([]);
    expect(selectionIds(["a", "", "b"])).toEqual(["a", "b"]);
  });
});

describe("escolha / auto-seleção", () => {
  it("productOffersChoice: opt-out conta como escolha", () => {
    expect(productOffersChoice(kit)).toBe(true);
  });
  it("variação de opção única é auto-selecionada, exceto a 1ª quando há opt-out", () => {
    const withOptOutFirstSingle = {
      ...kit,
      variationGroups: [
        { id: "camisa", name: "Camisa", sortOrder: 0, variations: [opt("c-u", "U", "camisa")] },
        { id: "short", name: "Short", sortOrder: 1, variations: [opt("s-u", "U", "short")] },
      ],
    };
    expect(autoSelectedVariationIds(withOptOutFirstSingle)).toEqual(["s-u"]);
    expect(autoSelectedVariationIds({ ...withOptOutFirstSingle, variations: [] })).toEqual(["c-u", "s-u"]);
  });
});

describe("rótulo", () => {
  it("1 escolha → só o nome; várias → 'Grupo: Opção · Grupo: Opção'", () => {
    expect(buildVariationLabel([{ name: "M", groupName: "Tamanho da camisa" }])).toBe("M");
    expect(
      buildVariationLabel([
        { name: "M", groupName: "Tamanho da camisa" },
        { name: "G", groupName: "Tamanho do short" },
      ]),
    ).toBe("Tamanho da camisa: M · Tamanho do short: G");
    expect(buildVariationLabel([{ name: "Sem interesse" }])).toBe("");
  });
  it("selectionLabel / resolveSelection a partir do produto", () => {
    expect(selectionLabel(kit, ["c-m", "s-g"])).toBe("Tamanho da camisa: M · Tamanho do short: G");
    expect(selectionLabel(kit, ["no"])).toBe("");
    expect(resolveSelection(kit, ["no"])[0].group).toBeNull();
  });
  it("item da inscrição: variationLabel do backend tem prioridade", () => {
    expect(registrationItemVariationLabel({ variationLabel: "Pronto", variation: { name: "M" } })).toBe("Pronto");
  });
  it("item da inscrição: monta pelas escolhas quando não vem variationLabel", () => {
    const item = {
      variation: { id: "c-m", name: "M" },
      variations: [
        { id: "c-m", name: "M", groupId: "camisa", groupName: "Tamanho da camisa" },
        { id: "s-g", name: "G", groupId: "short", groupName: "Tamanho do short" },
      ],
    };
    expect(registrationItemChosenVariations(item).map((c) => c.id)).toEqual(["c-m", "s-g"]);
    expect(registrationItemVariationLabel(item)).toBe("Tamanho da camisa: M · Tamanho do short: G");
  });
  it("item legado: variations[] é a lista de opções (sem groupName) → usa a variação única", () => {
    const item = {
      variation: { id: "v1", name: "M" },
      variations: [{ id: "v1", name: "M", price: 0, stock: 0 }, { id: "v2", name: "G", price: 0, stock: 0 }],
    };
    expect(registrationItemChosenVariations(item)).toEqual([]);
    expect(registrationItemVariationLabel(item)).toBe("M");
  });
});

describe("dashboard", () => {
  it("rótulo da linha: variationLabel > 'Grupo: Opção' > nome", () => {
    expect(topVariationRowLabel({ variationName: "M", variationLabel: "X" })).toBe("X");
    expect(topVariationRowLabel({ variationName: "M", groupName: "Camisa" })).toBe("Camisa: M");
    expect(topVariationRowLabel({ variationName: "M" })).toBe("M");
  });
  it("totais do produto não contam o kit uma vez por variação", () => {
    const rows = [
      { variationName: "P", groupId: "camisa", quantitySold: 3, totalStock: 10, remainingStock: 7 },
      { variationName: "M", groupId: "camisa", quantitySold: 2, totalStock: 10, remainingStock: 8 },
      { variationName: "G", groupId: "short", quantitySold: 5 },
    ];
    expect(topVariationProductTotals(rows)).toEqual({ quantity: 5, totalStock: 20, remainingStock: 15 });
    // legado (sem grupo) = soma simples
    expect(topVariationProductTotals([{ variationName: "P", quantitySold: 1 }, { variationName: "M", quantitySold: 2 }]).quantity).toBe(3);
  });
});
