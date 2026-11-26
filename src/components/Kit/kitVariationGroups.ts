/**
 * Kit com várias variações (Figma "Criação de kit · fluxo e estados", 20/11/2026).
 *
 * Um kit tem 0..N VARIAÇÕES (ex.: "Tamanho da camisa") e cada variação tem 1..N
 * OPÇÕES (P, M, G…). O nome da variação é a pergunta que o participante vê.
 * Opção não tem preço no fluxo novo (o participante paga o preço do kit); o preço
 * salvo de opções antigas é devolvido intacto para o back não mudar o que já vale.
 *
 * Estoque da opção: `stock = 0` no back = sem limite próprio (segue o ingresso);
 * "Limitar estoque" liga um limite. O campo editável é o RESTANTE disponível; o
 * limite gravado é derivado no save preservando vendas e reservas.
 *
 * Módulo puro (sem React) para ser testável.
 */

export interface KitVariationOption {
  /** Chave local estável (React key / foco). */
  key: string;
  /** UUID persistido; ausente em opção nova. */
  id?: string;
  name: string;
  /** Preço salvo em centavos (legado) — só reenviado, nunca editado aqui. */
  price?: number;
  stockLimited: boolean;
  /** "Quantidade disponível no estoque" (restante), como string do input. */
  available: string;
  persistedStock?: number;
  persistedAvailable?: number;
  soldCount: number;
}

export interface KitVariationGroup {
  key: string;
  id?: string;
  name: string;
  options: KitVariationOption[];
}

export const SEM_INTERESSE_NAME = "Sem interesse";
export const NEW_GROUP_NAME = "Nova variação";
export const NEW_OPTION_NAME = "Nova opção";

/** Tags da caixa "O que o participante vai escolher?" (Figma kit/átomo/tag-sugestão). */
export const VARIATION_SUGGESTIONS: ReadonlyArray<{
  label: string;
  /** null = "Personalizar": cria "Nova variação" já em edição de nome. */
  groupName: string | null;
  options: string[];
}> = [
  { label: "Tamanho da camisa", groupName: "Tamanho da camisa", options: ["P", "M", "G", "GG"] },
  { label: "Cor da garrafa", groupName: "Cor da garrafa", options: [] },
  { label: "Personalizar", groupName: null, options: [] },
];

let keySeq = 0;
export function newKey(prefix: string): string {
  keySeq += 1;
  return `${prefix}-${Date.now().toString(36)}-${keySeq}`;
}

/** Comparação de nomes: trim + sem diferença de maiúsculas (pt-BR). */
export function sameName(a: string, b: string): boolean {
  return a.trim().toLocaleLowerCase("pt-BR") === b.trim().toLocaleLowerCase("pt-BR");
}

export function isSemInteresseName(name: unknown): boolean {
  return typeof name === "string" && sameName(name, SEM_INTERESSE_NAME);
}

export function createOption(name: string): KitVariationOption {
  return { key: newKey("opt"), name, stockLimited: false, available: "", soldCount: 0 };
}

export function createGroup(name: string, optionNames: string[] = []): KitVariationGroup {
  return { key: newKey("grp"), name, options: optionNames.map(createOption) };
}

// ─── API → formulário ────────────────────────────────────────────────────────

type Rec = Record<string, unknown>;
const asRec = (v: unknown): Rec => (v && typeof v === "object" ? (v as Rec) : {});
const toInt = (v: unknown): number | undefined => {
  if (v == null || v === "") return undefined;
  const n = typeof v === "number" ? v : parseInt(String(v), 10);
  return Number.isFinite(n) ? n : undefined;
};
const bySortOrder = (a: unknown, b: unknown) =>
  (toInt(asRec(a).sortOrder) ?? 0) - (toInt(asRec(b).sortOrder) ?? 0);

function optionFromApi(raw: unknown): KitVariationOption {
  const r = asRec(raw);
  const stock = toInt(r.stock) ?? 0;
  const available = toInt(r.availableStock);
  return {
    key: newKey("opt"),
    id: typeof r.id === "string" ? r.id : undefined,
    name: String(r.name ?? ""),
    price: toInt(r.price),
    stockLimited: stock > 0,
    available: stock > 0 ? String(available ?? stock) : "",
    persistedStock: stock,
    persistedAvailable: available,
    soldCount: toInt(r.soldCount) ?? 0,
  };
}

/**
 * Variações do produto vindo da API. Usa `variationGroups`; resposta antiga (sem
 * grupos) vira 1 variação com o nome de `variationType`. "Sem interesse" (opt-out
 * do kit, mantido pelo back) nunca aparece para o organizador.
 */
export function groupsFromApiProduct(product: unknown): KitVariationGroup[] {
  const p = asRec(product);
  if (Array.isArray(p.variationGroups)) {
    return [...p.variationGroups].sort(bySortOrder).map((g) => {
      const gr = asRec(g);
      const options = Array.isArray(gr.variations) ? [...gr.variations].sort(bySortOrder) : [];
      return {
        key: newKey("grp"),
        id: typeof gr.id === "string" ? gr.id : undefined,
        name: String(gr.name ?? ""),
        options: options.filter((o) => !isSemInteresseName(asRec(o).name)).map(optionFromApi),
      };
    });
  }
  const legacy = (Array.isArray(p.variations) ? [...p.variations] : [])
    .filter((v) => !isSemInteresseName(asRec(v).name))
    .sort(bySortOrder);
  if (legacy.length === 0) return [];
  const name = typeof p.variationType === "string" && p.variationType.trim() ? p.variationType.trim() : "Variação";
  return [{ key: newKey("grp"), name, options: legacy.map(optionFromApi) }];
}

// ─── Estoque ─────────────────────────────────────────────────────────────────

/**
 * Limite (`stock`) a gravar para a opção. Vale para kit incluso ou pago: o back segura o
 * estoque da variação nos dois casos (`holdsStock` em product-stock.util).
 * - Sem "Limitar estoque": 0 (segue o estoque do ingresso).
 * - Já limitada: aplica ao limite salvo o mesmo delta do restante (preserva vendas/reservas).
 * - Passou a limitar agora: o restante desejado vira o limite (o back parte o restante dele).
 */
export function optionStockToPersist(o: KitVariationOption): number {
  if (!o.stockLimited) return 0;
  const remaining = Math.max(0, parseInt(o.available, 10) || 0);
  if ((o.persistedStock ?? 0) > 0 && o.persistedAvailable != null) {
    return Math.max(0, (o.persistedStock ?? 0) + remaining - o.persistedAvailable);
  }
  return remaining;
}

/** Texto à direita da linha da opção ("3 vendidos · 7 disponíveis", "Esgotado"). */
export function optionStockLabel(o: KitVariationOption): { text: string; soldOut: boolean } {
  const sold = o.soldCount;
  const soldText = `${sold} ${sold === 1 ? "vendido" : "vendidos"}`;
  if (o.stockLimited) {
    const available = Math.max(0, parseInt(o.available, 10) || 0);
    if (available === 0) return { text: `${soldText} · Esgotado`, soldOut: true };
    return { text: `${soldText} · ${available} ${available === 1 ? "disponível" : "disponíveis"}`, soldOut: false };
  }
  return { text: sold > 0 ? soldText : "", soldOut: false };
}

// ─── Validação e payload ─────────────────────────────────────────────────────

/** Erro por variação (chave = `group.key`), mostrado logo abaixo da lista. */
export function validateGroups(groups: KitVariationGroup[]): Record<string, string> {
  const errors: Record<string, string> = {};
  groups.forEach((g, i) => {
    const label = g.name.trim() || "Variação";
    if (!g.name.trim()) {
      errors[g.key] = "Dê um nome para a variação.";
    } else if (groups.some((other, j) => j < i && sameName(other.name, g.name))) {
      errors[g.key] = `Já existe uma variação chamada ${label}.`;
    } else if (g.options.length === 0) {
      errors[g.key] = `${label}: adicione pelo menos uma opção.`;
    } else if (g.options.some((o) => o.stockLimited && optionStockToPersist(o) <= 0)) {
      errors[g.key] = `${label}: informe uma quantidade em estoque maior que zero.`;
    }
  });
  return errors;
}

export function variationGroupsPayload(
  groups: KitVariationGroup[],
): Array<{ id?: string; name: string; variations: Array<{ id?: string; name: string; price?: number; stock: number }> }> {
  return groups.map((g) => ({
    ...(g.id ? { id: g.id } : {}),
    name: g.name.trim(),
    variations: g.options.map((o) => ({
      ...(o.id ? { id: o.id } : {}),
      name: o.name.trim(),
      ...(o.price != null ? { price: o.price } : {}),
      stock: optionStockToPersist(o),
    })),
  }));
}
