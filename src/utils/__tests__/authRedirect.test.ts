import { describe, it, expect } from "vitest";
import { sanitizeReturnPath } from "../authRedirect";

/**
 * `sanitizeReturnPath` é segurança-crítica: o destino pós-login pode vir da URL
 * (`?redirect_to=`), então precisa barrar open-redirect e só aceitar caminhos
 * relativos same-site.
 */
describe("sanitizeReturnPath", () => {
  it("aceita caminhos relativos same-site", () => {
    expect(sanitizeReturnPath("/checkout/ingressos?eventId=123")).toBe(
      "/checkout/ingressos?eventId=123",
    );
    expect(sanitizeReturnPath("/")).toBe("/");
    expect(sanitizeReturnPath("/user/tickets")).toBe("/user/tickets");
  });

  it("rejeita vazio/nulo", () => {
    expect(sanitizeReturnPath(null)).toBeNull();
    expect(sanitizeReturnPath(undefined)).toBeNull();
    expect(sanitizeReturnPath("")).toBeNull();
  });

  it("rejeita URL absoluta (host externo)", () => {
    expect(sanitizeReturnPath("http://evil.com")).toBeNull();
    expect(sanitizeReturnPath("https://evil.com/path")).toBeNull();
  });

  it("rejeita protocol-relative (//host) e backslash (/\\host)", () => {
    expect(sanitizeReturnPath("//evil.com")).toBeNull();
    expect(sanitizeReturnPath("/\\evil.com")).toBeNull();
  });

  it("rejeita esquemas perigosos sem barra inicial", () => {
    expect(sanitizeReturnPath("javascript:alert(1)")).toBeNull();
    expect(sanitizeReturnPath("data:text/html,foo")).toBeNull();
    expect(sanitizeReturnPath("checkout/ingressos")).toBeNull();
  });
});
