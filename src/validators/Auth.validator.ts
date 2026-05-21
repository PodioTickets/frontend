import { z } from "zod";
import { isValidCPF } from "@/utils/cpf";

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email é obrigatório")
    .email("Email inválido"),
  password: z
    .string()
    .min(1, "Senha é obrigatória")
    .min(6, "A senha deve ter pelo menos 6 caracteres"),
});

export const forgotPasswordStep1Schema = loginSchema.pick({ email: true });

// Step 1a: Identidade (nome + nacionalidade) — primeira tela de dados pessoais.
export const registerStep1aSchema = z.object({
  nome: z
    .string()
    .min(1, "Nome completo é obrigatório")
    .refine(
      (v) => v.trim().split(/\s+/).length >= 2,
      { message: "Informe o nome completo" }
    ),
  nacionalidade: z.string().min(1, "Nacionalidade é obrigatória"),
});

/**
 * Decide se a pessoa é brasileira a partir do campo `nacionalidade`.
 * Aceita variantes ("BR", "Brasil", "Brazil") e trata vazio como BR (default
 * do formulário).
 */
export function isBrazilianCountry(country: string | undefined | null): boolean {
  if (!country) return true;
  const c = country.trim().toLowerCase();
  return !c || c === "br" || c === "brasil" || c === "brazil";
}

/**
 * Schema dinâmico da Step 1b. Quando a nacionalidade selecionada é brasileira
 * exige CPF válido; caso contrário aceita um documento genérico (passaporte,
 * RNE, identidade estrangeira) entre 4 e 30 caracteres. O campo continua se
 * chamando `cpf` no formData só pra evitar refactor em todo o componente.
 * A função é definida após `registerStep1bSchema` para reutilizar o shape
 * dos outros campos (dataNascimento, telefone, etc).
 */
export function buildRegisterStep1bSchema(country: string | undefined | null) {
  const docSchema = isBrazilianCountry(country)
    ? registerStep1bSchema.shape.cpf
    : z
      .string()
      .min(4, "Documento deve ter pelo menos 4 caracteres")
      .max(30, "Documento deve ter no máximo 30 caracteres");

  return registerStep1bSchema.extend({ cpf: docSchema });
}

// Step 1b: Documentos + contato — segunda tela de dados pessoais.
// Mantido como CPF brasileiro por compatibilidade com tipos exportados (form
// data type). A validação real em runtime usa `buildRegisterStep1bSchema()`
// que considera a nacionalidade selecionada.
export const registerStep1bSchema = z.object({
  cpf: z
    .string()
    .min(1, "CPF é obrigatório")
    .refine(
      (cpf) => cpf.replace(/\D/g, "").length === 11,
      { message: "CPF deve ter 11 dígitos" },
    )
    .refine((cpf) => isValidCPF(cpf), {
      message:
        "CPF inválido",
    }),
  dataNascimento: z
    .date({ message: "Data de nascimento é obrigatória" })
    .refine(
      (date) => {
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        return date <= today;
      },
      { message: "Data de nascimento não pode ser no futuro" }
    )
    .refine(
      (date) => {
        const today = new Date();
        const age = today.getFullYear() - date.getFullYear();
        const monthDiff = today.getMonth() - date.getMonth();
        if (
          monthDiff < 0 ||
          (monthDiff === 0 && today.getDate() < date.getDate())
        ) {
          return age - 1 >= 18;
        }
        return age >= 18;
      },
      { message: "Você deve ter pelo menos 18 anos" }
    ),
  telefone: z
    .string()
    .min(1, "Telefone é obrigatório")
    .refine(
      (phone) => {
        const numbers = phone.replace(/\D/g, "");
        return numbers.length === 11;
      },
      { message: "Telefone deve ter 11 dígitos" }
    ),
  telefoneEmergencia: z
    .string()
    .optional()
    .refine(
      (phone) => {
        if (!phone || phone.trim() === "") return true;
        const numbers = phone.replace(/\D/g, "");
        return numbers.length === 11 || numbers.length === 0;
      },
      { message: "Telefone de emergência deve ter 11 dígitos" }
    ),
  sexo: z.string().min(1, "Sexo é obrigatório"),
});

// Composição: dados pessoais completos (1a + 1b) — usado no payload final.
export const registerStep1Schema = registerStep1aSchema.merge(registerStep1bSchema);

// Step 2: Account Access
export const registerStep2Schema = z
  .object({
    email: z.string().min(1, "Email é obrigatório").email("Email inválido"),
    senha: z
      .string()
      .min(1, "Senha é obrigatória")
      .min(8, "Senha deve ter pelo menos 8 caracteres")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Senha deve conter pelo menos uma letra maiúscula, uma minúscula e um número"
      ),
    confirmarSenha: z.string().min(1, "Confirmação de senha é obrigatória"),
  })
  .refine((data) => data.senha === data.confirmarSenha, {
    message: "As senhas não coincidem",
    path: ["confirmarSenha"],
  });

export const registerSchema = registerStep1Schema.merge(registerStep2Schema);

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(1, "Senha é obrigatória")
      .min(8, "Senha deve ter pelo menos 8 caracteres")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Senha deve conter pelo menos uma letra maiúscula, uma minúscula e um número"
      ),
    confirmPassword: z.string().min(1, "Confirmação de senha é obrigatória"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type RegisterStep1FormData = z.infer<typeof registerStep1Schema>;
export type RegisterStep1aFormData = z.infer<typeof registerStep1aSchema>;
export type RegisterStep1bFormData = z.infer<typeof registerStep1bSchema>;
export type RegisterStep2FormData = z.infer<typeof registerStep2Schema>;
