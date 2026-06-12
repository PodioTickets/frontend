// Setup global do Vitest: matchers do jest-dom (toBeInTheDocument, etc.)
import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// jsdom não implementa window.matchMedia — componentes que o usam
// (ex.: tooltips responsivos hover/click) quebrariam no teste. Polyfill mínimo:
// retorna "não corresponde" e um listener no-op.
if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(), // deprecado, mas algumas libs ainda usam
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}
