import { describe, it, expect } from "vitest";
import {
  accessStepSchema,
  personTypeStepSchema,
  orgDataStepSchema,
  addressStepSchema,
  contactsStepSchema,
  buildOrganizerSignupPayload,
  emptyOrganizerSignupForm,
  type OrganizerSignupFormData,
} from "@/validators/OrganizerSignup.validator";

// Documentos válidos (checksum Receita) usados nos testes.
const VALID_CPF = "529.982.247-25";
const VALID_CNPJ = "11.222.333/0001-81";

function makeForm(
  overrides: Partial<OrganizerSignupFormData> = {},
): OrganizerSignupFormData {
  return {
    ...emptyOrganizerSignupForm,
    completeName: "Maria Silva",
    email: "maria@exemplo.com",
    password: "SenhaF0rte",
    confirmPassword: "SenhaF0rte",
    personType: "PJ",
    document: VALID_CNPJ,
    legalName: "Empresa LTDA",
    tradeName: "Meu Evento",
    ownerName: "João Responsável",
    ownerDocument: VALID_CPF,
    zipCode: "84010-000",
    street: "Rua A",
    number: "123",
    neighborhood: "Centro",
    city: "Ponta Grossa",
    state: "PR",
    orgEmail: "contato@meuevento.com.br",
    whatsapp: "(42) 99999-0000",
    phone: "",
    ...overrides,
  };
}

describe("accessStepSchema", () => {
  it("aceita dados válidos", () => {
    expect(accessStepSchema.safeParse(makeForm()).success).toBe(true);
  });
  it("rejeita nome incompleto", () => {
    expect(accessStepSchema.safeParse(makeForm({ completeName: "Maria" })).success).toBe(false);
  });
  it("rejeita senha fraca (sem maiúscula/número)", () => {
    const r = accessStepSchema.safeParse(
      makeForm({ password: "abcdefgh", confirmPassword: "abcdefgh" }),
    );
    expect(r.success).toBe(false);
  });
  it("rejeita senhas diferentes", () => {
    const r = accessStepSchema.safeParse(makeForm({ confirmPassword: "Outra1234" }));
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path[0] === "confirmPassword")).toBe(true);
    }
  });
});

describe("personTypeStepSchema", () => {
  it("exige PF ou PJ", () => {
    expect(personTypeStepSchema.safeParse({ personType: "" }).success).toBe(false);
    expect(personTypeStepSchema.safeParse({ personType: "PJ" }).success).toBe(true);
  });
});

describe("orgDataStepSchema", () => {
  it("PJ exige CNPJ válido + razão social", () => {
    expect(orgDataStepSchema("PJ").safeParse(makeForm()).success).toBe(true);
    expect(orgDataStepSchema("PJ").safeParse(makeForm({ document: "11.111.111/1111-11" })).success).toBe(false);
    expect(orgDataStepSchema("PJ").safeParse(makeForm({ legalName: "" })).success).toBe(false);
  });
  it("PF não exige CNPJ/razão social, mas exige CPF válido do responsável", () => {
    const pf = makeForm({ personType: "PF", document: "", legalName: "" });
    expect(orgDataStepSchema("PF").safeParse(pf).success).toBe(true);
    expect(orgDataStepSchema("PF").safeParse(makeForm({ personType: "PF", ownerDocument: "123" })).success).toBe(false);
  });
});

describe("addressStepSchema", () => {
  it("exige CEP de 8 dígitos e campos", () => {
    expect(addressStepSchema.safeParse(makeForm()).success).toBe(true);
    expect(addressStepSchema.safeParse(makeForm({ zipCode: "8401" })).success).toBe(false);
    expect(addressStepSchema.safeParse(makeForm({ city: "" })).success).toBe(false);
  });
});

describe("contactsStepSchema", () => {
  it("exige e-mail e WhatsApp com 11 dígitos", () => {
    expect(contactsStepSchema.safeParse(makeForm()).success).toBe(true);
    expect(contactsStepSchema.safeParse(makeForm({ orgEmail: "invalido" })).success).toBe(false);
    expect(contactsStepSchema.safeParse(makeForm({ whatsapp: "(42) 3222-0000" })).success).toBe(false);
  });
});

describe("buildOrganizerSignupPayload", () => {
  it("PJ inclui document/legalName com dígitos limpos", () => {
    const payload = buildOrganizerSignupPayload(makeForm(), "tk");
    expect(payload.personType).toBe("PJ");
    expect(payload.document).toBe("11222333000181");
    expect(payload.legalName).toBe("Empresa LTDA");
    expect(payload.ownerDocument).toBe("52998224725");
    expect(payload.whatsapp).toBe("42999990000");
    expect(payload.turnstileToken).toBe("tk");
  });

  it("PF omite document/legalName", () => {
    const payload = buildOrganizerSignupPayload(
      makeForm({ personType: "PF", document: "", legalName: "" }),
    );
    expect(payload.personType).toBe("PF");
    expect("document" in payload).toBe(false);
    expect("legalName" in payload).toBe(false);
    expect(payload.tradeName).toBe("Meu Evento");
    expect(payload.turnstileToken).toBeUndefined();
  });

  it("número/telefone vazios viram undefined", () => {
    const payload = buildOrganizerSignupPayload(makeForm({ number: "", phone: "" }));
    expect(payload.number).toBeUndefined();
    expect(payload.phone).toBeUndefined();
  });
});
