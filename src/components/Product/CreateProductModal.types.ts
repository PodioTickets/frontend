/**
 * Tipos do `CreateProductModal` (extraídos no split do Bloco 3).
 *
 * IMPORTANTE: a shape de variação aqui é a do FORMULÁRIO/rascunho do organizador
 * (`price`/`stock` como string editável + snapshot persistido), DIFERENTE da
 * shape de runtime do checkout (`SubscriptionStep.utils` → `Product.variations`,
 * numérica em centavos). São domínios distintos (edição × consumo) e NÃO devem
 * ser unificadas.
 */

export interface ProductVariation {
  id: string;
  name: string;
  price: string;
  /**
   * Estoque UNIFICADO editável = restante disponível. O "total/limite" deixou de
   * existir na UI; é derivado no save aplicando ao limite persistido o MESMO
   * delta que o organizador aplicou ao restante (ver `variationStockToPersist`).
   */
  stock: string;
  /**
   * Snapshot PERSISTIDO do backend (só em edição). Necessários pra reconstruir o
   * limite preservando vendas E holds. Ausentes em criação / variação nova.
   * - `persistedStock`     → limite salvo (`0` = ilimitado).
   * - `persistedAvailable` → restante salvo na carga (baseline do delta).
   * - `soldCount`          → vendidas confirmadas (coluna "Total vendidos").
   */
  persistedStock?: number;
  persistedAvailable?: number;
  soldCount?: number;
}

export type LinkedTicketListItem = { name: string; categoryLabel: string };

export type MobileVariationDraft = {
  /** "new" cria uma nova variação ao salvar; UUID edita a existente. */
  target: "new" | string;
  name: string;
  price: string;
  stock: string;
};
