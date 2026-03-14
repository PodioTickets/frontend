"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
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
  ];
}

export function getDiscountOptions(eventId: string, onLinkClick?: () => void) {
  return [
    { id: "cupom", label: "Cupom", href: `/organizer/events/${eventId}/discount/cupom`, onClick: onLinkClick },
    { id: "voucher", label: "Voucher", href: `/organizer/events/${eventId}/discount/voucher`, onClick: onLinkClick },
  ];
}

interface EventMobileTabsProps {
  tabs: EventTabItem[];
  /** href da aba ativa (ex.: /organizer/events/xxx/dashboard) */
  activeHref: string;
  /** Chamado ao clicar em um link (ex.: fechar modal antes de navegar) */
  onLinkClick?: () => void;
  /** eventId necessário para o dropdown de Desconto (Cupom/Voucher) */
  eventId: string;
}

export function EventMobileTabs({ tabs, activeHref, onLinkClick, eventId }: EventMobileTabsProps) {
  const [descontoOpen, setDescontoOpen] = useState(false);
  const descontoTriggerRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  const isDiscountActive = activeHref.includes("/discount");
  const discountOptions = getDiscountOptions(eventId, onLinkClick);

  useLayoutEffect(() => {
    if (!descontoOpen || !descontoTriggerRef.current) return;
    const rect = descontoTriggerRef.current.getBoundingClientRect();
    setMenuPosition({ top: rect.bottom + 4, left: rect.left });
  }, [descontoOpen]);

  useEffect(() => {
    if (!descontoOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (descontoTriggerRef.current?.contains(target)) return;
      const menu = document.getElementById("event-mobile-desconto-menu");
      if (menu?.contains(target)) return;
      setDescontoOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [descontoOpen]);

  if (tabs.length === 0) return null;

  const menuPortal =
    typeof document !== "undefined" &&
    descontoOpen &&
    createPortal(
      <div
        id="event-mobile-desconto-menu"
        className="fixed z-100 w-40 rounded-lg border border-gray-6 bg-gray-1 shadow-lg py-1"
        style={{ top: menuPosition.top, left: menuPosition.left }}
      >
        {discountOptions.map((opt) => (
          <Link
            key={opt.id}
            href={opt.href}
            onClick={() => {
              opt.onClick?.();
              setDescontoOpen(false);
            }}
            className="flex h-12 px-4 items-center text-sm text-gray-12 hover:bg-gray-3 transition-colors"
          >
            {opt.label}
          </Link>
        ))}
      </div>,
      document.body
    );

  return (
    <>
      <div
        className="border-b border-gray-6 overflow-x-auto [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        <div className="flex items-center min-w-max">
          {tabs.map((tab) => {
            const isDescontoTab = tab.href.includes("/discount");
            const isActive = isDescontoTab
              ? isDiscountActive
              : activeHref === tab.href || (activeHref.startsWith(tab.href) && (activeHref.length === tab.href.length || activeHref[tab.href.length] === "/"));

            if (isDescontoTab) {
              return (
                <div key="desconto" className="shrink-0" ref={descontoTriggerRef}>
                  <button
                    type="button"
                    onClick={() => setDescontoOpen((o) => !o)}
                    className={`shrink-0 px-4 py-3 text-base transition-colors border-b-2 -mb-px flex items-center gap-1 cursor-pointer w-full ${isActive
                      ? "border-primary-11 text-primary-11 font-manrope font-bold"
                      : "border-transparent text-gray-11 font-family-dm-sans font-normal"
                      }`}
                  >
                    <span>{tab.label}</span>
                  </button>
                </div>
              );
            }

            return (
              <Link
                key={tab.href}
                href={tab.href}
                onClick={onLinkClick}
                className={`shrink-0 px-4 py-3 text-base transition-colors border-b-2 -mb-px ${isActive
                  ? "border-primary-11 text-primary-11 font-manrope font-bold"
                  : "border-transparent text-gray-11 font-family-dm-sans font-normal"
                  }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>
      {menuPortal}
    </>
  );
}
