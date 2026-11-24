import type { IncludedProduct } from "@/components/Ticket/ProductVariationCard";
import { isSemInteresseVariation } from "@/utils/semInteresseVariation";
import {
  registrationItemChosenVariations,
  registrationItemVariationLabel,
} from "@/lib/productVariationGroups";

/**
 * Normaliza os produtos de UMA registration (`reg.products[]`) no shape
 * `IncludedProduct` consumido pelo `ProductVariationCard` — fonte de verdade
 * única usada pela tela de ingresso do usuário e pela de pagamento concluído,
 * pra a tab de Produtos ficar IDÊNTICA nas duas (ver order-details-response-spec.md §6).
 *
 * Regras (contrato do backend):
 *  - FONTE ÚNICA = `reg.products[]`. NÃO ler `ticket.includedProducts[]` (duplicaria).
 *  - `product.isIncludedInTicket === true` → INCLUSO (brinde, preço 0/base).
 *    Pode editar variação (flags do backend preservadas).
 *  - `product.isIncludedInTicket !== true` → ADICIONAL pago (`unitPrice`).
 *    NÃO edita variação → flags de edição forçadas em `false`.
 *  - Variação "Sem interesse" (opt-out) já vem omitida pelo backend; filtramos
 *    como defesa.
 */
export function buildRegistrationProducts(reg: any): {
  includedProducts: IncludedProduct[];
  additionalProducts: IncludedProduct[];
} {
  const rawProducts = (reg?.products || []) as any[];

  const toIncludedProduct = (item: any, basePriceCents: number): IncludedProduct => {
    const prod = item.product || {};
    /* Kit com várias variações: `item.variations` passou a ser a lista das opções
     * ESCOLHIDAS (com `groupName`). Respostas antigas usam o mesmo campo para as
     * opções vivas do seletor — distinguimos pelo shape. */
    const chosen = registrationItemChosenVariations(item);
    const groups = item.variationGroups ?? prod.variationGroups;
    const options =
      chosen.length === 0 && Array.isArray(item.variations)
        ? item.variations
        : Array.isArray(item.variationOptions)
          ? item.variationOptions
          : Array.isArray(groups)
            ? groups.flatMap((g: { variations?: unknown[] }) => g.variations ?? [])
            : undefined;
    const selectedVariationIds =
      chosen.length > 0
        ? chosen.map((c) => c.id).filter(Boolean)
        : item.variation?.id
          ? [item.variation.id]
          : undefined;
    return {
      // O endpoint de update é keyed pelo id do PRODUTO (catálogo).
      id: prod.id ?? item.id,
      name: prod.name ?? "Produto",
      image: prod.image,
      basePrice: basePriceCents,
      variationType: prod.variationType,
      buyerVariationEditAllowed: item.buyerVariationEditAllowed === true,
      canEditVariation: item.canEditVariation === true,
      variationEdited: item.variationEdited === true,
      variationEditDeadline: item.variationEditDeadline,
      selectedVariation: item.variation
        ? {
            id: item.variation.id,
            name: item.variation.name,
            price: item.variation.price ?? 0,
          }
        : undefined,
      variations: options,
      variationGroups: Array.isArray(groups) ? groups : undefined,
      selectedVariationIds,
      chosenVariations: chosen.length > 0 ? chosen : undefined,
      variationLabel: registrationItemVariationLabel(item),
    };
  };

  const visibleProducts = rawProducts.filter((item: any) => {
    const variationName = item.variation?.name ?? item.variationName ?? null;
    return !(variationName && isSemInteresseVariation({ name: variationName }));
  });

  const includedProducts: IncludedProduct[] = visibleProducts
    .filter((item: any) => item.product?.isIncludedInTicket === true)
    .map((item: any) => toIncludedProduct(item, item.product?.basePrice ?? 0));

  const additionalProducts: IncludedProduct[] = visibleProducts
    .filter((item: any) => item.product?.isIncludedInTicket !== true)
    .map((item: any) => ({
      ...toIncludedProduct(item, item.unitPrice ?? item.product?.basePrice ?? 0),
      // Adicional pago não troca variação no pós-compra.
      buyerVariationEditAllowed: false,
      canEditVariation: false,
    }));

  return { includedProducts, additionalProducts };
}
