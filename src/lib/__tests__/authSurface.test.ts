// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { getCurrentSurface, sessionHintCookieName } from "../authSurface";

const ORIG_ADMIN = process.env.NEXT_PUBLIC_ADMIN_APP_HOST;
const ORIG_ORG = process.env.NEXT_PUBLIC_ORGANIZER_APP_HOST;

function mockLocation(hostname: string, pathname: string) {
  Object.defineProperty(window, "location", {
    value: { hostname, pathname },
    writable: true,
    configurable: true,
  });
}

function setAppSurfaceMeta(content: string) {
  let el = document.querySelector('meta[name="pt-app-surface"]');
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("name", "pt-app-surface");
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function clearAppSurfaceMeta() {
  document.querySelector('meta[name="pt-app-surface"]')?.remove();
}

afterEach(() => {
  process.env.NEXT_PUBLIC_ADMIN_APP_HOST = ORIG_ADMIN;
  process.env.NEXT_PUBLIC_ORGANIZER_APP_HOST = ORIG_ORG;
  clearAppSurfaceMeta();
});

describe("getCurrentSurface", () => {
  describe("dev / same-host (sem subdomínio configurado) → por PATH", () => {
    afterEach(() => {
      delete process.env.NEXT_PUBLIC_ADMIN_APP_HOST;
      delete process.env.NEXT_PUBLIC_ORGANIZER_APP_HOST;
    });
    it("/admin/* → admin", () => {
      delete process.env.NEXT_PUBLIC_ADMIN_APP_HOST;
      delete process.env.NEXT_PUBLIC_ORGANIZER_APP_HOST;
      mockLocation("localhost", "/admin/events");
      expect(getCurrentSurface()).toBe("admin");
    });
    it("/organizer/* → organizer", () => {
      delete process.env.NEXT_PUBLIC_ADMIN_APP_HOST;
      delete process.env.NEXT_PUBLIC_ORGANIZER_APP_HOST;
      mockLocation("localhost", "/organizer/events");
      expect(getCurrentSurface()).toBe("organizer");
    });
    it("outro path → client", () => {
      delete process.env.NEXT_PUBLIC_ADMIN_APP_HOST;
      delete process.env.NEXT_PUBLIC_ORGANIZER_APP_HOST;
      mockLocation("localhost", "/checkout/ingressos");
      expect(getCurrentSurface()).toBe("client");
    });
  });

  describe("prod / subdomínio dedicado → por HOST (URL curta sem /admin)", () => {
    it("host admin → admin mesmo com path curto", () => {
      process.env.NEXT_PUBLIC_ADMIN_APP_HOST = "https://admin.podioticket.com.br";
      mockLocation("admin.podioticket.com.br", "/events");
      expect(getCurrentSurface()).toBe("admin");
    });
    it("host organizador (app) → organizer", () => {
      process.env.NEXT_PUBLIC_ORGANIZER_APP_HOST = "https://app.podioticket.com.br";
      mockLocation("app.podioticket.com.br", "/events");
      expect(getCurrentSurface()).toBe("organizer");
    });
    it("host público do cliente → client", () => {
      process.env.NEXT_PUBLIC_ADMIN_APP_HOST = "https://admin.podioticket.com.br";
      process.env.NEXT_PUBLIC_ORGANIZER_APP_HOST = "https://app.podioticket.com.br";
      mockLocation("www.podioticket.com.br", "/events/maratona-2026");
      expect(getCurrentSurface()).toBe("client");
    });
  });

  describe("homolog → por HOST exato (env aponta o host do ambiente)", () => {
    // O build do homolog DEVE setar NEXT_PUBLIC_*_APP_HOST com os hosts do homolog
    // (não herdar os de dev). Com isso o match exato resolve a superfície e NÃO há
    // heurística de rótulo (que esconderia o Header das páginas públicas no app host).
    const HOMOLOG_ENV = () => {
      process.env.NEXT_PUBLIC_ADMIN_APP_HOST = "https://homologacao.test890.podioticket.com.br";
      process.env.NEXT_PUBLIC_ORGANIZER_APP_HOST = "https://homologacao.app.podioticket.com.br";
    };
    it("host do organizador → organizer (URL curta)", () => {
      HOMOLOG_ENV();
      mockLocation("homologacao.app.podioticket.com.br", "/");
      expect(getCurrentSurface()).toBe("organizer");
    });
    it("host do admin → admin", () => {
      HOMOLOG_ENV();
      mockLocation("homologacao.test890.podioticket.com.br", "/");
      expect(getCurrentSurface()).toBe("admin");
    });
    it("host público do cliente → client", () => {
      HOMOLOG_ENV();
      mockLocation("homologacao.podioticket.com.br", "/");
      expect(getCurrentSurface()).toBe("client");
    });
  });

  describe("meta pt-app-surface (sinal do server) tem PRIORIDADE", () => {
    // Regressão do bounce: no host do painel a URL é curta (/events) e o
    // NEXT_PUBLIC_* pode NÃO estar no build (só o env runtime do server). O meta
    // renderizado pelo RootLayout resolve a superfície mesmo assim.
    it("URL curta /events + SEM NEXT_PUBLIC + meta=organizer → organizer (não client)", () => {
      delete process.env.NEXT_PUBLIC_ADMIN_APP_HOST;
      delete process.env.NEXT_PUBLIC_ORGANIZER_APP_HOST;
      setAppSurfaceMeta("organizer");
      mockLocation("homologacao.app.podioticket.com.br", "/events/123/dashboard");
      expect(getCurrentSurface()).toBe("organizer");
    });

    it("meta=admin vence host/path divergentes", () => {
      delete process.env.NEXT_PUBLIC_ADMIN_APP_HOST;
      delete process.env.NEXT_PUBLIC_ORGANIZER_APP_HOST;
      setAppSurfaceMeta("admin");
      mockLocation("localhost", "/events");
      expect(getCurrentSurface()).toBe("admin");
    });

    it("meta ausente → cai no fallback de host/path (client no path público)", () => {
      delete process.env.NEXT_PUBLIC_ADMIN_APP_HOST;
      delete process.env.NEXT_PUBLIC_ORGANIZER_APP_HOST;
      clearAppSurfaceMeta();
      mockLocation("homologacao.app.podioticket.com.br", "/events");
      expect(getCurrentSurface()).toBe("client");
    });
  });

  it("sessionHintCookieName usa a superfície atual", () => {
    delete process.env.NEXT_PUBLIC_ADMIN_APP_HOST;
    delete process.env.NEXT_PUBLIC_ORGANIZER_APP_HOST;
    mockLocation("localhost", "/admin/events");
    expect(sessionHintCookieName()).toBe("pt_authed_admin");
    expect(sessionHintCookieName("client")).toBe("pt_authed_client");
  });
});
