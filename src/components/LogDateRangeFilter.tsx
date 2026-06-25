"use client";

import type { DateRange } from "react-day-picker";
import { Dropdown } from "@/components/Dropdown";
import { DateRangePicker } from "@/components/DateRangePicker";
import { ArrowButton } from "@/components/ArrowButton";
import { cn } from "@/utils/cn";

/**
 * Filtro de data POR INTERVALO para as telas de log (auditoria org/admin, atividade).
 * Substitui o `DatePicker` de dia único — agora dá pra escolher um período (`from`–`to`),
 * igual à tela de inscrições, mas tolera também dia único (só `from`).
 *
 * Aplica a seleção a cada clique (1 clique = dia; 2 cliques = intervalo); limpar zera.
 */

const fmtDayMonth = (d: Date) => `${d.getDate()}/${d.getMonth() + 1}`;

/** `YYYY-MM-DD` a partir dos componentes LOCAIS (sem `toISOString`, que shiftaria o dia). */
function toLocalYmd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

/**
 * Deriva os parâmetros `from`/`to` (string `YYYY-MM-DD`) do range pro backend. Dia único
 * (só `from`) → `to = from`. O backend interpreta como DIA BRT (ver brt-date.util).
 */
export function dateRangeToParams(range: DateRange | undefined): {
  from?: string;
  to?: string;
} {
  if (!range?.from) return {};
  const from = toLocalYmd(range.from);
  return { from, to: range.to ? toLocalYmd(range.to) : from };
}

interface LogDateRangeFilterProps {
  value: DateRange | undefined;
  onChange: (range: DateRange | undefined) => void;
  className?: string;
}

export function LogDateRangeFilter({
  value,
  onChange,
  className,
}: LogDateRangeFilterProps) {
  const label = !value?.from
    ? "Filtrar por data"
    : value.to && value.from.getTime() !== value.to.getTime()
      ? `${fmtDayMonth(value.from)} - ${fmtDayMonth(value.to)}`
      : fmtDayMonth(value.from);

  return (
    <Dropdown
      width="w-max"
      // O filtro fica na borda DIREITA da linha; `end` ancora a borda direita do
      // calendário (largo) ao trigger e abre pra ESQUERDA — senão estoura a tela.
      align="end"
      trigger={() => (
        <div
          className={cn(
            "flex h-12 w-full items-center justify-between gap-2 rounded-lg border border-gray-6 bg-gray-1 px-3 text-sm text-gray-12 shadow-[0px_2px_6px_0px_rgba(17,17,17,0.08)] cursor-pointer hover:bg-gray-2 transition-colors",
            !value?.from && "text-gray-11",
            className,
          )}
        >
          <span className="truncate">{label}</span>
          <ArrowButton isOpen={false} />
        </div>
      )}
    >
      <DateRangePicker
        allowPastDates
        value={value}
        onSelect={(range) => onChange(range?.from ? range : undefined)}
      />
    </Dropdown>
  );
}
