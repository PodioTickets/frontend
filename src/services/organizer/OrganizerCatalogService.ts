import { OrganizerReportingService } from "./OrganizerReportingService";
import { unwrapProductApiPayload } from "./OrganizerService.types";
import type {
  CreateOrganizerRequest,
  Organizer,
  CreateOrganizationRequest,
  OrganizerPermissionKey,
  OrganizationMember,
  Organization,
  PixKey,
  UserOrganization,
  CreateOrganizationMemberRequest,
  UpdateOrganizationMemberRequest,
  UpdateOrganizationMemberSettingsRequest,
  OrganizationMemberDetailResponse,
  OrganizationMeResponse,
  OrganizationAuditLogItem,
  OrganizationAuditLogsPagination,
  CreateEventRequest,
  EventTopic,
  EventLocation,
  CreateModalityGroupRequest,
  ModalityGroup,
  ModalityTemplate,
  CreateModalityRequest,
  Modality,
  CreateKitRequest,
  CreateKitItemRequest,
  KitItemSize,
  Kit,
  KitItem,
  CreateQuestionRequest,
  Question,
  Registration,
  EventStats,
  DashboardMetrics,
  RegistrationsTrend,
  TicketRanking,
  TopCity,
  LotNearDepletionBatch,
  LotNearDepletion,
  SalesHeatmapData,
  TopProductVariationItem,
  TopProductVariation,
  MostAnsweredQuestion,
  DashboardPagination,
  DashboardPeriod,
  DashboardOverviewData,
  DashboardRankingsData,
  DashboardSecondaryData,
  FinancialSummary,
  PaymentMethodBreakdown,
  FiscalOrder,
  FiscalOrdersData,
  PaymentMethodStats,
  RevenueChartData,
  FinancialTicketBatch,
  FinancialTicket,
  FinancialData,
  Transfer,
  Installment,
  PendingRelease,
  PaymentDetailsBillingAddress,
  PaymentDetails,
  RegistrationStats,
  EventNotificationChannel,
  EventNotificationStatus,
  EventNotification,
  EventNotificationsPagination,
  CreateEventNotificationRequest,
  EventTracking,
  EventTrackingPatch,
} from "./OrganizerService.types";

/**
 * Domínio de catálogo do evento (Bloco 3, fase 2): modalidades, kits, perguntas,
 * inscrições (export/stats/revenue), tópicos, localizações, categorias, ingressos,
 * produtos, cupons e vouchers. Elo da cadeia de mixins (entre Reporting e o
 * OrganizerService). Usa só `this.apiClient` + `unwrapProductApiPayload`.
 */
export class OrganizerCatalogService extends OrganizerReportingService {
  async createModalityGroup(
    eventId: string,
    data: CreateModalityGroupRequest,
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
    data: Partial<CreateModalityGroupRequest>,
  ): Promise<ModalityGroup> {
    const { data: response } = await this.apiClient.patch<{
      data: ModalityGroup;
    }>(`/api/v1/modalities/events/${eventId}/groups/${groupId}`, data);
    return response.data;
  }

  async deleteModalityGroup(eventId: string, groupId: string): Promise<void> {
    await this.apiClient.delete(
      `/api/v1/modalities/events/${eventId}/groups/${groupId}`,
    );
  }

  // Modality methods
  async createModality(
    eventId: string,
    data: CreateModalityRequest,
  ): Promise<Modality> {
    const { data: response } = await this.apiClient.post<{ data: Modality }>(
      `/api/v1/modalities/events/${eventId}`,
      data,
    );
    return response.data;
  }

  async getModalities(eventId: string): Promise<Modality[]> {
    const { data: response } = await this.apiClient.get<{
      data: { modalities: Modality[] };
    }>(`/api/v1/modalities/events/${eventId}`);
    return response.data.modalities;
  }

  async updateModality(
    eventId: string,
    modalityId: string,
    data: Partial<CreateModalityRequest>,
  ): Promise<Modality> {
    const { data: response } = await this.apiClient.patch<{ data: Modality }>(
      `/api/v1/modalities/events/${eventId}/${modalityId}`,
      data,
    );
    return response.data;
  }

  async deleteModality(eventId: string, modalityId: string): Promise<void> {
    await this.apiClient.delete(
      `/api/v1/modalities/events/${eventId}/${modalityId}`,
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
      data,
    );
    return response.data;
  }

  async getKits(eventId: string): Promise<Kit[]> {
    const { data: response } = await this.apiClient.get<{ data: Kit[] }>(
      `/api/v1/kits/events/${eventId}`,
    );
    return response.data;
  }

  async updateKit(
    eventId: string,
    kitId: string,
    data: Partial<CreateKitRequest>,
  ): Promise<Kit> {
    const { data: response } = await this.apiClient.patch<{ data: Kit }>(
      `/api/v1/kits/events/${eventId}/${kitId}`,
      data,
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
    data: CreateKitItemRequest,
  ): Promise<KitItem> {
    const { data: response } = await this.apiClient.post<{ data: KitItem }>(
      `/api/v1/kits/events/${eventId}/kits/${kitId}/items`,
      data,
    );
    return response.data;
  }

  async updateKitItem(
    eventId: string,
    kitId: string,
    itemId: string,
    data: Partial<CreateKitItemRequest>,
  ): Promise<KitItem> {
    const { data: response } = await this.apiClient.patch<{ data: KitItem }>(
      `/api/v1/kits/events/${eventId}/kits/${kitId}/items/${itemId}`,
      data,
    );
    return response.data;
  }

  async deleteKitItem(
    eventId: string,
    kitId: string,
    itemId: string,
  ): Promise<void> {
    await this.apiClient.delete(
      `/api/v1/kits/events/${eventId}/kits/${kitId}/items/${itemId}`,
    );
  }

  // Question methods
  async createQuestion(
    eventId: string,
    data: CreateQuestionRequest,
  ): Promise<Question> {
    const { data: response } = await this.apiClient.post<{ data: Question }>(
      `/api/v1/questions/events/${eventId}`,
      data,
    );
    return response.data;
  }

  async getQuestions(eventId: string): Promise<Question[]> {
    const { data: response } = await this.apiClient.get<{
      data: { questions: Question[] };
    }>(`/api/v1/questions/events/${eventId}`);
    return response.data.questions;
  }

  async updateQuestion(
    eventId: string,
    questionId: string,
    data: Partial<CreateQuestionRequest>,
  ): Promise<Question> {
    const { data: response } = await this.apiClient.patch<{ data: Question }>(
      `/api/v1/questions/events/${eventId}/${questionId}`,
      data,
    );
    return response.data;
  }

  async deleteQuestion(eventId: string, questionId: string): Promise<void> {
    await this.apiClient.delete(
      `/api/v1/questions/events/${eventId}/${questionId}`,
    );
  }

  // Registration methods
  async getEventRegistrations(
    eventId: string,
    params?: { page?: number; limit?: number; status?: string },
  ): Promise<{ registrations: Registration[]; pagination: any }> {
    const { page = 1, limit = 20, status } = params || {};
    const { data: response } = await this.apiClient.get<{
      data: { registrations: Registration[]; pagination: any };
    }>(`/api/v1/events/${eventId}/registrations`, {
      params: { page, limit, status },
    });
    return response.data;
  }

  async exportEventRegistrations(
    eventId: string,
    format: "txt" | "excel" | "pdf",
    fields?: string[],
    filters?: {
      search?: string;
      status?: string;
      ticketIds?: string[];
      startDate?: string;
      endDate?: string;
    },
  ): Promise<{ blob: Blob; filename: string }> {
    const params: Record<string, string> = { format };
    if (fields && fields.length > 0) params.fields = fields.join(",");
    if (filters?.search) params.search = filters.search;
    if (filters?.status && filters.status !== "all")
      params.status = filters.status;
    if (filters?.ticketIds?.length)
      params.ticketIds = filters.ticketIds.join(",");
    if (filters?.startDate) params.startDate = filters.startDate;
    if (filters?.endDate) params.endDate = filters.endDate;

    const response = await this.apiClient.get<Blob>(
      `/api/v1/events/${eventId}/registrations/export`,
      { params, responseType: "blob" },
    );

    const contentDisposition =
      (response.headers as any)["content-disposition"] ?? "";
    const match = contentDisposition.match(/filename="?([^"]+)"?/);
    const ext = format === "excel" ? "xlsx" : format === "pdf" ? "pdf" : "csv";
    const filename = match?.[1] ?? `inscricoes-${eventId.slice(0, 8)}.${ext}`;

    return { blob: response.data as unknown as Blob, filename };
  }

  async getEventStats(eventId: string): Promise<EventStats> {
    const { data: response } = await this.apiClient.get<{ data: EventStats }>(
      `/api/v1/events/${eventId}/stats`,
    );
    return response.data;
  }

  async getEventRevenue(
    eventId: string,
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
      isDefault?: boolean;
    },
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
      isDefault: boolean;
    }>,
  ): Promise<EventTopic> {
    const { data: response } = await this.apiClient.patch<{
      data: { topic: EventTopic };
    }>(`/api/v1/events/${eventId}/topics/${topicId}`, data);
    return response.data.topic;
  }

  /** Body order is 0-based (`order` = index in `topicIds`). Must list every topic id once. */
  async reorderEventTopics(
    eventId: string,
    topicIds: string[],
  ): Promise<EventTopic[]> {
    const { data: response } = await this.apiClient.patch<{
      message: string;
      data: { topics: EventTopic[] };
    }>(`/api/v1/events/${eventId}/topics/reorder`, { topicIds });
    return response.data.topics;
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
    },
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
    }>,
  ): Promise<EventLocation> {
    const { data: response } = await this.apiClient.patch<{
      data: { location: EventLocation };
    }>(`/api/v1/events/${eventId}/locations/${locationId}`, data);
    return response.data.location;
  }

  async deleteLocation(eventId: string, locationId: string): Promise<void> {
    await this.apiClient.delete(
      `/api/v1/events/${eventId}/locations/${locationId}`,
    );
  }

  // Ticket Category methods
  async createTicketCategory(
    eventId: string,
    data: { name: string },
  ): Promise<any> {
    const { data: response } = await this.apiClient.post<{ data: any }>(
      `/api/v1/tickets/events/${eventId}/categories`,
      data,
    );
    return response.data;
  }

  async getTicketCategories(eventId: string): Promise<any[]> {
    const { data: response } = await this.apiClient.get<{
      data: { categories: any[] };
    }>(`/api/v1/tickets/events/${eventId}/categories`);
    return response.data.categories;
  }

  /** Índice em `categoryIds` = sortOrder 0, 1, 2… — todos os ids do evento, sem repetir (como topics/reorder). */
  async reorderTicketCategories(
    eventId: string,
    categoryIds: string[],
  ): Promise<void> {
    await this.apiClient.patch(
      `/api/v1/tickets/events/${eventId}/categories/reorder`,
      {
        categoryIds,
      },
    );
  }

  async updateTicketCategory(
    eventId: string,
    categoryId: string,
    data: Partial<{ name: string; order: number; description?: string }>,
  ): Promise<any> {
    const { data: response } = await this.apiClient.patch<{ data: any }>(
      `/api/v1/tickets/events/${eventId}/categories/${categoryId}`,
      data,
    );
    return response.data;
  }

  async deleteTicketCategory(
    eventId: string,
    categoryId: string,
  ): Promise<void> {
    await this.apiClient.delete(
      `/api/v1/tickets/events/${eventId}/categories/${categoryId}`,
    );
  }

  // Ticket methods
  async createTicket(eventId: string, data: any): Promise<any> {
    const { data: response } = await this.apiClient.post<{ data: any }>(
      `/api/v1/tickets/events/${eventId}`,
      data,
    );
    // Backend envolve em `{ data: { ticket: {...} } }` — mesmo padrão de
    // `duplicateTicket` e `getTicketById`. Desempacota defensivamente:
    // se vier sem `.ticket`, retorna o data direto.
    return (response.data as { ticket?: unknown })?.ticket ?? response.data;
  }

  async getTickets(
    eventId: string,
    params?: {
      categoryId?: string;
      page?: number;
      limit?: number;
      includeInactive?: boolean;
    },
  ): Promise<{ tickets: any[]; pagination: any }> {
    const { data: response } = await this.apiClient.get<{
      data: { tickets: any[]; pagination: any };
    }>(`/api/v1/tickets/events/${eventId}`, { params });
    return response.data;
  }

  async getTicketById(id: string): Promise<any> {
    const { data: response } = await this.apiClient.get<{ data: any }>(
      `/api/v1/tickets/${id}`,
    );
    return response.data.ticket;
  }

  async updateTicket(
    eventId: string,
    ticketId: string,
    data: Partial<any>,
  ): Promise<any> {
    const { data: response } = await this.apiClient.patch<{ data: any }>(
      `/api/v1/tickets/events/${eventId}/${ticketId}`,
      data,
    );
    // Backend envolve em `{ data: { ticket: {...} } }` — mesmo padrão de
    // `duplicateTicket` e `getTicketById`. Desempacota defensivamente:
    // se vier sem `.ticket`, retorna o data direto.
    return (response.data as { ticket?: unknown })?.ticket ?? response.data;
  }

  /** Ordem do array = sortOrder 0…n; todos os ingressos ativos do escopo (mesma categoryId ou sem categoria). */
  async reorderTickets(
    eventId: string,
    body: { categoryId?: string | null; ticketIds: string[] },
  ): Promise<void> {
    const payload =
      body.categoryId === null || body.categoryId === undefined
        ? { ticketIds: body.ticketIds }
        : { categoryId: body.categoryId, ticketIds: body.ticketIds };
    await this.apiClient.patch(
      `/api/v1/tickets/events/${eventId}/reorder-tickets`,
      payload,
    );
  }

  async reorderTicketProducts(
    eventId: string,
    ticketId: string,
    productIds: string[],
  ): Promise<{ ticketId: string; productIds: string[] }> {
    const { data: body } = await this.apiClient.patch<{
      message?: string;
      data: { ticketId: string; productIds: string[] };
    }>(`/api/v1/tickets/events/${eventId}/${ticketId}/products/reorder`, {
      productIds,
    });
    return body.data;
  }

  async deleteTicket(eventId: string, ticketId: string): Promise<void> {
    await this.apiClient.delete(
      `/api/v1/tickets/events/${eventId}/${ticketId}`,
    );
  }

  async duplicateTicket(eventId: string, ticketId: string): Promise<any> {
    const { data: response } = await this.apiClient.post<{
      data: { ticket: any };
    }>(`/api/v1/tickets/events/${eventId}/${ticketId}/duplicate`);
    return response.data.ticket;
  }

  // Product methods
  async createProduct(eventId: string, data: any): Promise<any> {
    const { data: response } = await this.apiClient.post<{ data: any }>(
      `/api/v1/products/events/${eventId}`,
      data,
    );
    return unwrapProductApiPayload(response.data);
  }

  async getProducts(
    eventId: string,
    params?: { page?: number; limit?: number },
  ): Promise<{ products: any[]; pagination: any }> {
    const { data: response } = await this.apiClient.get<{
      data: { products: any[]; pagination: any };
    }>(`/api/v1/products/events/${eventId}`, { params });
    return response.data;
  }

  async getProductById(id: string): Promise<any> {
    const { data: response } = await this.apiClient.get<{ data: any }>(
      `/api/v1/products/${id}`,
    );
    return unwrapProductApiPayload(response.data);
  }

  async updateProduct(
    eventId: string,
    productId: string,
    data: Partial<any>,
  ): Promise<any> {
    const { data: response } = await this.apiClient.patch<{ data: any }>(
      `/api/v1/products/events/${eventId}/${productId}`,
      data,
    );
    return unwrapProductApiPayload(response.data);
  }

  async deleteProduct(eventId: string, productId: string): Promise<void> {
    await this.apiClient.delete(
      `/api/v1/products/events/${eventId}/${productId}`,
    );
  }

  // Coupon methods
  async createCoupon(eventId: string, data: any): Promise<any> {
    const { data: response } = await this.apiClient.post<{ data: any }>(
      `/api/v1/coupons/events/${eventId}`,
      data,
    );
    return response.data;
  }

  async getCoupons(
    eventId: string,
    params?: { page?: number; limit?: number; status?: string },
  ): Promise<{ coupons: any[]; pagination: any }> {
    const { data: response } = await this.apiClient.get<{
      data: { coupons: any[]; pagination: any };
    }>(`/api/v1/coupons/events/${eventId}`, { params });
    return response.data;
  }

  async getCouponById(id: string): Promise<any> {
    const { data: response } = await this.apiClient.get<{ data: any }>(
      `/api/v1/coupons/${id}`,
    );
    return response.data;
  }

  async updateCoupon(
    eventId: string,
    couponId: string,
    data: Partial<any>,
  ): Promise<any> {
    const { data: response } = await this.apiClient.patch<{ data: any }>(
      `/api/v1/coupons/events/${eventId}/${couponId}`,
      data,
    );
    return response.data;
  }

  async deleteCoupon(eventId: string, couponId: string): Promise<void> {
    await this.apiClient.delete(
      `/api/v1/coupons/events/${eventId}/${couponId}`,
    );
  }

  // Voucher methods
  async createVoucher(eventId: string, data: any): Promise<any> {
    const { data: response } = await this.apiClient.post<{ data: any }>(
      `/api/v1/vouchers/events/${eventId}`,
      data,
    );
    return response.data;
  }

  async getVouchers(
    eventId: string,
    params?: { page?: number; limit?: number; status?: string },
  ): Promise<{ groups: any[]; pagination: any }> {
    const { data: response } = await this.apiClient.get<{
      data: { groups: any[]; pagination: any };
    }>(`/api/v1/vouchers/events/${eventId}`, { params });
    return response.data;
  }

  async getVoucherById(id: string): Promise<any> {
    const { data: response } = await this.apiClient.get<{ data: any }>(
      `/api/v1/vouchers/${id}`,
    );
    return response.data;
  }

  async updateVoucher(
    eventId: string,
    voucherId: string,
    data: Partial<any>,
  ): Promise<any> {
    const { data: response } = await this.apiClient.patch<{ data: any }>(
      `/api/v1/vouchers/events/${eventId}/${voucherId}`,
      data,
    );
    return response.data;
  }

  async deleteVoucher(eventId: string, voucherId: string): Promise<void> {
    await this.apiClient.delete(
      `/api/v1/vouchers/events/${eventId}/${voucherId}`,
    );
  }

  async getVoucherGroup(
    eventId: string,
    groupName: string,
    params?: { page?: number; limit?: number },
  ): Promise<{
    groupName: string;
    vouchers: any[];
    group?: {
      name: string;
      status: "ACTIVE" | "INACTIVE" | "USED" | "EXPIRED";
      totalCount: number;
      availableCount: number;
      usedCount: number;
      expiredCount: number;
      inactiveCount: number;
      expiryDate?: string;
      appliesTo?: "all" | Array<string | { id: string }>;
      linkedTicket?: {
        id: string;
        name: string;
        price: number;
        category?: { id: string; name: string };
      };
    };
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const { data: response } = await this.apiClient.get<{
      message: string;
      data: {
        groupName: string;
        vouchers: any[];
        group?: {
          name: string;
          status: "ACTIVE" | "INACTIVE" | "USED" | "EXPIRED";
          totalCount: number;
          availableCount: number;
          usedCount: number;
          expiredCount: number;
          inactiveCount: number;
          expiryDate?: string;
          appliesTo?: "all" | Array<string | { id: string }>;
          linkedTicket?: {
            id: string;
            name: string;
            price: number;
            category?: { id: string; name: string };
          };
        };
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
        };
      };
    }>(`/api/v1/vouchers/events/${eventId}/groups/${groupName}`, { params });
    return response.data;
  }
}
