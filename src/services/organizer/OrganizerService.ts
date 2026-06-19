import type { Event, AcceptedPaymentMethod } from "@/interfaces/event";
import { ACCEPTED_PAYMENT_METHODS } from "@/interfaces/event";
import { sanitizeOrganizerAuditPageKey } from "@/lib/organizerAudit";
import { surfaceHeader } from "@/lib/authSurface";
import { OrganizerOrganizationService } from "./OrganizerOrganizationService";

// Tipos extraídos (Bloco 3) + re-export para compat retroativa.
export * from "./OrganizerService.types";
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
import {
  normalizeOrganizationMember,
  normalizeMemberDetailResponse,
  normalizeOrganizationAuditLogItem,
  normalizeEventTracking,
  normalizeEventNotification,
} from "./OrganizerService.types";

/**
 * Topo da cadeia de mixins do OrganizerService. Domínio EVENTO (evento,
 * notificações, config financeira, publicação/suspensão/retomada). Herda
 * organização/catálogo/leitura/financeiro via Organization -> Catalog ->
 * Reporting -> Base. API pública `organizerService.x` preservada 100%.
 */
export class OrganizerService extends OrganizerOrganizationService {
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

  /** Rastreamento (Meta Pixel, GA4, Google Ads). Requer JWT + permissão `edit_event`. */
  async getEventTracking(eventId: string): Promise<EventTracking> {
    const { data: response } = await this.apiClient.get<{
      data: { tracking: Record<string, unknown> };
    }>(`/api/v1/events/${eventId}/tracking`);
    return normalizeEventTracking(response.data?.tracking);
  }

  /**
   * Atualização parcial: só chaves enviadas são alteradas; string vazia persiste null no banco.
   */
  async patchEventTracking(
    eventId: string,
    patch: EventTrackingPatch,
  ): Promise<EventTracking> {
    const { data: response } = await this.apiClient.patch<{
      data: { tracking?: Record<string, unknown> };
    }>(`/api/v1/events/${eventId}/tracking`, patch);
    if (response.data?.tracking) {
      return normalizeEventTracking(response.data.tracking);
    }
    return this.getEventTracking(eventId);
  }

  /**
   * Lista notificações do evento (sem `messageHtml` na lista). Ver EVENT_NOTIFICATIONS_API.md.
   */
  async getEventNotifications(
    eventId: string,
    params?: {
      page?: number;
      limit?: number;
      q?: string;
      status?: EventNotificationStatus;
    },
  ): Promise<{
    items: EventNotification[];
    pagination: EventNotificationsPagination;
  }> {
    const { data: response } = await this.apiClient.get<{
      data: {
        items: Record<string, unknown>[];
        pagination: EventNotificationsPagination;
      };
    }>(`/api/v1/organizer/events/${eventId}/notifications`, {
      params: {
        page: params?.page,
        limit: params?.limit,
        q: params?.q?.trim() || undefined,
        status: params?.status || undefined,
      },
    });

    const items = (response.data.items ?? []).map((row) =>
      normalizeEventNotification(row),
    );
    const p = response.data.pagination;
    const pagination: EventNotificationsPagination = {
      page: p?.page ?? 1,
      limit: p?.limit ?? 8,
      total: p?.total ?? 0,
      totalPages: Math.max(1, p?.totalPages ?? 1),
    };

    return { items, pagination };
  }

  /** Detalhe com `messageHtml` completo. */
  async getEventNotification(
    eventId: string,
    notificationId: string,
  ): Promise<EventNotification> {
    const { data: response } = await this.apiClient.get<{
      data: Record<string, unknown>;
    }>(`/api/v1/organizer/events/${eventId}/notifications/${notificationId}`);
    return normalizeEventNotification(response.data);
  }

  async createEventNotification(
    eventId: string,
    body: CreateEventNotificationRequest,
  ): Promise<EventNotification> {
    const { data: response } = await this.apiClient.post<{
      message?: string;
      data: Record<string, unknown>;
    }>(`/api/v1/organizer/events/${eventId}/notifications`, body);
    return normalizeEventNotification(response.data);
  }

  async updateEvent(
    id: string,
    data: Partial<CreateEventRequest>,
    options?: { clientPage?: string },
  ): Promise<Event> {
    const payload: Record<string, unknown> = {
      ...(data as Record<string, unknown>),
    };
    const cp = options?.clientPage?.trim();
    if (cp) payload.clientPage = cp;

    const { data: response } = await this.apiClient.patch<{
      data: { event: Event };
    }>(`/api/v1/events/${id}`, payload);
    return response.data.event;
  }

  async getFinancialSettings(eventId: string): Promise<{
    organizerFeePercent: number;
    participantFeePercent: number;
    maxInstallments: 1 | 2 | 3;
    totalFee: number;
    acceptedPaymentMethods: AcceptedPaymentMethod[];
  }> {
    const { data } = await this.apiClient.get<{
      data: {
        organizerFeePercent: number;
        participantFeePercent?: number;
        maxInstallments: 1 | 2 | 3;
        totalFee?: number;
        acceptedPaymentMethods?: AcceptedPaymentMethod[];
      };
    }>(`/api/v1/events/${eventId}/financial-settings`);
    const raw = data.data;
    const participantFeePercent = raw.participantFeePercent ?? 0;
    const totalFee =
      raw.totalFee ??
      parseFloat((raw.organizerFeePercent + participantFeePercent).toFixed(2));
    // Servidor antigo (sem o campo) ou array vazio → todos os métodos, espelhando
    // o default do backend. Ordem canônica garante dirty-check estável nas telas.
    const acceptedPaymentMethods = ACCEPTED_PAYMENT_METHODS.filter((m) =>
      raw.acceptedPaymentMethods?.length ? raw.acceptedPaymentMethods.includes(m) : true,
    );
    return { ...raw, participantFeePercent, totalFee, acceptedPaymentMethods };
  }

  /**
   * Semântica PATCH: campo omitido mantém o valor atual no servidor.
   * Pós-publicação só a divisão da taxa fica travada (409 ao enviá-la) —
   * parcelamento e formas de pagamento seguem editáveis pelo organizador.
   */
  async saveFinancialSettings(
    eventId: string,
    settings: {
      organizerFeePercent?: number;
      participantFeePercent?: number;
      maxInstallments?: 1 | 2 | 3;
      totalFee?: number;
      acceptedPaymentMethods?: AcceptedPaymentMethod[];
    },
  ): Promise<void> {
    const { organizerFeePercent, participantFeePercent, maxInstallments, totalFee, acceptedPaymentMethods } = settings;
    await this.apiClient.patch(`/api/v1/events/${eventId}/financial-settings`, {
      ...(organizerFeePercent !== undefined && { organizerFeePercent }),
      ...(participantFeePercent !== undefined && { participantFeePercent }),
      ...(maxInstallments !== undefined && { maxInstallments }),
      ...(totalFee !== undefined && { totalFee }),
      // Só envia quando válido — PATCH com array vazio seria 400 (mín. 1 no DTO)
      ...(acceptedPaymentMethods?.length && { acceptedPaymentMethods }),
    });
  }

  async deleteEvent(id: string): Promise<void> {
    await this.apiClient.delete(`/api/v1/events/${id}`);
  }

  async publishEvent(id: string): Promise<Event> {
    const { data: body } = await this.apiClient.post<{
      message?: string;
      data: { event: Event };
    }>(`/api/v1/events/${id}/publish`);
    return body.data.event;
  }

  /** PUBLISHED → SUSPENDED. Ver EVENT_SUSPEND_ORGANIZER_API.md */
  async suspendEvent(id: string): Promise<{ event: Event; message?: string }> {
    const { data: body } = await this.apiClient.post<{
      message?: string;
      data: { event: Event };
    }>(`/api/v1/events/${id}/suspend`);
    return { event: body.data.event, message: body.message };
  }

  /** SUSPENDED → PUBLISHED. Ver EVENT_SUSPEND_ORGANIZER_API.md */
  async resumeEvent(id: string): Promise<{ event: Event; message?: string }> {
    const { data: body } = await this.apiClient.post<{
      message?: string;
      data: { event: Event };
    }>(`/api/v1/events/${id}/resume`);
    return { event: body.data.event, message: body.message };
  }
}
