"use client";

import { useEffect, useState } from "react";
import { serverNow, useServerClock } from "@/lib/serverClock";

/** Teto do `setTimeout` (2^31 − 1 ms ≈ 24,8 dias); acima disso ele dispara na hora. */
const MAX_TIMEOUT_MS = 2_147_483_647;

/**
 * "Agora" OFICIAL (hora do servidor — ver `lib/serverClock`) que re-renderiza quando
 * o relógio CRUZA um dos instantes informados (ms). `null` enquanto a hora do
 * servidor não chegou: o chamador NÃO pode cair no relógio do dispositivo.
 *
 * Por que existe: o estado do CTA do evento ("Em breve!" → "Inscreva-se" →
 * "Inscrições encerradas!") é derivado do "agora", mas nada re-renderizava a tela
 * quando a contagem zerava. Invalidar a query não resolve: o React Query preserva a
 * referência do dado quando o servidor devolve o mesmo JSON (structural sharing).
 *
 * Performance: um único `setTimeout` agendado para o PRÓXIMO limite — sem tick por
 * segundo. Cada re-sincronização do relógio (refetch do evento) reagenda.
 */
export function useNowAtBoundaries(
  boundaries: ReadonlyArray<number | null | undefined>,
): number | null {
  const clockVersion = useServerClock();
  const [tick, setTick] = useState(0);
  // Chave estável: o array é recriado a cada render do chamador.
  const key = boundaries
    .filter((b): b is number => typeof b === "number" && Number.isFinite(b))
    .join(",");

  useEffect(() => {
    const current = serverNow();
    if (current === null) return;

    const next = key
      .split(",")
      .filter(Boolean)
      .map(Number)
      .filter((b) => b > current)
      .sort((a, b) => a - b)[0];
    if (next === undefined) return;

    // +50ms: garante que `agora >= limite` já seja verdade no re-render.
    const timer = setTimeout(
      () => setTick((t) => t + 1),
      Math.min(next - current + 50, MAX_TIMEOUT_MS),
    );
    return () => clearTimeout(timer);
    // `tick` reagenda o próximo limite depois de cada cruzamento.
  }, [key, tick, clockVersion]);

  return clockVersion === 0 ? null : serverNow();
}
