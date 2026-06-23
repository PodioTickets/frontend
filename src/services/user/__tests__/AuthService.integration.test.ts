import { describe, it, expect } from "vitest";
import { http, HttpResponse } from "msw";
import { mswServer, useMswServer } from "@/test/mswServer";
import { userService } from "@/services";

/**
 * Caracterização (golden master) da camada de rede de AUTH (`AuthService`, via o
 * singleton `userService`). Trava o comportamento atual de login/registro ANTES de
 * refatorar os modais de Login/Register (Fase 2). Foco: shape de resposta aceito,
 * transformação do payload de registro (documento/telefone) e tratamento de erro.
 */

const API = "http://localhost:3333/api/v1";

describe("AuthService (integração MSW)", () => {
  useMswServer();

  it("login: aceita resposta aninhada { data: { access_token, user } }", async () => {
    mswServer.use(
      http.post(`${API}/auth/login`, () =>
        HttpResponse.json({
          data: {
            access_token: "at",
            refresh_token: "rt",
            user: { id: "u1", email: "a@a.com", role: "USER" },
          },
        }),
      ),
    );

    const res = await userService.login({ emailOrCpf: "a@a.com", password: "x" });
    expect(res.success).toBe(true);
    expect(res.data?.access_token).toBe("at");
    expect(res.data?.user.id).toBe("u1");
  });

  it("login: aceita resposta plana { access_token, user } (refresh_token default '')", async () => {
    mswServer.use(
      http.post(`${API}/auth/login`, () =>
        HttpResponse.json({ access_token: "at2", user: { id: "u2", email: "b@b.com", role: "USER" } }),
      ),
    );

    const res = await userService.login({ emailOrCpf: "b@b.com", password: "x" });
    expect(res.success).toBe(true);
    expect(res.data?.access_token).toBe("at2");
    expect(res.data?.refresh_token).toBe("");
  });

  it("login: MFA requerido → { success, mfaRequired, mfaToken }", async () => {
    mswServer.use(
      http.post(`${API}/auth/login`, () =>
        HttpResponse.json({ mfaRequired: true, mfaToken: "mfa-1" }),
      ),
    );

    const res = await userService.login({ emailOrCpf: "a@a.com", password: "x" });
    expect(res).toMatchObject({ success: true, mfaRequired: true, mfaToken: "mfa-1" });
  });

  it("login: organizer usa o endpoint /auth/login/organizer", async () => {
    let hit = false;
    mswServer.use(
      http.post(`${API}/auth/login/organizer`, () => {
        hit = true;
        return HttpResponse.json({ data: { access_token: "at", refresh_token: "rt", user: { id: "o1", email: "o@o.com", role: "ORGANIZER" } } });
      }),
    );

    const res = await userService.login({ emailOrCpf: "o@o.com", password: "x", accountType: "ORGANIZER" });
    expect(hit).toBe(true);
    expect(res.success).toBe(true);
  });

  it("login: erro do servidor → { success: false, error } (não lança)", async () => {
    mswServer.use(
      http.post(`${API}/auth/login`, () =>
        HttpResponse.json({ message: "Credenciais inválidas" }, { status: 401 }),
      ),
    );

    const res = await userService.login({ emailOrCpf: "a@a.com", password: "wrong" });
    expect(res.success).toBe(false);
    expect(typeof res.error).toBe("string");
    expect(res.data).toBeUndefined();
  });

  it("register: CPF é enviado só com dígitos e telefone idem; retorna user + tokens", async () => {
    let body: any;
    mswServer.use(
      http.post(`${API}/auth/register`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({
          data: {
            access_token: "at",
            refresh_token: "rt",
            user: { id: "u9", email: "c@c.com", role: "USER" },
          },
        });
      }),
    );

    const res = await userService.register({
      email: "c@c.com",
      password: "Senha123!",
      complete_name: "Carlos Silva",
      gender: "M",
      phone: "(11) 98888-7777",
      dateOfBirth: "1990-01-01",
      country: "Brasil",
      documentType: "CPF",
      documentNumber: "503.798.000-00",
    } as never);

    expect(body.documentNumber).toBe("50379800000"); // máscara removida
    expect(body.phone).toBe("11988887777"); // só dígitos
    expect(res.id).toBe("u9");
    expect(res.access_token).toBe("at");
  });

  it("register: PASSPORT preserva o documento cru (não faz strip de letras)", async () => {
    let body: any;
    mswServer.use(
      http.post(`${API}/auth/register`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ data: { access_token: "at", refresh_token: "rt", user: { id: "u10", email: "d@d.com", role: "USER" } } });
      }),
    );

    await userService.register({
      email: "d@d.com",
      password: "Senha123!",
      complete_name: "John Doe",
      gender: "M",
      phone: "+1 555 123 4567",
      dateOfBirth: "1990-01-01",
      country: "Estados Unidos",
      documentType: "PASSPORT",
      documentNumber: "X1234567",
    } as never);

    expect(body.documentNumber).toBe("X1234567"); // preservado
  });

  it("register: erro do servidor lança (handleError)", async () => {
    mswServer.use(
      http.post(`${API}/auth/register`, () =>
        HttpResponse.json({ message: "E-mail já cadastrado" }, { status: 409 }),
      ),
    );

    await expect(
      userService.register({
        email: "dup@dup.com",
        password: "Senha123!",
        complete_name: "Dup User",
        gender: "M",
        phone: "11999998888",
        dateOfBirth: "1990-01-01",
        country: "Brasil",
        documentType: "CPF",
        documentNumber: "50379800000",
      } as never),
    ).rejects.toBeTruthy();
  });
});
