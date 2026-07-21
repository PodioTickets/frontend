import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

// A faixa lê a superfície (admin/organizer subdomain) só para montar o href.
vi.mock("@/contexts/OrganizerAppSurfaceContext", () => ({
  useOrganizerAppSurface: () => "organizer",
}));

// jsdom não implementa Element.scrollTo (a faixa alinha a aba ativa no mount).
if (!Element.prototype.scrollTo) {
  Element.prototype.scrollTo = () => {};
}

import { EventMobileTabs, getEventTabs } from "../EventMobileTabs";

const EVENT_ID = "evt-1";

const renderTabs = () =>
  render(
    <EventMobileTabs
      tabs={getEventTabs(EVENT_ID)}
      activeHref={`/organizer/events/${EVENT_ID}/dashboard`}
      eventId={EVENT_ID}
    />,
  );

/**
 * Abre/fecha por CLICK (o `EventTabStrip` alterna no click, não no pointerdown —
 * é justamente o que impede a rolagem horizontal de abrir o menu, já que arrastar
 * a faixa por toque nem gera click).
 */
const tap = (el: HTMLElement) => fireEvent.click(el);

describe("EventMobileTabs — troca de menus (Editar/Desconto)", () => {
  it("tocar em «Editar» abre o menu com os passos de edição", () => {
    renderTabs();

    tap(screen.getByRole("button", { name: /editar/i }));

    expect(screen.getByRole("link", { name: /informações/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /pagamento/i })).toBeTruthy();
  });

  it("com «Desconto» aberto, tocar «Editar» troca de menu (fecha um, abre o outro)", () => {
    renderTabs();

    tap(screen.getByRole("button", { name: /desconto/i }));
    expect(screen.getByRole("link", { name: /cupom/i })).toBeTruthy();

    tap(screen.getByRole("button", { name: /editar/i }));
    // Desconto fechou, Editar abriu — não os dois fechados (regressão do bug).
    expect(screen.queryByRole("link", { name: /cupom/i })).toBeNull();
    expect(screen.getByRole("link", { name: /informações/i })).toBeTruthy();
  });

  it("tocar no mesmo botão de novo fecha o menu", () => {
    renderTabs();
    const editar = screen.getByRole("button", { name: /editar/i });

    tap(editar);
    expect(screen.getByRole("link", { name: /informações/i })).toBeTruthy();

    tap(editar);
    expect(screen.queryByRole("link", { name: /informações/i })).toBeNull();
  });

  it("clicar fora fecha o menu aberto", () => {
    renderTabs();

    tap(screen.getByRole("button", { name: /editar/i }));
    expect(screen.getByRole("link", { name: /informações/i })).toBeTruthy();

    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole("link", { name: /informações/i })).toBeNull();
  });
});

/**
 * O menu é `fixed` (coordenadas de viewport). Sem reancorar no scroll ele fica
 * parado enquanto o botão sobe — o Radix (que fazia isso sozinho) saiu daqui.
 */
describe("EventMobileTabs — menu acompanha o botão ao rolar", () => {
  const stubRect = (top: number) => {
    Element.prototype.getBoundingClientRect = function (): DOMRect {
      return {
        top,
        bottom: top + 40,
        left: 10,
        right: 100,
        width: 90,
        height: 40,
        x: 10,
        y: top,
        toJSON: () => ({}),
      } as DOMRect;
    };
  };

  const flushFrame = () =>
    act(() => {
      vi.advanceTimersByTime(50);
    });

  it("reposiciona o menu quando a página rola", () => {
    const originalRect = Element.prototype.getBoundingClientRect;
    vi.useFakeTimers();
    try {
      stubRect(200);
      renderTabs();

      act(() => {
        screen.getByRole("button", { name: /editar/i }).click();
      });
      flushFrame();

      const menu = screen.getByRole("link", { name: /informações/i })
        .parentElement as HTMLElement;
      // top do trigger (200) + altura (40) + 4px de folga
      expect(menu.style.top).toBe("244px");

      // Rolou 150px: o trigger subiu, o menu tem que subir junto.
      stubRect(50);
      act(() => {
        window.dispatchEvent(new Event("scroll"));
      });
      flushFrame();

      expect(menu.style.top).toBe("94px");
    } finally {
      Element.prototype.getBoundingClientRect = originalRect;
      vi.useRealTimers();
    }
  });
});
