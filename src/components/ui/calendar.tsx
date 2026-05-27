"use client";

import * as React from "react";
import { useMemo } from "react";
import { ChevronLeftIcon, ChevronRightIcon, ChevronDownIcon } from "lucide-react";
import {
  DayPicker,
  type Matcher,
  type MonthCaptionProps,
  type DayButtonProps,
  useDayPicker,
} from "react-day-picker";

import { cn } from "@/utils/cn";
import { buttonVariants } from "@/components/Button";
import { Button } from "@/components/Button";
import { Dropdown, type DropdownOption } from "@/components/Dropdown";

const YearRangeContext = React.createContext<{ fromYear: number; toYear: number }>({
  fromYear: new Date().getFullYear(),
  toYear: new Date().getFullYear() + 4,
});

export type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  disablePastDates?: boolean;
};

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
        "h-8! w-8! p-0! font-normal! text-gray-12 rounded-md! text-sm!",
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

const monthNames = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function CalendarCaptionWithDropdowns({ calendarMonth }: MonthCaptionProps) {
  const { goToMonth } = useDayPicker();
  const { fromYear, toYear } = React.useContext(YearRangeContext);
  const current = calendarMonth.date;

  // Quando o ano exibido for o atual, lista comeca pelo mes atual e da a volta
  // (ex.: Maio, ..., Dezembro, Janeiro, ..., Abril) — usuario provavelmente
  // quer agendar pra frente. Quando for outro ano, ordem natural (Janeiro
  // ..Dezembro) — meses passados ou futuros nao tem ancora no "agora".
  // `id` continua o indice 0-11 do mes — selecao/realce independem da ordem.
  const today = new Date();
  const isCurrentYear = current.getFullYear() === today.getFullYear();
  const startIdx = isCurrentYear ? today.getMonth() : 0;
  const monthOptions: DropdownOption[] = useMemo(() => {
    const list: DropdownOption[] = [];
    for (let i = startIdx; i < 12; i++) {
      list.push({ id: String(i), label: monthNames[i] });
    }
    for (let i = 0; i < startIdx; i++) {
      list.push({ id: String(i), label: monthNames[i] });
    }
    return list;
  }, [startIdx]);

  const yearOptions: DropdownOption[] = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const start = Math.max(fromYear, Math.min(toYear, currentYear));
    const list: DropdownOption[] = [];
    for (let y = start; y <= toYear; y++) {
      list.push({ id: String(y), label: String(y) });
    }
    for (let y = start - 1; y >= fromYear; y--) {
      list.push({ id: String(y), label: String(y) });
    }
    return list;
  }, [toYear, fromYear]);

  const handleMonthSelect = (option: DropdownOption) => {
    const month = parseInt(option.id ?? "0", 10);
    goToMonth(new Date(current.getFullYear(), month, 1));
  };

  const handleYearSelect = (option: DropdownOption) => {
    const year = parseInt(option.id ?? "0", 10);
    // Mudar de ano reseta o mes pra Janeiro quando alvo nao for o ano atual.
    // Manter o mes corrente so faz sentido pro ano atual (usuario provavelmente
    // continua olhando perto do "agora"). Anos diferentes → ordem natural.
    const month = year === today.getFullYear() ? current.getMonth() : 0;
    goToMonth(new Date(year, month, 1));
  };

  const monthLabel = monthNames[current.getMonth()];
  const yearLabel = String(current.getFullYear());
  // ~10 itens visíveis, resto com scroll (item height 48px)
  const dropdownMaxHeight = "max-h-[250px]";

  return (
    <div className="flex justify-center items-center gap-2 pt-1 pb-1 mb-1 w-full">
      <Dropdown
        options={monthOptions}
        selectedIds={[String(current.getMonth())]}
        onSelect={handleMonthSelect}
        width="min-w-[140px]"
        maxHeight={dropdownMaxHeight}
        dataAttribute="calendar-month"
        trigger={() => (
          <div className="flex items-center justify-between gap-1.5 h-8 min-w-[120px] px-2 rounded-md border border-gray-6 bg-gray-1 text-sm font-medium text-gray-12 cursor-pointer hover:bg-gray-3 transition-colors">
            <span className="truncate">{monthLabel}</span>
            <ChevronDownIcon className="h-3.5 w-3.5 text-gray-11 shrink-0" />
          </div>
        )}
      />
      <Dropdown
        options={yearOptions}
        selectedIds={[yearLabel]}
        onSelect={handleYearSelect}
        width="min-w-[100px]"
        maxHeight={dropdownMaxHeight}
        dataAttribute="calendar-year"
        trigger={() => (
          <div className="flex items-center justify-between gap-1.5 h-8 min-w-[90px] px-2 rounded-md border border-gray-6 bg-gray-1 text-sm font-medium text-gray-12 cursor-pointer hover:bg-gray-3 transition-colors">
            <span className="truncate">{yearLabel}</span>
            <ChevronDownIcon className="h-3.5 w-3.5 text-gray-11 shrink-0" />
          </div>
        )}
      />
    </div>
  );
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout,
  disabled: customDisabled,
  disablePastDates = true,
  fromYear,
  toYear,
  ...props
}: CalendarProps) {
  const currentYear = new Date().getFullYear();
  const resolvedFromYear = fromYear ?? currentYear;
  const resolvedToYear = toYear ?? currentYear + 10;
  const todayStart = (() => {
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), t.getDate());
  })();

  /** `before` é exclusivo no react-day-picker: o dia de `todayStart` continua selecionável. */
  const pastMatcher: Matcher = { before: todayStart };

  const disabledProp: Matcher | Matcher[] | undefined = (() => {
    if (disablePastDates === false) {
      return customDisabled;
    }
    if (customDisabled == null) {
      return pastMatcher;
    }
    const extra = Array.isArray(customDisabled) ? customDisabled : [customDisabled];
    return [pastMatcher, ...extra];
  })();

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
    MonthCaption: captionLayout === "dropdown" ? CalendarCaptionWithDropdowns : CalendarCaption,
  };

  return (
    <YearRangeContext.Provider value={{ fromYear: resolvedFromYear, toYear: resolvedToYear }}>
    <DayPicker
      showOutsideDays={showOutsideDays}
      disabled={disabledProp}
      captionLayout={captionLayout}
      fromYear={fromYear}
      toYear={toYear}
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
            ? "hidden"
            : "hidden",
        dropdown_root:
          captionLayout === "dropdown"
            ? "hidden"
            : "hidden",
        dropdown:
          captionLayout === "dropdown"
            ? "hidden"
            : "hidden",
        nav: "hidden",
        button_previous: "hidden",
        button_next: "hidden",
        month_caption: "flex items-center justify-center pt-1",
        month_grid: "w-full border-collapse space-y-1",
        weekdays: "flex",
        weekday:
          "text-gray-11 rounded w-8 font-normal text-[0.8rem] transition-colors duration-200",
        week: "flex w-full mt-2 gap-0.5",
        day: "h-8 w-8 text-center text-sm p-0 relative focus-within:relative focus-within:z-20 transition-all duration-200",
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
    </YearRangeContext.Provider>
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
