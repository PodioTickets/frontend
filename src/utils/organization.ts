import type { Event } from "@/interfaces/event";
import type { Organization } from "@/services/organizer/OrganizerService";
import type { Organizer } from "@/interfaces/user";

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
} | null {
  // Prioriza organization (novo formato)
  if (event.organization) {
    const org = event.organization as Organization;
    const displayName =
      org.tradeName?.trim() || org.name;
    return {
      id: org.id,
      name: displayName,
      email: org.email,
      phone: org.phone,
      description: org.description,
      logoUrl: org.logoUrl,
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
  return event.organizationId || event.organizer?.id || null;
}
