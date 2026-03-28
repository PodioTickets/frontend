import type { ApiClient } from "../base/ApiClient";
import {
  normalizeOrganizationAuditLogItem,
  type OrganizationAuditLogItem,
  type OrganizationAuditLogsPagination,
} from "../organizer/OrganizerService";

const ADMIN_AUDIT_LOGS_PATH =
  "/api/v1/organizations/admin/audit-logs";

export interface AdminAuditOrganization {
  id: string;
  name?: string;
  email?: string | null;
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
  return {
    id,
    name: typeof o.name === "string" ? o.name : undefined,
    email:
      typeof o.email === "string"
        ? o.email
        : o.email === null
          ? null
          : undefined,
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

export class AdminService {
  constructor(private apiClient: ApiClient) {}

  async getAuditLogs(params?: {
    q?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
    organizationId?: string;
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
}
