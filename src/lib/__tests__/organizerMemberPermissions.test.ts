import { describe, expect, it } from "vitest";
import {
  PERMISSION_ROWS,
  allPermissions,
  defaultNewMemberPermissions,
  permissionsFromApi,
  permissionsFromArray,
  permissionsToArray,
  togglePermission,
} from "../organizerMemberPermissions";

const granted = (state: Record<string, boolean>) =>
  Object.entries(state)
    .filter(([, v]) => v)
    .map(([k]) => k)
    .sort();

describe("organizerMemberPermissions", () => {
  it("expõe as mesmas linhas para os dois painéis", () => {
    expect(PERMISSION_ROWS.map((r) => r.id)).toEqual([
      "financial",
      "edit_event",
      "view_event",
      "coupons",
      "pixel",
      "notify",
      "create_event",
    ]);
  });

  describe("permissionsFromApi", () => {
    it("array de chaves concede SOMENTE o listado", () => {
      expect(granted(permissionsFromApi(["financial", "coupons"]))).toEqual([
        "coupons",
        "financial",
      ]);
    });

    it("array vazio não concede nada (≠ acesso total)", () => {
      expect(granted(permissionsFromApi([]))).toEqual([]);
    });

    it("mapa PARCIAL não ressuscita chave ausente com o default", () => {
      // Regressão do drawer do admin: o estado partia de `DEFAULT_PERMISSIONS`
      // (com `view_event: true`) e só sobrescrevia as chaves presentes, então
      // permissão removida pelo organizador voltava marcada no admin.
      expect(granted(permissionsFromApi({ financial: true }))).toEqual([
        "financial",
      ]);
    });

    it("mapa completo com falses respeita os falses", () => {
      expect(
        granted(
          permissionsFromApi({
            financial: false,
            edit_event: false,
            view_event: false,
            coupons: true,
            pixel: false,
            notify: false,
            create_event: false,
          }),
        ),
      ).toEqual(["coupons"]);
    });

    it("null = nunca configurado → acesso total (mesma regra do backend)", () => {
      expect(permissionsFromApi(null)).toEqual(allPermissions(true));
      expect(permissionsFromApi(undefined)).toEqual(allPermissions(true));
    });

    it("OWNER tem acesso total qualquer que seja o payload", () => {
      expect(permissionsFromApi([], "OWNER")).toEqual(allPermissions(true));
      expect(permissionsFromApi({ financial: false }, "OWNER")).toEqual(
        allPermissions(true),
      );
    });
  });

  it("ida e volta array → estado → array preserva o conjunto", () => {
    const keys = ["view_event", "notify"];
    expect(permissionsToArray(permissionsFromArray(keys)).sort()).toEqual(
      keys.slice().sort(),
    );
  });

  it("default de criação marca só Visualizar Evento", () => {
    expect(granted(defaultNewMemberPermissions())).toEqual(["view_event"]);
  });

  describe("togglePermission", () => {
    it("marcar Criar Evento liga também Editar e Visualizar", () => {
      const next = togglePermission(allPermissions(false), "create_event");
      expect(granted(next)).toEqual([
        "create_event",
        "edit_event",
        "view_event",
      ]);
    });

    it("desmarcar Criar Evento mantém Editar e Visualizar", () => {
      const withCreate = togglePermission(allPermissions(false), "create_event");
      const next = togglePermission(withCreate, "create_event");
      expect(granted(next)).toEqual(["edit_event", "view_event"]);
    });

    it("permissão sem dependência alterna sozinha", () => {
      const on = togglePermission(allPermissions(false), "financial");
      expect(granted(on)).toEqual(["financial"]);
      const off = togglePermission(on, "financial");
      expect(granted(off)).toEqual([]);
    });

    it("não remove implicadas já ligadas por outra via", () => {
      const base = { ...allPermissions(false), view_event: true };
      const next = togglePermission(base, "create_event");
      expect(next.view_event).toBe(true);
      expect(next.edit_event).toBe(true);
    });
  });
});
