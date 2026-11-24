import { describe, it, expect } from "vitest";
import { findDuplicateBatchPeriod } from "../TicketForm.utils";
import type { Batch } from "../TicketForm.types";

const lote = (id: string, p: Partial<Batch>): Batch => ({
  id,
  quantity: "10",
  price: "R$ 10,00",
  startType: "date",
  ...p,
});

describe("findDuplicateBatchPeriod", () => {
  it("acusa dois lotes com a mesma data de início e término", () => {
    const batches = [
      lote("1", { startDate: "2030-01-01", endDate: "2030-01-10" }),
      lote("2", { startDate: "2030-01-11", endDate: "2030-01-20" }),
      lote("3", { startDate: "2030-01-01", endDate: "2030-01-10" }),
    ];
    expect(findDuplicateBatchPeriod(batches)).toEqual([0, 2]);
  });

  it("aceita mesmo início com término diferente e mesmas datas com horário diferente", () => {
    const batches = [
      lote("1", { startDate: "2030-01-01", endDate: "2030-01-10" }),
      lote("2", { startDate: "2030-01-01", endDate: "2030-01-12" }),
      lote("3", { startDate: "2030-01-01", startTime: "12:00", endDate: "2030-01-10" }),
    ];
    expect(findDuplicateBatchPeriod(batches)).toBeNull();
  });

  it("ignora lote 'ao esgotar o anterior'", () => {
    const batches = [
      lote("1", { startDate: "2030-01-01", endDate: "2030-01-10" }),
      lote("2", { startType: "previous", startDate: "2030-01-01", endDate: "2030-01-10" }),
    ];
    expect(findDuplicateBatchPeriod(batches)).toBeNull();
  });
});
