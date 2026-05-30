import type { Event } from "@/interfaces/event";
import type { Organization } from "@/services/organizer/OrganizerService";
import type { Organizer } from "@/interfaces/user";

/**
 * Formata CPF (11 dígitos) ou CNPJ (14 dígitos) para exibição.
 * Outros tamanhos: devolve o texto original (trim) sem máscara.
 */
export function formatBrazilianCnpjCpf(
  value: string | undefined | null
): string {
  if (!value?.trim()) return "";
  const digits = value.replace(/\D/g, "");
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  }
  if (digits.length === 14) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
  }
  return value.trim();
}

/** Rótulo para documento da organização com base só nos dígitos. */
export function organizationDocumentKind(
  value: string | undefined | null
): "CNPJ" | "CPF" | "Documento" {
  const n = value?.replace(/\D/g, "").length ?? 0;
  if (n === 14) return "CNPJ";
  if (n === 11) return "CPF";
  return "Documento";
}

/** Formata telefone BR para exibição: (11) 98765-4321, (11) 3030-3030 */
export function formatBrazilianPhone(phone: string | undefined | null): string {
  if (!phone?.trim()) return "";
  let d = phone.replace(/\D/g, "");
  if (!d) return phone.trim();
  if (d.startsWith("55") && d.length >= 12) d = d.slice(2);
  if (d.length <= 8) {
    return d.length <= 4 ? d : `${d.slice(0, 4)}-${d.slice(4, 8)}`;
  }
  if (d.length <= 10) {
    const ddd = d.slice(0, 2);
    const rest = d.slice(2);
    return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4, 8)}`;
  }
  if (d.length <= 11) {
    const ddd = d.slice(0, 2);
    const rest = d.slice(2);
    return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5, 9)}`;
  }
  return phone.trim();
}

export function phoneDigitsForTel(phone: string | undefined | null): string {
  if (!phone?.trim()) return "";
  const d = phone.replace(/\D/g, "");
  if (!d) return "";
  if (d.length === 10 || d.length === 11) return `+55${d}`;
  if (d.startsWith("55") && d.length >= 12) return `+${d}`;
  return d.length ? `+${d}` : "";
}

/**
 * Helper para obter dados do organizador/organização de forma compatível
 * Prioriza organization (novo) mas mantém compatibilidade com organizer (antigo)
 */
export function getEventOrganizer(event: Event): {
  id: string;
  name: string;
  email: string;
  phone?: string;
  description?: string;
  logoUrl?: string;
  /** CPF/CNPJ da organização (prioriza `document`, depois titular da conta). */
  document?: string;
} | null {
  // Prioriza organization (novo formato)
  if (event.organization) {
    const org = event.organization as Organization;
    const displayName =
      org.tradeName?.trim() || org.name;
    const document =
      org.document?.trim() || org.accountHolderDocument?.trim() || undefined;
    return {
      id: org.id,
      name: displayName,
      email: org.email,
      phone: org.phone,
      description: org.description,
      logoUrl: org.logoUrl,
      document,
    };
  }

  // Fallback para organizer (formato antigo - compatibilidade)
  if (event.organizer) {
    return {
      id: event.organizer.id,
      name: event.organizer.name,
      email: event.organizer.email,
      phone: event.organizer.phone,
      description: event.organizer.description,
    };
  }

  return null;
}

/**
 * Obtém o ID da organização/organizador do evento
 */
export function getEventOrganizationId(event: Event): string | null {
  // `organizationId` (scalar de topo) não vem no payload público da rota slug;
  // o id da org está em `event.organization.id`. Mantém o legado `organizer`
  // como último fallback.
  return (
    event.organizationId ||
    event.organization?.id ||
    event.organizer?.id ||
    null
  );
}
