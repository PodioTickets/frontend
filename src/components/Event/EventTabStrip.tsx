"use client";

import Link from "next/link";
import {
  Fragment,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { ArrowButton } from "@/components/ArrowButton";
import { EventTabLabel } from "@/components/Icons/EventTabLabel";

export interface EventTabItem {
  label: string;
  href: string;
}

export interface EventTabStripOption {
  id: string;
  label: string;
  href: string;
  onClick?: () => void;
}

export interface EventTabStripProps {
  /** Abas na ordem de exibição (Dashboard, Inscrições, …, Editar, Desconto, …). */
  tabs: EventTabItem[];
  /** href da rota ativa (rota INTERNA do App Router, ex.: /organizer/events/x/edit). */
  activeHref: string;
  /**
   * Converte a rota interna no href EXIBIDO (rewrite de subdomínio admin/organizer).
   * Injetado pelo wrapper de cada superfície — este componente é agnóstico a ela.
   */
  navHref: (internal: string) => string;
  discountOptions: EventTabStripOption[];
  editStepOptions: EventTabStripOption[];
  /**
   * default — faixa do header mobile (tipografia maior, borda inferior na faixa).
   * pageHeader — faixa compacta; no desktop «Editar» vira Link, no mobile é botão+menu.
   */
  variant?: "default" | "pageHeader";
  /** Chamado ao clicar num link (ex.: fechar o modal que hospeda a faixa). */
  onLinkClick?: () => void;
  /**
   * z-index do menu (portalado no body). Default `z-40`: ABAIXO da
   * `OrganizerMobileNav` (`fixed z-50`), pro menu passar sob o header ao rolar.
   * Dentro de um modal, passe um valor MAIOR (ex.: `z-100`) senão abre atrás dele.
   */
  menuZClass?: string;
}

/**
 * Faixa horizontal de abas de um evento — FONTE ÚNICA para organizador e admin
 * (cada um injeta seu `navHref` + hrefs). «Editar» e «Desconto» abrem um menu.
 *
 * Por que toggle MANUAL no `click` (e não Radix DropdownMenu): o Radix abre no
 * `pointerdown`, e numa faixa que ROLA na horizontal isso fazia (a) começar o
 * arrasto sobre um trigger já escancarar o menu e (b) trocar de menu fechar os
 * dois — o pointerdown no outro trigger disparava o dismiss E o Radix engolia o
 * click seguinte. Abrir no `click` mata os dois: uma rolagem por toque nem gera
 * click, e a troca de menu é um setState explícito. Menu posicionado à mão num
 * portal (fixed) para não ser recortado pelo `overflow` da faixa.
 */
export function EventTabStrip({
  tabs,
  activeHref,
  navHref,
  discountOptions,
  editStepOptions,
  variant = "default",
  onLinkClick,
  menuZClass = "z-40",
}: EventTabStripProps) {
  const [descontoOpen, setDescontoOpen] = useState(false);
  const [editarOpen, setEditarOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  const descontoTriggerRef = useRef<HTMLDivElement>(null);
  const editarTriggerRef = useRef<HTMLDivElement>(null);
  /** `pageHeader` desktop: «Editar» é Link (o trigger mobile fica oculto). */
  const editarLinkRef = useRef<HTMLAnchorElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const tabLinkRefs = useRef<Map<string, HTMLElement>>(new Map());

  // Ids únicos por instância — desktop e mobile montam ao mesmo tempo (um oculto
  // por breakpoint); ids fixos colidiriam no teste de clique-fora.
  const rawId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const descontoMenuId = `desconto-menu-${rawId}`;
  const editarMenuId = `editar-menu-${rawId}`;

  const isDiscountActive = activeHref.includes("/discount");
  const isEditActive = activeHref.includes("/edit");
  const isPageHeader = variant === "pageHeader";

  // Enquanto um menu (Editar/Desconto) está aberto, o destaque verde migra para o
  // gatilho aberto — a aba da rota atual perde o realce até o menu fechar. Assim o
  // usuário vê claramente qual submenu está explorando; ao fechar, volta para a sua
  // aba (nenhum estado de rota é alterado, só a apresentação do realce).
  const anyMenuOpen = descontoOpen || editarOpen;
  const discountTabActive = descontoOpen || (!editarOpen && isDiscountActive);
  const editTabActive = editarOpen || (!descontoOpen && isEditActive);

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

  /** Trigger que ancora o menu ABERTO (no `pageHeader` desktop, «Editar» é o Link). */
  const getOpenMenuAnchor = useCallback((): HTMLElement | null => {
    if (typeof window === "undefined") return null;
    const isDesktop =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(min-width: 768px)").matches;

    if (editarOpen) {
      return isPageHeader && isDesktop && editarLinkRef.current
        ? editarLinkRef.current
        : editarTriggerRef.current;
    }
    if (descontoOpen) return descontoTriggerRef.current;
    return null;
  }, [editarOpen, descontoOpen, isPageHeader]);

  /** Recoloca o menu colado ao trigger (posição em coordenadas de viewport). */
  const updateMenuAnchor = useCallback(() => {
    const el = getOpenMenuAnchor();
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setMenuPosition({ top: rect.bottom + 4, left: rect.left });
  }, [getOpenMenuAnchor]);

  /**
   * O menu é `fixed` (coordenadas de viewport), então rolar a página o deixaria
   * parado enquanto o botão sobe. Enquanto houver menu aberto, reancora a cada
   * scroll/resize — `capture: true` para pegar também a rolagem de containers
   * internos (a própria faixa horizontal, o corpo de um modal). Coalescido em um
   * rAF para não recalcular layout a cada evento de scroll.
   */
  useEffect(() => {
    if (!descontoOpen && !editarOpen) return;

    let frame = 0;
    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        updateMenuAnchor();
      });
    };

    window.addEventListener("scroll", schedule, true);
    window.addEventListener("resize", schedule);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
    };
  }, [descontoOpen, editarOpen, updateMenuAnchor]);

  /** Alinha a aba ativa à esquerda da faixa e ancora o menu aberto ao seu trigger. */
  const scrollActiveTabIntoStart = useCallback(() => {
    if (typeof window === "undefined") return;

    const isDesktop =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(min-width: 768px)").matches;

    let el: HTMLElement | null = null;

    if (editarOpen || isEditActive) {
      el =
        isPageHeader && isDesktop && editarLinkRef.current
          ? editarLinkRef.current
          : editarTriggerRef.current;
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
      if (editarOpen || descontoOpen) updateMenuAnchor();
    };

    run();
    requestAnimationFrame(() => requestAnimationFrame(run));
  }, [
    tabs,
    editarOpen,
    descontoOpen,
    isDiscountActive,
    isEditActive,
    isLinkTabActive,
    isPageHeader,
    updateMenuAnchor,
  ]);

  useLayoutEffect(() => {
    scrollActiveTabIntoStart();
  }, [activeHref, editarOpen, descontoOpen, tabsKey, variant, scrollActiveTabIntoStart]);

  // Clique fora fecha os menus. `mousedown` (não pointerdown) espelha o padrão que
  // já roda estável no admin; no toque, o mouse sintético pós-touchend cobre o tap.
  useEffect(() => {
    if (!descontoOpen && !editarOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (descontoTriggerRef.current?.contains(target)) return;
      if (editarTriggerRef.current?.contains(target)) return;
      if (document.getElementById(descontoMenuId)?.contains(target)) return;
      if (document.getElementById(editarMenuId)?.contains(target)) return;
      setDescontoOpen(false);
      setEditarOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [descontoOpen, editarOpen, descontoMenuId, editarMenuId]);

  // `overflow-y-hidden` é obrigatório junto do `overflow-x-auto`: pela spec, um
  // eixo `auto` força o outro (`visible`) a virar `auto`, transformando o eixo Y
  // num scroll container. O `-mb-px` das abas ativas gera 1px de overflow
  // vertical — inócuo no Chrome/Android, mas no iOS Safari o eixo Y reserva
  // espaço rolável e desenha uma "margem" fantasma abaixo da faixa. Fixar Y em
  // hidden mantém a rolagem horizontal e elimina o gap só-do-iOS.
  const scrollClass = isPageHeader
    ? "w-full min-w-0 overflow-x-auto overflow-y-hidden px-6 [&::-webkit-scrollbar]:hidden"
    : "w-full min-w-0 overflow-x-auto overflow-y-hidden border-b border-gray-6 [&::-webkit-scrollbar]:hidden";

  const rowClass = isPageHeader
    ? "flex min-w-max flex-nowrap items-center gap-6"
    : "flex min-w-max items-center";

  const linkTabCls = (active: boolean) =>
    isPageHeader
      ? `shrink-0 border-b-2 pb-3 px-1 text-sm transition-colors ${active ? "border-primary-10 font-manrope font-bold text-primary-10" : "border-transparent font-family-dm-sans font-normal text-gray-11 hover:text-gray-12"}`
      : `shrink-0 border-b-2 px-4 py-3 text-base transition-colors ${active ? "border-primary-11 font-manrope font-bold text-primary-11" : "border-transparent font-family-dm-sans font-normal text-gray-11"}`;

  const menuTriggerCls = (active: boolean) =>
    isPageHeader
      ? `flex cursor-pointer items-center gap-1 border-b-2 pb-3 px-1 text-sm transition-colors ${active ? "border-primary-10 font-manrope font-bold text-primary-10" : "border-transparent font-family-dm-sans font-normal text-gray-11 hover:text-gray-12"}`
      : `flex w-full shrink-0 cursor-pointer items-center gap-1 border-b-2 px-4 py-3 text-base transition-colors ${active ? "border-primary-11 font-manrope font-bold text-primary-11" : "border-transparent font-family-dm-sans font-normal text-gray-11"}`;

  const renderMenu = (
    id: string,
    options: EventTabStripOption[],
    widthClass: string,
    close: () => void,
  ) =>
    typeof document !== "undefined" &&
    createPortal(
      <div
        id={id}
        className={`fixed ${menuZClass} ${widthClass} rounded-lg border border-gray-6 bg-gray-1 py-1 shadow-lg`}
        style={{ top: menuPosition.top, left: menuPosition.left }}
      >
        {options.map((opt) => (
          <Link
            key={opt.id}
            href={navHref(opt.href)}
            onClick={() => {
              opt.onClick?.();
              close();
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
                    className={menuTriggerCls(discountTabActive)}
                  >
                    <EventTabLabel label={tab.label} />
                    <ArrowButton isOpen={descontoOpen} className="ml-1 shrink-0" />
                  </button>
                </div>
              );
            }

            if (isEditarTab) {
              const editarButton = (
                <button
                  type="button"
                  onClick={() => {
                    setDescontoOpen(false);
                    setEditarOpen((o) => !o);
                  }}
                  className={menuTriggerCls(editTabActive)}
                >
                  <EventTabLabel label={tab.label} />
                  <ArrowButton isOpen={editarOpen} className="ml-1 shrink-0" />
                </button>
              );

              if (isPageHeader) {
                return (
                  <Fragment key={tab.href}>
                    <Link
                      ref={editarLinkRef}
                      href={navHref(tab.href)}
                      className={`${linkTabCls(editTabActive)} hidden md:block`}
                    >
                      <EventTabLabel label={tab.label} />
                    </Link>
                    <div className="shrink-0 md:hidden" ref={editarTriggerRef}>
                      {editarButton}
                    </div>
                  </Fragment>
                );
              }
              return (
                <div key="editar" className="shrink-0" ref={editarTriggerRef}>
                  {editarButton}
                </div>
              );
            }

            return (
              <Link
                key={tab.href}
                ref={(node) => setTabLinkRef(tab.href, node)}
                href={navHref(tab.href)}
                onClick={onLinkClick}
                className={linkTabCls(isLinkTabActive(tab) && !anyMenuOpen)}
              >
                <EventTabLabel label={tab.label} />
              </Link>
            );
          })}
        </div>
      </div>
      {descontoOpen &&
        renderMenu(descontoMenuId, discountOptions, "w-40", () => setDescontoOpen(false))}
      {editarOpen &&
        renderMenu(editarMenuId, editStepOptions, "min-w-44", () => setEditarOpen(false))}
    </>
  );
}
