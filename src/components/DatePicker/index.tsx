"use client";

import * as React from "react";
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

  const handleConfirm = () => {
    if (tempDate) {
      const year = tempDate.getFullYear();
      const month = String(tempDate.getMonth() + 1).padStart(2, "0");
      const day = String(tempDate.getDate()).padStart(2, "0");
      const dateString = `${year}-${month}-${day}`;
      onChange?.(dateString);
    }
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={`border border-gray-7 rounded-lg h-12 flex items-center justify-between px-3 w-full hover:bg-gray-3 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${className || ""
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
              className={`font-normal text-base leading-[1.3] font-dm-sans ${hideIcon ? "text-center" : "truncate"
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
              setTempDate(date);
            }}
            disabled={
              minDate || maxDate
                ? (date: Date) => {
                  if (minDate) {
                    const min = new Date(minDate);
                    min.setHours(0, 0, 0, 0);
                    const checkDate = new Date(date);
                    checkDate.setHours(0, 0, 0, 0);
                    if (checkDate < min) return true;
                  }
                  if (maxDate) {
                    const max = new Date(maxDate);
                    max.setHours(23, 59, 59, 999);
                    const checkDate = new Date(date);
                    checkDate.setHours(0, 0, 0, 0);
                    if (checkDate > max) return true;
                  }
                  return false;
                }
                : () => false
            }
            className="rounded-md border-0 bg-transparent w-full"
          />
          <div className="flex items-center justify-end">
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={!tempDate}
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
