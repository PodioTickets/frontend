import { ArrowDown } from "lucide-react";
import { ArrowUpIcon } from "@/components/Icons/ArrowUpIcon";
import {
  dashboardTrendIsNew,
  dashboardTrendVisible,
  dashboardWeekOverWeekPercent,
  periodComparisonLabel,
} from "@/lib/dashboard";

/**
 * Indicador de variação de período dos cards do dashboard (admin/organizer).
 * Centraliza TODA a lógica que antes estava duplicada inline em 8 blocos:
 *  - visibilidade (`dashboardTrendVisible`);
 *  - "novo" quando não há baseline (período anterior = 0 → backend manda `null`),
 *    em vez de um "+100%" enganoso;
 *  - sinal → seta + cor (verde sobe/novo, vermelho desce).
 *
 * `null >= 0` é `true` em JS, então "novo" cai naturalmente no ramo positivo
 * (seta pra cima + verde), sem caso especial pra cor/seta.
 *
 * @param variant define os tamanhos do Figma (desktop: seta de queda 24px, texto
 *   16px; mobile: queda 16px, texto 14px).
 * @param wrapperClassName classe do container — difere por card (cards de métrica
 *   têm padding/altura própria; o card de tendência usa só `gap-1`).
 */
export function DashboardWeekTrend({
  change,
  period,
  variant = "desktop",
  wrapperClassName = "flex items-center gap-1",
}: {
  change: number | null;
  period: string;
  variant?: "desktop" | "mobile";
  wrapperClassName?: string;
}) {
  if (!dashboardTrendVisible(change, period)) return null;

  const isNew = dashboardTrendIsNew(change);
  const up = isNew || (change ?? 0) >= 0;
  const downSize = variant === "desktop" ? "size-6" : "size-4";
  const textClass =
    variant === "desktop" ? "text-[16px] leading-[1.3]" : "text-sm";

  return (
    <div className={wrapperClassName}>
      {up ? (
        <ArrowUpIcon className="size-3 text-primary-11" />
      ) : (
        <ArrowDown className={`${downSize} text-red-11`} />
      )}
      <span
        className={`font-family-dm-sans font-normal ${textClass} ${up ? "text-primary-11" : "text-red-11"}`}
      >
        {isNew
          ? "novo"
          : `${dashboardWeekOverWeekPercent(change)}% ${periodComparisonLabel(period)}`}
      </span>
    </div>
  );
}
