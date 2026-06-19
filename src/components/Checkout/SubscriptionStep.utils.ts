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
 * Política atual (espelha `holdsStock` do backend, product-stock.util.ts): TODO
 * produto segura o próprio estoque da variação — inclusive incluso+obrigatório.
 * Assim uma variação esgotada de item incluso+obrigatório também bloqueia a
 * seleção no checkout. `stock = 0` segue ilimitado (ver `isVariationSoldOut`).
 */
export function variationHoldsStock(_product: Pick<Product, "isIncludedInTicket" | "isRequired">): boolean {
  return true;
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
 * não mostra valores à direita; com pelo menos um, linhas sem preço específico mostram a base.
 * Com preço específico o rótulo deve refletir o que é efetivamente cobrado
 * (`billableReaisForProductSelection` / PaymentStep):
 *  - não incluso: o preço da variação é o TOTAL daquela variação → exibe o valor cheio;
 *  - incluso no ingresso: a base já está paga no ingresso → exibe só o upgrade sobre a base.
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
  // Produto incluso → não exibe preço (a base já está paga no ingresso).
  if (product.isIncludedInTicket) {
    return undefined;
  }
  if (!productAnyVariationHasSpecificPrice(product)) {
    return undefined;
  }
  if (!variationHasMeaningfulSpecificPriceReais(variationPriceReais)) {
    return formatPrice(product.basePrice);
  }
  // Não incluso, variação com preço específico → total absoluto (não subtrai a base).
  return formatPrice(variationPriceReais);
};

/** Preço exibido no card do produto (preço geral / base), alinhado à prévia do modal. */
export const formatProductCardBasePriceLabel = (product: Product): string => {
  if (product.isIncludedInTicket) return "Incluso no ingresso";
  return formatPrice(product.basePrice);
};

/**
 * Título da seção de variação. Quando o organizador define um tipo, esse texto
 * é o título completo (ex.: "Escolha o tamanho da camisa"); vazio cai no rótulo
 * padrão "Escolha a variação". Espelha o preview do CreateProductModal.
 */
export const variationSectionTitle = (product: Product) =>
  product.variationType?.trim() || "Escolha a variação";

/**
 * Valor em reais a somar no total do pedido.
 * Produto INCLUSO no ingresso → NUNCA cobra nada (0), mesmo com preço na variação.
 * NÃO incluso: o preço específico da variação é o TOTAL ABSOLUTO cobrado (não
 * soma/subtrai a base) — variação 30 cobra 30; sem preço específico cobra a base.
 */
export function billableReaisForProductSelection(
  product: Product,
  selectedVariation: Product["variations"][number] | null,
): number {
  // Incluso é sempre grátis (já pago no ingresso).
  if (product.isIncludedInTicket) return 0;

  const base = product.basePrice;

  if (!selectedVariation) return base;

  if (isSemInteresseVariation(selectedVariation)) return 0;

  const v = selectedVariation.price;

  if (!productAnyVariationHasSpecificPrice(product)) return base;

  if (!variationHasMeaningfulSpecificPriceReais(v)) return base;

  // Variação com preço específico → total absoluto (não subtrai a base).
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
