"use client";

import * as React from "react";
import { Calendar } from "@/components/ui/calendar";
import type { DateRange } from "react-day-picker";
import { cn } from "@/utils/cn";

interface DateRangePickerProps {
  onSelect?: (range: DateRange | undefined) => void;
  className?: string;
  value?: DateRange | undefined;
}

export function DateRangePicker({ onSelect, className, value }: DateRangePickerProps) {
  const [date, setDate] = React.useState<DateRange | undefined>(value);
  
  React.useEffect(() => {
    setDate(value);
  }, [value]);

  const handleSelect = (range: DateRange | undefined) => {
    setDate(range);
    if (onSelect) {
      onSelect(range);
    }
  };

  return (
    <div className={cn("p-2 transition-all duration-300", className)}>
      <Calendar
        mode="range"
        defaultMonth={date?.from}
        selected={date}
        onSelect={handleSelect}
        numberOfMonths={2}
        className="rounded-md border-0 bg-transparent"
      />
    </div>
  );
}
