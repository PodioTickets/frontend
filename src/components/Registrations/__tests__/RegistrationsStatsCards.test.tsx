import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { RegistrationsStatsCards } from "../RegistrationsStatsCards";
import type { RegistrationStats } from "@/services/organizer/OrganizerService";

const stats: RegistrationStats = {
  total: 1234,
  paid: 0,
  cancelled: 12,
  totalCollected: 567890, // centavos → R$ 5.678,90
  refunded: 3,
  refundedChange: 0,
  totalChange: 5,
  cancelledChange: -2,
};

describe("RegistrationsStatsCards", () => {
  it("renderiza os 4 cartões (mobile + desktop = 2x cada label)", () => {
    render(<RegistrationsStatsCards stats={stats} />);
    expect(screen.getAllByText("Inscrições Confirmadas")).toHaveLength(2);
    expect(screen.getAllByText("Cancelados")).toHaveLength(2);
    expect(screen.getAllByText("Estornos / Chargebacks")).toHaveLength(2);
    expect(screen.getAllByText("Receita Líquida")).toHaveLength(2);
  });

  it("formata a receita líquida em pt-BR (centavos → reais)", () => {
    render(<RegistrationsStatsCards stats={stats} />);
    expect(screen.getAllByText(/R\$\s*5\.678,90/)).toHaveLength(2);
  });
});
