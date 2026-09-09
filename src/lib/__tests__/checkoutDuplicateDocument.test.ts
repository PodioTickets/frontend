import { describe, expect, it } from "vitest";
import {
  getDuplicateDocumentReason,
  normalizeCheckoutDocument,
  type CheckoutDocumentSlot,
} from "@/lib/checkoutParticipants";

const br = (
  index: number,
  doc: string,
  ticketId: string | null,
): CheckoutDocumentSlot => ({ index, doc, isBrazilian: true, ticketId });

describe("normalizeCheckoutDocument", () => {
  it("iguala CPF mascarado e cru", () => {
    expect(normalizeCheckoutDocument("123.456.789-00", true)).toBe("12345678900");
    expect(normalizeCheckoutDocument("12345678900", true)).toBe("12345678900");
  });

  it("compara passaporte sem distinguir caixa", () => {
    expect(normalizeCheckoutDocument("AB123456", false)).toBe("ab123456");
  });

  it("devolve vazio para ausente ou só espaços", () => {
    expect(normalizeCheckoutDocument(undefined, true)).toBe("");
    expect(normalizeCheckoutDocument("   ", true)).toBe("");
  });
});

describe("getDuplicateDocumentReason", () => {
  it("com a opção LIGADA não bloqueia nada, nem o mesmo ingresso repetido", () => {
    const slots = [br(0, "12345678900", "t1"), br(1, "12345678900", "t1")];
    expect(getDuplicateDocumentReason(slots, 1, true)).toBeNull();
  });

  it("com a opção DESLIGADA bloqueia entre ingressos DIFERENTES", () => {
    // Este é o caso que passava antes: o guard antigo só olhava o mesmo ticketId.
    const slots = [br(0, "12345678900", "t1"), br(1, "12345678900", "t2")];
    expect(getDuplicateDocumentReason(slots, 1, false)).toBe("event-single-ticket");
  });

  it("mantém a mensagem específica quando a colisão é no MESMO ingresso", () => {
    const slots = [br(0, "12345678900", "t1"), br(1, "12345678900", "t1")];
    expect(getDuplicateDocumentReason(slots, 1, false)).toBe("same-ticket");
  });

  it("mesmo ingresso vence a colisão genérica, independentemente da ordem", () => {
    const slots = [
      br(0, "12345678900", "t2"),
      br(1, "12345678900", "t1"),
      br(2, "12345678900", "t1"),
    ];
    expect(getDuplicateDocumentReason(slots, 2, false)).toBe("same-ticket");
    expect(getDuplicateDocumentReason(slots, 0, false)).toBe("event-single-ticket");
  });

  it("ignora máscara ao comparar", () => {
    const slots = [br(0, "123.456.789-00", "t1"), br(1, "12345678900", "t2")];
    expect(getDuplicateDocumentReason(slots, 1, false)).toBe("event-single-ticket");
  });

  it("não acusa nada quando os documentos são distintos", () => {
    const slots = [br(0, "12345678900", "t1"), br(1, "98765432100", "t2")];
    expect(getDuplicateDocumentReason(slots, 1, false)).toBeNull();
  });

  it("slot sem documento nunca é duplicata", () => {
    const slots = [br(0, "12345678900", "t1"), br(1, "", "t2")];
    expect(getDuplicateDocumentReason(slots, 1, false)).toBeNull();
  });

  it("CPF e passaporte com os mesmos caracteres não colidem", () => {
    const slots: CheckoutDocumentSlot[] = [
      { index: 0, doc: "12345678900", isBrazilian: true, ticketId: "t1" },
      { index: 1, doc: "12345678900", isBrazilian: false, ticketId: "t2" },
    ];
    expect(getDuplicateDocumentReason(slots, 1, false)).toBeNull();
  });

  it("slot inexistente devolve null em vez de estourar", () => {
    expect(getDuplicateDocumentReason([br(0, "12345678900", "t1")], 9, false)).toBeNull();
  });
});
