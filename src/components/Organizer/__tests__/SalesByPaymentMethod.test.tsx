import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SalesByPaymentMethod } from "../SalesByPaymentMethod";

describe("SalesByPaymentMethod", () => {
  it("não mostra Cartão de débito quando não há venda no débito", () => {
    render(
      <SalesByPaymentMethod
        data={{
          items: [
            { method: "PIX", salesCount: 3, totalAmount: 30000, percentage: 75 },
            { method: "CREDIT_CARD", salesCount: 1, totalAmount: 10000, percentage: 25 },
          ],
          totals: { salesCount: 4, totalAmount: 40000 },
        }}
      />,
    );
    expect(screen.getByText("PIX")).toBeInTheDocument();
    expect(screen.getByText("Cartão de crédito")).toBeInTheDocument();
    expect(screen.queryByText("Cartão de débito")).not.toBeInTheDocument();
  });

  it("mostra Cartão de débito quando há venda no débito", () => {
    render(
      <SalesByPaymentMethod
        data={{
          items: [{ method: "DEBIT_CARD", salesCount: 2, totalAmount: 20000, percentage: 100 }],
          totals: { salesCount: 2, totalAmount: 20000 },
        }}
      />,
    );
    expect(screen.getByText("Cartão de débito")).toBeInTheDocument();
  });

  const labelsOnScreen = () =>
    screen.getAllByText(/^(PIX|Cartão de crédito|Cartão de débito)$/).map((el) => el.textContent);

  it("ordena do método que mais vendeu para o que menos vendeu", () => {
    render(
      <SalesByPaymentMethod
        data={{
          items: [
            { method: "PIX", salesCount: 2, totalAmount: 20000, percentage: 20 },
            { method: "DEBIT_CARD", salesCount: 5, totalAmount: 50000, percentage: 50 },
            { method: "CREDIT_CARD", salesCount: 3, totalAmount: 30000, percentage: 30 },
          ],
          totals: { salesCount: 10, totalAmount: 100000 },
        }}
      />,
    );
    expect(labelsOnScreen()).toEqual(["Cartão de débito", "Cartão de crédito", "PIX"]);
  });

  it("no empate de vendas, o maior valor vem antes; empate total segue PIX, crédito, débito", () => {
    render(
      <SalesByPaymentMethod
        data={{
          items: [
            { method: "DEBIT_CARD", salesCount: 2, totalAmount: 10000, percentage: 25 },
            { method: "CREDIT_CARD", salesCount: 2, totalAmount: 10000, percentage: 25 },
            { method: "PIX", salesCount: 2, totalAmount: 20000, percentage: 50 },
          ],
          totals: { salesCount: 6, totalAmount: 40000 },
        }}
      />,
    );
    expect(labelsOnScreen()).toEqual(["PIX", "Cartão de crédito", "Cartão de débito"]);
  });

  it("sem nenhuma venda mantém o estado vazio", () => {
    render(<SalesByPaymentMethod data={{ items: [], totals: { salesCount: 0, totalAmount: 0 } }} />);
    expect(screen.getByText("Nenhuma venda registrada")).toBeInTheDocument();
  });
});
