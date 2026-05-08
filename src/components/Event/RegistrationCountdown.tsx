"use client";

import { useEffect } from "react";
import { useCountdown } from "@/hooks/useCountdown";

interface RegistrationCountdownProps {
  /** Momento em que as inscrições abrem. */
  targetDate: Date | null;
  /**
   * Texto fallback exibido durante SSR e até o primeiro tick no client.
   * Evita hydration mismatch e flash de "00h 00m 00s" antes do useEffect rodar.
   */
  fallbackText: string;
  /**
   * Disparado no instante em que o cronômetro chega a zero. Útil para o
   * caller revalidar a UI (ex.: invalidar a query do evento e re-avaliar
   * `registrationsNotOpenYet`).
   */
  onExpire?: () => void;
  className?: string;
}

const pad = (n: number) => String(n).padStart(2, "0");

export function RegistrationCountdown({
  targetDate,
  fallbackText,
  onExpire,
  className,
}: RegistrationCountdownProps) {
  const { days, hours, minutes, isReady, isExpired } =
    useCountdown(targetDate);

  useEffect(() => {
    if (isReady && isExpired && onExpire) {
      onExpire();
    }
  }, [isReady, isExpired, onExpire]);

  if (!isReady) {
    return <span className={className}>{fallbackText}</span>;
  }

  if (isExpired) {
    return <span className={className}>agora</span>;
  }

  const formatted =
    days > 0
      ? `${days} dias : ${pad(hours)} horas : ${pad(minutes)} minutos`
      : `${pad(hours)} horas : ${pad(minutes)} minutos`;

  return (
    <span
      className={className}
      // tabular-nums evita "saltos" de largura quando dígitos mudam.
      style={{ fontVariantNumeric: "tabular-nums" }}
      aria-live="polite"
    >
      {formatted}
    </span>
  );
}
