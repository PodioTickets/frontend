// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { buildCouponShareLink } from "../couponShareLink";

const ORIG_ORG = process.env.NEXT_PUBLIC_ORGANIZER_APP_HOST;
const ORIG_ROOT = process.env.NEXT_PUBLIC_ROOT_SITE_URL;

afterEach(() => {
  process.env.NEXT_PUBLIC_ORGANIZER_APP_HOST = ORIG_ORG;
  process.env.NEXT_PUBLIC_ROOT_SITE_URL = ORIG_ROOT;
});

describe("buildCouponShareLink", () => {
  it("usa ?cupom= para cupom (default)", () => {
    delete process.env.NEXT_PUBLIC_ORGANIZER_APP_HOST;
    // jsdom origin = http://localhost:3000
    expect(buildCouponShareLink("meu-evento", "PROMO10")).toBe(
      "http://localhost:3000/events/meu-evento?cupom=PROMO10",
    );
  });

  it("usa ?voucher= para voucher", () => {
    delete process.env.NEXT_PUBLIC_ORGANIZER_APP_HOST;
    expect(buildCouponShareLink("meu-evento", "VIP-1", "voucher")).toBe(
      "http://localhost:3000/events/meu-evento?voucher=VIP-1",
    );
  });

  it("aponta para o domínio público (root) quando o split está configurado", () => {
    process.env.NEXT_PUBLIC_ORGANIZER_APP_HOST = "painel.podioticket.com.br";
    process.env.NEXT_PUBLIC_ROOT_SITE_URL = "https://podioticket.com.br";
    expect(buildCouponShareLink("corrida-2026", "CUPOM5", "coupon")).toBe(
      "https://podioticket.com.br/events/corrida-2026?cupom=CUPOM5",
    );
  });

  it("encoda slug e código (espaços, acentos, símbolos)", () => {
    delete process.env.NEXT_PUBLIC_ORGANIZER_APP_HOST;
    expect(buildCouponShareLink("evento legal", "10% OFF", "coupon")).toBe(
      "http://localhost:3000/events/evento%20legal?cupom=10%25%20OFF",
    );
  });

  it("fallback para o código cru quando não há slug (evita /events/undefined)", () => {
    delete process.env.NEXT_PUBLIC_ORGANIZER_APP_HOST;
    expect(buildCouponShareLink(undefined, "PROMO10")).toBe("PROMO10");
    expect(buildCouponShareLink(null, "PROMO10", "voucher")).toBe("PROMO10");
    expect(buildCouponShareLink("", "PROMO10")).toBe("PROMO10");
  });
});
