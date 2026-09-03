import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { Pagination } from "@/components/Pagination";
import {
  DashboardRankingCategoryLabel,
  DashboardRankingTicketNameLabel,
} from "../DashboardRankingLabels";

// A barra própria do dashboard (`LotsNearDepletionPaginationBar`) foi removida:
// as listas paginadas usam o `Pagination` compartilhado no `variant="compact"`,
// que mantém o `‹ N / M ›` e já esconde a si mesmo com uma única página.
describe("Pagination compact (rodapé das listas do dashboard)", () => {
  it("não renderiza nada com 1 página", () => {
    const { container } = render(
      <Pagination currentPage={1} totalPages={1} onPageChange={() => {}} variant="compact" />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("mostra 'page / totalPages' e navega", () => {
    const onPageChange = vi.fn();
    render(
      <Pagination currentPage={2} totalPages={5} onPageChange={onPageChange} variant="compact" />,
    );
    expect(screen.getByText("2 / 5")).toBeInTheDocument();
    screen.getByLabelText("Próxima página").click();
    expect(onPageChange).toHaveBeenCalledWith(3);
    screen.getByLabelText("Página anterior").click();
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it("desabilita anterior na 1ª e próxima na última", () => {
    const { rerender } = render(
      <Pagination currentPage={1} totalPages={3} onPageChange={() => {}} variant="compact" />,
    );
    expect(screen.getByLabelText("Página anterior")).toBeDisabled();
    rerender(
      <Pagination currentPage={3} totalPages={3} onPageChange={() => {}} variant="compact" />,
    );
    expect(screen.getByLabelText("Próxima página")).toBeDisabled();
  });
});

describe("DashboardRankingLabels", () => {
  it("categoria: renderiza o texto", () => {
    render(<DashboardRankingCategoryLabel category="Lote 1" />);
    expect(screen.getAllByText("Lote 1").length).toBeGreaterThanOrEqual(1);
  });

  it("ticket: renderiza o nome", () => {
    render(<DashboardRankingTicketNameLabel name="Pista" />);
    expect(screen.getAllByText("Pista").length).toBeGreaterThanOrEqual(1);
  });

  it("usa o emptyDisplay quando vazio", () => {
    render(<DashboardRankingCategoryLabel category="   " />);
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(1);
  });
});
