import type { Organizer } from "./user";
import type { Organization } from "@/services/organizer/OrganizerService";

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
  googleMapsLink: string;
  stravaRouteId?: string;
  eventDate: string;
  registrationStartDate: string;
  registrationEndDate: string;
  status: string;
  createdAt: string;
  updatedAt: string;
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
}

export interface Question {
  id: string;
  eventId: string;
  question: string;
  type: "text" | "true_false" | "number" | "select" | "multiple_choice";
  options?: string[];
  isRequired: boolean;
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
