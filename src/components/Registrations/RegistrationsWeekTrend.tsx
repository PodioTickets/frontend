import { TrendingUp, TrendingDown } from "lucide-react";
import { registrationsWeekOverWeekPercent } from "@/lib/registrations";

/**
 * Indicador de variação semana-a-semana (compartilhado entre as páginas de
 * inscrições de admin e organizer). Antes era duplicado byte a byte.
 */
export function RegistrationsWeekTrend({
  change,
  compact,
}: {
  change?: number;
  compact?: boolean;
}) {
  if (
    change === undefined ||
    change === null ||
    Number.isNaN(Number(change))
  ) {
    return (
      <span
        className={`font-family-dm-sans font-normal text-gray-11 ${compact ? "text-xs" : "text-sm"}`}
      >
        {compact ? "—" : "Sem dado da semana passada"}
      </span>
    );
  }
  const pct = registrationsWeekOverWeekPercent(change);
  if (pct === 0) {
    return null;
  }
  const n = Number(change);
  const up = n >= 0;
  const iconClass = compact ? "size-3 shrink-0" : "size-4 shrink-0";
  const textClass = compact ? "text-xs" : "text-sm";
  return (
    <div className="flex items-center gap-1">
      {up ? (
        <TrendingUp className={`${iconClass} text-primary-11`} />
      ) : (
        <TrendingDown className={`${iconClass} text-red-11`} />
      )}
      <span
        className={`font-family-dm-sans font-normal ${textClass} ${up ? "text-primary-11" : "text-red-11"}`}
      >
        {pct}%
        {compact ? " vs. sem. passada" : " vs. semana passada"}
      </span>
    </div>
  );
}
