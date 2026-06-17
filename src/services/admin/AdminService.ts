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

const ADMIN_USER_ACTIVITY_PATH = "/api/v1/admin/user-activity";

// ──────────────── User activity (cliente final + anônimo) ────────────────

export const USER_ACTIVITY_CATEGORIES = [
  "PAGE_VIEW",
  "CLICK",
  "API",
  "AUTH",
  "CHECKOUT",
  "PROFILE",
  "COMPLIANCE",
  "OTHER",
] as const;
export type AdminUserActivityCategory =
  (typeof USER_ACTIVITY_CATEGORIES)[number];

export const USER_ACTIVITY_SOURCES = ["FRONTEND", "BACKEND", "WEBHOOK"] as const;
export type AdminUserActivitySource = (typeof USER_ACTIVITY_SOURCES)[number];

export interface AdminUserActivityUser {
  id: string;
  fullName: string;
  email: string;
  accountType?: string | null;
}

/**
 * Item do `UserActivityLog` (endpoint `/admin/user-activity`). Anônimo =
 * `userId`/`user` null — o ResponseCompressionInterceptor dropa chaves null
 * do payload, então TODO campo anulável pode chegar AUSENTE.
 */
export interface AdminUserActivityItem {
  id: string;
  userId: string | null;
  user: AdminUserActivityUser | null;
  sessionId: string | null;
  ip: string | null;
  userAgent: string | null;
  source: string;
  category: string;
  action: string;
  path: string | null;
  referrer: string | null;
  metadata?: Record<string, unknown> | null;
  occurredAt: string;
}

/** Métricas agregadas do dashboard (`GET /admin/user-activity/stats`). */
export interface AdminUserActivityStats {
  range: { from: string; to: string };
  totals: {
    events: number;
    uniqueUsers: number;
    uniqueSessions: number;
    anonymousEvents: number;
    /** Views da página pública de evento (action `page:event`) no período. */
    eventPageViews: number;
    /** Pagamentos confirmados (action `order.paid`) no período. */
    paymentsConfirmed: number;
  };
  byCategory: Array<{ category: string; count: number }>;
  bySource: Array<{ source: string; count: number }>;
  topActions: Array<{ action: string; count: number }>;
  /** Série diária esparsa (`day` = YYYY-MM-DD UTC) — dias sem evento são omitidos. */
  perDay: Array<{ day: string; count: number }>;
  /** Views da página de evento por dia (esparsa, mesmo formato de `perDay`). */
  viewsPerDay: Array<{ day: string; count: number }>;
}

/**
 * Etapa do funil de compra (`GET /admin/user-activity/funnel`). Ordem
 * canônica garantida pelo backend: page:event → order.reserve →
 * order.billing-address → order.pay → order.paid.
 */
export interface AdminPurchaseFunnelStage {
  action: string;
  /** Contagem bruta de ações (cada clique/tentativa conta). */
  total: number;
  /** Sessões/usuários únicos que chegaram na etapa — base do funil. */
  unique: number;
}

export interface AdminPurchaseFunnel {
  range: { from: string; to: string };
  eventId: string | null;
  stages: AdminPurchaseFunnelStage[];
}

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


  async login(data: { emailOrCpf: string; password: string; turnstileToken?: string }): Promise<{
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
        // Token do Cloudflare Turnstile — só vai no body quando presente, para
        // não enviar `undefined` em ambientes sem captcha configurado.
        ...(data.turnstileToken ? { turnstileToken: data.turnstileToken } : {}),
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

  /**
   * `GET /admin/user-activity` — UserActivityLog (cliente final + anônimo),
   * paralelo ao audit-log do painel. Filtros combinados via AND; ordenação
   * fixa `occurredAt desc`; `limit` máx. 100 (cap do backend).
   */
  async getUserActivityLogs(params?: {
    q?: string;
    category?: string;
    source?: string;
    userId?: string;
    /** Substring em nome/sobrenome/email — exclui anônimos. */
    userSearch?: string;
    sessionId?: string;
    ip?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    items: AdminUserActivityItem[];
    pagination: OrganizationAuditLogsPagination;
  }> {
    const { page = 1, limit = 20, ...filters } = params || {};
    const safeLimit = Math.min(100, Math.max(1, limit));

    const res = await this.apiClient.get<Record<string, unknown>>(
      ADMIN_USER_ACTIVITY_PATH,
      {
        params: {
          page,
          limit: safeLimit,
          // Só envia filtros preenchidos — string vazia viraria filtro real
          ...Object.fromEntries(
            Object.entries(filters).filter(
              ([, v]) => typeof v === "string" && v.trim() !== ""
            )
          ),
        },
      }
    );

    const body = (res.data ?? {}) as Record<string, unknown>;
    const data = (body.data ?? body) as Record<string, unknown>;
    const rawItems = Array.isArray(data.items) ? data.items : [];
    const rawPagination = (data.pagination ?? {}) as Record<string, unknown>;

    const str = (v: unknown): string | null =>
      typeof v === "string" && v ? v : null;

    const items: AdminUserActivityItem[] = rawItems.map((raw, i) => {
      const r = (raw && typeof raw === "object" ? raw : {}) as Record<
        string,
        unknown
      >;
      const u = (r.user && typeof r.user === "object" ? r.user : null) as
        | Record<string, unknown>
        | null;
      return {
        id: str(r.id) ?? `activity-${i}`,
        userId: str(r.userId),
        user: u
          ? {
              id: str(u.id) ?? "",
              fullName: str(u.fullName) ?? "",
              email: str(u.email) ?? "",
              accountType: str(u.accountType),
            }
          : null,
        sessionId: str(r.sessionId),
        ip: str(r.ip),
        userAgent: str(r.userAgent),
        source: str(r.source) ?? "—",
        category: str(r.category) ?? "—",
        action: str(r.action) ?? "—",
        path: str(r.path),
        referrer: str(r.referrer),
        metadata:
          r.metadata && typeof r.metadata === "object" && !Array.isArray(r.metadata)
            ? (r.metadata as Record<string, unknown>)
            : null,
        occurredAt: str(r.occurredAt) ?? "",
      };
    });

    const num = (v: unknown): number | null =>
      typeof v === "number" && Number.isFinite(v) ? v : null;

    return {
      items,
      pagination: {
        page: num(rawPagination.page) ?? page,
        limit: num(rawPagination.limit) ?? safeLimit,
        total: num(rawPagination.total) ?? 0,
        totalPages: Math.max(1, num(rawPagination.totalPages) ?? 1),
      },
    };
  }

  /**
   * `GET /admin/user-activity/stats` — métricas agregadas (dashboard).
   * Agregação 100% no banco; janela default de 30 dias quando sem from/to.
   */
  async getUserActivityStats(params?: {
    category?: string;
    source?: string;
    /** Restringe as métricas a um evento esportivo (metadata.eventId). */
    eventId?: string;
    from?: string;
    to?: string;
  }): Promise<AdminUserActivityStats> {
    const res = await this.apiClient.get<Record<string, unknown>>(
      `${ADMIN_USER_ACTIVITY_PATH}/stats`,
      {
        params: Object.fromEntries(
          Object.entries(params ?? {}).filter(
            ([, v]) => typeof v === "string" && v.trim() !== ""
          )
        ),
      }
    );

    const body = (res.data ?? {}) as Record<string, unknown>;
    const data = (body.data ?? body) as Record<string, unknown>;

    const n = (v: unknown): number =>
      typeof v === "number" && Number.isFinite(v) ? v : 0;
    const s = (v: unknown): string => (typeof v === "string" ? v : "");
    const arr = (v: unknown): Record<string, unknown>[] =>
      Array.isArray(v)
        ? v.filter(
            (x): x is Record<string, unknown> =>
              !!x && typeof x === "object" && !Array.isArray(x)
          )
        : [];

    const totals = (data.totals ?? {}) as Record<string, unknown>;
    const range = (data.range ?? {}) as Record<string, unknown>;

    return {
      range: { from: s(range.from), to: s(range.to) },
      totals: {
        events: n(totals.events),
        uniqueUsers: n(totals.uniqueUsers),
        uniqueSessions: n(totals.uniqueSessions),
        anonymousEvents: n(totals.anonymousEvents),
        eventPageViews: n(totals.eventPageViews),
        paymentsConfirmed: n(totals.paymentsConfirmed),
      },
      byCategory: arr(data.byCategory).map((g) => ({
        category: s(g.category),
        count: n(g.count),
      })),
      bySource: arr(data.bySource).map((g) => ({
        source: s(g.source),
        count: n(g.count),
      })),
      topActions: arr(data.topActions).map((g) => ({
        action: s(g.action),
        count: n(g.count),
      })),
      perDay: arr(data.perDay).map((g) => ({
        day: s(g.day),
        count: n(g.count),
      })),
      viewsPerDay: arr(data.viewsPerDay).map((g) => ({
        day: s(g.day),
        count: n(g.count),
      })),
    };
  }

  /**
   * `GET /admin/user-activity/funnel` — funil de compra (sessões únicas por
   * etapa). O backend já devolve as etapas na ordem canônica com zero-fill;
   * a normalização aqui é só defesa contra chave dropada pelo
   * ResponseCompressionInterceptor (count 0 → chave ausente).
   */
  async getUserActivityFunnel(params?: {
    eventId?: string;
    from?: string;
    to?: string;
  }): Promise<AdminPurchaseFunnel> {
    const res = await this.apiClient.get<Record<string, unknown>>(
      `${ADMIN_USER_ACTIVITY_PATH}/funnel`,
      {
        params: Object.fromEntries(
          Object.entries(params ?? {}).filter(
            ([, v]) => typeof v === "string" && v.trim() !== ""
          )
        ),
      }
    );

    const body = (res.data ?? {}) as Record<string, unknown>;
    const data = (body.data ?? body) as Record<string, unknown>;

    const n = (v: unknown): number =>
      typeof v === "number" && Number.isFinite(v) ? v : 0;
    const s = (v: unknown): string => (typeof v === "string" ? v : "");
    const range = (data.range ?? {}) as Record<string, unknown>;
    const rawStages = Array.isArray(data.stages) ? data.stages : [];

    return {
      range: { from: s(range.from), to: s(range.to) },
      eventId: typeof data.eventId === "string" ? data.eventId : null,
      stages: rawStages
        .filter(
          (x): x is Record<string, unknown> =>
            !!x && typeof x === "object" && !Array.isArray(x)
        )
        .map((g) => ({
          action: s(g.action),
          total: n(g.total),
          unique: n(g.unique),
        })),
    };
  }

  async publishEvent(eventId: string): Promise<void> {
    await this.apiClient.post(`/api/v1/admin/events/${eventId}/publish`);
  }
}
