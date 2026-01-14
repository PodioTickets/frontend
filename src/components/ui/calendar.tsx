"use client";

import * as React from "react";
import { ChevronLeftIcon, ChevronRightIcon, ChevronDownIcon } from "lucide-react";
import {
  DayPicker,
  getDefaultClassNames,
  type MonthCaptionProps,
  type DayButtonProps,
  useDayPicker,
  type DropdownProps,
} from "react-day-picker";

import { cn } from "@/utils/cn";
import { buttonVariants } from "@/components/Button";
import { Button } from "@/components/Button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function CalendarDayButton({ day, modifiers, ...props }: DayButtonProps) {
  const isSelected = modifiers.selected || modifiers.range_start || modifiers.range_end;
  const isRangeStart = modifiers.range_start;
  const isRangeEnd = modifiers.range_end;
  const isRangeMiddle = modifiers.range_middle;
  const isDisabled = modifiers.disabled;
  const isOutside = modifiers.outside;

  return (
    <button
      {...props}
      className={cn(
        buttonVariants({ variant: "ghost" }),
        "h-9! w-9! p-0! font-normal! text-gray-12 rounded-md!",
        "transition-all duration-200 ease-out",
        "hover:bg-primary-9 hover:text-primary-1 hover:scale-110 active:scale-95",
        "focus-visible:ring-2 focus-visible:ring-primary-9 focus-visible:ring-offset-2",
        "transform-gpu will-change-transform",
        isSelected && "rounded-md! bg-primary-9 text-primary-1 animate-in fade-in duration-200",
        isRangeStart && "rounded-md! bg-primary-9 text-primary-1 animate-in fade-in duration-200",
        isRangeEnd && "rounded-md! bg-primary-9 text-primary-1 animate-in fade-in duration-200",
        isRangeMiddle && "rounded-md! bg-gray-4 text-gray-12 transition-all duration-200",
        isOutside && "text-gray-11 opacity-50",
        isDisabled && "opacity-50 cursor-not-allowed"
      )}
    >
      {day.date.getDate()}
    </button>
  );
}

function CalendarCaption({
  calendarMonth,
  displayIndex,
  ...props
}: MonthCaptionProps) {
  const { goToMonth, previousMonth, nextMonth, months } = useDayPicker();
  const numberOfMonths = months.length;
  const isFirstMonth = displayIndex === 0;
  const isLastMonth = displayIndex === numberOfMonths - 1;

  const handlePreviousClick = () => {
    if (previousMonth) {
      goToMonth(previousMonth);
    }
  };

  const handleNextClick = () => {
    if (nextMonth) {
      goToMonth(nextMonth);
    }
  };

  return (
    <div
      {...props}
      className="flex items-center justify-between w-full relative"
    >
      {isFirstMonth ? (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 p-0 text-gray-11 hover:text-gray-12 hover:bg-gray-4 transition-all duration-200 hover:scale-110 active:scale-95"
          onClick={handlePreviousClick}
          disabled={!previousMonth}
          aria-label="Mês anterior"
        >
          <ChevronLeftIcon className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
        </Button>
      ) : (
        <div className="w-7" />
      )}
      <h2 className="text-sm font-medium text-gray-12 absolute left-1/2 -translate-x-1/2 transition-all duration-300">
        {calendarMonth.date.toLocaleDateString("pt-BR", {
          month: "long",
          year: "numeric",
        })}
      </h2>
      {isLastMonth ? (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 p-0 text-gray-11 hover:text-gray-12 hover:bg-gray-4 ml-auto transition-all duration-200 hover:scale-110 active:scale-95"
          onClick={handleNextClick}
          disabled={!nextMonth}
          aria-label="Próximo mês"
        >
          <ChevronRightIcon className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
        </Button>
      ) : (
        <div className="w-7 ml-auto" />
      )}
    </div>
  );
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout,
  disabled: customDisabled,
  ...props
}: CalendarProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const defaultIsDateDisabled = (date: Date) => {
    const dateToCheck = new Date(date);
    dateToCheck.setHours(0, 0, 0, 0);
    return dateToCheck < today;
  };

  const isDateDisabled = customDisabled || defaultIsDateDisabled;

  // Components configuration
  const components = {
    DayButton: CalendarDayButton,
    Chevron: ({ orientation, className, ...props }: { orientation?: "left" | "right" | "up" | "down"; className?: string; size?: number; disabled?: boolean }) => {
      if (orientation === "left") {
        return <ChevronLeftIcon className={cn("h-4 w-4", className)} {...props} />;
      }
      if (orientation === "right") {
        return <ChevronRightIcon className={cn("h-4 w-4", className)} {...props} />;
      }
      return <ChevronDownIcon className={cn("h-3.5 w-3.5 text-gray-11", className)} {...props} />;
    },
    ...(captionLayout !== "dropdown" && { MonthCaption: CalendarCaption }),
  };

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      disabled={isDateDisabled}
      captionLayout={captionLayout}
      className={cn("", className)}
      formatters={
        captionLayout === "dropdown"
          ? {
              formatMonthDropdown: (date: Date) =>
                date.toLocaleDateString("pt-BR", { month: "long" }),
              formatYearDropdown: (date: Date) => date.getFullYear().toString(),
            }
          : undefined
      }
      classNames={{
        months: "flex flex-col sm:flex-row gap-4 transition-all duration-300",
        month: "space-y-4 transition-all duration-300",
        caption:
          captionLayout === "dropdown"
            ? "flex justify-center items-center pt-1 relative mb-1"
            : "flex justify-between items-center pt-1 relative mb-1",
        caption_label:
          captionLayout === "dropdown"
            ? "hidden"
            : "text-sm font-medium text-gray-12",
        dropdowns:
          captionLayout === "dropdown"
            ? "flex h-8 w-full items-center justify-center gap-1.5 text-sm font-medium [&>*:nth-child(n+3)]:hidden"
            : "hidden",
        dropdown_root:
          captionLayout === "dropdown"
            ? "relative rounded-md border border-gray-7 bg-gray-1 shadow-sm has-focus:border-primary-9 has-focus:ring-primary-9/50 has-focus:ring-[3px] transition-all min-w-[120px] h-8"
            : "hidden",
        dropdown:
          captionLayout === "dropdown"
            ? "w-full h-full cursor-pointer appearance-none bg-transparent border-0 outline-none focus:border-0 focus:outline-none focus-visible:border-0 focus-visible:outline-none text-sm font-medium text-gray-12 px-2 pr-7"
            : "hidden",
        nav: "hidden",
        button_previous: "hidden",
        button_next: "hidden",
        month_caption: "flex items-center justify-center pt-1",
        month_grid: "w-full border-collapse space-y-1",
        weekdays: "flex",
        weekday:
          "text-gray-11 rounded w-9 font-normal text-[0.8rem] transition-colors duration-200",
        week: "flex w-full mt-2 gap-0.5",
        day: "h-9 w-9 text-center text-sm p-0 relative focus-within:relative focus-within:z-20 transition-all duration-200",
        day_button: "",
        range_start: "day-range-start",
        range_end: "day-range-end",
        selected:
          "bg-primary-9 text-primary-1 hover:bg-primary-10 hover:text-primary-1 focus:bg-primary-9 focus:text-primary-1 rounded-md transition-all duration-200",
        today: "",
        outside:
          "day-outside text-gray-11 opacity-50 aria-selected:bg-gray-4/50 aria-selected:text-gray-11 aria-selected:opacity-30 transition-opacity duration-200",
        disabled:
          "text-gray-11 opacity-50 cursor-not-allowed transition-opacity duration-200",
        range_middle:
          "aria-selected:bg-gray-4 aria-selected:text-gray-12 rounded-md transition-all duration-200",
        hidden: "invisible",
        ...classNames,
      }}
      components={components}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
