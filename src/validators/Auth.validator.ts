import { z } from "zod";

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

// Helper function to validate CPF format
const validateCPFFormat = (cpf: string): boolean => {
  const numbers = cpf.replace(/\D/g, "");
  if (numbers.length !== 11) return false;

  // Check if all digits are the same (invalid CPF)
  if (/^(\d)\1{10}$/.test(numbers)) return false;

  return true;
};

// Step 1: Personal Information
export const registerStep1Schema = z.object({
  nome: z
    .string()
    .min(1, "Nome é obrigatório")
    .min(3, "Nome deve ter pelo menos 3 caracteres"),
  nacionalidade: z.string().min(1, "Nacionalidade é obrigatória"),
  cpf: z
    .string()
    .min(1, "CPF é obrigatório")
    .refine(
      (cpf) => {
        const numbers = cpf.replace(/\D/g, "");
        return numbers.length === 11;
      },
      { message: "CPF deve ter 11 dígitos" }
    )
    .refine((cpf) => validateCPFFormat(cpf), { message: "CPF inválido" }),
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

// Complete register schema
export const registerSchema = registerStep1Schema.merge(registerStep2Schema);

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type RegisterStep1FormData = z.infer<typeof registerStep1Schema>;
export type RegisterStep2FormData = z.infer<typeof registerStep2Schema>;
