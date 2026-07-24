"use client";

import { useCallback } from "react";
import { useOrganizerAppSurface } from "@/contexts/OrganizerAppSurfaceContext";
import { organizerExternalHref } from "@/lib/organizerPathPresentation";
import {
  EventTabStrip,
  type EventTabItem,
  type EventTabStripOption,
} from "@/components/Event/EventTabStrip";

export type { EventTabItem };

const EVENT_TABS_DEF = (eventId: string): { label: string; href: string; permission: string | string[] | null }[] => [
  { label: "Dashboard", href: `/organizer/events/${eventId}/dashboard`, permission: "dashboard" },
  { label: "Inscrições", href: `/organizer/events/${eventId}/registrations`, permission: "dashboard" },
  { label: "Financeiro", href: `/organizer/events/${eventId}/financial`, permission: "financial" },
  { label: "Editar", href: `/organizer/events/${eventId}/edit`, permission: ["edit_event", "view_event"] },
  { label: "Desconto", href: `/organizer/events/${eventId}/discount/cupom`, permission: "coupons" },
  { label: "Ads", href: `/organizer/events/${eventId}/ads`, permission: "pixel" },
  { label: "Notificação", href: `/organizer/events/${eventId}/notifications`, permission: "notify" },
];

export function getEventTabs(
  eventId: string,
  hasPermission?: (key: string) => boolean,
): EventTabItem[] {
  const can = hasPermission ?? (() => true);
  return EVENT_TABS_DEF(eventId)
    .filter((t) => {
      if (t.permission === null) return true;
      if (Array.isArray(t.permission)) return t.permission.some((p) => can(p));
      return can(t.permission);
    })
    .map(({ label, href }) => ({ label, href }));
}

export function getDiscountOptions(eventId: string, onLinkClick?: () => void): EventTabStripOption[] {
  return [
    { id: "cupom", label: "Cupom", href: `/organizer/events/${eventId}/discount/cupom`, onClick: onLinkClick },
    { id: "voucher", label: "Voucher", href: `/organizer/events/${eventId}/discount/voucher`, onClick: onLinkClick },
  ];
}

export function getEditStepOptions(eventId: string, onLinkClick?: () => void): EventTabStripOption[] {
  return [
    { id: "informacoes", label: "Informações", href: `/organizer/events/${eventId}/edit`, onClick: onLinkClick },
    { id: "banner", label: "Banner", href: `/organizer/events/${eventId}/edit/banner`, onClick: onLinkClick },
    { id: "ingressos", label: "Ingressos", href: `/organizer/events/${eventId}/edit/tickets`, onClick: onLinkClick },
    { id: "topicos", label: "Tópicos", href: `/organizer/events/${eventId}/edit/topics`, onClick: onLinkClick },
    { id: "questionario", label: "Questionário", href: `/organizer/events/${eventId}/edit/questionnaire`, onClick: onLinkClick },
    // Espelha o passo 6 do `EditProgressBar`. Rótulo "Pagamento" segue o stepper do
    // organizador (o admin usa "Financeiro" no menu equivalente).
    { id: "pagamento", label: "Pagamento", href: `/organizer/events/${eventId}/edit/financial`, onClick: onLinkClick },
  ];
}

interface EventMobileTabsProps {
  tabs: EventTabItem[];
  /** href da aba ativa (ex.: /organizer/events/xxx/dashboard) */
  activeHref: string;
  /** Chamado ao clicar em um link (ex.: fechar modal antes de navegar) */
  onLinkClick?: () => void;
  /** eventId para dropdowns de Editar e Desconto */
  eventId: string;
  variant?: "default" | "pageHeader";
  /** z-index do menu (ver `EventTabStrip`). Default `z-40`. */
  menuZClass?: string;
}

/**
 * Faixa de abas do evento no fluxo do ORGANIZADOR. Wrapper fino sobre
 * `EventTabStrip` (fonte única, compartilhada com o admin): injeta o `navHref`
 * do subdomínio de organizador e as opções de Editar/Desconto desta superfície.
 */
export function EventMobileTabs({
  tabs,
  activeHref,
  onLinkClick,
  eventId,
  variant = "default",
  menuZClass = "z-40",
}: EventMobileTabsProps) {
  const appSurface = useOrganizerAppSurface();
  const navHref = useCallback(
    (internal: string) => organizerExternalHref(internal, appSurface),
    [appSurface],
  );

  if (tabs.length === 0) return null;

  return (
    <EventTabStrip
      tabs={tabs}
      activeHref={activeHref}
      navHref={navHref}
      discountOptions={getDiscountOptions(eventId, onLinkClick)}
      editStepOptions={getEditStepOptions(eventId, onLinkClick)}
      variant={variant}
      onLinkClick={onLinkClick}
      menuZClass={menuZClass}
    />
  );
}
