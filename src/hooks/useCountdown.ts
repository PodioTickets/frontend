"use client";

import { useEffect, useState } from "react";

export interface CountdownState {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
  isExpired: boolean;
  /**
   * Falso no primeiro render (SSR e antes do mount no client) para evitar
   * hydration mismatch — caller pode renderizar um fallback estático até cá.
   */
  isReady: boolean;
}

const INITIAL: CountdownState = {
  days: 0,
  hours: 0,
  minutes: 0,
  seconds: 0,
  totalMs: 0,
  isExpired: false,
  isReady: false,
};

function compute(targetMs: number): CountdownState {
  const totalMs = Math.max(0, targetMs - Date.now());
  const totalSeconds = Math.floor(totalMs / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    totalMs,
    isExpired: totalMs === 0,
    isReady: true,
  };
}

/**
 * Cronômetro regressivo até `target`. Atualiza a cada segundo enquanto a aba
 * estiver ativa (browsers throttlam intervals em background — re-sincroniza
 * via `visibilitychange` ao voltar ao foco para evitar drift visível).
 *
 * Custo por instância: 1 setInterval + re-render do consumer a cada segundo.
 * Use com componentes isolados para evitar re-render cascata.
 */
export function useCountdown(target: Date | null | undefined): CountdownState {
  const targetMs = target?.getTime();
  const validTarget =
    typeof targetMs === "number" && !Number.isNaN(targetMs) ? targetMs : null;

  const [state, setState] = useState<CountdownState>(INITIAL);

  useEffect(() => {
    if (validTarget === null) {
      setState(INITIAL);
      return;
    }
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      setState(compute(validTarget));
    };
    tick();
    const id = window.setInterval(tick, 1000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [validTarget]);

  return state;
}
