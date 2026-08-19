"use client";

import { createContext, useContext, type ReactNode } from "react";

/**
 * Sinaliza que o fluxo atual deve IGNORAR a restrição de idade dos ingressos
 * reusados do checkout — tanto o BADGE "Limite de idade: …" quanto a REGRA de
 * validação (idade do participante vs. faixa do ingresso).
 *
 * Usado no fluxo de CORTESIA do organizador ("adicionar inscrito"): o organizador
 * inscreve manualmente e não deve ser barrado (nem ver o aviso) por faixa etária.
 *
 * Padrão `false`: o checkout PAGO não envolve este provider, então a idade
 * continua exibida e validada normalmente. Só o container de cortesia envolve os
 * steps com `<IgnoreAgeLimitProvider>`, e cada componente lê `useIgnoreAgeLimit()`
 * para omitir o badge / pular a checagem de idade (mantendo o resto intacto).
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
