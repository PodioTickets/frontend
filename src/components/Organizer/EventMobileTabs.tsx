"use client";

import Link from "next/link";
import { Fragment } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useOrganizerAppSurface } from "@/contexts/OrganizerAppSurfaceContext";
import { organizerExternalHref } from "@/lib/organizerPathPresentation";
import { EventTabLabel } from "@/components/Icons/EventTabLabel";
import { useRef, useState, useLayoutEffect, useCallback } from "react";

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
    // Espelha o passo 6 do `EditProgressBar` (stepper do desktop, escondido no
    // mobile): sem esta entrada não havia como chegar em /edit/financial pelo
    // menu «Editar» do mobile. Rótulo "Pagamento" segue o stepper do organizador
    // (o admin usa "Financeiro" no menu equivalente).
    {
      id: "pagamento",
      label: "Pagamento",
      href: `/organizer/events/${eventId}/edit/financial`,
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
  /**
   * Classe de z-index do menu. Os dropdowns são portalados no `body`, então o z deles
   * é comparado no contexto RAIZ — não herdam o do container da faixa.
   *
   * Default `z-40`: ABAIXO da `OrganizerMobileNav` (`fixed z-50`), pra o menu passar por
   * baixo do header ao rolar (e acima do conteúdo da página, que fica em z ≤ 20).
   *
   * Quando esta faixa é renderizada DENTRO de um modal, o portal precisa VENCER o z do
   * modal, senão o menu abre atrás dele — nesse caso passe um valor maior (ver
   * `PaymentDetailsModal` e `ExportDataModal`).
   */
  menuZClass?: string;
}

export function EventMobileTabs({
  tabs,
  activeHref,
  onLinkClick,
  eventId,
  variant = "default",
  menuZClass = "z-40",
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

  /** Alinha a aba ativa à esquerda da faixa horizontal. */
  const scrollActiveTabIntoStart = useCallback(() => {
    if (typeof window === "undefined") return;

    const isDesktop =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(min-width: 768px)").matches;

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

  /* Conteúdo do menu (Radix DropdownMenu — mesmo padrão de `admin/events/page.tsx`).
   * O Radix ancora o Content no Trigger via Floating UI e reposiciona sozinho no
   * scroll/resize; era isso que o posicionamento manual (`fixed` + rect lido só na
   * abertura) não fazia, e o menu descolava do botão ao rolar a página. Também traz
   * clique-fora, Esc, foco e collision detection de graça.
   *
   * `modal={false}` de propósito (no Root), por DOIS motivos:
   * 1. O default `true` trava a rolagem da página (react-remove-scroll) enquanto o
   *    menu está aberto — mudaria o comportamento atual, em que dá pra rolar.
   * 2. Esta faixa também é renderizada DENTRO de `PaymentDetailsModal`/`ExportDataModal`,
   *    que abrem sobre vaul Drawers. Um lock a mais na pilha do react-remove-scroll ali
   *    é justamente o tipo de conflito que já custou caro neste fluxo. */
  const renderMenuContent = (
    options: ReturnType<typeof getDiscountOptions>,
    widthClass: string,
  ) => (
    <DropdownMenu.Portal>
      <DropdownMenu.Content
        align="start"
        sideOffset={4}
        collisionPadding={8}
        className={`${menuZClass} ${widthClass} rounded-lg border border-gray-6 bg-gray-1 py-1 shadow-lg outline-none`}
      >
        {options.map((opt) => (
          // asChild: o Link do Next vira o item (navegação client-side preservada).
          // O Radix fecha o menu ao selecionar — não precisa de setOpen(false) manual.
          <DropdownMenu.Item key={opt.id} asChild>
            <Link
              href={navHref(opt.href)}
              onClick={opt.onClick}
              className="flex h-12 cursor-pointer items-center px-4 text-sm text-gray-12 outline-none transition-colors hover:bg-gray-3 focus:bg-gray-3"
            >
              {opt.label}
            </Link>
          </DropdownMenu.Item>
        ))}
      </DropdownMenu.Content>
    </DropdownMenu.Portal>
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
                <div key="desconto" className="shrink-0 md:-mb-0.5" ref={descontoTriggerRef}>
                  <DropdownMenu.Root
                    open={descontoOpen}
                    onOpenChange={(open) => {
                      if (open) setEditarOpen(false);
                      setDescontoOpen(open);
                    }}
                    modal={false}
                  >
                    <DropdownMenu.Trigger asChild>
                      <button
                        type="button"
                        className={menuTriggerClass(isDiscountActive || descontoOpen)}
                      >
                        <EventTabLabel label={tab.label} />
                      </button>
                    </DropdownMenu.Trigger>
                    {renderMenuContent(discountOptions, "w-40")}
                  </DropdownMenu.Root>
                </div>
              );
            }

            if (isEditarTab) {
              const editarMenu = (
                <DropdownMenu.Root
                  open={editarOpen}
                  onOpenChange={(open) => {
                    if (open) setDescontoOpen(false);
                    setEditarOpen(open);
                  }}
                  modal={false}
                >
                  <DropdownMenu.Trigger asChild>
                    <button
                      type="button"
                      className={menuTriggerClass(isEditActive || editarOpen)}
                    >
                      <EventTabLabel label={tab.label} />
                    </button>
                  </DropdownMenu.Trigger>
                  {renderMenuContent(editStepOptions, "min-w-44")}
                </DropdownMenu.Root>
              );

              if (isPageHeader) {
                return (
                  <Fragment key={tab.href}>
                    <Link
                      ref={editarLinkRef}
                      href={navHref(tab.href)}
                      className={`${linkTabClass(isEditActive)} hidden md:block`}
                    >
                      <EventTabLabel label={tab.label} />
                    </Link>
                    <div className="shrink-0 md:hidden" ref={editarTriggerRef}>
                      {editarMenu}
                    </div>
                  </Fragment>
                );
              }
              return (
                <div key="editar" className="shrink-0" ref={editarTriggerRef}>
                  {editarMenu}
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
                <EventTabLabel label={tab.label} />
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
