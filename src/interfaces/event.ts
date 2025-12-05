import type { Organizer } from "./user";

export interface Event {
  id: string;
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
  eventDate: string;
  registrationEndDate: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  organizer: Organizer;
  topics: Topic[];
  locations: [];
  modalities: [];
  kits: [];
  questions: [];
}

export interface Topic {
  id: string;
  eventId: string;
  title: string;
  isEnabled: boolean;
  isDefault: boolean;
  order: number;
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
