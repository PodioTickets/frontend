import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { RegistrationsWeekTrend } from "../RegistrationsWeekTrend";
import { RegistrationRow } from "../RegistrationRow";
import {
  getRegistrationStatusBadge,
  type RegistrationListRow,
} from "@/lib/registrations";

describe("RegistrationsWeekTrend", () => {
  it("sem dado: compact mostra '—'", () => {
    render(<RegistrationsWeekTrend compact />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("sem dado: não-compact mostra texto explicativo", () => {
    render(<RegistrationsWeekTrend />);
    expect(screen.getByText("Sem dado da semana passada")).toBeInTheDocument();
  });

  it("variação 0 não renderiza nada", () => {
    const { container } = render(<RegistrationsWeekTrend change={0} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("variação positiva mostra '% vs. semana passada'", () => {
    render(<RegistrationsWeekTrend change={12.3} />);
    expect(screen.getByText(/12%\s*vs\. semana passada/)).toBeInTheDocument();
  });
});

describe("RegistrationRow", () => {
  const baseRow = (over: Partial<RegistrationListRow> = {}): RegistrationListRow =>
    ({
      id: "abc123def456ghi789",
      status: "CONFIRMED",
      user: { firstName: "Ana", lastName: "Lima", email: "ana@ex.com" },
      ticket: { name: "Pista", category: { name: "Lote 1" } },
      ...over,
    } as RegistrationListRow);

  it("renderiza nome, email e ticket do inscrito", () => {
    render(
      <RegistrationRow
        registration={baseRow()}
        onViewRegistration={() => {}}
        onViewPaymentDetails={() => {}}
        getStatusBadge={getRegistrationStatusBadge}
      />,
    );
    expect(screen.getByText(/Ana/)).toBeInTheDocument();
    expect(screen.getByText("ana@ex.com")).toBeInTheDocument();
    expect(screen.getByText("Pista")).toBeInTheDocument();
    expect(screen.getByText("Lote 1")).toBeInTheDocument();
  });

  it("status CONFIRMED mostra 'Pago' e os 2 botões de ação", () => {
    render(
      <RegistrationRow
        registration={baseRow({ status: "CONFIRMED" })}
        onViewRegistration={() => {}}
        onViewPaymentDetails={() => {}}
        getStatusBadge={getRegistrationStatusBadge}
      />,
    );
    expect(screen.getByText("Pago")).toBeInTheDocument();
    expect(screen.getByLabelText("Ver pedido")).toBeInTheDocument();
    expect(screen.getByLabelText("Ver ingresso")).toBeInTheDocument();
  });

  it("status CANCELLED mostra 'Cancelado' e esconde os botões", () => {
    render(
      <RegistrationRow
        registration={baseRow({ status: "CANCELLED" })}
        onViewRegistration={() => {}}
        onViewPaymentDetails={() => {}}
        getStatusBadge={getRegistrationStatusBadge}
      />,
    );
    expect(screen.getByText("Cancelado")).toBeInTheDocument();
    expect(screen.queryByLabelText("Ver pedido")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Ver ingresso")).not.toBeInTheDocument();
  });

  it("dispara os callbacks ao clicar nos botões", async () => {
    const onView = vi.fn();
    const onPay = vi.fn();
    render(
      <RegistrationRow
        registration={baseRow()}
        onViewRegistration={onView}
        onViewPaymentDetails={onPay}
        getStatusBadge={getRegistrationStatusBadge}
      />,
    );
    screen.getByLabelText("Ver pedido").click();
    screen.getByLabelText("Ver ingresso").click();
    expect(onPay).toHaveBeenCalledOnce();
    expect(onView).toHaveBeenCalledOnce();
  });
});
