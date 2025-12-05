import type { Event, EventResponse } from "@/interfaces/event";
import type { ApiClient } from "../base/ApiClient";

export class EventService {
  constructor(private apiClient: ApiClient) {}

  async getEvents(params?: {
    page?: number;
    limit?: number;
  }): Promise<EventResponse> {
    const { page = 1, limit = 10 } = params || {};

    const { data } = await this.apiClient.get("/api/v1/events", {
      params: { page, limit },
    });

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
}
