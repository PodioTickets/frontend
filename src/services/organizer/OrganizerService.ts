import type { Event, AcceptedPaymentMethod } from "@/interfaces/event";
import { ACCEPTED_PAYMENT_METHODS } from "@/interfaces/event";
import { sanitizeOrganizerAuditPageKey } from "@/lib/organizerAudit";
import { surfaceHeader } from "@/lib/authSurface";
import { OrganizerCatalogService } from "./OrganizerCatalogService";

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
 * Topo da cadeia de mixins do OrganizerService. Domínio organização/evento
 * (organização, membros, auditoria, evento, notificações, config financeira,
 * publicação/suspensão). Herda catálogo, leitura e financeiro via a cadeia
 * Catalog -> Reporting -> Base. API pública `organizerService.x` preservada 100%.
 */
export class OrganizerService extends OrganizerCatalogService {
  // Organizer methods (DEPRECATED - usar getOrganization/createOrganization/updateOrganization)
  // Mantidos apenas para compatibilidade retroativa
  /**
   * @deprecated Use createOrganization() instead
   */
  async createOrganizer(data: CreateOrganizerRequest): Promise<Organizer> {
    // Usa o novo endpoint /organizations através do endpoint de compatibilidade
    // O backend ainda aceita /organizers mas cria Organization internamente
    const { data: response } = await this.apiClient.post<{
      data: { organization: Organization; member: OrganizationMember };
    }>("/api/v1/organizers", data);
    // Retorna no formato antigo para compatibilidade
    return {
      id: response.data.organization.id,
      name: response.data.organization.name,
      email: response.data.organization.email,
      phone: response.data.organization.phone || "",
      description: response.data.organization.description,
      userId: response.data.member.userId,
      createdAt: response.data.organization.createdAt,
      updatedAt: response.data.organization.updatedAt,
    };
  }

  /**
   * @deprecated Use getOrganization() instead
   */
  async getOrganizer(): Promise<Organizer> {
    // Usa o novo endpoint /organizations/me
    const { organization: org } = await this.getOrganization();
    // Retorna no formato antigo para compatibilidade
    return {
      id: org.id,
      name: org.name,
      email: org.email,
      phone: org.phone || "",
      description: org.description,
      userId: org.members?.find((m) => m.role === "OWNER")?.userId || "",
      createdAt: org.createdAt,
      updatedAt: org.updatedAt,
    };
  }

  /**
   * @deprecated Use updateOrganization() instead
   */
  async updateOrganizer(
    id: string | null,
    data: Partial<CreateOrganizerRequest>,
  ): Promise<Organizer> {
    // Usa o novo endpoint /organizations/me
    // O parâmetro id é ignorado, mantido apenas para compatibilidade
    const org = await this.updateOrganization(data);
    // Retorna no formato antigo para compatibilidade
    return {
      id: org.id,
      name: org.name,
      email: org.email,
      phone: org.phone || "",
      description: org.description,
      userId: org.members?.find((m) => m.role === "OWNER")?.userId || "",
      createdAt: org.createdAt,
      updatedAt: org.updatedAt,
    };
  }

  // Novos métodos de Organization
  async getMyOrganizations(): Promise<UserOrganization[]> {
    const { data: response } = await this.apiClient.get<{
      data: { organizations: UserOrganization[] };
    }>("/api/v1/organizers/me/organizations");
    return response.data.organizations;
  }

  async getOrganization(): Promise<OrganizationMeResponse> {
    const { data: response } = await this.apiClient.get<{
      data: {
        organization: Organization;
        member?: { role: "OWNER" | "EMPLOYEE"; permissions: string[] } | null;
      };
    }>("/api/v1/organizations/me");
    return {
      organization: response.data.organization,
      member: response.data.member ?? null,
    };
  }

  async updateOrganization(
    data: Partial<CreateOrganizationRequest>,
  ): Promise<Organization> {
    const { data: response } = await this.apiClient.patch<{
      data: { organization: Organization };
    }>("/api/v1/organizations/me", data);
    return response.data.organization;
  }

  async updateOrganizationLogo(logoUrl: string): Promise<Organization> {
    const { data: response } = await this.apiClient.patch<{
      data: { organization: Organization };
    }>("/api/v1/organizations/me/logo", { logoUrl });
    return response.data.organization;
  }

  async uploadImage(file: File): Promise<string> {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const apiUrl = (
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:3333"
      ).replace(/\/$/, "");

      // Auth por cookie httpOnly: `credentials: "include"` envia o cookie.
      // `X-PT-Surface` declara a superfície (fetch cru não passa pelo ApiClient).
      const response = await fetch(`${apiUrl}/api/v1/upload/image`, {
        method: "POST",
        credentials: "include",
        headers: surfaceHeader(),
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Erro ao fazer upload da imagem");
      }

      const result = await response.json();
      const imageUrl =
        result.url ||
        result.imageUrl ||
        result.data?.url ||
        result.data?.imageUrl;

      if (!imageUrl) {
        throw new Error("URL da imagem não retornada pelo servidor");
      }

      // Se a URL não começar com http, adicionar o domínio base
      if (!imageUrl.startsWith("http")) {
        return `${apiUrl}${imageUrl.startsWith("/") ? "" : "/"}${imageUrl}`;
      }

      return imageUrl;
    } catch (error: any) {
      throw error;
    }
  }

  // Verificar acesso do organizador
  async checkOrganizerAccess(): Promise<{
    isMember: boolean;
    role?: "OWNER" | "EMPLOYEE";
    organizationId?: string;
    organization?: {
      id: string;
      name: string;
      tradeName?: string | null;
    } | null;
  }> {
    const { data: response } = await this.apiClient.get<{
      data: {
        isMember: boolean;
        role?: "OWNER" | "EMPLOYEE";
        organizationId?: string;
        organization?: {
          id: string;
          name: string;
          tradeName?: string | null;
        } | null;
      };
    }>("/api/v1/organizations/me/check");
    return response.data;
  }

  // Métodos de gerenciamento de membros
  async getOrganizationMembers(): Promise<OrganizationMember[]> {
    const { data: response } = await this.apiClient.get<{
      data: { members: OrganizationMember[] };
    }>("/api/v1/organizations/me/members");
    return response.data.members.map((m) =>
      normalizeOrganizationMember(m as any),
    );
  }

  async addOrganizationMember(
    data: CreateOrganizationMemberRequest,
  ): Promise<OrganizationMember> {
    const { data: response } = await this.apiClient.post<{
      data: { member: OrganizationMember };
    }>("/api/v1/organizations/me/members", data);
    return normalizeOrganizationMember(response.data.member as any);
  }

  async updateOrganizationMemberRole(
    memberUserId: string,
    data: UpdateOrganizationMemberRequest,
  ): Promise<OrganizationMember> {
    const { data: response } = await this.apiClient.patch<{
      data: { member: OrganizationMember };
    }>(`/api/v1/organizations/me/members/${memberUserId}`, data);
    return normalizeOrganizationMember(response.data.member as any);
  }

  /** DELETE responde só `{ message }` — sem `data` (ver ORGANIZATIONS_HTTP_REFERENCE.md). */
  async removeOrganizationMember(memberUserId: string): Promise<void> {
    await this.apiClient.delete(
      `/api/v1/organizations/me/members/${memberUserId}`,
    );
  }

  async getOrganizationMember(
    memberUserId: string,
  ): Promise<OrganizationMemberDetailResponse> {
    const { data: response } = await this.apiClient.get<{
      data: OrganizationMemberDetailResponse;
    }>(`/api/v1/organizations/me/members/${memberUserId}`);
    return normalizeMemberDetailResponse(response.data);
  }

  /** Resposta = mesmo formato do GET detalhe (`member` + `permissions` + `eventIds` + `lastLoginAt`). */
  async updateOrganizationMemberSettings(
    memberUserId: string,
    body: UpdateOrganizationMemberSettingsRequest,
  ): Promise<OrganizationMemberDetailResponse> {
    const { data: response } = await this.apiClient.patch<{
      data: OrganizationMemberDetailResponse;
    }>(`/api/v1/organizations/me/members/${memberUserId}/settings`, body);
    return normalizeMemberDetailResponse(response.data);
  }

  /**
   * Registra acesso à tela (dedupe no servidor ~30 min).
   * Ver ORGANIZER_AUDIT_FRONTEND.md — falhas não devem bloquear o usuário.
   */
  async recordOrganizerAuditPageView(pageKey: string): Promise<void> {
    const key = sanitizeOrganizerAuditPageKey(pageKey);
    if (!key) return;
    try {
      await this.apiClient.post("/api/v1/organizations/me/audit/page-view", {
        pageKey: key,
      });
    } catch {
      /* 401 / 403 / rede */
    }
  }

  async getOrganizationAuditLogs(params?: {
    q?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    items: OrganizationAuditLogItem[];
    pagination: OrganizationAuditLogsPagination;
  }> {
    const { page = 1, limit = 20, q, from, to } = params || {};
    const { data: response } = await this.apiClient.get<{
      data: {
        items: OrganizationAuditLogItem[];
        pagination: OrganizationAuditLogsPagination;
      };
    }>("/api/v1/organizations/me/audit-logs", {
      params: {
        page,
        limit,
        ...(q ? { q } : {}),
        ...(from ? { from } : {}),
        ...(to ? { to } : {}),
      },
    });
    const rawItems = response.data?.items ?? [];
    const pagination = response.data?.pagination ?? {
      page,
      limit,
      total: 0,
      totalPages: 1,
    };
    return {
      items: rawItems.map((item, i) =>
        normalizeOrganizationAuditLogItem(
          item as unknown as Record<string, unknown>,
          i,
        ),
      ),
      pagination: {
        page: pagination.page ?? page,
        limit: pagination.limit ?? limit,
        total: pagination.total ?? 0,
        totalPages: Math.max(1, pagination.totalPages ?? 1),
      },
    };
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
