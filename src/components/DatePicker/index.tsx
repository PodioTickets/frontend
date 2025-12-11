"use client";

import * as React from "react";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "@/components/Icons/CalendarIcon";
import { cn } from "@/utils/cn";
import { ArrowButton } from "@/components/ArrowButton";

interface DatePickerProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  maxDate?: Date;
  minDate?: Date;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Selecione uma data",
  className,
  disabled = false,
  maxDate,
  minDate,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const selectedDate = value ? new Date(value) : undefined;

  const formatDate = (date: Date | undefined): string => {
    if (!date) return "";
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const handleSelect = (date: Date | undefined) => {
    if (date) {
      // Format as YYYY-MM-DD for input value
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const formattedDate = `${year}-${month}-${day}`;
      onChange?.(formattedDate);
      setIsOpen(false);
    }
  };

  const isDateDisabled = React.useCallback(
    (date: Date) => {
      if (maxDate) {
        const max = new Date(maxDate);
        max.setHours(23, 59, 59, 999);
        if (date > max) return true;
      }
      if (minDate) {
        const min = new Date(minDate);
        min.setHours(0, 0, 0, 0);
        if (date < min) return true;
      }
      // Disable future dates by default for date of birth
      if (!maxDate && !minDate) {
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        return date > today;
      }
      return false;
    },
    [maxDate, minDate]
  );

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "flex h-12 w-full items-center gap-2.5 rounded-lg border border-gray-6 bg-transparent px-3 text-left",
          disabled && "cursor-not-allowed opacity-50",
          !disabled && "cursor-pointer"
        )}
      >
        <CalendarIcon className="size-5 shrink-0 text-gray-11" />
        <span
          className={cn(
            "flex-1 text-base",
            value ? "text-gray-12" : "text-gray-11"
          )}
        >
          {value ? formatDate(selectedDate) : placeholder}
        </span>
        <ArrowButton isOpen={isOpen} />
      </button>

      {isOpen && (
        <div className="absolute top-[52px] z-50 rounded-lg border border-gray-6 bg-gray-1 shadow-[0px_2px_4px_0px_rgba(0,0,0,0.25)] p-2">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleSelect}
            disabled={isDateDisabled}
            captionLayout="dropdown"
            className="rounded-md border-0 bg-transparent"
            fromYear={1900}
            toYear={new Date().getFullYear()}
          />
        </div>
      )}
    </div>
  );
}

