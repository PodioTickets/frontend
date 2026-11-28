import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { SelectTicketsModal } from "../SelectTicketsModal";

const ticket = (id: string, name: string, groupId: string, price = 5000) => ({
  id,
  name,
  groupId,
  modality: "Corrida",
  distance: "5",
  distanceUnit: "KM",
  price: "R$ 50,00",
  activeBatch: { price },
});

vi.mock("@/hooks/useTickets", () => ({
  useTickets: () => ({
    loading: false,
    tickets: [
      ticket("a1", "Avulso 5K", "uncategorized"),
      ticket("c1", "5K Geral", "cat-1"),
      ticket("c2", "5K Kids", "cat-1"),
      ticket("c3", "5K Grátis", "cat-1", 0),
    ],
  }),
}));
vi.mock("@/hooks/useTicketCategories", () => ({
  useTicketCategories: () => ({ categories: [{ id: "cat-1", name: "Corrida de 5KM" }] }),
}));

// Referência estável: o modal ressincroniza a seleção quando a prop muda (como fazem os callers).
const NONE: string[] = [];

function renderModal(onConfirm = vi.fn()) {
  render(
    <SelectTicketsModal isOpen onClose={vi.fn()} onConfirm={onConfirm} eventId="ev" selectedTicketIds={NONE} />,
  );
  return onConfirm;
}

describe("SelectTicketsModal (cupom)", () => {
  it("avulsos numa tabela sem título e cada categoria no seu card", () => {
    renderModal();
    expect(screen.getByText("Total de ingressos:")).toHaveTextContent("4");
    expect(screen.getByText("Corrida de 5KM")).toBeInTheDocument();
    expect(screen.getAllByText("Nome do ingresso")).toHaveLength(2);
    expect(screen.getAllByText("5KM")).toHaveLength(4);
  });

  it("selecionar todos da categoria marca só os elegíveis (gratuito fica de fora)", () => {
    const onConfirm = renderModal();
    const card = screen.getByText("Corrida de 5KM").parentElement as HTMLElement;
    fireEvent.click(within(card).getByLabelText("Selecionar todos"));
    expect(screen.getByText("Selecionados:")).toHaveTextContent("2");
    expect(within(card).getByText("Gratuito · não elegível")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Aplicar ao cupom"));
    expect(onConfirm).toHaveBeenCalledWith(["c1", "c2"]);
  });

  it("clicar de novo em selecionar todos desmarca a categoria", () => {
    renderModal();
    const card = screen.getByText("Corrida de 5KM").parentElement as HTMLElement;
    fireEvent.click(screen.getByText("Avulso 5K"));
    fireEvent.click(within(card).getByLabelText("Selecionar todos"));
    fireEvent.click(within(card).getByLabelText("Selecionar todos"));
    expect(screen.getByText("Selecionados:")).toHaveTextContent("1");
  });
});
