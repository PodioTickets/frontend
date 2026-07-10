import type { Organizer } from "./user";
import type { Organization } from "@/services/organizer/OrganizerService";
import type { EventKitSelectionDisplay } from "@/lib/eventKitSelectionDisplay";

export type { EventKitSelectionDisplay };

/** Métodos de pagamento configuráveis na tela financeira do evento (whitelist do checkout). */
export const ACCEPTED_PAYMENT_METHODS = ["PIX", "DEBIT_CARD", "CREDIT_CARD"] as const;
export type AcceptedPaymentMethod = (typeof ACCEPTED_PAYMENT_METHODS)[number];

export interface Event {
  id: string;
  slug: string;
  organizationId: string; // Mudado de organizerId para organizationId
  name: string;
  description: string;
  location: string;
  // Imagem do evento = BANNER apenas. A antiga "imagem do card" (logoUrl/
  // cardImageUrl) foi descontinuada — todo o app exibe o banner.
  bannerUrl: string;
  city: string;
  state: string;
  country: string;
  price: number;
  serviceFee: number;
  participantFeePercent?: number;
  maxInstallments?: 1 | 2 | 3;
  /** Whitelist de métodos do checkout (tela financeira). Ausente = todos. */
  acceptedPaymentMethods?: AcceptedPaymentMethod[];
  googleMapsLink: string;
  /**
   * Local do evento por coordenadas (seleção no mapa). Opcionais até o backend
   * persistir os novos campos; `googleMapsLink` segue derivado destas para
   * compatibilidade com o consumo público (embed/EventMap).
   */
  latitude?: number | null;
  longitude?: number | null;
  /** Rótulo amigável do local escolhido no mapa (nome do POI / endereço). */
  locationName?: string | null;
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
  /**
   * Vagas do evento: teto máximo de participantes (inscrições). `null`/ausente =
   * ilimitado. É o limite absoluto sobre a soma dos lotes; o "esgotado" derivado
   * dele vem em `hasRegistrationSlotsAvailable` (não recalcular no front).
   */
  maxParticipants?: number | null;
  hasRegistrationSlotsAvailable?: boolean;
  /** Inscrições suspensas (alternativa ou complemento a status SUSPENDED). */
  isSuspended?: boolean;
  status: string;
  /**
   * Ordem no carrossel de "Eventos em destaque" (admin). `null`/ausente = não
   * destacado. Valor menor aparece primeiro; também é a chave primária da ordem
   * PADRÃO da busca (destaque no topo). Só exposto nos payloads públicos/admin
   * relevantes — pode vir undefined em contratos que não o selecionam.
   */
  featuredOrder?: number | null;
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
