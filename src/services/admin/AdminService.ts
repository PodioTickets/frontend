import type { ApiClient } from "../base/ApiClient";
import {
  normalizeOrganizationAuditLogItem,
  type OrganizationAuditLogItem,
  type OrganizationAuditLogsPagination,
} from "../organizer/OrganizerService";
import type { LoginResponse } from "../user/UserService";

const ADMIN_AUDIT_LOGS_PATH =
  "/api/v1/organizations/admin/audit-logs";

const ADMIN_ORGANIZATIONS_PATH = "/api/v1/admin/organizations";

export interface AdminAuditOrganization {
  id: string;
  name?: string;
  tradeName?: string;
  document?: string | null;
  logoUrl?: string | null;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  state?: string | null;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  memberCount?: number;
  eventCount?: number;
}

export interface AdminAuditChangeDetail {
  field: string;
  fieldLabel?: string;
  oldValue: unknown;
  newValue: unknown;
}

/** Item da listagem admin conforme `integracao-admin-audit-logs.md`. */
export interface AdminAuditLogItem extends OrganizationAuditLogItem {
  organizationId?: string;
  organizationName?: string;
  organizationEmail?: string | null;
  organization?: AdminAuditOrganization | null;
  kind?: string | null;
  editedFields?: string | null;
  changeDetails?: AdminAuditChangeDetail[] | null;
  storedAction?: string;
}

function parseOrganization(
  raw: unknown
): AdminAuditOrganization | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === "string" ? o.id : "";
  if (!id) return null;
  const name =
    typeof o.name === "string"
      ? o.name
      : typeof o.organization_name === "string"
        ? o.organization_name
        : typeof o.organizationName === "string"
          ? o.organizationName
          : undefined;
  const tradeName =
    typeof o.tradeName === "string"
      ? o.tradeName
      : typeof o.trade_name === "string"
        ? o.trade_name
        : undefined;
  const document =
    typeof o.document === "string"
      ? o.document
      : o.document === null
        ? null
        : undefined;
  const logoUrl =
    typeof o.logoUrl === "string"
      ? o.logoUrl
      : typeof o.logo_url === "string"
        ? o.logo_url
        : o.logoUrl === null || o.logo_url === null
          ? null
          : undefined;
  const emailRaw = o.email ?? o.organization_email ?? o.organizationEmail;
  const email =
    typeof emailRaw === "string"
      ? emailRaw
      : emailRaw === null
        ? null
        : undefined;
  const phone =
    typeof o.phone === "string" ? o.phone : o.phone === null ? null : undefined;
  const city =
    typeof o.city === "string" ? o.city : o.city === null ? null : undefined;
  const state =
    typeof o.state === "string"
      ? o.state
      : o.state === null
        ? null
        : undefined;
  const createdAt =
    typeof o.createdAt === "string"
      ? o.createdAt
      : typeof o.created_at === "string"
        ? o.created_at
        : undefined;
  const updatedAt =
    typeof o.updatedAt === "string"
      ? o.updatedAt
      : typeof o.updated_at === "string"
        ? o.updated_at
        : undefined;

  const isActive = typeof o.isActive === "boolean" ? o.isActive : undefined;

  let memberCount: number | undefined;
  let eventCount: number | undefined;
  const rawCount = o._count;
  if (rawCount && typeof rawCount === "object" && !Array.isArray(rawCount)) {
    const c = rawCount as Record<string, unknown>;
    if (typeof c.members === "number") memberCount = c.members;
    if (typeof c.events === "number") eventCount = c.events;
  }

  return {
    id,
    name,
    tradeName,
    document,
    logoUrl,
    email,
    phone,
    city,
    state,
    isActive,
    createdAt,
    updatedAt,
    memberCount,
    eventCount,
  };
}

function parseChangeDetails(raw: unknown): AdminAuditChangeDetail[] | null {
  if (!Array.isArray(raw)) return null;
  const out: AdminAuditChangeDetail[] = [];
  for (const x of raw) {
    if (!x || typeof x !== "object") continue;
    const o = x as Record<string, unknown>;
    const field = typeof o.field === "string" ? o.field : "";
    if (!field) continue;
    const oldValue =
      o.oldValue !== undefined
        ? o.oldValue
        : o.old !== undefined
          ? o.old
          : null;
    const newValue =
      o.newValue !== undefined
        ? o.newValue
        : o.new !== undefined
          ? o.new
          : null;
    out.push({
      field,
      fieldLabel: typeof o.fieldLabel === "string" ? o.fieldLabel : undefined,
      oldValue,
      newValue,
    });
  }
  return out.length > 0 ? out : null;
}

function normalizeAdminAuditLogItem(
  raw: Record<string, unknown>,
  index: number
): AdminAuditLogItem {
  const base = normalizeOrganizationAuditLogItem(raw, index);
  const org = parseOrganization(raw.organization);

  const organizationId =
    (typeof raw.organizationId === "string" && raw.organizationId) ||
    (typeof raw.organization_id === "string" && raw.organization_id) ||
    org?.id;

  const organizationName =
    (typeof raw.organizationName === "string" && raw.organizationName) ||
    (typeof raw.organization_name === "string" && raw.organization_name) ||
    org?.name;

  const organizationEmail =
    org != null && org.email !== undefined
      ? org.email
      : typeof raw.organizationEmail === "string"
        ? raw.organizationEmail
        : null;

  const kind =
    typeof raw.kind === "string"
      ? raw.kind
      : base.metadata &&
        typeof base.metadata.kind === "string"
        ? base.metadata.kind
        : null;

  const editedFields =
    typeof raw.editedFields === "string" ? raw.editedFields : null;

  const changeDetails = parseChangeDetails(raw.changeDetails);

  const storedAction =
    typeof raw.storedAction === "string"
      ? raw.storedAction
      : typeof raw.stored_action === "string"
        ? raw.stored_action
        : undefined;

  return {
    ...base,
    organizationId,
    organizationName,
    organizationEmail,
    organization: org,
    kind,
    editedFields,
    changeDetails,
    storedAction,
  };
}

function unwrapAuditLogsPayload(body: Record<string, unknown>): {
  items: unknown[];
  pagination: OrganizationAuditLogsPagination;
} {
  const nested =
    body.data != null &&
      typeof body.data === "object" &&
      !Array.isArray(body.data)
      ? (body.data as Record<string, unknown>)
      : null;

  const source = nested && ("items" in nested || "pagination" in nested)
    ? nested
    : body;

  const items = Array.isArray(source.items) ? source.items : [];
  const p = source.pagination;
  const paginationObj =
    p && typeof p === "object" && !Array.isArray(p)
      ? (p as Record<string, unknown>)
      : {};

  const page = typeof paginationObj.page === "number" ? paginationObj.page : 1;
  const limit =
    typeof paginationObj.limit === "number" ? paginationObj.limit : 20;

  const pagination: OrganizationAuditLogsPagination = {
    page,
    limit,
    total: typeof paginationObj.total === "number" ? paginationObj.total : 0,
    totalPages: Math.max(
      1,
      typeof paginationObj.totalPages === "number"
        ? paginationObj.totalPages
        : 1
    ),
  };

  return { items, pagination };
}

function unwrapOrganizationsPayload(body: Record<string, unknown>): {
  items: unknown[];
  pagination: OrganizationAuditLogsPagination;
} {
  const nested =
    body.data != null &&
      typeof body.data === "object" &&
      !Array.isArray(body.data)
      ? (body.data as Record<string, unknown>)
      : null;

  const source = nested && ("items" in nested || "organizations" in nested || "pagination" in nested)
    ? nested
    : body;

  const rawItems = Array.isArray(source.organizations)
    ? source.organizations
    : Array.isArray(source.items)
      ? source.items
      : [];

  const p = source.pagination;
  const paginationObj =
    p && typeof p === "object" && !Array.isArray(p)
      ? (p as Record<string, unknown>)
      : {};

  const page = typeof paginationObj.page === "number" ? paginationObj.page : 1;
  const limit =
    typeof paginationObj.limit === "number" ? paginationObj.limit : 20;

  const pagination: OrganizationAuditLogsPagination = {
    page,
    limit,
    total: typeof paginationObj.total === "number" ? paginationObj.total : 0,
    totalPages: Math.max(
      1,
      typeof paginationObj.totalPages === "number"
        ? paginationObj.totalPages
        : 1
    ),
  };

  return { items: rawItems, pagination };
}

export interface AdminProfile {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  avatarUrl?: string | null;
}

export class AdminService {
  constructor(private apiClient: ApiClient) { }


  async login(data: { emailOrCpf: string; password: string; }): Promise<{
    success: boolean;
    data?: {
      access_token: string;
      refresh_token: string;
      user: {
        id: string;
        email: string;
        firstName?: string;
        lastName?: string;
        documentNumber?: string;
        role: string;
      };
    };
    error?: string;
  }> {
    try {
      const endpoint = "/api/v1/auth/login/admin";
      const payload = {
        emailOrCpf: data.emailOrCpf,
        password: data.password,
      };
      const response = await this.apiClient.post<LoginResponse>(
        endpoint,
        payload
      );
      const responseBody = response.data as LoginResponse;
      let loginData: {
        access_token: string;
        refresh_token: string;
        user: {
          id: string;
          email: string;
          firstName?: string;
          lastName?: string;
          documentNumber?: string;
          role: string;
        };
      } | null = null;

      if (responseBody?.data?.access_token && responseBody?.data?.user) {
        loginData = {
          access_token: responseBody.data.access_token,
          refresh_token: responseBody.data.refresh_token,
          user: responseBody.data.user,
        };
      } else if (responseBody?.access_token && responseBody?.user) {
        loginData = {
          access_token: responseBody.access_token,
          refresh_token: responseBody.refresh_token || "",
          user: responseBody.user,
        };
      }

      if (!loginData || !loginData.access_token || !loginData.user) {
        throw new Error(
          "Resposta do servidor não contém dados de login válidos"
        );
      }

      return {
        success: true,
        data: loginData,
      };
    } catch (error: any) {
      const fallback = "Erro ao fazer login. Tente novamente.";
      return {
        success: false,
        error:
          error?.message && !String(error.message).includes("No refresh token")
            ? error.message
            : fallback,
        data: undefined,
      };
    }
  }


  async getMe(): Promise<AdminProfile> {
    const res = await this.apiClient.get<{ data: AdminProfile } | AdminProfile>(
      "/api/v1/admin/me"
    );
    const body = res.data as any;
    return (body?.data ?? body) as AdminProfile;
  }

  async getAdminOrganizations(params?: {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
  }): Promise<{
    items: AdminAuditOrganization[];
    pagination: OrganizationAuditLogsPagination;
  }> {
    const { page = 1, limit = 20, search, isActive } = params || {};
    const safeLimit = Math.min(100, Math.max(1, limit));

    const res = await this.apiClient.get<Record<string, unknown>>(
      ADMIN_ORGANIZATIONS_PATH,
      {
        params: {
          page,
          limit: safeLimit,
          ...(search?.trim() ? { search: search.trim() } : {}),
          ...(isActive !== undefined ? { isActive } : {}),
        },
      }
    );

    const body =
      res.data && typeof res.data === "object" && !Array.isArray(res.data)
        ? (res.data as Record<string, unknown>)
        : {};

    const { items: rawItems, pagination } = unwrapOrganizationsPayload(body);

    const items: AdminAuditOrganization[] = [];
    for (const raw of rawItems) {
      const o =
        raw && typeof raw === "object" && !Array.isArray(raw)
          ? (raw as Record<string, unknown>)
          : null;
      if (!o) continue;
      const id =
        (typeof o.id === "string" && o.id) ||
        (typeof o.organization_id === "string" && o.organization_id) ||
        (typeof o.organizationId === "string" && o.organizationId) ||
        "";
      if (!id) continue;
      const parsed = parseOrganization({ ...o, id });
      if (parsed) items.push(parsed);
    }

    return {
      items,
      pagination: {
        page: pagination.page ?? page,
        limit: pagination.limit ?? safeLimit,
        total: pagination.total ?? 0,
        totalPages: Math.max(1, pagination.totalPages ?? 1),
      },
    };
  }

  async getAuditLogs(params?: {
    q?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
    organizationId?: string;
    userId?: string;
    /** Busca por nome (ou texto) do usuário quando não for UUID. */
    userSearch?: string;
    kind?: string;
  }): Promise<{
    items: AdminAuditLogItem[];
    pagination: OrganizationAuditLogsPagination;
  }> {
    const {
      page = 1,
      limit = 20,
      q,
      from,
      to,
      organizationId,
      userId,
      userSearch,
      kind,
    } = params || {};

    const res = await this.apiClient.get<Record<string, unknown>>(
      ADMIN_AUDIT_LOGS_PATH,
      {
        params: {
          page,
          limit,
          ...(q ? { q } : {}),
          ...(from ? { from } : {}),
          ...(to ? { to } : {}),
          ...(organizationId ? { organizationId } : {}),
          ...(userId ? { userId } : {}),
          ...(userSearch?.trim() ? { userSearch: userSearch.trim() } : {}),
          ...(kind?.trim() ? { kind: kind.trim() } : {}),
        },
      }
    );

    const body =
      res.data && typeof res.data === "object" && !Array.isArray(res.data)
        ? (res.data as Record<string, unknown>)
        : {};

    const { items: rawItems, pagination } = unwrapAuditLogsPayload(body);

    return {
      items: rawItems.map((item, i) =>
        normalizeAdminAuditLogItem(
          (item && typeof item === "object" && !Array.isArray(item)
            ? item
            : {}) as Record<string, unknown>,
          i
        )
      ),
      pagination: {
        page: pagination.page ?? page,
        limit: pagination.limit ?? limit,
        total: pagination.total ?? 0,
        totalPages: Math.max(1, pagination.totalPages ?? 1),
      },
    };
  }

  async publishEvent(eventId: string): Promise<void> {
    await this.apiClient.post(`/api/v1/admin/events/${eventId}/publish`);
  }
}
