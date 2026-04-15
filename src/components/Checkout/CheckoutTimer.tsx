"use client";

import { cn } from "@/utils/cn";
import {
  formatRemaining,
  useCheckoutTimer,
} from "@/contexts/CheckoutTimerContext";

interface CheckoutTimerProps {
  className?: string;
  compact?: boolean;
}

export function CheckoutTimer({ className, compact }: CheckoutTimerProps) {
  const { isActive, remainingMs } = useCheckoutTimer();

  if (!isActive) return null;

  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center gap-1.5 rounded-lg px-2 py-1 font-family-dm-sans text-xs font-semibold bg-gray-3 text-gray-12",
          className,
        )}
        role="timer"
        aria-live="polite"
        aria-label="Tempo restante da reserva"
      >
        <span className="text-gray-11">Restante:</span>
        <span className="tabular-nums">{formatRemaining(remainingMs)}</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 rounded-xl p-3 font-family-dm-sans text-sm font-semibold transition-colors bg-gray-3 text-gray-12 w-[180px]",
        className,
      )}
      role="timer"
      aria-live="polite"
      aria-label="Tempo restante da reserva"
    >
      <div className="flex items-center gap-2 w-full">
        <span className="text-gray-11">Tempo restante:</span>
        <span className="tabular-nums">{formatRemaining(remainingMs)}</span>
      </div>

      <div className="w-full bg-gray-7 h-4 rounded-full">
        <div className="bg-primary-11 h-full rounded-full" style={{ width: `${Math.min(100, (remainingMs / (30 * 60 * 1000)) * 100)}%` }}></div>
      </div>
    </div>
  );
}
