import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { LotsNearDepletionPaginationBar } from "../LotsNearDepletionPaginationBar";
import {
  DashboardRankingCategoryLabel,
  DashboardRankingTicketNameLabel,
} from "../DashboardRankingLabels";

describe("LotsNearDepletionPaginationBar", () => {
  it("não renderiza nada com 1 página", () => {
    const { container } = render(
      <LotsNearDepletionPaginationBar page={1} totalPages={1} onPageChange={() => {}} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("mostra 'page / totalPages' e navega", () => {
    const onPageChange = vi.fn();
    render(
      <LotsNearDepletionPaginationBar page={2} totalPages={5} onPageChange={onPageChange} />,
    );
    expect(screen.getByText("2 / 5")).toBeInTheDocument();
    screen.getByLabelText("Próxima página").click();
    expect(onPageChange).toHaveBeenCalledWith(3);
    screen.getByLabelText("Página anterior").click();
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it("desabilita anterior na 1ª e próxima na última", () => {
    const { rerender } = render(
      <LotsNearDepletionPaginationBar page={1} totalPages={3} onPageChange={() => {}} />,
    );
    expect(screen.getByLabelText("Página anterior")).toBeDisabled();
    rerender(
      <LotsNearDepletionPaginationBar page={3} totalPages={3} onPageChange={() => {}} />,
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
