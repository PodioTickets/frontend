import type { ApiClient } from "../base/ApiClient";

export interface CreateOrganizerRequest {
  name: string;
  email: string;
  phone: string;
  description?: string;
}

export interface Organizer {
  id: string;
  name: string;
  email: string;
  phone: string;
  description?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEventRequest {
  name: string;
  description?: string;
  location?: string;
  city?: string;
  state?: string;
  country?: string;
  eventDate?: string;
  registrationStartDate?: string;
  registrationEndDate?: string;
  googleMapsLink?: string;
  bannerUrl?: string;
  status?: "DRAFT" | "PUBLISHED" | "CANCELLED" | "COMPLETED";
}

export interface EventTopic {
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

export interface EventLocation {
  id: string;
  eventId: string;
  name?: string;
  address: string;
  city: string;
  state: string;
  country: string;
  zipCode?: string;
  googleMapsLink?: string;
  latitude?: number;
  longitude?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Event {
  id: string;
  name: string;
  description?: string;
  location?: string;
  city?: string;
  state?: string;
  country?: string;
  eventDate?: string;
  registrationStartDate?: string;
  registrationEndDate?: string;
  googleMapsLink?: string;
  bannerUrl?: string;
  status: "DRAFT" | "PUBLISHED" | "CANCELLED" | "COMPLETED";
  organizerId: string;
  createdAt: string;
  updatedAt: string;
  topics?: EventTopic[];
  locations?: EventLocation[];
  _count?: {
    registrations?: number;
    modalities?: number;
  };
}

export interface CreateModalityGroupRequest {
  name: string;
  description?: string;
  order?: number;
}

export interface ModalityGroup {
  id: string;
  name: string;
  description?: string;
  order: number;
  eventId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ModalityTemplate {
  id: string;
  code: string;
  label: string;
  icon?: string;
  isActive: boolean;
}

export interface CreateModalityRequest {
  templateId?: string;
  name: string;
  description?: string;
  price: number;
  maxParticipants?: number;
  isActive?: boolean;
  order?: number;
}

export interface Modality {
  id: string;
  eventId: string;
  templateId?: string;
  name: string;
  description?: string;
  price: number;
  maxParticipants?: number;
  currentParticipants?: number;
  isActive: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
  template?: ModalityTemplate;
}

export interface CreateKitRequest {
  name: string;
  description?: string;
  isActive?: boolean;
  items: CreateKitItemRequest[];
}

export interface CreateKitItemRequest {
  name: string;
  description?: string;
  sizes: KitItemSize[];
  isActive?: boolean;
}

export interface KitItemSize {
  size: string;
  stock: number;
}

export interface Kit {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  eventId: string;
  items: KitItem[];
  createdAt: string;
  updatedAt: string;
}

export interface KitItem {
  id: string;
  name: string;
  description?: string;
  sizes: KitItemSize[];
  isActive: boolean;
  kitId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateQuestionRequest {
  question: string;
  type: "text" | "true_false" | "number" | "select" | "multiple_choice";
  options?: string[];
  isRequired?: boolean;
  order?: number;
}

export interface Question {
  id: string;
  question: string;
  type: "text" | "true_false" | "number" | "select" | "multiple_choice";
  options?: string[];
  isRequired: boolean;
  order: number;
  eventId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Registration {
  id: string;
  eventId: string;
  userId: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
  totalAmount: number;
  serviceFee: number;
  finalAmount: number;
  qrCode: string;
  purchaseDate: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    documentNumber?: string;
  };
  modalities: Array<{
    id: string;
    modality: Modality;
  }>;
  kitItems: Array<{
    id: string;
    kitItem: KitItem;
    selectedSize: string;
    quantity: number;
  }>;
  questionAnswers: Array<{
    id: string;
    question: Question;
    answer: string;
  }>;
}

export interface EventStats {
  totalRegistrations: number;
  confirmedRegistrations: number;
  pendingRegistrations: number;
  cancelledRegistrations: number;
  totalRevenue: number;
  registrationsByModality: Array<{
    modalityId: string;
    modalityName: string;
    count: number;
  }>;
}

export class OrganizerService {
  constructor(private apiClient: ApiClient) {}

  // Organizer methods
  async createOrganizer(data: CreateOrganizerRequest): Promise<Organizer> {
    const { data: response } = await this.apiClient.post<{ data: Organizer }>(
      "/api/v1/organizers",
      data
    );
    return response.data;
  }

  async getOrganizer(): Promise<Organizer> {
    const { data: response } = await this.apiClient.get<{ data: Organizer }>(
      "/api/v1/organizers/me"
    );
    return response.data;
  }

  async updateOrganizer(
    id: string,
    data: Partial<CreateOrganizerRequest>
  ): Promise<Organizer> {
    const { data: response } = await this.apiClient.patch<{ data: Organizer }>(
      `/api/v1/organizers/${id}`,
      data
    );
    return response.data;
  }

  async createEvent(data: CreateEventRequest): Promise<Event> {
    const { data: response } = await this.apiClient.post<{
      data: { event: Event };
    }>("/api/v1/events", data);
    return response.data.event;
  }

  async getMyEvents(params?: {
    page?: number;
    limit?: number;
    status?: string;
    includePast?: boolean;
    startDate?: string;
    endDate?: string;
    name?: string;
  }): Promise<{ events: Event[]; pagination: any }> {
    const {
      page = 1,
      limit = 20,
      status,
      includePast,
      startDate,
      endDate,
      name,
    } = params || {};
    const { data: response } = await this.apiClient.get<{
      data: { events: Event[]; pagination: any };
    }>("/api/v1/organizers/me/events", {
      params: {
        page,
        limit,
        status,
        includePast:
          includePast !== undefined ? String(includePast) : undefined,
        startDate,
        endDate,
        name,
      },
    });
    return response.data;
  }

  async getEventById(id: string): Promise<Event> {
    const { data: response } = await this.apiClient.get<{
      data: { event: Event };
    }>(`/api/v1/events/${id}`);
    return response.data.event;
  }

  async updateEvent(
    id: string,
    data: Partial<CreateEventRequest>
  ): Promise<Event> {
    const { data: response } = await this.apiClient.patch<{
      data: { event: Event };
    }>(`/api/v1/events/${id}`, data);
    return response.data.event;
  }

  async deleteEvent(id: string): Promise<void> {
    await this.apiClient.delete(`/api/v1/events/${id}`);
  }

  async publishEvent(id: string): Promise<Event> {
    return this.updateEvent(id, { status: "PUBLISHED" });
  }

  async createModalityGroup(
    eventId: string,
    data: CreateModalityGroupRequest
  ): Promise<ModalityGroup> {
    const { data: response } = await this.apiClient.post<{
      data: ModalityGroup;
    }>(`/api/v1/modalities/events/${eventId}/groups`, data);
    return response.data;
  }

  async getModalityGroups(eventId: string): Promise<ModalityGroup[]> {
    const { data: response } = await this.apiClient.get<{
      data: ModalityGroup[];
    }>(`/api/v1/modalities/events/${eventId}/groups`);
    return response.data;
  }

  async updateModalityGroup(
    eventId: string,
    groupId: string,
    data: Partial<CreateModalityGroupRequest>
  ): Promise<ModalityGroup> {
    const { data: response } = await this.apiClient.patch<{
      data: ModalityGroup;
    }>(`/api/v1/modalities/events/${eventId}/groups/${groupId}`, data);
    return response.data;
  }

  async deleteModalityGroup(eventId: string, groupId: string): Promise<void> {
    await this.apiClient.delete(
      `/api/v1/modalities/events/${eventId}/groups/${groupId}`
    );
  }

  // Modality methods
  async createModality(
    eventId: string,
    data: CreateModalityRequest
  ): Promise<Modality> {
    const { data: response } = await this.apiClient.post<{ data: Modality }>(
      `/api/v1/modalities/events/${eventId}`,
      data
    );
    return response.data;
  }

  async getModalities(eventId: string): Promise<Modality[]> {
    const { data: response } = await this.apiClient.get<{
      data: { modalities: Modality[] };
    }>(`/api/v1/modalities/events/${eventId}`);
    console.log("response", response);
    return response.data.modalities;
  }

  async updateModality(
    eventId: string,
    modalityId: string,
    data: Partial<CreateModalityRequest>
  ): Promise<Modality> {
    const { data: response } = await this.apiClient.patch<{ data: Modality }>(
      `/api/v1/modalities/events/${eventId}/${modalityId}`,
      data
    );
    return response.data;
  }

  async deleteModality(eventId: string, modalityId: string): Promise<void> {
    await this.apiClient.delete(
      `/api/v1/modalities/events/${eventId}/${modalityId}`
    );
  }

  // Modality Template methods
  async getModalityTemplates(): Promise<ModalityTemplate[]> {
    const { data: response } = await this.apiClient.get<{
      data: { templates: ModalityTemplate[] };
    }>("/api/v1/modalities/templates");
    return response.data.templates;
  }

  // Kit methods
  async createKit(eventId: string, data: CreateKitRequest): Promise<Kit> {
    const { data: response } = await this.apiClient.post<{ data: Kit }>(
      `/api/v1/kits/events/${eventId}`,
      data
    );
    return response.data;
  }

  async getKits(eventId: string): Promise<Kit[]> {
    const { data: response } = await this.apiClient.get<{ data: Kit[] }>(
      `/api/v1/kits/events/${eventId}`
    );
    return response.data;
  }

  async updateKit(
    eventId: string,
    kitId: string,
    data: Partial<CreateKitRequest>
  ): Promise<Kit> {
    const { data: response } = await this.apiClient.patch<{ data: Kit }>(
      `/api/v1/kits/events/${eventId}/${kitId}`,
      data
    );
    return response.data;
  }

  async deleteKit(eventId: string, kitId: string): Promise<void> {
    await this.apiClient.delete(`/api/v1/kits/events/${eventId}/${kitId}`);
  }

  // Kit Item methods
  async createKitItem(
    eventId: string,
    kitId: string,
    data: CreateKitItemRequest
  ): Promise<KitItem> {
    const { data: response } = await this.apiClient.post<{ data: KitItem }>(
      `/api/v1/kits/events/${eventId}/kits/${kitId}/items`,
      data
    );
    return response.data;
  }

  async updateKitItem(
    eventId: string,
    kitId: string,
    itemId: string,
    data: Partial<CreateKitItemRequest>
  ): Promise<KitItem> {
    const { data: response } = await this.apiClient.patch<{ data: KitItem }>(
      `/api/v1/kits/events/${eventId}/kits/${kitId}/items/${itemId}`,
      data
    );
    return response.data;
  }

  async deleteKitItem(
    eventId: string,
    kitId: string,
    itemId: string
  ): Promise<void> {
    await this.apiClient.delete(
      `/api/v1/kits/events/${eventId}/kits/${kitId}/items/${itemId}`
    );
  }

  // Question methods
  async createQuestion(
    eventId: string,
    data: CreateQuestionRequest
  ): Promise<Question> {
    const { data: response } = await this.apiClient.post<{ data: Question }>(
      `/api/v1/questions/events/${eventId}`,
      data
    );
    return response.data;
  }

  async getQuestions(eventId: string): Promise<Question[]> {
    const { data: response } = await this.apiClient.get<{ data: Question[] }>(
      `/api/v1/questions/events/${eventId}`
    );
    return response.data;
  }

  async updateQuestion(
    eventId: string,
    questionId: string,
    data: Partial<CreateQuestionRequest>
  ): Promise<Question> {
    const { data: response } = await this.apiClient.patch<{ data: Question }>(
      `/api/v1/questions/events/${eventId}/${questionId}`,
      data
    );
    return response.data;
  }

  async deleteQuestion(eventId: string, questionId: string): Promise<void> {
    await this.apiClient.delete(
      `/api/v1/questions/events/${eventId}/${questionId}`
    );
  }

  // Registration methods
  async getEventRegistrations(
    eventId: string,
    params?: { page?: number; limit?: number; status?: string }
  ): Promise<{ registrations: Registration[]; pagination: any }> {
    const { page = 1, limit = 20, status } = params || {};
    const { data: response } = await this.apiClient.get<{
      data: { registrations: Registration[]; pagination: any };
    }>(`/api/v1/events/${eventId}/registrations`, {
      params: { page, limit, status },
    });
    return response.data;
  }

  async getEventStats(eventId: string): Promise<EventStats> {
    const { data: response } = await this.apiClient.get<{ data: EventStats }>(
      `/api/v1/events/${eventId}/stats`
    );
    return response.data;
  }

  async getEventRevenue(
    eventId: string
  ): Promise<{ total: number; breakdown: any[] }> {
    const { data: response } = await this.apiClient.get<{
      data: { total: number; breakdown: any[] };
    }>(`/api/v1/events/${eventId}/revenue`);
    return response.data;
  }

  // Topic methods
  async createTopic(
    eventId: string,
    data: {
      title: string;
      content: string;
      isEnabled?: boolean;
      order?: number;
    }
  ): Promise<EventTopic> {
    const { data: response } = await this.apiClient.post<{
      data: { topic: EventTopic };
    }>(`/api/v1/events/${eventId}/topics`, data);
    return response.data.topic;
  }

  async updateTopic(
    eventId: string,
    topicId: string,
    data: Partial<{
      title: string;
      content: string;
      isEnabled: boolean;
      order: number;
    }>
  ): Promise<EventTopic> {
    const { data: response } = await this.apiClient.patch<{
      data: { topic: EventTopic };
    }>(`/api/v1/events/${eventId}/topics/${topicId}`, data);
    return response.data.topic;
  }

  async deleteTopic(eventId: string, topicId: string): Promise<void> {
    await this.apiClient.delete(`/api/v1/events/${eventId}/topics/${topicId}`);
  }

  // Location methods
  async createLocation(
    eventId: string,
    data: {
      name?: string;
      address: string;
      city: string;
      state: string;
      country: string;
      zipCode?: string;
      googleMapsLink?: string;
      latitude?: number;
      longitude?: number;
    }
  ): Promise<EventLocation> {
    const { data: response } = await this.apiClient.post<{
      data: { location: EventLocation };
    }>(`/api/v1/events/${eventId}/locations`, data);
    return response.data.location;
  }

  async updateLocation(
    eventId: string,
    locationId: string,
    data: Partial<{
      name: string;
      address: string;
      city: string;
      state: string;
      country: string;
      zipCode: string;
      googleMapsLink: string;
      latitude: number;
      longitude: number;
    }>
  ): Promise<EventLocation> {
    const { data: response } = await this.apiClient.patch<{
      data: { location: EventLocation };
    }>(`/api/v1/events/${eventId}/locations/${locationId}`, data);
    return response.data.location;
  }

  async deleteLocation(eventId: string, locationId: string): Promise<void> {
    await this.apiClient.delete(
      `/api/v1/events/${eventId}/locations/${locationId}`
    );
  }
}
