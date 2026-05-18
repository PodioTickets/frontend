"use client";

import Link from "next/link";
import { Fragment, useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { ArrowButton } from "@/components/ArrowButton";
import { useAdminAppSurface } from "@/contexts/AdminAppSurfaceContext";
import { adminExternalHref } from "@/lib/adminPathPresentation";
import { useAdminPathname } from "@/hooks/useAdminPathname";

interface AdminEventHeaderProps {
  eventId: string;
  eventName?: string;
  eventSlug?: string;
}

interface AdminTabItem {
  label: string;
  href: string;
}

const ADMIN_TABS_DEF = (eventId: string): AdminTabItem[] => [
  { label: "Dashboard", href: `/admin/events/${eventId}/dashboard` },
  { label: "Inscrições", href: `/admin/events/${eventId}/registrations` },
  { label: "Financeiro", href: `/admin/events/${eventId}/financial` },
  { label: "Editar", href: `/admin/events/${eventId}/edit` },
  { label: "Desconto", href: `/admin/events/${eventId}/discount/cupom` },
  { label: "Ads", href: `/admin/events/${eventId}/ads` },
  { label: "Notificação", href: `/admin/events/${eventId}/notifications` },
];

function getDiscountOptions(eventId: string, onLinkClick?: () => void) {
  return [
    { id: "cupom", label: "Cupom", href: `/admin/events/${eventId}/discount/cupom`, onClick: onLinkClick },
    { id: "voucher", label: "Voucher", href: `/admin/events/${eventId}/discount/voucher`, onClick: onLinkClick },
  ];
}

function getEditStepOptions(eventId: string, onLinkClick?: () => void) {
  return [
    { id: "informacoes", label: "Informações", href: `/admin/events/${eventId}/edit`, onClick: onLinkClick },
    { id: "banner", label: "Banner", href: `/admin/events/${eventId}/edit/banner`, onClick: onLinkClick },
    { id: "ingressos", label: "Ingressos", href: `/admin/events/${eventId}/edit/tickets`, onClick: onLinkClick },
    { id: "topicos", label: "Tópicos", href: `/admin/events/${eventId}/edit/topics`, onClick: onLinkClick },
    { id: "questionario", label: "Questionário", href: `/admin/events/${eventId}/edit/questionnaire`, onClick: onLinkClick },
    { id: "financeiro-edit", label: "Financeiro", href: `/admin/events/${eventId}/edit/financial`, onClick: onLinkClick },
  ];
}

interface TabsProps {
  eventId: string;
  activeHref: string;
  variant: "pageHeader" | "default";
  onLinkClick?: () => void;
}

function AdminEventTabs({ eventId, activeHref, variant, onLinkClick }: TabsProps) {
  const adminSurface = useAdminAppSurface();
  // No admin host (admin.dominio) o `href` exibido na URL é curto (/events/...),
  // mas a rota interna do App Router continua /admin/events/... — converte aqui
  // pra evitar que o Link aponte pra rota inexistente.
  const navHref = useCallback(
    (internal: string) => adminExternalHref(internal, adminSurface),
    [adminSurface],
  );

  const [descontoOpen, setDescontoOpen] = useState(false);
  const [editarOpen, setEditarOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const descontoTriggerRef = useRef<HTMLDivElement>(null);
  const editarTriggerRef = useRef<HTMLDivElement>(null);
  const editarLinkRef = useRef<HTMLAnchorElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const tabLinkRefs = useRef<Map<string, HTMLElement>>(new Map());

  const isDiscountActive = activeHref.includes("/discount");
  const isEditActive = activeHref.includes("/edit");
  const isPageHeader = variant === "pageHeader";

  const tabs = useMemo(() => ADMIN_TABS_DEF(eventId), [eventId]);
  const discountOptions = useMemo(() => getDiscountOptions(eventId, onLinkClick), [eventId, onLinkClick]);
  const editStepOptions = useMemo(() => getEditStepOptions(eventId, onLinkClick), [eventId, onLinkClick]);

  const setTabLinkRef = useCallback((href: string, el: HTMLElement | null) => {
    if (el) tabLinkRefs.current.set(href, el);
    else tabLinkRefs.current.delete(href);
  }, []);

  const isLinkTabActive = useCallback(
    (tab: AdminTabItem) =>
      activeHref === tab.href ||
      (activeHref.startsWith(tab.href) &&
        (activeHref.length === tab.href.length || activeHref[tab.href.length] === "/")),
    [activeHref],
  );

  const tabsKey = tabs.map((t) => t.href).join("|");

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
  }, [activeHref, editarOpen, descontoOpen, tabsKey, variant, scrollActiveTabIntoStart]);

  useEffect(() => {
    if (!descontoOpen && !editarOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (descontoTriggerRef.current?.contains(target)) return;
      if (editarTriggerRef.current?.contains(target)) return;
      if (document.getElementById("admin-desconto-menu")?.contains(target)) return;
      if (document.getElementById("admin-editar-menu")?.contains(target)) return;
      setDescontoOpen(false);
      setEditarOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [descontoOpen, editarOpen]);

  const scrollClass = isPageHeader
    ? "w-full min-w-0 overflow-x-auto px-6 [&::-webkit-scrollbar]:hidden"
    : "w-full min-w-0 overflow-x-auto border-b border-gray-6 [&::-webkit-scrollbar]:hidden";

  const rowClass = isPageHeader
    ? "flex min-w-max flex-nowrap items-center gap-6"
    : "flex min-w-max items-center";

  const linkTabCls = (active: boolean) =>
    isPageHeader
      ? `shrink-0 border-b-2 pb-3 px-1 text-sm transition-colors ${active ? "border-primary-10 font-manrope font-bold text-primary-10" : "border-transparent font-family-dm-sans font-normal text-gray-11 hover:text-gray-12"}`
      : `-mb-px shrink-0 border-b-2 px-4 py-3 text-base transition-colors ${active ? "border-primary-11 font-manrope font-bold text-primary-11" : "border-transparent font-family-dm-sans font-normal text-gray-11"}`;

  const menuTriggerCls = (active: boolean) =>
    isPageHeader
      ? `flex cursor-pointer items-center gap-1 border-b-2 pb-3 px-1 text-sm transition-colors ${active ? "border-primary-10 font-manrope font-bold text-primary-10" : "border-transparent font-family-dm-sans font-normal text-gray-11 hover:text-gray-12"}`
      : `-mb-px flex w-full shrink-0 cursor-pointer items-center gap-1 border-b-2 px-4 py-3 text-base transition-colors ${active ? "border-primary-11 font-manrope font-bold text-primary-11" : "border-transparent font-family-dm-sans font-normal text-gray-11"}`;

  const descontoPortal =
    typeof document !== "undefined" &&
    descontoOpen &&
    createPortal(
      <div
        id="admin-desconto-menu"
        className="fixed z-100 w-40 rounded-lg border border-gray-6 bg-gray-1 py-1 shadow-lg"
        style={{ top: menuPosition.top, left: menuPosition.left }}
      >
        {discountOptions.map((opt) => (
          <Link
            key={opt.id}
            href={navHref(opt.href)}
            onClick={() => { opt.onClick?.(); setDescontoOpen(false); }}
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
        id="admin-editar-menu"
        className="fixed z-100 min-w-44 rounded-lg border border-gray-6 bg-gray-1 py-1 shadow-lg"
        style={{ top: menuPosition.top, left: menuPosition.left }}
      >
        {editStepOptions.map((opt) => (
          <Link
            key={opt.id}
            href={navHref(opt.href)}
            onClick={() => { opt.onClick?.(); setEditarOpen(false); }}
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
                    onClick={() => { setEditarOpen(false); setDescontoOpen((o) => !o); }}
                    className={menuTriggerCls(isDiscountActive || descontoOpen)}
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
                      className={`${linkTabCls(isEditActive)} hidden md:block`}
                    >
                      {tab.label}
                    </Link>
                    <div className="shrink-0 md:hidden" ref={editarTriggerRef}>
                      <button
                        type="button"
                        onClick={() => { setDescontoOpen(false); setEditarOpen((o) => !o); }}
                        className={menuTriggerCls(isEditActive || editarOpen)}
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
                    onClick={() => { setDescontoOpen(false); setEditarOpen((o) => !o); }}
                    className={menuTriggerCls(isEditActive || editarOpen)}
                  >
                    <span>{tab.label}</span>
                  </button>
                </div>
              );
            }

            const isActive = isLinkTabActive(tab);
            return (
              <Link
                key={tab.href}
                ref={(node) => setTabLinkRef(tab.href, node)}
                href={navHref(tab.href)}
                onClick={onLinkClick}
                className={linkTabCls(isActive)}
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
