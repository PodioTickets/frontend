"use client";

import Link from "next/link";
import { Fragment } from "react";
import { useOrganizerAppSurface } from "@/contexts/OrganizerAppSurfaceContext";
import { organizerExternalHref } from "@/lib/organizerPathPresentation";
import {
  useRef,
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
} from "react";
import { createPortal } from "react-dom";

export interface EventTabItem {
  label: string;
  href: string;
}

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
  /** `pageHeader`: no desktop «Editar» é Link; o trigger mobile fica oculto — precisamos deste ref para o scroll. */
  const editarLinkRef = useRef<HTMLAnchorElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const tabLinkRefs = useRef<Map<string, HTMLElement>>(new Map());
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  const isDiscountActive = activeHref.includes("/discount");
  const isEditActive = activeHref.includes("/edit");
  const discountOptions = getDiscountOptions(eventId, onLinkClick);
  const editStepOptions = getEditStepOptions(eventId, onLinkClick);

  const setTabLinkRef = useCallback((href: string, el: HTMLElement | null) => {
    if (el) tabLinkRefs.current.set(href, el);
    else tabLinkRefs.current.delete(href);
  }, []);

  const isLinkTabActive = useCallback(
    (tab: EventTabItem) =>
      activeHref === tab.href ||
      (activeHref.startsWith(tab.href) &&
        (activeHref.length === tab.href.length ||
          activeHref[tab.href.length] === "/")),
    [activeHref],
  );

  const tabsKey = tabs.map((t) => t.href).join("|");

  /** Alinha a aba ativa à esquerda da faixa horizontal e reposiciona o menu (portal) após o scroll. */
  const scrollActiveTabIntoStart = useCallback(() => {
    if (typeof window === "undefined") return;

    const isDesktop =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(min-width: 768px)").matches;

    const updateMenuAnchor = () => {
      if (editarOpen) {
        const menuEl =
          variant === "pageHeader" && isDesktop && editarLinkRef.current
            ? editarLinkRef.current
            : editarTriggerRef.current;
        if (menuEl) {
          const rect = menuEl.getBoundingClientRect();
          setMenuPosition({ top: rect.bottom + 4, left: rect.left });
        }
      } else if (descontoOpen && descontoTriggerRef.current) {
        const rect = descontoTriggerRef.current.getBoundingClientRect();
        setMenuPosition({ top: rect.bottom + 4, left: rect.left });
      }
    };

    const container = scrollContainerRef.current;
    let el: HTMLElement | null = null;

    if (editarOpen || isEditActive) {
      if (variant === "pageHeader" && isDesktop && editarLinkRef.current) {
        el = editarLinkRef.current;
      } else {
        el = editarTriggerRef.current;
      }
    } else if (descontoOpen || isDiscountActive) {
      el = descontoTriggerRef.current;
    } else {
      for (const tab of tabs) {
        if (tab.href.includes("/discount")) continue;
        if (tab.label === "Editar") continue;
        if (isLinkTabActive(tab)) {
          el = tabLinkRefs.current.get(tab.href) ?? null;
          break;
        }
      }
    }

    const run = () => {
      const c = scrollContainerRef.current;
      if (c && el) {
        const cRect = c.getBoundingClientRect();
        const eRect = el.getBoundingClientRect();
        const nextLeft = c.scrollLeft + (eRect.left - cRect.left);
        c.scrollTo({ left: Math.max(0, nextLeft), behavior: "auto" });
      }
      if (editarOpen || descontoOpen) {
        updateMenuAnchor();
      }
    };

    run();
    requestAnimationFrame(() => requestAnimationFrame(run));
  }, [
    tabsKey,
    tabs,
    editarOpen,
    descontoOpen,
    isDiscountActive,
    isEditActive,
    isLinkTabActive,
    variant,
  ]);

  useLayoutEffect(() => {
    scrollActiveTabIntoStart();
  }, [
    activeHref,
    editarOpen,
    descontoOpen,
    tabsKey,
    variant,
    scrollActiveTabIntoStart,
  ]);

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
    ? "w-full min-w-0  overflow-x-auto px-6 [&::-webkit-scrollbar]:hidden"
    : "w-full min-w-0 overflow-x-auto border-b border-gray-6 [&::-webkit-scrollbar]:hidden";

  const rowClass = isPageHeader
    ? "flex min-w-max flex-nowrap items-center gap-6"
    : "flex min-w-max items-center";

  const linkTabClass = (active: boolean) =>
    isPageHeader
      ? `shrink-0 border-b-2 pb-3 px-1 text-sm transition-colors ${active
        ? "border-primary-10 font-bold text-primary-10"
        : "border-transparent font-normal text-gray-11 hover:text-gray-12"
      }`
      : `shrink-0 border-b-2 px-4 py-3 text-base transition-colors ${active
        ? "border-primary-11 font-bold text-primary-11"
        : "border-transparent font-normal text-gray-11"
      }`;

  const menuTriggerClass = (active: boolean) =>
    isPageHeader
      ? `flex cursor-pointer items-center gap-1 border-b-2 pb-3 px-1 text-sm transition-colors ${active
        ? "border-primary-10 font-normal text-primary-10"
        : "border-transparent font-normal text-gray-11 hover:text-gray-12"
      }`
      : `flex w-full shrink-0 cursor-pointer items-center gap-1 border-b-2 px-4 py-3 text-base transition-colors ${active
        ? "border-primary-11 font-normal text-primary-11"
        : "border-transparent font-normal text-gray-11"
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
        ref={scrollContainerRef}
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
                      ref={editarLinkRef}
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
                ref={(node) => setTabLinkRef(tab.href, node)}
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
