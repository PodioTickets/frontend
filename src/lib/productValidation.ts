import type { ProductVariation } from "@/components/Product/CreateProductModal.types";

/**
 * Lógica PURA do formulário de produto (extraída do `CreateProductModal` no
 * Bloco 3). Sem React, sem toast, sem I/O → testável isoladamente. O componente
 * mantém os efeitos colaterais (toast/estado) e delega as regras pra cá.
 */

/**
 * Limite (`stock`) a enviar pro backend a partir do estoque RESTANTE editável.
 * O backend reconcilia o restante por DELTA do limite — então preservamos vendas
 * E holds aplicando ao limite persistido o MESMO delta que o organizador aplicou
 * ao restante:  novoLimite = limitePersistido + (restanteAtual − restanteOriginal).
 * Variação nova (sem snapshot): limite = restante digitado (sem vendas/holds).
 * Nunca abaixo de 0.
 */
export function variationStockToPersist(v: ProductVariation): number {
  const remaining = parseInt(v.stock, 10) || 0;
  if (v.persistedStock == null || v.persistedAvailable == null) {
    return Math.max(0, remaining);
  }
  const delta = remaining - v.persistedAvailable;
  return Math.max(0, v.persistedStock + delta);
}

export function categoryLabelFromTicket(t: Record<string, unknown>): string {
  const nested = t.category as { name?: string } | undefined;
  const fromNested =
    typeof nested?.name === "string" ? nested.name.trim() : "";
  if (fromNested) return fromNested;
  const snake = t.category_name;
  if (typeof snake === "string" && snake.trim()) return snake.trim();
  const cid = t.categoryId ?? t.category_id;
  if (cid == null || cid === "") return "Sem categoria";
  return "Sem categoria";
}

/** Lê campos da API (camelCase ou snake_case) para o formulário de edição. */
export function buyerVariationEditStateFromApiProduct(
  p: Record<string, unknown> | null | undefined,
): {
  allowed: boolean;
  deadlineDays: string;
} {
  if (!p || typeof p !== "object") {
    return { allowed: false, deadlineDays: "30" };
  }
  const rawAllowed =
    p.buyerVariationEditAllowed ?? p.buyer_variation_edit_allowed;
  const allowed =
    rawAllowed === true ||
    rawAllowed === "true" ||
    rawAllowed === 1 ||
    rawAllowed === "1";
  const rawDays =
    p.variationEditDeadlineDays ?? p.variation_edit_deadline_days;
  const n =
    typeof rawDays === "number" && Number.isFinite(rawDays)
      ? rawDays
      : parseInt(String(rawDays ?? "").replace(/\D/g, ""), 10);
  if (!allowed) {
    return { allowed: false, deadlineDays: "30" };
  }
  if (Number.isFinite(n) && n >= 0) {
    return { allowed: true, deadlineDays: String(n) };
  }
  return { allowed: true, deadlineDays: "30" };
}

/** Nome do tipo de variação: só letras, números e espaços (sem . , - etc.). */
export function sanitizeVariationTypeLabelInput(value: string): string {
  return value.replace(/[^\p{L}\p{N}\s]/gu, "");
}

/** Valor em reais a partir do texto "10,50" / "0,00". */
export function parsePriceReais(formatted: string): number {
  const n = parseFloat(
    String(formatted ?? "")
      .replace(",", ".")
      .trim(),
  );
  return Number.isFinite(n) ? n : 0;
}

/** API retorna preços em centavos; exibir em reais (formato "10,50"). */
export function formatPriceFromApi(
  value: number | string | undefined,
): string {
  if (value == null || value === "") return "";
  if (typeof value === "number")
    return (value / 100).toFixed(2).replace(".", ",");
  const s = String(value).trim().replace(".", ",");
  return s;
}

/** Campo «preço específico» com valor numérico ≠ 0 (vazio ou 0 / 0,00 = sem preço específico). */
export function variationHasMeaningfulSpecificPrice(
  price: string | undefined,
): boolean {
  const s = String(price ?? "").trim();
  if (s === "") return false;
  const n = parseFloat(s.replace(",", "."));
  return Number.isFinite(n) && n !== 0;
}

/**
 * Máscara de input de preço: dígitos crus → "10,50" (interpreta como centavos).
 * Ex.: "1050" → "10,50"; "" → "". Era o `formatPrice` inline do modal.
 */
export function maskPriceInputFromDigits(value: string): string {
  const numbers = value.replace(/\D/g, "");
  if (!numbers) return "";
  const cents = parseInt(numbers, 10);
  return (cents / 100).toFixed(2).replace(".", ",");
}

export interface ValidateProductFormInput {
  productName: string;
  variations: ProductVariation[];
  eventId: string | null | undefined;
  productHoldsStock: boolean;
  isIncludedInTicket: boolean;
  basePrice: string;
}

export type ProductFormValidation =
  | { ok: true }
  | { ok: false; message: string };

/**
 * Regras de validação do produto antes de salvar (espelha o `validateBeforeSave`
 * original, na MESMA ordem). Pura: retorna `{ ok }` ou `{ ok:false, message }` —
 * quem exibe o toast e aborta é o componente. O guard de "ainda carregando"
 * (sem mensagem) permanece no componente, antes desta chamada.
 */
export function validateProductForm(
  input: ValidateProductFormInput,
): ProductFormValidation {
  const {
    productName,
    variations,
    eventId,
    productHoldsStock,
    isIncludedInTicket,
    basePrice,
  } = input;

  if (!productName.trim()) {
    return { ok: false, message: "Digite o nome do produto" };
  }
  if (productName.length > 100) {
    return {
      ok: false,
      message: "O nome do produto deve ter no máximo 100 caracteres",
    };
  }

  const hasMinVariations = variations.some((v) => v.name.trim());
  if (!hasMinVariations) {
    return { ok: false, message: "Preencha o nome de pelo menos uma variação" };
  }

  // Nomes de variação únicos (trim + case-insensitive pt-BR).
  const seenVariationNames = new Set<string>();
  for (const v of variations) {
    const trimmed = v.name.trim();
    if (!trimmed) continue;
    const key = trimmed.toLocaleLowerCase("pt-BR");
    if (seenVariationNames.has(key)) {
      return {
        ok: false,
        message: `Variação duplicada: "${trimmed}". Cada variação deve ter um nome único.`,
      };
    }
    seenVariationNames.add(key);
  }

  if (!eventId) {
    return { ok: false, message: "Evento não encontrado" };
  }

  // Todo produto segura estoque: o campo é o estoque RESTANTE; o total
  // (restante + vendidas) precisa ser > 0.
  if (productHoldsStock) {
    for (const v of variations) {
      if (!v.name.trim()) continue;
      if (variationStockToPersist(v) <= 0) {
        return {
          ok: false,
          message: `Informe um estoque maior que zero para a variação "${v.name.trim()}".`,
        };
      }
    }
  }

  if (!isIncludedInTicket && parsePriceReais(basePrice) <= 0) {
    return {
      ok: false,
      message: "Informe um preço maior que zero para o produto.",
    };
  }

  return { ok: true };
}
