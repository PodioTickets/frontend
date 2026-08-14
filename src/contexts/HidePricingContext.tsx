"use client";

import { createContext, useContext, type ReactNode } from "react";

/**
 * Sinaliza que o fluxo atual deve ESCONDER todos os valores/preços dos
 * componentes reusados do checkout (usado no fluxo de CORTESIA do organizador —
 * inscrição manual sem cobrança).
 *
 * Padrão `false`: o checkout pago NÃO envolve este provider, então os
 * componentes exibem preço normalmente. Só o container de cortesia envolve os
 * steps com `<HidePricingProvider>`, e cada componente de preço lê `useHidePricing()`
 * para omitir as linhas de valor (mantendo layout, CTAs e o resto intactos).
 */
const HidePricingContext = createContext(false);

export function HidePricingProvider({ children }: { children: ReactNode }) {
  return <HidePricingContext.Provider value={true}>{children}</HidePricingContext.Provider>;
}

export function useHidePricing(): boolean {
  return useContext(HidePricingContext);
}
