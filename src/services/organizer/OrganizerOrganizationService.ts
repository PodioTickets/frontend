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
  OrganizerSignupRequest,
  OrganizerSignupUser,
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
 * Domínio ORGANIZAÇÃO do OrganizerService (organização, membros, auditoria,
 * upload de imagem, acesso). Mixin intermediário da cadeia: Base -> Reporting
 * -> Catalog -> Organization -> OrganizerService(Evento). Só usa apiClient +
 * normalizadores; NÃO chama métodos do domínio Evento (subclasse).
 */
export class OrganizerOrganizationService extends OrganizerCatalogService {
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

  /**
   * Auto-cadastro público de organizador. Cria conta ORGANIZER + organização
   * ativa + membro OWNER e o backend AUTOLOGA na superfície organizer (cookies
   * httpOnly na resposta). Retorna o `user` (mesmo shape do login) para o
   * `useAuth` popular o contexto sem novo GET. Rota pública (só Turnstile).
   */
  async signupOrganizer(
    payload: OrganizerSignupRequest,
  ): Promise<OrganizerSignupUser> {
    try {
      const { data: response } = await this.apiClient.post<{
        data: { user: OrganizerSignupUser };
      }>("/api/v1/auth/register/organizer", payload);
      return response.data.user;
    } catch (error: any) {
      // Normaliza a mensagem do backend (ex.: 409 "Já existe uma conta...")
      // para o wizard exibir texto útil em vez de "Request failed".
      const backendMsg =
        error?.response?.data?.message ?? error?.response?.data?.error;
      const message = Array.isArray(backendMsg)
        ? backendMsg[0]
        : backendMsg || error?.message || "Erro ao criar conta de organizador.";
      throw new Error(message);
    }
  }

  /**
   * Disponibilidade do DOCUMENTO da ORGANIZAÇÃO (CPF de PF / CNPJ de PJ) no
   * auto-cadastro público. Valida contra a tabela `Organization` (não `User`) —
   * usado pelo wizard para checar AO VIVO se já existe organização com aquele
   * documento. Rota pública; retorna só `{ available }`. Em falha de rede,
   * assume `true` (não trava o preenchimento; o submit ainda revalida).
   */
  async checkOrganizationDocumentAvailability(
    document: string,
  ): Promise<boolean> {
    try {
      const { data } = await this.apiClient.get<{
        data?: { available?: boolean };
        available?: boolean;
      }>("/api/v1/organizations/document-availability", {
        params: { document },
      });
      const available = data?.data?.available ?? data?.available;
      return available !== false;
    } catch {
      return true;
    }
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
}
