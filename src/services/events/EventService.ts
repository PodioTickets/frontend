import type { Event, EventResponse, Question } from "@/interfaces/event";
import type { ApiClient } from "../base/ApiClient";
import { normalizeSearchLocationsPayload } from "@/utils/locationFacets";

export type EventSearchLocationPair = {
  state: string;
  city: string | null;
};

export interface SearchEventsParams {
  q?: string;
  country?: string;
  state?: string;
  city?: string;
  startDate?: string;
  endDate?: string;
  includePast?: boolean;
  modalities?: string[];
  /** Filtro de preço em REAIS (slider 0–1000). Evento entra se tiver algum
   *  ingresso/lote no intervalo. Omitidos quando o slider está no padrão. */
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  limit?: number;
}

export interface SearchEventsResponse {
  events: Event[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  query?: string;
}

export class EventService {
  constructor(private apiClient: ApiClient) { }

  async getEvents(params?: {
    page?: number;
    limit?: number;
  }): Promise<EventResponse> {
    const { page = 1, limit = 10 } = params || {};

    const { data } = await this.apiClient.get("/api/v1/events", {
      params: { page, limit },
    });

    console.log(data)

    return (
      data.data || {
        events: [],
        pagination: { page, limit, total: 0, totalPages: 1 },
      }
    );
  }

  async getEventById(id: string): Promise<Event> {
    const { data } = await this.apiClient.get(`/api/v1/events/${id}`);
    return data.data.event || null;
  }

  async getEventBySlug(slug: string): Promise<Event> {
    const { data } = await this.apiClient.get(`/api/v1/events/slug/${slug}`);
    return data.data.event || null;
  }

  async searchEvents(params?: SearchEventsParams): Promise<SearchEventsResponse> {
    const {
      q,
      country,
      state,
      city,
      startDate,
      endDate,
      includePast,
      modalities,
      minPrice,
      maxPrice,
      page = 1,
      limit = 20,
    } = params || {};

    // O filtro de preço da UI é em REAIS (com centavos, ex.: 100,01). A busca no
    // backend é em CENTAVOS (inteiro, mesma unidade de TicketBatch.price) — converte
    // aqui, na fronteira da API, pra não mandar decimal (rejeitado pelo @IsInt do DTO).
    const toCents = (reais?: number) =>
      reais != null ? Math.round(reais * 100) : undefined;

    const { data } = await this.apiClient.get("/api/v1/events/search", {
      params: {
        q,
        country,
        state,
        city,
        startDate,
        endDate,
        includePast: includePast !== undefined ? String(includePast) : undefined,
        modalities: modalities && modalities.length > 0 ? modalities.join(",") : undefined,
        minPrice: toCents(minPrice),
        maxPrice: toCents(maxPrice),
        page,
        limit,
      },
    });

    return (
      data.data || {
        events: [],
        pagination: { page, limit, total: 0, totalPages: 1 },
        query: q,
      }
    );
  }

  /** Pares distintos estado/cidade com eventos — `GET /api/v1/events/search/locations`. */
  async getSearchLocationFacets(): Promise<EventSearchLocationPair[]> {
    const { data } = await this.apiClient.get("/api/v1/events/search/locations");
    return normalizeSearchLocationsPayload(data);
  }

  async getEventQuestions(eventId: string): Promise<Question[]> {
    const { data } = await this.apiClient.get(
      `/api/v1/questions/events/${eventId}`
    );
    return data.data.questions || [];
  }
}
