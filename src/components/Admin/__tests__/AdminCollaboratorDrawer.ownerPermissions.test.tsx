import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";

vi.mock("@/services/base/ApiClient", () => ({
  getApiClient: () => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() }),
}));

import { AdminCollaboratorDrawer } from "../AdminCollaboratorDrawer";

const PERMISSION_LABELS = [
  "Financeiro",
  "Editar Evento",
  "Visualizar Evento",
  "Cupons",
  "Pixel",
  "Notificar Inscritos",
  "Criar Evento",
];

const renderDrawer = () =>
  render(
    <AdminCollaboratorDrawer
      open
      mode="create"
      member={null}
      orgId="org-1"
      onOpenChange={vi.fn()}
      onSuccess={vi.fn()}
    />,
  );

const ownerToggle = () => screen.getByRole("checkbox", { name: /Proprietário/ });

/** Linha de permissão pelo título (o nome acessível inclui a descrição). */
const permissionToggle = (title: string) =>
  screen
    .getAllByRole("checkbox")
    .find((el) => within(el).queryByText(title) !== null)!;

const isChecked = (el: HTMLElement) => el.getAttribute("aria-checked") === "true";

/**
 * Proprietário = acesso total, e a UI tem que refletir isso nos dois sentidos:
 * marcar liga todas as permissões; desmarcar qualquer uma derruba o Proprietário.
 */
describe("AdminCollaboratorDrawer — Proprietário ↔ Permissões", () => {
  it("marcar Proprietário liga TODAS as permissões", () => {
    renderDrawer();

    // Estado inicial: só "Visualizar Evento" (default).
    expect(isChecked(permissionToggle("Financeiro"))).toBe(false);

    fireEvent.click(ownerToggle());

    expect(isChecked(ownerToggle())).toBe(true);
    for (const label of PERMISSION_LABELS) {
      expect(isChecked(permissionToggle(label))).toBe(true);
    }
  });

  it("desmarcar uma permissão derruba o Proprietário", () => {
    renderDrawer();

    fireEvent.click(ownerToggle());
    expect(isChecked(ownerToggle())).toBe(true);

    fireEvent.click(permissionToggle("Cupons"));

    expect(isChecked(permissionToggle("Cupons"))).toBe(false);
    expect(isChecked(ownerToggle())).toBe(false);
    // As demais permanecem — só o Proprietário caiu.
    expect(isChecked(permissionToggle("Financeiro"))).toBe(true);
  });

  it("remarcar uma permissão NÃO repromove a Proprietário", () => {
    renderDrawer();

    fireEvent.click(ownerToggle());
    fireEvent.click(permissionToggle("Pixel")); // desmarca → cai o Proprietário
    fireEvent.click(permissionToggle("Pixel")); // marca de volta

    expect(isChecked(permissionToggle("Pixel"))).toBe(true);
    expect(isChecked(ownerToggle())).toBe(false);
  });

  it("«Limpar tudo» também desmarca Proprietário", () => {
    renderDrawer();

    fireEvent.click(ownerToggle());
    fireEvent.click(screen.getByRole("button", { name: "Limpar tudo" }));

    expect(isChecked(ownerToggle())).toBe(false);
    for (const label of PERMISSION_LABELS) {
      expect(isChecked(permissionToggle(label))).toBe(false);
    }
  });

  it("«Selecionar tudo» liga as permissões sem promover a Proprietário", () => {
    renderDrawer();

    fireEvent.click(screen.getByRole("button", { name: "Selecionar tudo" }));

    for (const label of PERMISSION_LABELS) {
      expect(isChecked(permissionToggle(label))).toBe(true);
    }
    // Proprietário é um PAPEL, não a soma dos checkboxes.
    expect(isChecked(ownerToggle())).toBe(false);
  });
});
