import type { Organizer } from "./user";

export interface Event {
  id: string;
  slug: string;
  organizerId: string;
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
  registrationEndDate: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  organizer: Organizer;
  topics: Topic[];
  locations: [];
  modalities: Modality[];
  kits: [];
  questions: Question[];
}

export interface Question {
  id: string;
  eventId: string;
  question: string;
  type: "text" | "select" | "radio" | "checkbox";
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
