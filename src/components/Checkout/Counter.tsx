"use client";

import { Minus, Plus } from "lucide-react";

interface CounterProps {
  value: number;
  onDecrease: () => void;
  onIncrease: () => void;
  min?: number;
  max?: number;
  disabled?: boolean;
}

export function Counter({
  value,
  onDecrease,
  onIncrease,
  min = 0,
  max,
  disabled = false,
}: CounterProps) {
  const canDecrease = value > min && !disabled;
  const canIncrease = max === undefined || value < max;

  return (
    <div className="flex items-center gap-2 bg-primary-4 rounded-full p-2">
      <button
        type="button"
        onClick={onDecrease}
        disabled={!canDecrease}
        className={`
          w-8 h-8 rounded-full flex items-center justify-center
          transition-all ease-in-out duration-200
          ${
            canDecrease
              ? "bg-gray-12 hover:bg-gray-11 text-gray-12 cursor-pointer"
              : "bg-gray-10 text-gray-8 cursor-not-allowed"
          }
        `}
        aria-label="Diminuir quantidade"
      >
        <Minus className="size-4 text-gray-2" />
      </button>
      <span className="w-8 text-center text-sm font-semibold text-gray-12">
        {value}
      </span>
      <button
        type="button"
        onClick={onIncrease}
        disabled={!canIncrease || disabled}
        className={`
          w-8 h-8 rounded-full flex items-center justify-center
          transition-all ease-in-out duration-200
          ${
            canIncrease && !disabled
              ? "bg-gray-12 hover:bg-gray-11 text-gray-12 cursor-pointer"
              : "bg-gray-12 text-gray-8 cursor-not-allowed"
          }
        `}
        aria-label="Aumentar quantidade"
      >
        <Plus className="size-4 text-gray-2" />
      </button>
    </div>
  );
}

