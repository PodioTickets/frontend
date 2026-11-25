import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { CreateKitModal } from "../CreateKitModal";

vi.mock("@/hooks/useEvent", () => ({ useEvent: () => ({ event: { eventDate: "2026-12-20T00:00:00.000Z" } }) }));

const kit = {
  id: "k1",
  name: "Kit Teste",
  image: null,
  images: [],
  isIncludedInTicket: false,
  basePrice: 8900,
  isKit: true,
  buyerVariationEditAllowed: false,
  variationEditDeadlineDays: 0,
  variationGroups: [
    { id: "g1", name: "Camisa", sortOrder: 0, variations: [{ id: "v1", name: "P", stock: 0, sortOrder: 0 }, { id: "v2", name: "M", stock: 10, availableStock: 8, sortOrder: 1 }] },
  ],
};

describe("CreateKitModal — Salvar alterações", () => {
  it("fica desabilitado ao abrir sem mudanças e habilita ao mudar", () => {
    render(<CreateKitModal isOpen onClose={() => {}} eventId="e1" kit={kit} onSave={() => {}} />);
    const save = screen.getByRole("button", { name: "Salvar alterações" });
    expect(save).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Nome descritivo do kit"), { target: { value: "Kit Novo" } });
    expect(save).not.toBeDisabled();
  });

  it("\"Este kit é obrigatório?\" vem Não e vai no payload como isRequired", async () => {
    const onSave = vi.fn();
    render(<CreateKitModal isOpen onClose={() => {}} eventId="e1" kit={kit} onSave={onSave} />);
    const group = screen.getByRole("radiogroup", { name: "Este kit é obrigatório?" });
    expect(within(group).getByLabelText("Não")).toBeChecked();
    fireEvent.click(within(group).getByLabelText("Sim"));
    const save = screen.getByRole("button", { name: "Salvar alterações" });
    expect(save).not.toBeDisabled();
    fireEvent.click(save);
    await vi.waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0]).toMatchObject({ isRequired: true, isIncludedInTicket: false });
  });
});
