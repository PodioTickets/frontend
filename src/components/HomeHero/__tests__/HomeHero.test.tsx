import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const events = Array.from({ length: 7 }, (_, i) => ({
  id: `e${i}`,
  slug: `evento-${i}`,
  name: `Evento ${i}`,
  bannerUrl: null,
}));
vi.mock("@/hooks/useFeaturedEvents", () => ({
  useHomeFeaturedEvents: () => ({ events, isLoading: false }),
}));

import { HomeHero } from "../index";

/** Link do banner do evento `i` (o nome vira o `alt`/inicial do fallback). */
const slide = (i: number) =>
  document.querySelector(`a[href="/events/evento-${i}"]`) as HTMLAnchorElement;

describe("HomeHero", () => {
  it("mostra só os 5 primeiros, com o 1º no centro e os vizinhos em leque", () => {
    render(<HomeHero />);
    expect(document.querySelectorAll("a[href^='/events/']")).toHaveLength(5);
    expect(slide(0).className).toContain("z-30");
    // Circular: o anterior ao 1º é o último (4) — vizinho à esquerda.
    expect(slide(1).className).toContain("left-[66.4%]");
    expect(slide(4).className).toContain("left-[33.6%]");
    expect(screen.getAllByRole("button", { name: /Ir para o banner/ })).toHaveLength(5);
  });

  it("seta e clique no banner lateral trazem o slide para o centro sem navegar", () => {
    render(<HomeHero />);
    fireEvent.click(screen.getByRole("button", { name: "Próximo banner" }));
    expect(slide(1).className).toContain("z-30");

    // `fireEvent` devolve false quando o handler chamou preventDefault (não navegou).
    expect(fireEvent.click(slide(3))).toBe(false);
    expect(slide(3).className).toContain("z-30");
  });
});
