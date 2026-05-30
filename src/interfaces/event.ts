import type { Organizer } from "./user";
import type { Organization } from "@/services/organizer/OrganizerService";
import type { EventKitSelectionDisplay } from "@/lib/eventKitSelectionDisplay";

export type { EventKitSelectionDisplay };

export interface Event {
  id: string;
  slug: string;
  organizationId: string; // Mudado de organizerId para organizationId
  name: string;
  description: string;
  location: string;
  bannerUrl: string;
  city: string;
  state: string;
  country: string;
  price: number;
  serviceFee: number;
  participantFeePercent?: number;
  maxInstallments?: 1 | 2 | 3;
  googleMapsLink: string;
  stravaRouteId?: string;
  /** URL do regulamento do evento (ex.: PDF) */
  regulationUrl?: string;
  eventDate: string;
  website?: string;
  tiktok?: string;
  youtube?: string;
  facebook?: string;
  instagram?: string;
  registrationStartDate: string;
  registrationEndDate: string;
  hasRegistrationSlotsAvailable?: boolean;
  /** Inscrições suspensas (alternativa ou complemento a status SUSPENDED). */
  isSuspended?: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
  zipCode: string;
  neighborhood: string;
  organization: Organization; // Mudado de organizer para organization
  organizer?: Organizer; // Mantido para compatibilidade retroativa
  topics: Topic[];
  locations: [];
  modalities: Modality[];
  kits: [];
  questions: Question[];
  _count?: {
    registrations?: number;
    modalities?: number;
  };
  /**
   * Total de inscrições confirmadas. Backend só retorna esse campo quando o
   * caller é organizador/admin do evento — undefined em chamadas públicas.
   * Usado, por ex., na criação de notificações para indicar quantos
   * participantes receberão a mensagem.
   */
  registrationsCount?: number;
  /** Exibição do kit na escolha de ingressos (organizer). Opcional até o backend expor o campo. */
  kitSelectionDisplay?: EventKitSelectionDisplay | null;
  /**
   * IDs de rastreamento expostos no payload público do evento (página do
   * evento + checkout). Usado pelo Meta Pixel; GA/Ads ficam disponíveis para
   * integrações futuras. Opcional — só vem quando configurado pelo organizador.
   */
  tracking?: EventTracking;
}

export interface EventTracking {
  metaPixelId?: string;
  googleAnalyticsId?: string;
  googleAdsId?: string;
}

export interface Question {
  id: string;
  eventId: string;
  question: string;
  type: "text" | "true_false" | "number" | "select" | "multiple_choice";
  options?: string[];
  isRequired: boolean;
  description?: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface Topic {
  id: string;
  eventId: string;
  title: string;
  content: string;
  isEnabled: boolean;
  isDefault: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface ModalityTemplate {
  id: string;
  code: string;
  label: string;
  icon: string;
}

export interface Modality {
  id: string;
  eventId: string;
  templateId: string;
  name: string;
  description?: string;
  price: number;
  maxParticipants?: number;
  currentParticipants?: number;
  isActive: boolean;
  order: number;
  template?: ModalityTemplate;
  createdAt: string;
  updatedAt: string;
}

export interface EventResponse {
  events: Event[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
