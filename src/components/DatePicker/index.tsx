"use client";

import * as React from "react";
import type { Matcher } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "@/components/Icons/CalendarIcon";
import { ArrowButton } from "@/components/ArrowButton";
import { Button } from "../Button";

const formatDate = (date: Date | null | string | undefined): string => {
  if (!date) return "00/00/0000";

  let dateObj: Date;

  if (date instanceof Date) {
    dateObj = date;
  } else if (typeof date === "string") {
    // If it's a string in YYYY-MM-DD format, parse it manually to avoid timezone issues
    const parts = date.split("-");
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
      const day = parseInt(parts[2], 10);

      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        // Create date using local timezone (not UTC)
        dateObj = new Date(year, month, day);

        // Validate that the date is correct
        if (
          dateObj.getFullYear() === year &&
          dateObj.getMonth() === month &&
          dateObj.getDate() === day
        ) {
          // Date is valid, use it
        } else {
          return "00/00/0000";
        }
      } else {
        return "00/00/0000";
      }
    } else {
      // Fallback to standard Date parsing
      dateObj = new Date(date);
    }
  } else {
    return "00/00/0000";
  }

  if (isNaN(dateObj.getTime())) return "00/00/0000";

  const day = String(dateObj.getDate()).padStart(2, "0");
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const year = dateObj.getFullYear();
  return `${day}/${month}/${year}`;
};

interface DatePickerProps {
  value?: string | Date | null;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  hideIcon?: boolean;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "00/00/0000",
  className,
  disabled = false,
  minDate,
  maxDate,
  hideIcon = false,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  // Helper function to parse value to Date
  const parseValueToDate = (
    val: Date | null | string | undefined
  ): Date | null => {
    if (!val) return null;

    // If it's already a Date, use it
    if (val instanceof Date) {
      if (isNaN(val.getTime())) return null;
      return val;
    }

    if (typeof val === "string") {
      const parts = val.split("-");
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
        const day = parseInt(parts[2], 10);

        if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
          // Create date using local timezone (not UTC)
          const dateValue = new Date(year, month, day);

          // Validate that the date is correct
          if (
            dateValue.getFullYear() === year &&
            dateValue.getMonth() === month &&
            dateValue.getDate() === day
          ) {
            return dateValue;
          }
        }
      }

      // Fallback to standard Date parsing if format doesn't match
      const dateValue = new Date(val);
      if (isNaN(dateValue.getTime())) return null;
      return dateValue;
    }

    return null;
  };

  const validDate = React.useMemo(() => {
    return parseValueToDate(value);
  }, [value]);

  const [tempDate, setTempDate] = React.useState<Date | undefined>(
    validDate || undefined
  );

  React.useEffect(() => {
    if (value) {
      const parsed = parseValueToDate(value);
      setTempDate(parsed || undefined);
    } else {
      setTempDate(undefined);
    }
  }, [value]);

  const rangeMatchers = React.useMemo((): Matcher | Matcher[] | undefined => {
    const list: Matcher[] = [];
    if (minDate) {
      const d = new Date(minDate);
      d.setHours(0, 0, 0, 0);
      list.push({ before: d });
    }
    if (maxDate) {
      const d = new Date(maxDate);
      d.setHours(23, 59, 59, 999);
      list.push({ after: d });
    }
    if (list.length === 0) return undefined;
    return list.length === 1 ? list[0] : list;
  }, [minDate, maxDate]);

  /** Sempre deixar `disablePastDates` no Calendar (default true): o Calendar soma `{ before: hoje }` aos matchers de min/max. */
  const startOfLocalDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate());

  const isSelectionAllowed = (d: Date): boolean => {
    const day = startOfLocalDay(d);
    const today = startOfLocalDay(new Date());
    if (day < today) return false;
    if (minDate) {
      const min = startOfLocalDay(new Date(minDate));
      if (day < min) return false;
    }
    if (maxDate) {
      const max = startOfLocalDay(new Date(maxDate));
      if (day > max) return false;
    }
    return true;
  };

  const confirmDisabled = !tempDate || !isSelectionAllowed(tempDate);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open && value) {
      const parsed = parseValueToDate(value);
      if (parsed && !isSelectionAllowed(parsed)) {
        setTempDate(undefined);
      }
    }
  };

  const handleConfirm = () => {
    if (tempDate && isSelectionAllowed(tempDate)) {
      const year = tempDate.getFullYear();
      const month = String(tempDate.getMonth() + 1).padStart(2, "0");
      const day = String(tempDate.getDate()).padStart(2, "0");
      const dateString = `${year}-${month}-${day}`;
      onChange?.(dateString);
    }
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={`border border-gray-6 rounded-lg h-12 flex items-center justify-between px-3 w-full hover:bg-gray-3 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${className || ""
            }`}
        >
          <div
            className={`flex gap-2 items-center flex-1 min-w-0 ${hideIcon ? "justify-center" : ""
              }`}
          >
            {!hideIcon && (
              <CalendarIcon className="w-5 h-5 text-gray-11 shrink-0" />
            )}
            <span
              className={`font-normal text-base leading-[1.3] font-family-dm-sans ${hideIcon ? "text-center" : "truncate"
                } ${validDate ? "text-gray-12" : "text-gray-11"}`}
            >
              {validDate ? formatDate(validDate) : placeholder}
            </span>
          </div>
          {/*  <div className="flex-none shrink-0">
            <ArrowButton isOpen={isOpen} />
          </div> */}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2 z-100000" align="start">
        <div className="space-y-4">
          <Calendar
            mode="single"
            captionLayout="dropdown"
            fromYear={new Date().getFullYear() - 10}
            toYear={new Date().getFullYear() + 10}
            selected={tempDate}
            onSelect={(date: Date | undefined) => {
              if (date && isSelectionAllowed(date)) {
                setTempDate(date);
              } else if (!date) {
                setTempDate(undefined);
              }
            }}
            disabled={rangeMatchers}
            className="rounded-md border-0 bg-transparent w-full"
          />
          <div className="flex items-center justify-end">
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={confirmDisabled}
              className="w-1/2 h-8 text-xs"
            >
              Confirmar
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
