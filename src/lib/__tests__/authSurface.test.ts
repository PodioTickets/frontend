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

afterEach(() => {
  process.env.NEXT_PUBLIC_ADMIN_APP_HOST = ORIG_ADMIN;
  process.env.NEXT_PUBLIC_ORGANIZER_APP_HOST = ORIG_ORG;
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

  describe("homolog / prefixo de ambiente → por RÓTULO do subdomínio", () => {
    // Build herdou os hosts de DEV (`app.localhost`/`test890.localhost`), mas roda
    // em `homologacao.*` — o rótulo (`app`/`test890`) ainda aparece como segmento.
    it("homologacao.app.* → organizer (rótulo 'app')", () => {
      process.env.NEXT_PUBLIC_ADMIN_APP_HOST = "http://test890.localhost:3000";
      process.env.NEXT_PUBLIC_ORGANIZER_APP_HOST = "http://app.localhost:3000";
      mockLocation("homologacao.app.podioticket.com.br", "/");
      expect(getCurrentSurface()).toBe("organizer");
    });
    it("homologacao.test890.* → admin (rótulo 'test890')", () => {
      process.env.NEXT_PUBLIC_ADMIN_APP_HOST = "http://test890.localhost:3000";
      process.env.NEXT_PUBLIC_ORGANIZER_APP_HOST = "http://app.localhost:3000";
      mockLocation("homologacao.test890.podioticket.com.br", "/");
      expect(getCurrentSurface()).toBe("admin");
    });
    it("homologacao.podioticket.com.br (sem rótulo) → client", () => {
      process.env.NEXT_PUBLIC_ADMIN_APP_HOST = "http://test890.localhost:3000";
      process.env.NEXT_PUBLIC_ORGANIZER_APP_HOST = "http://app.localhost:3000";
      mockLocation("homologacao.podioticket.com.br", "/");
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
