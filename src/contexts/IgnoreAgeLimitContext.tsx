"use client";

import { createContext, useContext, type ReactNode } from "react";

/**
 * Sinaliza que o fluxo atual deve ESCONDER o BADGE "Limite de idade: …" dos
 * ingressos reusados do checkout. A REGRA de validação de idade (idade do
 * participante vs. faixa do ingresso) CONTINUA valendo — o erro aparece no input
 * de data de nascimento.
 *
 * Usado no fluxo de CORTESIA do organizador ("adicionar inscrito"): o organizador
 * não deve ver o aviso visual, mas a idade ainda precisa respeitar a faixa do
 * ingresso (validação no input).
 *
 * Padrão `false`: o checkout PAGO não envolve este provider, então o badge
 * continua exibido normalmente. Só o container de cortesia envolve os steps com
 * `<IgnoreAgeLimitProvider>`, e cada componente lê `useIgnoreAgeLimit()` apenas
 * para omitir o badge (a validação de idade é independente deste flag).
 *
 * Espelha o padrão de `HidePricingContext`.
 */
const IgnoreAgeLimitContext = createContext(false);

export function IgnoreAgeLimitProvider({ children }: { children: ReactNode }) {
  return (
    <IgnoreAgeLimitContext.Provider value={true}>
      {children}
    </IgnoreAgeLimitContext.Provider>
  );
}

export function useIgnoreAgeLimit(): boolean {
  return useContext(IgnoreAgeLimitContext);
}
