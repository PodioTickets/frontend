import type { ComponentType } from "react";
import { DashboardIcon } from "@/components/Icons/Organizer/DashboardIcon";
import { PencilIcon } from "@/components/Icons/PencilIcon";
import { PackageBoxIcon } from "@/components/Icons/PackageBoxIcon";
import { CoinDollarIcon } from "@/components/Icons/CoinDollarIcon";
import { BadgePercentIcon } from "@/components/Icons/BadgePercentIcon";
import { AnnouncementIcon } from "@/components/Icons/AnnouncementIcon";
import { NotificationIcon } from "@/components/Icons/NotificationIcon";

/**
 * Ícone de cada tab do evento (organizador + admin), mapeado por label.
 * Os ícones usam `currentColor` → acompanham o estado ativo/inativo da tab.
 * Mapa por label (não por href) porque organizador e admin compartilham os
 * mesmos rótulos. Label desconhecido cai sem ícone (degradação segura).
 */
const EVENT_TAB_ICON: Record<string, ComponentType<{ className?: string }>> = {
  Dashboard: DashboardIcon,
  Inscrições: PackageBoxIcon,
  Financeiro: CoinDollarIcon,
  Editar: PencilIcon,
  Desconto: BadgePercentIcon,
  Ads: AnnouncementIcon,
  Notificação: NotificationIcon,
  Notificações: NotificationIcon,
};

/** Conteúdo de uma tab de evento: ícone + label, alinhados. Usado tanto nos
 * `Link` quanto nos botões com dropdown (Editar/Desconto). */
export function EventTabLabel({ label }: { label: string }) {
  const Icon = EVENT_TAB_ICON[label];
  return (
    <span className="inline-flex items-center gap-2">
      {Icon ? <Icon className="size-4 shrink-0" /> : null}
      <span>{label}</span>
    </span>
  );
}
