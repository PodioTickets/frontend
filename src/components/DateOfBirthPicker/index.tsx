"use client";

import * as React from "react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "@/components/Icons/CalendarIcon";
import { cn } from "@/utils/cn";
import { ArrowButton } from "@/components/ArrowButton";

interface DateOfBirthPickerProps {
  value?: string | Date | null;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  icon?: boolean;
}

export function DateOfBirthPicker({
  value,
  onChange,
  placeholder = "00/00/0000",
  className,
  icon = true,
  disabled = false,
}: DateOfBirthPickerProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");
  const [previousInputValue, setPreviousInputValue] = React.useState("");
  const isInternalChangeRef = React.useRef(false);

  // Parse YYYY-MM-DD to Date using local timezone (not UTC)
  const parseValueToDate = React.useCallback(
    (dateString: string | Date | null | undefined): Date | undefined => {
      if (!dateString) return undefined;
      
      // If it's already a Date, return it
      if (dateString instanceof Date) {
        // Validate the date
        if (isNaN(dateString.getTime())) return undefined;
        return dateString;
      }
      
      // If it's a string, parse it
      if (typeof dateString !== 'string') return undefined;
      
      const parts = dateString.split("-");
      if (parts.length !== 3) return undefined;

      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
      const day = parseInt(parts[2], 10);

      if (isNaN(year) || isNaN(month) || isNaN(day)) return undefined;

      // Create date using local timezone (not UTC)
      const date = new Date(year, month, day);

      // Validate that the date is correct
      if (
        date.getFullYear() !== year ||
        date.getMonth() !== month ||
        date.getDate() !== day
      ) {
        return undefined;
      }

      return date;
    },
    []
  );

  const selectedDate = value ? parseValueToDate(value) : undefined;

  // Format Date to DD/MM/YYYY
  const formatDate = React.useCallback((date: Date): string => {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }, []);

  // Initialize input value from prop (only when value changes externally)
  React.useEffect(() => {
    // Skip if this change was triggered internally (by user typing)
    if (isInternalChangeRef.current) {
      isInternalChangeRef.current = false;
      return;
    }

    if (value) {
      const date = parseValueToDate(value);
      if (date) {
        const formatted = formatDate(date);
        setInputValue(formatted);
        setPreviousInputValue(formatted);
      } else {
        setInputValue("");
        setPreviousInputValue("");
      }
    } else {
      setInputValue("");
      setPreviousInputValue("");
    }
  }, [value, formatDate, parseValueToDate]);

  // Check if year is leap year
  const isLeapYear = (year: number): boolean => {
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  };

  // Get max days for a month
  const getMaxDaysInMonth = (month: number, year?: number): number => {
    const monthIndex = month - 1; // Convert to 0-indexed
    const daysInMonth = [
      31, // January
      28, // February (will be 29 if leap year)
      31, // March
      30, // April
      31, // May
      30, // June
      31, // July
      31, // August
      30, // September
      31, // October
      30, // November
      31, // December
    ];

    if (monthIndex === 1 && year && isLeapYear(year)) {
      return 29; // February in leap year
    }

    return daysInMonth[monthIndex] || 31;
  };

  // Validate day based on month and year
  const validateDay = (day: number, month: number, year?: number): boolean => {
    if (day < 1 || day > 31) return false;
    if (month < 1 || month > 12) return true; // Can't validate day without valid month
    const maxDays = getMaxDaysInMonth(month, year);
    return day <= maxDays;
  };

  // Validate year
  const validateYear = (year: number): boolean => {
    const currentYear = new Date().getFullYear();
    return year >= 1900 && year <= currentYear;
  };

  // Mask function for DD/MM/YYYY with validation
  const maskDate = (value: string, previousValue: string = ""): string => {
    // Remove everything that's not a digit
    const numbers = value.replace(/\D/g, "");
    const prevNumbers = previousValue.replace(/\D/g, "");

    // If deleting, allow it
    if (numbers.length < prevNumbers.length) {
      if (numbers.length <= 2) return numbers;
      if (numbers.length <= 4)
        return `${numbers.slice(0, 2)}/${numbers.slice(2)}`;
      return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(
        4,
        8
      )}`;
    }

    // Apply mask with validation
    let day = "";
    let month = "";
    let year = "";

    if (numbers.length > 0) {
      day = numbers.slice(0, 2);
      // Validate first digit of day (can't be > 3)
      if (numbers.length === 1) {
        const firstDigit = parseInt(numbers[0], 10);
        if (firstDigit > 3) {
          // Invalid first digit (can't be 4, 5, 6, 7, 8, 9)
          return previousValue;
        }
      }
      // Validate complete day (1-31)
      if (day.length === 2) {
        const dayNum = parseInt(day, 10);
        if (dayNum > 31 || dayNum < 1) {
          // Invalid day, keep previous value
          return previousValue;
        }
      }
    }

    if (numbers.length > 2) {
      month = numbers.slice(2, 4);
      // Validate first digit of month (can't be > 1)
      if (numbers.length === 3) {
        const firstDigit = parseInt(numbers[2], 10);
        if (firstDigit > 1) {
          // Invalid first digit (can't be 2, 3, 4, etc)
          return previousValue;
        }
      }
      // Validate complete month (1-12)
      if (month.length === 2) {
        const monthNum = parseInt(month, 10);
        if (monthNum > 12 || monthNum < 1) {
          // Invalid month, keep previous value
          return previousValue;
        }

        // Validate day against month
        if (day.length === 2) {
          const dayNum = parseInt(day, 10);
          if (!validateDay(dayNum, monthNum)) {
            // Invalid day for this month, keep previous value
            return previousValue;
          }
        }
      }
    }

    if (numbers.length > 4) {
      year = numbers.slice(4, 8);
      // Validate year as user types
      if (year.length >= 4) {
        const yearNum = parseInt(year, 10);
        if (!validateYear(yearNum)) {
          // Invalid year, keep previous value
          return previousValue;
        }

        // Validate day against month and year (for February leap years)
        if (day.length === 2 && month.length === 2) {
          const dayNum = parseInt(day, 10);
          const monthNum = parseInt(month, 10);
          if (!validateDay(dayNum, monthNum, yearNum)) {
            // Invalid day for this month/year, keep previous value
            return previousValue;
          }
        }
      }
    }

    // Build masked string
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 4)
      return `${numbers.slice(0, 2)}/${numbers.slice(2)}`;
    return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(
      4,
      8
    )}`;
  };

  // Parse DD/MM/YYYY to Date
  const parseDate = (dateString: string): Date | null => {
    const parts = dateString.split("/");
    if (parts.length !== 3) return null;

    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
    const year = parseInt(parts[2], 10);

    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
    if (day < 1 || day > 31) return null;
    if (month < 0 || month > 11) return null;
    if (year < 1900 || year > new Date().getFullYear()) return null;

    const date = new Date(year, month, day);

    // Validate date (e.g., check if Feb 30 is invalid)
    if (
      date.getDate() !== day ||
      date.getMonth() !== month ||
      date.getFullYear() !== year
    ) {
      return null;
    }

    // Check if date is in the future
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (date > today) return null;

    return date;
  };

  // Convert Date to YYYY-MM-DD format
  const dateToStorageFormat = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    const masked = maskDate(newValue, previousInputValue);

    // Only update if masked value is different (validation passed)
    if (masked !== previousInputValue) {
      setInputValue(masked);
      setPreviousInputValue(masked);

      // If complete date (DD/MM/YYYY), parse and update
      if (masked.length === 10) {
        const parsedDate = parseDate(masked);
        if (parsedDate) {
          const storageFormat = dateToStorageFormat(parsedDate);
          // Only call onChange if the value actually changed
          // This prevents unnecessary re-renders and date reformatting
          if (storageFormat !== value) {
            isInternalChangeRef.current = true;
            onChange?.(storageFormat);
          }
        } else {
          // Invalid date, clear onChange but keep input for user to correct
          if (value) {
            isInternalChangeRef.current = true;
            onChange?.("");
          }
        }
      } else if (masked.length === 0) {
        // Clear value if input is empty
        if (value) {
          isInternalChangeRef.current = true;
          onChange?.("");
        }
      }
    }
    // If validation failed, input value stays the same (previousInputValue)
  };

  const handleInputBlur = () => {
    // Validate and format on blur
    if (inputValue.length > 0 && inputValue.length < 10) {
      // Invalid date, clear it
      setInputValue("");
      onChange?.("");
    } else if (inputValue.length === 10) {
      const parsedDate = parseDate(inputValue);
      if (!parsedDate) {
        // Invalid date, clear it
        setInputValue("");
        onChange?.("");
      }
    }
  };

  const handleSelect = (date: Date | undefined) => {
    if (date) {
      const formattedDate = dateToStorageFormat(date);
      isInternalChangeRef.current = true;
      onChange?.(formattedDate);
      setInputValue(formatDate(date));
      setPreviousInputValue(formatDate(date));
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className="relative w-full">
        <div className="relative flex items-center">
          {icon && (
            <CalendarIcon className="absolute left-3 size-5 shrink-0 text-gray-11 pointer-events-none z-10" />
          )}
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            disabled={disabled}
            placeholder={placeholder}
            maxLength={10}
            className={cn(
              "flex h-12 w-full items-center gap-2.5 rounded-lg border border-gray-6 bg-transparent px-3 text-left hover:bg-gray-3 focus:bg-gray-3 focus:outline-none focus:border-primary-10 transition-colors text-base font-normal font-dm-sans",
              icon && "pl-10",
              "pr-10",
              disabled && "cursor-not-allowed opacity-50",
              !disabled && "cursor-text",
              inputValue ? "text-gray-12" : "text-gray-11",
              className
            )}
            onKeyDown={(e) => {
              // Prevent invalid characters
              const key = e.key;
              if (
                !/[0-9]/.test(key) &&
                key !== "Backspace" &&
                key !== "Delete" &&
                key !== "Tab" &&
                key !== "ArrowLeft" &&
                key !== "ArrowRight" &&
                key !== "ArrowUp" &&
                key !== "ArrowDown" &&
                !(e.ctrlKey || e.metaKey) // Allow Ctrl/Cmd + A, C, V, etc.
              ) {
                e.preventDefault();
              }
            }}
          />
        </div>
      </div>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleSelect}
          captionLayout="dropdown"
          fromYear={1900}
          toYear={new Date().getFullYear()}
          disabled={(date: Date) => {
            const today = new Date();
            today.setHours(23, 59, 59, 999);
            return date > today;
          }}
          className="rounded-md border-0 bg-transparent"
        />
      </PopoverContent>
    </Popover>
  );
}
