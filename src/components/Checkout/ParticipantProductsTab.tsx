"use client";

import {
  ProductVariationCard,
  type IncludedProduct,
} from "@/components/Ticket/ProductVariationCard";

/**
 * Tab "Produtos" compartilhada entre a tela de ingresso do usuário
 * (`/user/tickets/[id]`) e a de pagamento concluído (`PaymentSuccessStep`).
 *
 * Renderiza as MESMAS seções e cards (ProductVariationCard) nos dois lugares —
 * fonte de verdade única do layout, pra não divergirem. Cada tela só fornece os
 * produtos já no shape `IncludedProduct` (separados em inclusos × adicionais por
 * `product.isIncludedInTicket`, conforme order-details-response-spec.md §6).
 *
 * `registrationId` é exigido pelo card (endpoint de edição de variação é keyed por
 * registration). No pós-compra (pagamento concluído) os produtos vêm com as flags
 * de edição em `false`, então o card fica só-leitura naturalmente — sem botão
 * "Alterar" nem banner de prazo.
 */
export interface ParticipantProductsTabProps {
  includedProducts: IncludedProduct[];
  additionalProducts: IncludedProduct[];
  registrationId: string;
  /** Criação da order (ISO) — usado pelo card pro cálculo do prazo de edição. */
  orderCreatedAt?: string;
}

export function ParticipantProductsTab({
  includedProducts,
  additionalProducts,
  registrationId,
  orderCreatedAt,
}: ParticipantProductsTabProps) {
  const hasIncluded = includedProducts.length > 0;
  const hasAdditional = additionalProducts.length > 0;

  return (
    <div className="flex flex-col gap-8">
      {hasIncluded && (
        <div className="flex flex-col gap-4">
          <h3 className="text-xl font-bold text-gray-12 font-manrope leading-[1.1]">
            Incluídos no ingresso
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
            {includedProducts.map((product) => (
              <ProductVariationCard
                key={product.id}
                product={product}
                orderCreatedAt={orderCreatedAt}
                registrationId={registrationId}
                isIncluded
              />
            ))}
          </div>
        </div>
      )}

      {hasAdditional && (
        <div className="flex flex-col gap-4">
          <h3 className="text-xl font-bold text-gray-12 font-manrope leading-[1.1]">
            Adicionais
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
            {additionalProducts.map((product) => (
              <ProductVariationCard
                key={product.id}
                product={product}
                orderCreatedAt={orderCreatedAt}
                registrationId={registrationId}
              />
            ))}
          </div>
        </div>
      )}

      {!hasIncluded && !hasAdditional && (
        <p className="text-base text-gray-11 font-family-dm-sans">
          Nenhum produto para este participante.
        </p>
      )}
    </div>
  );
}
