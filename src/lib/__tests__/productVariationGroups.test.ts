import { describe, expect, it } from "vitest";
import {
  LEGACY_VARIATION_GROUP_ID,
  autoSelectedVariationIds,
  buildVariationLabel,
  getOptOutOption,
  getVariationGroups,
  isGroupOptedOut,
  isOptedOut,
  toApiVariationIds,
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
  it("variationGroups vazio ignora opções antigas sem grupo (variações removidas com vendas)", () => {
    const semVariacao = {
      id: "p",
      variationGroups: [],
      variations: [opt("no", "Sem interesse"), opt("old-p", "P"), opt("old-m", "M")],
    };
    expect(getVariationGroups(semVariacao)).toEqual([]);
    expect(productOffersChoice(semVariacao)).toBe(true);
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
  it("'Sem interesse' vale só para a variação escolhida; as outras não mudam sozinhas (27/11)", () => {
    // Bug relatado: recusar a Camisa com o Short ainda vazio virava "Sem interesse" no Short também.
    const camisaNao = setGroupSelection(kit, [], "camisa", "no");
    expect(camisaNao).toEqual(["no::camisa"]);
    expect(isGroupOptedOut(kit, camisaNao, getVariationGroups(kit)[1])).toBe(false);
    expect(isSelectionComplete(kit, camisaNao)).toBe(false);
    expect(isOptedOut(kit, camisaNao)).toBe(false);
    // Short escolhido depois: Camisa continua "Sem interesse".
    const comShort = setGroupSelection(kit, camisaNao, "short", "s-g");
    expect(comShort).toEqual(["no::camisa", "s-g"]);
    expect(isSelectionComplete(kit, comShort)).toBe(true);
    expect(selectionLabel(kit, comShort)).toBe("Tamanho da camisa: Sem interesse · Tamanho do short: G");
    expect(toApiVariationIds(comShort)).toEqual(["s-g", "no"]);
    // As duas em "Sem interesse" = kit recusado inteiro; para a API vai só o opt-out.
    const tudoNao = setGroupSelection(kit, comShort, "short", "no");
    expect(isOptedOut(kit, tudoNao)).toBe(true);
    expect(toApiVariationIds(tudoNao)).toEqual(["no"]);
    // Opção real numa variação: a outra segue em "Sem interesse".
    expect(setGroupSelection(kit, tudoNao, "camisa", "c-p")).toEqual(["c-p", "no::short"]);
  });
  it("seleção vinda do back (opt-out puro) = variações sem opção em 'Sem interesse'", () => {
    expect(normalizeSelection(kit, ["s-g", "no"])).toEqual(["no::camisa", "s-g"]);
    expect(isOptedOut(kit, ["no"])).toBe(true);
    expect(setGroupSelection(kit, ["no"], "short", "s-g")).toEqual(["no::camisa", "s-g"]);
  });
  it("isSelectionComplete exige uma opção por variação", () => {
    expect(isSelectionComplete(kit, ["c-p"])).toBe(false);
    expect(isSelectionComplete(kit, ["c-p", "s-g"])).toBe(true);
    expect(isSelectionComplete({ id: "sem", variations: [] }, [])).toBe(true);
  });
  it("normalizeSelection descarta ids estranhos e ordena", () => {
    expect(normalizeSelection(kit, ["s-g", "lixo", "c-m"])).toEqual(["c-m", "s-g"]);
    expect(normalizeSelection(kit, ["no::camisa", "lixo"])).toEqual(["no::camisa"]);
    expect(normalizeSelection(kit, ["c-m", "s-g", "no"])).toEqual(["c-m", "s-g"]);
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
  it("variação de opção única é auto-selecionada, exceto quando há opt-out (todo select tem 'Sem interesse')", () => {
    const withOptOutFirstSingle = {
      ...kit,
      variationGroups: [
        { id: "camisa", name: "Camisa", sortOrder: 0, variations: [opt("c-u", "U", "camisa")] },
        { id: "short", name: "Short", sortOrder: 1, variations: [opt("s-u", "U", "short")] },
      ],
    };
    expect(autoSelectedVariationIds(withOptOutFirstSingle)).toEqual([]);
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
