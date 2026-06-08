import { isSemInteresseVariation } from "@/utils/semInteresseVariation";
import { formatDateBR } from "@/utils/datetimeBR";

export interface Product {
  id: string;
  name: string;
  image: string | null;
  images?: string[];
  basePrice: number;
  isRequired: boolean;
  isIncludedInTicket: boolean;
  /** Ex.: "Tamanho", "Cor" — mesmo campo do CreateProductModal / API. */
  variationType?: string | null;
  variations: Array<{
    id?: string;
    name: string;
    price: number;
    /** Limite configurado pelo organizador. `0` = ilimitado (sentinela do backend). */
    stock: number;
    /** Restante disponível; só significativo quando `stock > 0`. Pode vir ausente em respostas legadas. */
    availableStock?: number;
    /** Unidades já vendidas (confirmadas no pagamento). */
    soldCount?: number;
  }>;
}

/**
 * Um produto SEGURA estoque próprio quando NÃO é incluso-E-obrigatório ao mesmo
 * tempo. Incluso + obrigatório já é gated pela vaga do ingresso → não consome
 * estoque da variação. Espelha `holdsStock` do backend (product-stock.util.ts):
 * fonte única de verdade da regra de estoque.
 */
export function variationHoldsStock(product: Pick<Product, "isIncludedInTicket" | "isRequired">): boolean {
  return !(product.isIncludedInTicket === true && product.isRequired === true);
}

/**
 * Variação esgotada para fins de SELEÇÃO no checkout. Espelha o invariante do
 * backend: só há esgotamento quando o produto segura estoque, o estoque é
 * LIMITADO (`stock > 0`) e não resta disponível (`availableStock <= 0`).
 * `stock === 0` é ilimitado → nunca esgota. O backend continua sendo a fonte
 * autoritativa (valida atômico no PATCH /products); aqui é só prevenção de UX.
 */
export function isVariationSoldOut(
  product: Pick<Product, "isIncludedInTicket" | "isRequired">,
  variation: Pick<Product["variations"][number], "stock" | "availableStock">,
): boolean {
  if (!variationHoldsStock(product)) return false;
  const stock = variation.stock ?? 0;
  if (stock <= 0) return false; // ilimitado
  return (variation.availableStock ?? 0) <= 0;
}

export const VARIATION_KEY_SEPARATOR = "::";

/** API envia valores monetários em centavos (inteiro ou string numérica). */
export function productPriceFromApiToReais(value: unknown): number {
  if (value == null || value === "") return 0;
  if (typeof value === "number" && Number.isFinite(value)) return value / 100;
  const s = String(value).trim().replace(",", ".");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n / 100 : 0;
}

/** Formata preço (valor em reais). */
export const formatPrice = (price: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
};

/** Preço específico da variação ≠ 0 (0 = "só base", igual ao modal). */
const variationHasMeaningfulSpecificPriceReais = (priceReais: number): boolean => {
  if (!Number.isFinite(priceReais)) return false;
  return Math.round(priceReais * 100) !== 0;
};

export const productAnyVariationHasSpecificPrice = (product: Product): boolean =>
  product.variations.some((v) => variationHasMeaningfulSpecificPriceReais(v.price));

/**
 * Mesma regra da prévia do CreateProductModal: sem preço específico em nenhuma variação,
 * não mostra valores à direita; com pelo menos um, linhas sem preço específico mostram a base;
 * com preço específico: total se variação < base, senão acréscimo sobre a base.
 */
export const previewVariationListPriceLabelForProduct = (
  product: Product,
  variationPriceReais: number,
  variationName?: string,
): string | undefined => {
  if (
    variationName != null &&
    isSemInteresseVariation({ name: variationName })
  ) {
    return undefined;
  }
  if (!productAnyVariationHasSpecificPrice(product)) {
    return undefined;
  }
  const base = product.basePrice;
  if (!variationHasMeaningfulSpecificPriceReais(variationPriceReais)) {
    return formatPrice(base);
  }
  const v = variationPriceReais;
  if (v < base) {
    return formatPrice(v);
  }
  return formatPrice(Math.max(0, v - base));
};

/** Preço exibido no card do produto (preço geral / base), alinhado à prévia do modal. */
export const formatProductCardBasePriceLabel = (product: Product): string => {
  if (product.isIncludedInTicket) return "Incluso no ingresso";
  return formatPrice(product.basePrice);
};

/** Alinhado ao CreateProductModal: "Escolha a variação - {tipo}" ou "Variações". */
export const variationSectionTitle = (product: Product) =>
  `Escolha a variação ${(product.variationType ? `- ${product.variationType}` : "").trim() || ""}`;

/**
 * Valor em reais a somar no total do pedido.
 * Incluso no ingresso: cobra só upgrade (v - base) quando v ≥ base;
 * fora do ingresso: paga v se v < base, senão v (equiv. base + acréscimo).
 */
export function billableReaisForProductSelection(
  product: Product,
  selectedVariation: Product["variations"][number] | null,
): number {
  const base = product.basePrice;

  if (!selectedVariation) {
    if (product.isIncludedInTicket) return 0;
    return base;
  }

  if (isSemInteresseVariation(selectedVariation)) {
    return 0;
  }

  const v = selectedVariation.price;

  if (!productAnyVariationHasSpecificPrice(product)) {
    if (product.isIncludedInTicket) return 0;
    return base;
  }

  if (!variationHasMeaningfulSpecificPriceReais(v)) {
    if (product.isIncludedInTicket) return 0;
    return base;
  }

  if (product.isIncludedInTicket) {
    if (v < base) return 0;
    return Math.max(0, v - base);
  }

  if (v < base) return v;
  return v;
}

export const getVariationKey = (participantIndex: number, productId: string) => {
  return `${participantIndex}${VARIATION_KEY_SEPARATOR}${productId}`;
};

export const parseVariationKey = (key: string): { participantIndex: number; productId: string } => {
  // Tentar formato novo primeiro (com ::)
  const separatorIndex = key.indexOf(VARIATION_KEY_SEPARATOR);
  if (separatorIndex !== -1) {
    return {
      participantIndex: Number(key.substring(0, separatorIndex)),
      productId: key.substring(separatorIndex + VARIATION_KEY_SEPARATOR.length),
    };
  }

  // Fallback para formato antigo (com -) - pegar apenas o primeiro número
  // Formato antigo: "0-9f24fcc6-421b-..." -> ["0", "9f24fcc6", "421b", ...]
  const parts = key.split("-");
  if (parts.length >= 2) {
    const participantIndex = Number(parts[0]);
    const productId = parts.slice(1).join("-");
    return { participantIndex, productId };
  }

  throw new Error(`Invalid variation key format: ${key}`);
};

export const formatDateShort = (date: string) => {
  if (!date) return "";
  return formatDateBR(date, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

export const maskCPF = (cpf: string) => {
  if (!cpf) return "";
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.***.***-$4");
};

export const formatDate = (date: string) => {
  return formatDateBR(date, {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};
