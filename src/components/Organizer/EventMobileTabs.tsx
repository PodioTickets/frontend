"use client";

import Link from "next/link";
import { Fragment } from "react";
import { useOrganizerAppSurface } from "@/contexts/OrganizerAppSurfaceContext";
import { organizerExternalHref } from "@/lib/organizerPathPresentation";
import { useRef, useState, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";

export interface EventTabItem {
  label: string;
  href: string;
}

export function getEventTabs(eventId: string): EventTabItem[] {
  return [
    { label: "Dashboard", href: `/organizer/events/${eventId}/dashboard` },
    { label: "Inscrições", href: `/organizer/events/${eventId}/registrations` },
    { label: "Financeiro", href: `/organizer/events/${eventId}/financial` },
    { label: "Editar", href: `/organizer/events/${eventId}/edit` },
    { label: "Desconto", href: `/organizer/events/${eventId}/discount/cupom` },
    { label: "Ads", href: `/organizer/events/${eventId}/ads` },
    { label: "Notificação", href: `/organizer/events/${eventId}/notifications` },
  ];
}

export function getDiscountOptions(eventId: string, onLinkClick?: () => void) {
  return [
    {
      id: "cupom",
      label: "Cupom",
      href: `/organizer/events/${eventId}/discount/cupom`,
      onClick: onLinkClick,
    },
    {
      id: "voucher",
      label: "Voucher",
      href: `/organizer/events/${eventId}/discount/voucher`,
      onClick: onLinkClick,
    },
  ];
}

export function getEditStepOptions(eventId: string, onLinkClick?: () => void) {
  return [
    {
      id: "informacoes",
      label: "Informações",
      href: `/organizer/events/${eventId}/edit`,
      onClick: onLinkClick,
    },
    {
      id: "banner",
      label: "Banner",
      href: `/organizer/events/${eventId}/edit/banner`,
      onClick: onLinkClick,
    },
    {
      id: "ingressos",
      label: "Ingressos",
      href: `/organizer/events/${eventId}/edit/tickets`,
      onClick: onLinkClick,
    },
    {
      id: "topicos",
      label: "Tópicos",
      href: `/organizer/events/${eventId}/edit/topics`,
      onClick: onLinkClick,
    },
    {
      id: "questionario",
      label: "Questionário",
      href: `/organizer/events/${eventId}/edit/questionnaire`,
      onClick: onLinkClick,
    },
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
  /**
   * default — faixa usada no header mobile (tipografia maior, borda inferior na faixa).
   * pageHeader — faixa compacta do `EventPageHeader` (desktop: «Editar» é link; mobile: botão + menu).
   */
  variant?: "default" | "pageHeader";
}

export function EventMobileTabs({
  tabs,
  activeHref,
  onLinkClick,
  eventId,
  variant = "default",
}: EventMobileTabsProps) {
  const appSurface = useOrganizerAppSurface();
  const navHref = (internal: string) =>
    organizerExternalHref(internal, appSurface);

  const [descontoOpen, setDescontoOpen] = useState(false);
  const [editarOpen, setEditarOpen] = useState(false);
  const descontoTriggerRef = useRef<HTMLDivElement>(null);
  const editarTriggerRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  const isDiscountActive = activeHref.includes("/discount");
  const isEditActive = activeHref.includes("/edit");
  const discountOptions = getDiscountOptions(eventId, onLinkClick);
  const editStepOptions = getEditStepOptions(eventId, onLinkClick);

  useLayoutEffect(() => {
    const ref = editarOpen
      ? editarTriggerRef
      : descontoOpen
        ? descontoTriggerRef
        : null;
    if (!ref?.current) return;
    const rect = ref.current.getBoundingClientRect();
    setMenuPosition({ top: rect.bottom + 4, left: rect.left });
  }, [editarOpen, descontoOpen]);

  useEffect(() => {
    if (!descontoOpen && !editarOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (descontoTriggerRef.current?.contains(target)) return;
      if (editarTriggerRef.current?.contains(target)) return;
      if (document.getElementById("event-mobile-desconto-menu")?.contains(target)) return;
      if (document.getElementById("event-mobile-editar-menu")?.contains(target)) return;
      setDescontoOpen(false);
      setEditarOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [descontoOpen, editarOpen]);

  if (tabs.length === 0) return null;

  const isPageHeader = variant === "pageHeader";

  const scrollClass = isPageHeader
    ? "-mx-4 overflow-x-auto px-4 lg:mx-0 lg:px-0 [&::-webkit-scrollbar]:hidden"
    : "overflow-x-auto border-b border-gray-6 [&::-webkit-scrollbar]:hidden";

  const rowClass = isPageHeader
    ? "flex min-w-max flex-nowrap items-center gap-6"
    : "flex min-w-max items-center";

  const linkTabClass = (active: boolean) =>
    isPageHeader
      ? `shrink-0 border-b-2 pb-3 px-1 text-sm transition-colors ${
          active
            ? "border-primary-10 font-manrope font-bold text-primary-10"
            : "border-transparent font-family-dm-sans font-normal text-gray-11 hover:text-gray-12"
        }`
      : `-mb-px shrink-0 border-b-2 px-4 py-3 text-base transition-colors ${
          active
            ? "border-primary-11 font-manrope font-bold text-primary-11"
            : "border-transparent font-family-dm-sans font-normal text-gray-11"
        }`;

  const menuTriggerClass = (active: boolean) =>
    isPageHeader
      ? `flex cursor-pointer items-center gap-1 border-b-2 pb-3 px-1 text-sm transition-colors ${
          active
            ? "border-primary-10 font-manrope font-bold text-primary-10"
            : "border-transparent font-family-dm-sans font-normal text-gray-11 hover:text-gray-12"
        }`
      : `-mb-px flex w-full shrink-0 cursor-pointer items-center gap-1 border-b-2 px-4 py-3 text-base transition-colors ${
          active
            ? "border-primary-11 font-manrope font-bold text-primary-11"
            : "border-transparent font-family-dm-sans font-normal text-gray-11"
        }`;

  const descontoPortal =
    typeof document !== "undefined" &&
    descontoOpen &&
    createPortal(
      <div
        id="event-mobile-desconto-menu"
        className="fixed z-100 w-40 rounded-lg border border-gray-6 bg-gray-1 py-1 shadow-lg"
        style={{ top: menuPosition.top, left: menuPosition.left }}
      >
        {discountOptions.map((opt) => (
          <Link
            key={opt.id}
            href={navHref(opt.href)}
            onClick={() => {
              opt.onClick?.();
              setDescontoOpen(false);
            }}
            className="flex h-12 items-center px-4 text-sm text-gray-12 transition-colors hover:bg-gray-3"
          >
            {opt.label}
          </Link>
        ))}
      </div>,
      document.body,
    );

  const editarPortal =
    typeof document !== "undefined" &&
    editarOpen &&
    createPortal(
      <div
        id="event-mobile-editar-menu"
        className="fixed z-100 min-w-44 rounded-lg border border-gray-6 bg-gray-1 py-1 shadow-lg"
        style={{ top: menuPosition.top, left: menuPosition.left }}
      >
        {editStepOptions.map((opt) => (
          <Link
            key={opt.id}
            href={navHref(opt.href)}
            onClick={() => {
              opt.onClick?.();
              setEditarOpen(false);
            }}
            className="flex h-12 items-center px-4 text-sm text-gray-12 transition-colors hover:bg-gray-3"
          >
            {opt.label}
          </Link>
        ))}
      </div>,
      document.body,
    );

  return (
    <>
      <div
        className={scrollClass}
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        <div className={rowClass}>
          {tabs.map((tab) => {
            const isDescontoTab = tab.href.includes("/discount");
            const isEditarTab = tab.label === "Editar";

            if (isDescontoTab) {
              return (
                <div key="desconto" className="shrink-0" ref={descontoTriggerRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setEditarOpen(false);
                      setDescontoOpen((o) => !o);
                    }}
                    className={menuTriggerClass(isDiscountActive || descontoOpen)}
                  >
                    <span>{tab.label}</span>
                  </button>
                </div>
              );
            }

            if (isEditarTab) {
              if (isPageHeader) {
                return (
                  <Fragment key={tab.href}>
                    <Link
                      href={navHref(tab.href)}
                      className={`${linkTabClass(isEditActive)} hidden md:block`}
                    >
                      {tab.label}
                    </Link>
                    <div className="shrink-0 md:hidden" ref={editarTriggerRef}>
                      <button
                        type="button"
                        onClick={() => {
                          setDescontoOpen(false);
                          setEditarOpen((o) => !o);
                        }}
                        className={menuTriggerClass(isEditActive || editarOpen)}
                      >
                        <span>{tab.label}</span>
                      </button>
                    </div>
                  </Fragment>
                );
              }
              return (
                <div key="editar" className="shrink-0" ref={editarTriggerRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setDescontoOpen(false);
                      setEditarOpen((o) => !o);
                    }}
                    className={menuTriggerClass(isEditActive || editarOpen)}
                  >
                    <span>{tab.label}</span>
                  </button>
                </div>
              );
            }

            const isActive =
              activeHref === tab.href ||
              (activeHref.startsWith(tab.href) &&
                (activeHref.length === tab.href.length ||
                  activeHref[tab.href.length] === "/"));

            return (
              <Link
                key={tab.href}
                href={navHref(tab.href)}
                onClick={onLinkClick}
                className={linkTabClass(isActive)}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>
      {descontoPortal}
      {editarPortal}
    </>
  );
}
