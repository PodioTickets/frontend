import { z } from "zod";
import { isValidCPF } from "@/utils/cpf";
import { isValidCNPJ } from "@/utils/cnpj";
import { onlyDigits } from "@/utils/masks";
import type { OrganizerSignupRequest } from "@/services/organizer/OrganizerService.types";

/**
 * Validação (Zod) por etapa do wizard de auto-cadastro de organizador.
 * Reusa `isValidCPF`/`isValidCNPJ` (checksum) e a regra de senha forte do
 * cadastro de participante (`registerStep2Schema`).
 */

export type PersonType = "PF" | "PJ";

export interface OrganizerSignupFormData {
  // Acesso
  completeName: string;
  email: string;
  password: string;
  confirmPassword: string;
  // Tipo
  personType: PersonType | "";
  // Dados da organização
  document: string; // CNPJ (PJ)
  legalName: string; // Razão social (PJ)
  tradeName: string; // Nome fantasia
  ownerName: string; // Nome do responsável
  ownerDocument: string; // CPF do responsável
  // Endereço
  zipCode: string;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  // Contatos
  orgEmail: string;
  whatsapp: string;
  phone: string;
}

export const emptyOrganizerSignupForm: OrganizerSignupFormData = {
  completeName: "",
  email: "",
  password: "",
  confirmPassword: "",
  personType: "",
  document: "",
  legalName: "",
  tradeName: "",
  ownerName: "",
  ownerDocument: "",
  zipCode: "",
  street: "",
  number: "",
  neighborhood: "",
  city: "",
  state: "",
  orgEmail: "",
  whatsapp: "",
  phone: "",
};

const fullNameSchema = z
  .string()
  .min(1, "Nome completo é obrigatório")
  .refine((v) => v.trim().split(/\s+/).length >= 2, {
    message: "Informe o nome completo",
  });

const strongPasswordSchema = z
  .string()
  .min(1, "Senha é obrigatória")
  .min(8, "Senha deve ter pelo menos 8 caracteres")
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    "Senha deve conter pelo menos uma letra maiúscula, uma minúscula e um número",
  );

const cpfSchema = z
  .string()
  .min(1, "CPF é obrigatório")
  .refine((v) => onlyDigits(v).length === 11, { message: "CPF deve ter 11 dígitos" })
  .refine((v) => isValidCPF(v), { message: "CPF inválido" });

const cnpjSchema = z
  .string()
  .min(1, "CNPJ é obrigatório")
  .refine((v) => onlyDigits(v).length === 14, { message: "CNPJ deve ter 14 dígitos" })
  .refine((v) => isValidCNPJ(v), { message: "CNPJ inválido" });

const phoneDigits11 = (v: string) => onlyDigits(v).length === 11;

// ─── Etapa 1: Dados de acesso ─────────────────────────────────────────────────
export const accessStepSchema = z
  .object({
    completeName: fullNameSchema,
    email: z.string().min(1, "E-mail é obrigatório").email("E-mail inválido"),
    password: strongPasswordSchema,
    confirmPassword: z.string().min(1, "Confirmação de senha é obrigatória"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

// ─── Etapa 2: Tipo ────────────────────────────────────────────────────────────
export const personTypeStepSchema = z.object({
  personType: z.enum(["PF", "PJ"], {
    message: "Selecione o tipo de cadastro",
  }),
});

// ─── Etapa 3: Dados da organização (ramo PF/PJ) ──────────────────────────────
const orgDataCommon = {
  tradeName: z.string().min(1, "Nome fantasia é obrigatório"),
  ownerName: fullNameSchema,
  ownerDocument: cpfSchema,
};

// PJ: o CNPJ é o GATE da etapa (os demais campos só são revelados após ele), então
// vem PRIMEIRO no schema — assim, sem CNPJ, a 1ª issue do Zod (usada no toast) é a
// do CNPJ, e não a de um campo ainda oculto (ex.: CPF do responsável).
export const orgDataPjSchema = z.object({
  document: cnpjSchema,
  legalName: z.string().min(1, "Razão social é obrigatória"),
  ...orgDataCommon,
});

export const orgDataPfSchema = z.object(orgDataCommon);

export function orgDataStepSchema(personType: PersonType | "") {
  return personType === "PJ" ? orgDataPjSchema : orgDataPfSchema;
}

// ─── Etapa 4: Endereço ────────────────────────────────────────────────────────
export const addressStepSchema = z.object({
  zipCode: z
    .string()
    .min(1, "CEP é obrigatório")
    .refine((v) => onlyDigits(v).length === 8, { message: "CEP deve ter 8 dígitos" }),
  street: z.string().min(1, "Rua é obrigatória"),
  number: z.string().optional(),
  neighborhood: z.string().min(1, "Bairro é obrigatório"),
  city: z.string().min(1, "Cidade é obrigatória"),
  state: z.string().min(1, "Estado é obrigatório"),
});

// ─── Etapa 5: Contatos ────────────────────────────────────────────────────────
export const contactsStepSchema = z.object({
  orgEmail: z.string().min(1, "E-mail é obrigatório").email("E-mail inválido"),
  whatsapp: z
    .string()
    .min(1, "WhatsApp é obrigatório")
    .refine(phoneDigits11, { message: "WhatsApp deve ter DDD + 9 dígitos" }),
  phone: z
    .string()
    .optional()
    .refine((v) => !v || onlyDigits(v).length === 0 || onlyDigits(v).length >= 10, {
      message: "Telefone inválido",
    }),
});

/**
 * Monta o payload do backend a partir do form, removendo máscaras dos campos
 * numéricos (documento/telefone/CEP). Para PF o documento da org e a razão
 * social são derivados no backend a partir do CPF/nome fantasia.
 */
export function buildOrganizerSignupPayload(
  form: OrganizerSignupFormData,
  turnstileToken?: string | null,
): OrganizerSignupRequest {
  const isPJ = form.personType === "PJ";
  return {
    completeName: form.completeName.trim(),
    email: form.email.trim(),
    password: form.password,
    personType: (form.personType || "PF") as PersonType,
    ...(isPJ
      ? {
          document: onlyDigits(form.document),
          legalName: form.legalName.trim(),
        }
      : {}),
    tradeName: form.tradeName.trim(),
    ownerName: form.ownerName.trim(),
    ownerDocument: onlyDigits(form.ownerDocument),
    zipCode: onlyDigits(form.zipCode),
    street: form.street.trim(),
    number: form.number.trim() || undefined,
    neighborhood: form.neighborhood.trim(),
    city: form.city.trim(),
    state: form.state.trim(),
    orgEmail: form.orgEmail.trim(),
    whatsapp: onlyDigits(form.whatsapp),
    phone: onlyDigits(form.phone) || undefined,
    ...(turnstileToken ? { turnstileToken } : {}),
  };
}
