import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "../Icons/CalendarIcon";
import { useState, useEffect, useMemo, useRef } from "react";
import { ArrowButton } from "../ArrowButton";
import { Button } from "../Button";

const formatDate = (date: Date | null | string) => {
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

export function DatePickerWithConfirm({
  value,
  onChange,
  error,
}: {
  value: Date | null | string;
  onChange: (date: Date | null) => void;
  error?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);

  // Helper function to parse value to Date
  const parseValueToDate = (val: Date | null | string): Date | null => {
    if (!val) return null;

    // If it's already a Date, use it
    if (val instanceof Date) {
      if (isNaN(val.getTime())) return null;
      return val;
    }

    // If it's a string in YYYY-MM-DD format, parse it manually to avoid timezone issues
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

  // Convert value to Date - parse it directly
  // Use stable key for comparison but parse the actual value
  const valueStableKey = value instanceof Date 
    ? value.getTime() 
    : typeof value === "string" 
      ? value 
      : null;

  const validDate = useMemo(() => {
    return parseValueToDate(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valueStableKey]);

  const [tempDate, setTempDate] = useState<Date | undefined>(
    validDate || undefined
  );

  const prevIsOpenRef = useRef(isOpen);
  const validDateRef = useRef(validDate);

  // Keep ref updated
  useEffect(() => {
    validDateRef.current = validDate;
  }, [validDate]);

  // Update tempDate when popover opens (transitions from closed to open)
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      // Popover just opened, sync tempDate with current validDate
      setTempDate(validDateRef.current || undefined);
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen]); // Only depend on isOpen to avoid loops

  // Update tempDate when validDate changes (but only when popover is closed)
  useEffect(() => {
    if (!isOpen && validDate) {
      setTempDate((prev) => {
        // Only update if the date is actually different
        if (!prev || prev.getTime() !== validDate.getTime()) {
          return validDate;
        }
        return prev;
      });
    }
  }, [validDate, isOpen]);

  const handleConfirm = () => {
    if (tempDate) {
      onChange(tempDate);
    }
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`border rounded-lg h-12 flex items-center justify-between px-3 w-full hover:bg-gray-3 transition-colors cursor-pointer ${
            error ? "border-red-9" : "border-gray-7"
          }`}
        >
          <div className="flex gap-1 items-center flex-1 min-w-0">
            <CalendarIcon className="w-5 h-5 text-gray-11 shrink-0" />
            <span
              className={`font-normal text-base leading-[1.3] font-family-dm-sans truncate ${
                validDate ? "text-gray-12" : "text-gray-11"
              }`}
            >
              {formatDate(validDate)}
            </span>
          </div>
          <div className="flex-none -scale-y-100 shrink-0">
            <ArrowButton isOpen={isOpen} />
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2 z-[100000]" align="start">
        <div className="space-y-4">
          <Calendar
            mode="single"
            captionLayout="dropdown"
            fromYear={1900}
            toYear={new Date().getFullYear()}
            selected={tempDate}
            onSelect={(date: Date | undefined) => {
              setTempDate(date);
            }}
            disabled={(date: Date) => {
              const today = new Date();
              today.setHours(23, 59, 59, 999);
              return date > today;
            }}
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
