import type { Event } from "@/interfaces/event";
import type { Organization } from "@/services/organizer/OrganizerService";
import type { Organizer } from "@/interfaces/user";

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
    return {
      id: event.organization.id,
      name: event.organization.name,
      email: event.organization.email,
      phone: event.organization.phone,
      description: event.organization.description,
      logoUrl: event.organization.logoUrl,
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
