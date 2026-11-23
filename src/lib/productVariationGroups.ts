import { isSemInteresseVariation } from "@/utils/semInteresseVariation";

/**
 * Kit com VÁRIAS variações (grupos), cada uma com várias opções — contrato
 * `kit-variation-groups` (20/11/2026).
 *
 *  - `product.variationGroups[]` (ordenados): cada grupo é uma PERGUNTA ("Tamanho
 *    da camisa") com suas opções (`variations[]`).
 *  - `product.variations[]` continua sendo a lista PLANA (todas as opções + o
 *    opt-out "Sem interesse", que não pertence a grupo).
 *  - Resposta antiga (sem `variationGroups`): vira 1 grupo cujo nome é
 *    `variationType`, com as variações planas (menos o opt-out).
 *
 * A seleção de um participante para um produto é uma LISTA de ids de opção, uma
 * por grupo e na ordem dos grupos — ou só o id do opt-out (recusa o kit inteiro).
 *
 * Tudo aqui é puro e estrutural (serve tanto ao `Product` do checkout, em reais,
 * quanto ao payload cru da API, em centavos): preço não entra nas regras de grupo.
 */

export interface VariationLike {
  id?: string | null;
  name: string;
  groupId?: string | null;
}

export interface VariationGroupLike<V extends VariationLike = VariationLike> {
  id: string;
  name: string;
  sortOrder?: number | null;
  variations?: V[] | null;
}

export interface ProductWithVariationsLike<V extends VariationLike = VariationLike> {
  id: string;
  variationType?: string | null;
  isRequired?: boolean;
  isIncludedInTicket?: boolean;
  variations?: V[] | null;
  variationGroups?: VariationGroupLike<V>[] | null;
}

export interface VariationOptionView<V extends VariationLike = VariationLike> {
  /** Id usado na seleção/payload (fallback `${productId}-${índice plano}` sem id). */
  id: string;
  variation: V;
}

export interface VariationGroupView<V extends VariationLike = VariationLike> {
  id: string;
  /** Nome da variação (a pergunta). `null` = legado sem `variationType` — a UI usa o rótulo padrão. */
  name: string | null;
  options: VariationOptionView<V>[];
}

/** Id do grupo sintético de produtos sem `variationGroups` (resposta antiga). */
export const LEGACY_VARIATION_GROUP_ID = "__legacy__";

/** Id da variação como o checkout sempre usou (fallback quando a opção não tem id). */
export function variationOptionId(
  productId: string,
  variation: { id?: string | null },
  flatIndex: number,
): string {
  return variation.id || `${productId}-${flatIndex}`;
}

/** Normaliza o valor salvo (string legado do sessionStorage, lista nova ou nulo) para lista. */
export function selectionIds(value: readonly string[] | string | null | undefined): string[] {
  if (Array.isArray(value)) return value.filter((id): id is string => typeof id === "string" && id !== "");
  return typeof value === "string" && value !== "" ? [value] : [];
}

/** Variações (grupos) do produto, na ordem, sem o opt-out e sem grupo vazio. */
export function getVariationGroups<V extends VariationLike>(
  product: ProductWithVariationsLike<V>,
): VariationGroupView<V>[] {
  const flat = product.variations ?? [];
  const flatIndexById = new Map<string, number>();
  flat.forEach((v, i) => {
    if (v.id) flatIndexById.set(v.id, i);
  });

  const groups = product.variationGroups;
  if (Array.isArray(groups) && groups.length > 0) {
    return groups
      .map((g, index) => ({ g, index }))
      .sort((a, b) => (a.g.sortOrder ?? a.index) - (b.g.sortOrder ?? b.index) || a.index - b.index)
      .map(({ g }) => {
        const source = Array.isArray(g.variations)
          ? g.variations
          : flat.filter((v) => v.groupId === g.id);
        return {
          id: g.id,
          name: g.name?.trim() || null,
          options: source
            .filter((v) => !isSemInteresseVariation({ name: v.name ?? "" }))
            .map((v, i) => ({
              id: variationOptionId(product.id, v, v.id ? (flatIndexById.get(v.id) ?? i) : i),
              variation: v,
            })),
        };
      })
      .filter((g) => g.options.length > 0);
  }

  const options = flat
    .map((v, i) => ({ id: variationOptionId(product.id, v, i), variation: v }))
    .filter((o) => !isSemInteresseVariation({ name: o.variation.name ?? "" }));
  if (options.length === 0) return [];
  return [
    {
      id: LEGACY_VARIATION_GROUP_ID,
      name: product.variationType?.trim() || null,
      options,
    },
  ];
}

/** Opção "Sem interesse" do produto (opt-out do kit inteiro), se existir. */
export function getOptOutOption<V extends VariationLike>(
  product: ProductWithVariationsLike<V>,
): VariationOptionView<V> | null {
  const flat = product.variations ?? [];
  const index = flat.findIndex((v) => isSemInteresseVariation({ name: v.name ?? "" }));
  if (index < 0) return null;
  return { id: variationOptionId(product.id, flat[index], index), variation: flat[index] };
}

export function isOptedOut(product: ProductWithVariationsLike, ids: readonly string[]): boolean {
  const optOut = getOptOutOption(product);
  return !!optOut && ids.includes(optOut.id);
}

/** Opção escolhida num grupo (ou `null`). */
export function groupSelection<V extends VariationLike>(
  group: VariationGroupView<V>,
  ids: readonly string[],
): VariationOptionView<V> | null {
  return group.options.find((o) => ids.includes(o.id)) ?? null;
}

/**
 * Seleção normalizada: opt-out sozinho, ou no máximo uma opção por grupo na
 * ordem dos grupos. Ids que não pertencem ao produto são descartados.
 */
export function normalizeSelection(product: ProductWithVariationsLike, ids: readonly string[]): string[] {
  const optOut = getOptOutOption(product);
  if (optOut && ids.includes(optOut.id)) return [optOut.id];
  const out: string[] = [];
  for (const group of getVariationGroups(product)) {
    const picked = groupSelection(group, ids);
    if (picked) out.push(picked.id);
  }
  return out;
}

/**
 * Escolhe `optionId` no grupo `groupId`. Escolher o opt-out zera as demais
 * variações; escolher uma opção real tira o opt-out.
 */
export function setGroupSelection(
  product: ProductWithVariationsLike,
  ids: readonly string[],
  groupId: string,
  optionId: string,
): string[] {
  const optOut = getOptOutOption(product);
  if (optOut && optionId === optOut.id) return [optOut.id];
  const groups = getVariationGroups(product);
  const target = groups.find((g) => g.id === groupId);
  if (!target || !target.options.some((o) => o.id === optionId)) {
    return normalizeSelection(product, ids);
  }
  const out: string[] = [];
  for (const group of groups) {
    if (group.id === groupId) out.push(optionId);
    else {
      const picked = groupSelection(group, ids);
      if (picked) out.push(picked.id);
    }
  }
  return out;
}

/** Uma opção por variação (ou opt-out). Produto sem variação já está completo. */
export function isSelectionComplete(product: ProductWithVariationsLike, ids: readonly string[]): boolean {
  if (isOptedOut(product, ids)) return true;
  return getVariationGroups(product).every((g) => groupSelection(g, ids) != null);
}

/**
 * O produto pede uma ESCOLHA real do usuário: alguma variação tem mais de uma
 * opção, ou existe o opt-out "Sem interesse".
 */
export function productOffersChoice(product: ProductWithVariationsLike): boolean {
  if (getOptOutOption(product)) return true;
  return getVariationGroups(product).some((g) => g.options.length > 1);
}

/**
 * Opções auto-selecionáveis: variação com UMA opção só, quando o produto exige
 * variação (`isRequired || !isIncludedInTicket`, espelha o checkout). A 1ª
 * variação não entra quando há opt-out — o dropdown dela tem 2 escolhas
 * (a opção + "Sem interesse").
 */
export function autoSelectableOptions<V extends VariationLike>(
  product: ProductWithVariationsLike<V>,
): Array<{ groupId: string; option: VariationOptionView<V> }> {
  const needsVariationChoice = !!product.isRequired || !product.isIncludedInTicket;
  if (!needsVariationChoice) return [];
  const hasOptOut = !!getOptOutOption(product);
  return getVariationGroups(product).flatMap((group, index) =>
    group.options.length === 1 && !(index === 0 && hasOptOut)
      ? [{ groupId: group.id, option: group.options[0] }]
      : [],
  );
}

export function autoSelectedVariationIds(product: ProductWithVariationsLike): string[] {
  return autoSelectableOptions(product).map(({ option }) => option.id);
}

/** Opções escolhidas (na ordem dos grupos), com o grupo de cada uma. Opt-out vem com `group: null`. */
export function resolveSelection<V extends VariationLike>(
  product: ProductWithVariationsLike<V>,
  ids: readonly string[],
): Array<{ group: VariationGroupView<V> | null; option: VariationOptionView<V> }> {
  const optOut = getOptOutOption(product);
  if (optOut && ids.includes(optOut.id)) return [{ group: null, option: optOut }];
  return getVariationGroups(product).flatMap((group) => {
    const option = groupSelection(group, ids);
    return option ? [{ group, option }] : [];
  });
}

/**
 * Rótulo da escolha: 1 escolha → só o nome ("M"); várias →
 * "Tamanho da camisa: M · Tamanho do short: G". Mesmo formato do
 * `variationLabel` do backend.
 */
export function buildVariationLabel(choices: ReadonlyArray<{ name: string; groupName?: string | null }>): string {
  const visible = choices.filter((c) => c.name && !isSemInteresseVariation({ name: c.name }));
  if (visible.length === 0) return "";
  if (visible.length === 1) return visible[0].name;
  return visible.map((c) => (c.groupName ? `${c.groupName}: ${c.name}` : c.name)).join(" · ");
}

/** Rótulo local da seleção de um produto (sem opt-out). */
export function selectionLabel(product: ProductWithVariationsLike, ids: readonly string[]): string {
  return buildVariationLabel(
    resolveSelection(product, ids).map(({ group, option }) => ({
      name: option.variation.name,
      groupName: group?.name ?? null,
    })),
  );
}

// ─── Leitura de inscrição/pedido (respostas que listam produtos escolhidos) ───

export interface ChosenVariation {
  id: string;
  name: string;
  groupId: string | null;
  groupName: string | null;
}

/**
 * Opções escolhidas de um item de produto da inscrição (`variations[]` do
 * contrato, cada uma com `groupName`). Respostas antigas usam `variations[]`
 * para a lista de opções do seletor (sem `groupName`) — essas são ignoradas aqui.
 */
export function registrationItemChosenVariations(item: unknown): ChosenVariation[] {
  const list = (item as { variations?: unknown } | null)?.variations;
  if (!Array.isArray(list) || list.length === 0) return [];
  const isChosenShape = list.every(
    (v) => v != null && typeof v === "object" && "groupName" in (v as object),
  );
  if (!isChosenShape) return [];
  return (list as Array<Record<string, unknown>>)
    .filter((v) => typeof v.name === "string" && !isSemInteresseVariation({ name: v.name as string }))
    .map((v) => ({
      id: String(v.id ?? ""),
      name: v.name as string,
      groupId: (v.groupId as string | null | undefined) ?? null,
      groupName: (v.groupName as string | null | undefined) ?? null,
    }));
}

/**
 * Rótulo da variação de um item da inscrição: `variationLabel` do backend quando
 * vem; senão monta a partir das escolhas; senão o nome da variação única (legado).
 */
export function registrationItemVariationLabel(item: unknown): string | null {
  const it = item as {
    variationLabel?: unknown;
    variationName?: unknown;
    variation?: { name?: unknown } | null;
    selectedVariation?: { name?: unknown } | null;
  } | null;
  if (!it) return null;
  if (typeof it.variationLabel === "string" && it.variationLabel.trim()) return it.variationLabel.trim();
  const chosen = registrationItemChosenVariations(it);
  if (chosen.length > 0) return buildVariationLabel(chosen) || null;
  const legacy = it.variation?.name ?? it.selectedVariation?.name ?? it.variationName;
  return typeof legacy === "string" && legacy ? legacy : null;
}

// ─── Dashboard (topProductVariations) ───

interface TopVariationRowLike {
  variationName: string;
  groupId?: string | null;
  groupName?: string | null;
  variationLabel?: string | null;
  quantitySold?: number;
  remainingStock?: number | null;
  totalStock?: number | null;
}

/** Rótulo da linha (uma opção): `variationLabel` do backend, senão "Grupo: Opção", senão o nome. */
export function topVariationRowLabel(row: TopVariationRowLike): string {
  if (row.variationLabel?.trim()) return row.variationLabel.trim();
  return row.groupName ? `${row.groupName}: ${row.variationName}` : row.variationName;
}

/**
 * Totais do produto a partir das linhas por opção. Com várias variações cada kit
 * vendido aparece UMA vez em CADA variação — somar tudo contaria o kit N vezes.
 * Soma por variação e usa a de maior venda (as demais têm o mesmo total, salvo
 * opt-out/legado). Sem grupo (resposta antiga) = 1 variação só → soma simples.
 */
export function topVariationProductTotals(rows: readonly TopVariationRowLike[]): {
  quantity: number;
  totalStock: number;
  remainingStock: number;
} {
  const byGroup = new Map<string, { quantity: number; totalStock: number; remainingStock: number }>();
  for (const row of rows) {
    const key = row.groupId ?? row.groupName ?? "";
    const acc = byGroup.get(key) ?? { quantity: 0, totalStock: 0, remainingStock: 0 };
    acc.quantity += row.quantitySold ?? 0;
    acc.totalStock += row.totalStock ?? 0;
    acc.remainingStock += row.remainingStock ?? 0;
    byGroup.set(key, acc);
  }
  let best: { quantity: number; totalStock: number; remainingStock: number } | null = null;
  for (const acc of byGroup.values()) if (!best || acc.quantity > best.quantity) best = acc;
  return best ?? { quantity: 0, totalStock: 0, remainingStock: 0 };
}
