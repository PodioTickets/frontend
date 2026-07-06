import { describe, it, expect } from "vitest";
import { buildCreateEventBodyFromForm } from "@/lib/createEventDraftSync";
import type { CreateEventFormData } from "@/contexts/CreateEventContext";

/**
 * REGRESSÃO: o wall-clock digitado pelo organizador (início/encerramento das
 * inscrições) DEVE ser enviado como UTC EXPLÍCITO (`...Z`). Sem o `Z`, o backend
 * faz `new Date("2026-07-05T20:00:00")` e interpreta no fuso LOCAL do servidor —
 * num servidor em America/Sao_Paulo isso deslocava +3h no save (20:00 → 23:00Z),
 * fazendo as inscrições fecharem no horário errado. Com `Z`, o instante gravado é
 * sempre o wall-clock digitado, determinístico em qualquer fuso de servidor.
 */
function baseForm(over: Partial<CreateEventFormData> = {}): CreateEventFormData {
  return {
    name: "Evento",
    eventDate: "2026-07-10",
    registrationStartDate: "2026-07-01",
    registrationStartTime: "08:00",
    registrationEndDate: "2026-07-05",
    registrationEndTime: "20:00",
    street: "Rua X",
    city: "SP",
    state: "SP",
    ...over,
  } as CreateEventFormData;
}

describe("buildCreateEventBodyFromForm — datetime em UTC explícito", () => {
  it("envia registrationStartDate/EndDate como wall-clock UTC (sufixo Z)", () => {
    const body = buildCreateEventBodyFromForm(baseForm());
    expect(body.registrationStartDate).toBe("2026-07-01T08:00:00.000Z");
    expect(body.registrationEndDate).toBe("2026-07-05T20:00:00.000Z");
  });

  it("hora vazia cai em 00:00 mas ainda carimba o Z", () => {
    const body = buildCreateEventBodyFromForm(
      baseForm({ registrationStartTime: "", registrationEndTime: "" }),
    );
    expect(body.registrationStartDate).toBe("2026-07-01T00:00:00.000Z");
    expect(body.registrationEndDate).toBe("2026-07-05T00:00:00.000Z");
  });

  it("new Date do valor enviado independe do fuso do servidor (mesmo instante wall-clock)", () => {
    const body = buildCreateEventBodyFromForm(baseForm());
    // O instante parseado é exatamente 20:00Z — não desloca pelo fuso do runtime.
    expect(new Date(body.registrationEndDate as string).toISOString()).toBe(
      "2026-07-05T20:00:00.000Z",
    );
  });

  it("sem data de inscrição → campo omitido (não envia string inválida)", () => {
    const body = buildCreateEventBodyFromForm(
      baseForm({ registrationStartDate: "", registrationEndDate: "" }),
    );
    expect(body.registrationStartDate).toBeUndefined();
    expect(body.registrationEndDate).toBeUndefined();
  });
});
