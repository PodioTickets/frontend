"use client";

import { useSyncExternalStore } from "react";

/**
 * "Agora" OFICIAL da página do evento (abertura/encerramento das inscrições, "evento
 * realizado", contagens). NUNCA o relógio do dispositivo (`Date.now()`).
 *
 * A resposta de `GET /events/slug/:slug` traz `serverTime`; guardamos esse instante e
 * medimos só o tempo DECORRIDO com `performance.now()` (monotônico — mudar o relógio
 * do sistema não afeta). Cada refetch do evento re-sincroniza.
 */

let anchor: { serverMs: number; perfMs: number } | null = null;
const listeners = new Set<() => void>();

/** Chamado com o `serverTime` da resposta do evento. */
export function applyServerTime(serverIso: string | undefined): void {
  const serverMs = serverIso ? new Date(serverIso).getTime() : NaN;
  if (Number.isNaN(serverMs)) return;
  anchor = { serverMs, perfMs: performance.now() };
  listeners.forEach((l) => l());
}

/** "Agora" do servidor em ms (epoch), ou `null` se o evento ainda não chegou. */
export function serverNow(): number | null {
  if (!anchor) return null;
  return anchor.serverMs + (performance.now() - anchor.perfMs);
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getVersion() {
  return anchor ? anchor.serverMs - anchor.perfMs : 0;
}

/** Re-renderiza quando a hora do servidor chega/muda. `0` = ainda sem hora. */
export function useServerClock(): number {
  return useSyncExternalStore(subscribe, getVersion, () => 0);
}

/** Só para testes. */
export function __resetServerClockForTests(): void {
  anchor = null;
  listeners.clear();
}
