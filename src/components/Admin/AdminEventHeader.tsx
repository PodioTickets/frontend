"use client";

import Link from "next/link";
import { useCallback } from "react";
import { ArrowButton } from "@/components/ArrowButton";
import { useAdminAppSurface } from "@/contexts/AdminAppSurfaceContext";
import { adminExternalHref } from "@/lib/adminPathPresentation";
import { useAdminPathname } from "@/hooks/useAdminPathname";
import { EventTabStrip, type EventTabItem, type EventTabStripOption } from "@/components/Event/EventTabStrip";

interface AdminEventHeaderProps {
  eventId: string;
  eventName?: string;
  eventSlug?: string;
}

const ADMIN_TABS_DEF = (eventId: string): EventTabItem[] => [
  { label: "Dashboard", href: `/admin/events/${eventId}/dashboard` },
  { label: "Inscrições", href: `/admin/events/${eventId}/registrations` },
  { label: "Financeiro", href: `/admin/events/${eventId}/financial` },
  { label: "Editar", href: `/admin/events/${eventId}/edit` },
  { label: "Desconto", href: `/admin/events/${eventId}/discount/cupom` },
  { label: "Ads", href: `/admin/events/${eventId}/ads` },
  { label: "Notificação", href: `/admin/events/${eventId}/notifications` },
];

function getDiscountOptions(eventId: string): EventTabStripOption[] {
  return [
    { id: "cupom", label: "Cupom", href: `/admin/events/${eventId}/discount/cupom` },
    { id: "voucher", label: "Voucher", href: `/admin/events/${eventId}/discount/voucher` },
  ];
}

function getEditStepOptions(eventId: string): EventTabStripOption[] {
  return [
    { id: "informacoes", label: "Informações", href: `/admin/events/${eventId}/edit` },
    { id: "banner", label: "Banner", href: `/admin/events/${eventId}/edit/banner` },
    { id: "ingressos", label: "Ingressos", href: `/admin/events/${eventId}/edit/tickets` },
    { id: "topicos", label: "Tópicos", href: `/admin/events/${eventId}/edit/topics` },
    { id: "questionario", label: "Questionário", href: `/admin/events/${eventId}/edit/questionnaire` },
    // Menu do admin usa "Financeiro" (o organizador chama de "Pagamento" no passo equivalente).
    { id: "financeiro-edit", label: "Financeiro", href: `/admin/events/${eventId}/edit/financial` },
  ];
}

/**
 * Abas do evento no fluxo do ADMIN. Wrapper fino sobre `EventTabStrip` (fonte
 * única, compartilhada com o organizador): injeta o `navHref` do host de admin
 * (URL curta /events/... ↔ rota interna /admin/events/...) e as opções desta
 * superfície. Menu portalado com z-100 (fica acima do conteúdo do admin).
 */
function AdminEventTabs({
  eventId,
  activeHref,
  variant,
}: {
  eventId: string;
  activeHref: string;
  variant: "pageHeader" | "default";
}) {
  const adminSurface = useAdminAppSurface();
  const navHref = useCallback(
    (internal: string) => adminExternalHref(internal, adminSurface),
    [adminSurface],
  );

  return (
    <EventTabStrip
      tabs={ADMIN_TABS_DEF(eventId)}
      activeHref={activeHref}
      navHref={navHref}
      discountOptions={getDiscountOptions(eventId)}
      editStepOptions={getEditStepOptions(eventId)}
      variant={variant}
      menuZClass="z-100"
    />
  );
}

export function AdminEventHeader({ eventId, eventName, eventSlug }: AdminEventHeaderProps) {
  // Pathname normalizado pra rota interna (/admin/...) mesmo quando o host curto
  // está em uso — sem isso, activeHref nunca bate com tab.href e nenhuma aba fica
  // marcada como ativa.
  const pathname = useAdminPathname();
  const adminSurface = useAdminAppSurface();
  const navHref = (internal: string) => adminExternalHref(internal, adminSurface);

  return (
    <>
      {/* Desktop header */}
      <div className="hidden md:block bg-gray-1 border-b border-gray-6 md:mb-6 pt-4 -mt-8 -mx-6 lg:-mx-8">
        <div className="flex items-end justify-between">
          <div className="flex-1 min-w-0">
            <div className="mb-4 px-6">
              <div className="flex items-center gap-2 text-sm text-gray-11">
                <Link href={navHref("/admin/events")} className="hover:text-gray-12">
                  Eventos
                </Link>
                <ArrowButton isOpen={false} className="size-2" />
                <span className="text-gray-12">{eventName ?? "Evento"}</span>
              </div>
            </div>
            <AdminEventTabs
              eventId={eventId}
              activeHref={pathname}
              variant="pageHeader"
            />
          </div>

          {eventSlug && (
            <Link
              href={`/events/${eventSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:flex items-center gap-1 pb-3 pr-8 text-primary-10 text-base underline hover:text-primary-11 shrink-0"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="2.5" y="4.167" width="13.333" height="13.333" rx="4" stroke="currentColor" strokeWidth="1.5" />
                <rect x="8.333" y="2.5" width="9.167" height="9.167" rx="1" stroke="currentColor" strokeWidth="1.5" />
              </svg>
              Abrir página do evento
            </Link>
          )}
        </div>
      </div>

      {/* Mobile header */}
      <div className="md:hidden bg-gray-1 border-b border-gray-6 -mt-4 -mx-4">
        <div className="flex items-center gap-1 h-[52px] px-4">
          <Link
            href={navHref("/admin/events")}
            className="-rotate-180 size-8 flex items-center justify-center shrink-0 rounded-lg hover:bg-gray-3 transition-colors"
            aria-label="Voltar"
          >
            <ArrowButton isOpen={false} />
          </Link>
          <p className="font-manrope font-extrabold text-base leading-[1.1] text-gray-12 truncate flex-1 min-w-0">
            {eventName ?? "Evento"}
          </p>
        </div>
        <AdminEventTabs
          eventId={eventId}
          activeHref={pathname}
          variant="default"
        />
      </div>
    </>
  );
}
