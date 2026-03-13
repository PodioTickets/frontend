"use client";

import * as React from "react";
import { Calendar } from "@/components/ui/calendar";
import type { DateRange } from "react-day-picker";
import { cn } from "@/utils/cn";

interface DateRangePickerProps {
  onSelect?: (range: DateRange | undefined) => void;
  className?: string;
  value?: DateRange | undefined;
  /** Se true, permite selecionar datas passadas. Útil para filtros (ex.: inscrições por período). */
  allowPastDates?: boolean;
}

export function DateRangePicker({ onSelect, className, value, allowPastDates }: DateRangePickerProps) {
  const [date, setDate] = React.useState<DateRange | undefined>(value);
  const [isMobile, setIsMobile] = React.useState(false);
  
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);
  
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
        numberOfMonths={isMobile ? 1 : 2}
        className="rounded-md border-0 bg-transparent"
        disablePastDates={!allowPastDates}
      />
    </div>
  );
}
