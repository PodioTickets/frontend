"use client";

import React, { useRef, useEffect, useState } from "react";
import { cn } from "@/utils/cn";

interface OtpCodeInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: boolean;
}

export function OtpCodeInput({ value, onChange, disabled, error }: OtpCodeInputProps) {
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (value === "") {
      setDigits(["", "", "", "", "", ""]);
    }
  }, [value]);

  const updateDigit = (index: number, val: string) => {
    if (val && !/^\d$/.test(val)) return;
    const next = [...digits];
    next[index] = val;
    setDigits(next);
    onChange(next.join(""));
    if (val && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6).split("");
    if (!pasted.length) return;
    const next = ["", "", "", "", "", ""];
    pasted.forEach((d, i) => { next[i] = d; });
    setDigits(next);
    onChange(next.join(""));
    const focusIdx = next.findIndex((v) => !v);
    inputRefs.current[focusIdx === -1 ? 5 : focusIdx]?.focus();
  };

  return (
    <div className="flex gap-2 items-center justify-center w-full">
      {digits.map((digit, index) => (
        <React.Fragment key={index}>
          <input
            ref={(el) => { inputRefs.current[index] = el; }}
            type="text"
            inputMode="numeric"
            autoComplete={index === 0 ? "one-time-code" : "off"}
            aria-label={`Dígito ${index + 1} de 6`}
            maxLength={1}
            value={digit}
            onChange={(e) => updateDigit(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={index === 0 ? handlePaste : undefined}
            disabled={disabled}
            className={cn(
              "w-[52px] h-[52px] sm:w-[62px] sm:h-[62px] aspect-square bg-gray-2 border-2 rounded-lg text-center",
              "font-semibold text-[24px] sm:text-[28px] leading-[1.1] text-gray-11 font-manrope",
              "focus:outline-none focus:border-primary-10 focus:ring-2 focus:ring-primary-10/20",
              "transition-all duration-200 disabled:opacity-50",
              error ? "border-red-9" : "border-gray-6"
            )}
          />
          {index === 2 && (
            <div className="bg-gray-6 h-1 rounded-full w-2 shrink-0" />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
