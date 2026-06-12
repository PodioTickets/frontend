import type { ApiClient } from "../base/ApiClient";
import type { Event, AcceptedPaymentMethod } from "@/interfaces/event";
import { ACCEPTED_PAYMENT_METHODS } from "@/interfaces/event";
import type { EventKitSelectionDisplay } from "@/lib/eventKitSelectionDisplay";
import { sanitizeOrganizerAuditPageKey } from "@/lib/organizerAudit";

export interface CreateOrganizerRequest {
  name: string;
  email: string;
  phone: string;
  description?: string;
}

// Mantido para compatibilidade - usar Organization quando possível
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

// Nova interface Organization com todos os campos
export interface CreateOrganizationRequest {
  name: string; // Razão social (obrigatório)
  tradeName?: string; // Nome fantasia
  document?: string; // CPF ou CNPJ (apenas números)
  logoUrl?: string; // URL da logo/foto
  email: string; // Email (obrigatório)
  phone?: string; // Telefone
  whatsapp?: string; // WhatsApp
  siteUrl?: string; // Site
  instagram?: string; // Instagram
  description?: string; // Descrição
  zipCode?: string; // CEP
  street?: string; // Rua
  number?: string; // Número
  neighborhood?: string; // Bairro
  city?: string; // Cidade
  state?: string; // Estado
  ownerName?: string; // Nome do responsável
  pix?: string; // Chave PIX
  bankName?: string; // Nome do banco
  bankCode?: string; // Código do banco
  agency?: string; // Agência
  account?: string; // Conta
  accountType?: "CORRENTE" | "POUPANCA"; // Tipo de conta
  accountHolderName?: string; // Nome do titular
  accountHolderDocument?: string; // CPF/CNPJ do titular
}

/** Chaves canônicas — ver API `organizations/me/members`. */
export type OrganizerPermissionKey =
  | "financial"
  | "edit_event"
  | "view_event"
  | "coupons"
  | "pixel"
  | "notify";

export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  role: "OWNER" | "EMPLOYEE";
  createdAt: string;
  updatedAt: string;
  /** Lista de chaves concedidas (OWNER costuma trazer todas). */
  permissions?: string[];
  /** Whitelist; vazio/ausente em colaborador = todos os eventos. */
  eventIds?: string[];
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    mfaEnabled?: boolean;
    documentNumber?: string;
    lastLoginAt?: string | null;
  };
  organization?: Organization;
}

export interface Organization {
  id: string;
  name: string; // Razão social
  tradeName?: string; // Nome fantasia
  document?: string; // CPF ou CNPJ
  logoUrl?: string; // URL da logo/foto
  email: string;
  phone?: string;
  whatsapp?: string;
  fiscalEmail?: string;
  siteUrl?: string;
  instagram?: string;
  description?: string;
  zipCode?: string;
  street?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  ownerName?: string;
  ownerDocument?: string;
  pix?: string;
  bankName?: string;
  bankCode?: string;
  agency?: string;
  account?: string;
  accountType?: "CORRENTE" | "POUPANCA";
  accountHolderName?: string;
  accountHolderDocument?: string;
  createdAt: string;
  updatedAt: string;
  members?: OrganizationMember[];
  events?: Event[];
  pixKeys?: PixKey[];
}

export interface PixKey {
  id: string;
  key: string;
  keyType: string;
  isDefault: boolean;
  accountHolderName?: string;
  accountHolderDocument?: string;
  bankName?: string;
  createdAt: string;
}

export interface UserOrganization {
  id: string;
  name: string;
  description?: string;
  logoUrl?: string;
  email?: string;
  phone?: string;
  city?: string;
  state?: string;
  role: "OWNER" | "ADMIN" | "MEMBER" | string;
  joinedAt: string;
  membersCount?: number;
  eventsCount?: number;
}

export interface CreateOrganizationMemberRequest {
  userId?: string; // Usar usuário existente
  // OU criar novo usuário:
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  phone?: string;
  enable2FA?: boolean;
  role: "OWNER" | "EMPLOYEE";
  /** Chaves de permissão (opcional; ausente = default do backend). */
  permissions?: string[];
  /** Omitir = todos os eventos da org; lista = whitelist. */
  eventIds?: string[];
}

export interface UpdateOrganizationMemberRequest {
  role: "OWNER" | "EMPLOYEE";
  /** Contexto para audit no backend (opcional). */
  clientPage?: string;
}

/** PATCH .../me/members/:memberUserId/settings — campos parciais. */
export interface UpdateOrganizationMemberSettingsRequest {
  role?: "OWNER" | "EMPLOYEE";
  permissions?: string[];
  eventIds?: string[];
  firstName?: string;
  lastName?: string;
  /** Contexto para audit no backend (opcional). */
  clientPage?: string;
}

export interface OrganizationMemberDetailResponse {
  member: OrganizationMember;
  permissions: string[];
  /** null = sem restrição (acesso a todos); [] = restrito a nenhum; [ids] = whitelist */
  eventIds: string[] | null;
  lastLoginAt?: string | null;
}

export interface OrganizationMeResponse {
  organization: Organization;
  /** Dados do membro logado. null = OWNER (sem restrições). */
  member: {
    role: "OWNER" | "EMPLOYEE";
    permissions: string[];
  } | null;
}

export interface OrganizationAuditLogItem {
  id: string;
  ip: string;
  userId?: string;
  userName: string;
  action: string;
  occurredAt: string;
  metadata?: Record<string, unknown>;
}

export interface OrganizationAuditLogsPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function normalizeOrganizationAuditLogItem(
  raw: Record<string, unknown>,
  index: number,
): OrganizationAuditLogItem {
  const actor = (raw.actor ?? raw.user) as Record<string, unknown> | undefined;
  const firstName = typeof actor?.firstName === "string" ? actor.firstName : "";
  const lastName = typeof actor?.lastName === "string" ? actor.lastName : "";
  const actorName = `${firstName} ${lastName}`.trim();
  const userName =
    (typeof raw.userName === "string" && raw.userName) ||
    (typeof raw.user_name === "string" && raw.user_name) ||
    actorName ||
    (typeof actor?.email === "string" ? actor.email : "") ||
    "—";

  const id =
    typeof raw.id === "string" && raw.id
      ? raw.id
      : typeof raw.uuid === "string" && raw.uuid
        ? raw.uuid
        : `audit-${index}`;

  const ip = String(raw.ip ?? raw.ipAddress ?? raw.ip_address ?? "—");
  const action = String(raw.action ?? raw.message ?? "—");
  const occurredAt = String(
    raw.occurredAt ?? raw.occurred_at ?? new Date().toISOString(),
  );
  const userId =
    typeof raw.userId === "string"
      ? raw.userId
      : typeof raw.user_id === "string"
        ? raw.user_id
        : typeof actor?.id === "string"
          ? actor.id
          : undefined;

  let metadata: Record<string, unknown> | undefined =
    raw.metadata &&
      typeof raw.metadata === "object" &&
      !Array.isArray(raw.metadata)
      ? { ...(raw.metadata as Record<string, unknown>) }
      : undefined;

  const mergeAuditEditRootFields = (target: Record<string, unknown>) => {
    if (
      typeof raw.editedFields === "string" &&
      target.editedFields === undefined
    ) {
      target.editedFields = raw.editedFields;
    }
    if (Array.isArray(raw.fieldsEdited) && target.fieldsEdited === undefined) {
      target.fieldsEdited = raw.fieldsEdited;
    }
    if (Array.isArray(raw.changes) && target.changes === undefined) {
      target.changes = raw.changes;
    }
  };

  if (metadata) {
    mergeAuditEditRootFields(metadata);
  } else if (
    typeof raw.editedFields === "string" ||
    Array.isArray(raw.fieldsEdited) ||
    Array.isArray(raw.changes)
  ) {
    metadata = {};
    mergeAuditEditRootFields(metadata);
  }

  return {
    id,
    ip,
    userId,
    userName,
    action,
    occurredAt,
    metadata,
  };
}

/**
 * Respostas crus variam: listagem/devolve `permissions: string[]`; POST/PATCH podem trazer JSON Prisma em `member.permissions`.
 * Ver `ORGANIZATIONS_HTTP_REFERENCE.md` na raiz do frontend.
 */
function normalizePermissionsField(
  p: string[] | Record<string, boolean> | null | undefined,
): string[] | undefined {
  if (p == null) return undefined;
  if (Array.isArray(p)) return p;
  if (typeof p === "object") {
    return Object.entries(p)
      .filter(([, v]) => v === true)
      .map(([k]) => k);
  }
  return undefined;
}

/** Materializa `eventIds` a partir de `eventAccesses` quando a API envia só o relacionamento. */
export function normalizeOrganizationMember(
  raw: OrganizationMember & {
    permissions?: string[] | Record<string, boolean> | null;
    eventAccesses?: { eventId: string }[];
  },
): OrganizationMember {
  const permissions = normalizePermissionsField(raw.permissions as any);
  let eventIds = raw.eventIds;
  if (
    (!eventIds || eventIds.length === 0) &&
    Array.isArray(raw.eventAccesses)
  ) {
    eventIds = raw.eventAccesses.map((e) => e.eventId).filter(Boolean);
  }
  const {
    eventAccesses: __,
    permissions: _rawPerm,
    ...rest
  } = raw as OrganizationMember & {
    eventAccesses?: { eventId: string }[];
    permissions?: unknown;
  };
  return {
    ...rest,
    permissions,
    eventIds,
  };
}

function normalizeMemberDetailResponse(
  d: OrganizationMemberDetailResponse,
): OrganizationMemberDetailResponse {
  return {
    member: normalizeOrganizationMember(d.member as any),
    permissions: d.permissions ?? [],
    eventIds: d.eventIds ?? null,
    lastLoginAt: d.lastLoginAt ?? null,
  };
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
  /** Imagem do card na listagem; API pode persistir como `logoUrl` na resposta GET. */
  cardImageUrl?: string;
  status?:
  | "DRAFT"
  | "PUBLISHED"
  | "CANCELLED"
  | "COMPLETED"
  | "SUSPENDED"
  | "REVISION";
  /** Quando true, inscrições/vendas do evento ficam pausadas (reativar com false). */
  isSuspended?: boolean;
  /**
   * Opções avançadas: imagens do kit na tela de escolha de ingressos.
   * Ver `EVENT_KIT_SELECTION_DISPLAY_API.md`.
   */
  kitSelectionDisplay?: EventKitSelectionDisplay;
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
  templates: any[];
  createdAt: string;
  updatedAt: string;
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
  description?: string;
  type: "text" | "true_false" | "number" | "select" | "multiple_choice";
  options?: string[];
  isRequired?: boolean;
  order?: number;
  appliesTo?: "all" | string[];
}

export interface Question {
  id: string;
  question: string;
  description?: string;
  type: "text" | "true_false" | "number" | "select" | "multiple_choice";
  options?: string[];
  isRequired: boolean;
  order: number;
  appliesTo?: "all" | string[];
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

// Dashboard interfaces
export interface DashboardMetrics {
  netRevenue: number;
  netRevenueChange: number;
  averageTicket: number;
  averageTicketChange: number;
  totalRegistrations: number;
  totalRegistrationsChange: number;
  cancellations: number;
  cancellationsStatus: "Normal" | "Atenção" | "Crítico";
  refunds: number;
  refundsStatus: "Normal" | "Atenção" | "Crítico";
}

export interface RegistrationsTrend {
  amount: number;
  change: number;
  confirmed: number;
  canceled: number;
  refunded: number;
  chartData: {
    labels: string[];
    revenue: number[];
    dailyData?: Array<{
      date: string;
      /** Faturamento confirmado no período (geralmente centavos). */
      revenue: number;
      confirmed: number;
      canceled: number;
      refunded: number;
      /** Opcional: valor monetário de cancelamentos no período (centavos). */
      canceledRevenue?: number;
      /** Opcional: valor monetário de estornos no período (centavos). */
      refundedRevenue?: number;
    }>;
  };
}

export interface TicketRanking {
  ticketId: string;
  name: string;
  category: string;
  quantity: number;
  total: number;
}

export interface TopCity {
  city: string;
  state?: string;
  /** Renomeado de `buyers` no split do dashboard (2026-05). 1 por registration paga+confirmada. */
  participants: number;
}

export interface LotNearDepletionBatch {
  id: string;
  name: string;
  total: number;
  sold: number;
  remaining: number;
  percentageSold: number;
  status: "Normal" | "Atenção" | "Crítico";
}

export interface LotNearDepletion {
  ticketId: string;
  ticketName: string;
  status: "Normal" | "Atenção" | "Crítico";
  sold: number;
  total: number;
  remaining: number;
  percentageSold: number;
  activeBatch?: { id: string; number: number; label: string } | null;
  /** Shape detalhado a partir da rota `/dashboard/rankings`. */
  batches?: LotNearDepletionBatch[];
}

export interface SalesHeatmapData {
  day: string;
  hour: number;
  sales: number;
}

/** Variação dentro de topProductVariations (variations mais vendidas por produto) */
export interface TopProductVariationItem {
  variationId: string | null;
  variationName: string;
  quantitySold: number;
  /** % sobre o total do produto. Opcional pra retro-compat. */
  percentage?: number;
  /** `null`/ausente quando estoque ilimitado. */
  remainingStock?: number | null;
  totalStock?: number | null;
}

/** Produto com variações ordenadas por quantidade vendida (API dashboard) */
export interface TopProductVariation {
  productId: string;
  productName: string;
  productImage?: string | null;
  totalQuantitySold?: number;
  /** Receita líquida do produto rateada pela razão orderNet/orderGross (centavos). */
  totalSoldAmount?: number;
  variations: TopProductVariationItem[];
}

/** Pergunta com contagem de respostas (API dashboard) */
export interface MostAnsweredQuestion {
  questionId: string;
  question: string;
  order: number;
  type?: "text" | "select" | "checkbox" | "true_false";
  options?: string[];
  isRequired?: boolean;
  participantCount: number;
  answersRanking?: Array<{
    answer: string;
    count: number;
    /** % sobre participantCount (não sobre total — checkbox pode somar >100%). */
    percentage: number;
  }>;
}

export interface DashboardPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface DashboardPeriod {
  selected: "geral" | "24h" | "7d" | "15d" | "1m" | "2m";
  startDate: string;
  endDate: string;
}

/* ──────────────────────────────────────────────────────────────────────────────
 * Dashboard split — 3 rotas independentes (substituiu `/dashboard` legacy).
 * Cada rota pode ser chamada em paralelo; falha em uma não afeta as outras.
 * Cache backend: overview/rankings 30s, secondary 60s.
 * ──────────────────────────────────────────────────────────────────────────── */

export interface DashboardOverviewData {
  period: DashboardPeriod;
  metrics: DashboardMetrics;
  registrationsTrend: RegistrationsTrend;
}

export interface DashboardRankingsData {
  ticketRanking: {
    data: TicketRanking[];
    pagination: DashboardPagination;
  };
  tickets: {
    message: string;
    data: {
      tickets: FinancialTicket[];
      pagination: DashboardPagination;
    };
  };
  topProductVariations: TopProductVariation[];
  lotsNearDepletion: LotNearDepletion[];
  /**
   * Distribuição de vendas por método de pagamento (PIX, CREDIT_CARD, etc).
   * Cada item carrega count, valor bruto (centavos) e percentual sobre o total.
   * Backend: buildSalesByPaymentMethod em dashboard.service.ts.
   */
  salesByPaymentMethod: {
    items: Array<{
      method: string;
      salesCount: number;
      totalAmount: number;
      percentage: number;
    }>;
    totals: { salesCount: number; totalAmount: number };
  };
}

export interface DashboardSecondaryData {
  topCities: TopCity[];
  salesHeatmap: SalesHeatmapData[];
  mostAnsweredQuestions: MostAnsweredQuestion[];
}

// Financial interfaces
export interface FinancialSummary {
  availableBalance: number;
  installmentsToReceive: number;
  pendingRelease: number;
  awaitingAudit: number;
  totalWithdrawn: number;
  totalRefunded: number;
  refundedCount: number;
  totalChargebacks: number;
  grossRevenue: number;
  isAudited: boolean;
  paymentMethodStats?: PaymentMethodStats;
}

export interface PaymentMethodBreakdown {
  sales: number;
  netRevenue: number;
}

export interface FiscalOrder {
  id: string;
  displayId: string;
  paymentId: string;
  paymentMethod: string;
  buyer: {
    name: string;
    email: string;
    cpf: string;
    avatarUrl: string | null;
  };
  purchaseDate: string;
  amount: number;
}

export interface FiscalOrdersData {
  orders: FiscalOrder[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PaymentMethodStats {
  pix: PaymentMethodBreakdown;
  creditCard: PaymentMethodBreakdown;
  debitCard: PaymentMethodBreakdown;
}

export interface RevenueChartData {
  labels: string[];
  revenue: number[];
  dailyData?: Array<{
    date: string;
    revenue: number;
  }>;
}

/** Lote de um ingresso, conforme `TicketsService.findAll` (Prisma `Batch`). */
export interface FinancialTicketBatch {
  id: string;
  /** Preço do lote em centavos. */
  price: number;
  /** Unidades vendidas do lote (agregado pelo backend). */
  quantitySold?: number;
  createdAt?: string;
}

/**
 * Ingresso no bloco `tickets` — shape idêntico ao retornado pelo backend em
 * `/dashboard/rankings` e `/events/:id/financial` (`TicketsService.findAll` +
 * `organizerNet` injetado pelo dashboard). Consumido diretamente por
 * `TicketsWithLotsList`, sem etapa de formatação intermediária.
 */
export interface FinancialTicket {
  id: string;
  name: string;
  createdAt: string;
  categoryId?: string | null;
  category?: { name: string } | null;
  /** Total vendido do ingresso (soma dos lotes), agregado pelo backend. */
  quantitySold?: number;
  /** Receita líquida do organizador no período (centavos). Só em `/dashboard/rankings`. */
  organizerNet?: number;
  batches: FinancialTicketBatch[];
}

export interface FinancialData {
  summary: FinancialSummary;
  revenueChart?: RevenueChartData;
  tickets: {
    message: string;
    data: {
      tickets: FinancialTicket[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    };
  };
}

export interface Transfer {
  id: string;
  amount: number;
  feeRate?: number;
  feeAmount?: number;
  netAmount?: number;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED";
  notes?: string | null;
  createdAt: string;
  completedAt?: string | null;
  paymentMethod?: "PIX" | "TED" | "DOC";
  bankAccount?: {
    bankName: string;
    account: string;
    agency: string;
  };
}

export interface Installment {
  id: string; // ID composto da parcela (não é UUID válido)
  paymentId?: string; // ID do pagamento (UUID)
  orderId?: string; // ID do pedido (UUID)
  registrationId?: string; // ID da inscrição (UUID)
  amount: number;
  dueDate: string;
  status: "PENDING" | "RECEIVED";
  buyer: {
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl: string | null;
  };
  releaseToday?: number;
}

export interface PendingRelease {
  orderId: string;
  paymentId: string;
  transactionId: string;
  amount: number;
  paymentMethod: "CREDIT_CARD" | "PIX";
  purchaseDate: string;
  paymentDate: string;
  releaseDate: string;
  daysUntilRelease: number;
  buyer: {
    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    email: string;
    phone: string;
    documentNumber: string;
    avatarUrl: string | null;
  };
  registrationsCount: number;
}

/** Endereço de cobrança retornado com os detalhes do pagamento (checkout). */
export interface PaymentDetailsBillingAddress {
  country: string;
  postalCode: string;
  stateUf: string;
  street: string;
  number: string;
  complement?: string | null;
  neighborhood: string;
  city: string;
}

export interface PaymentDetails {
  buyer: {
    id: string;
    fullName: string;
    firstName: string;
    lastName: string;
    email: string;
    documentNumber?: string | null;
    phone?: string | null;
    dateOfBirth?: string | null;
    reservePhone?: string | null;
    gender?: string | null;
  };
  billingAddress?: PaymentDetailsBillingAddress | null;
  payment: {
    id: string;
    method: string;
    status: string;
    totalAmount: number;
    purchaseDate: string;
    paymentDate?: string | null;
    gateway: string;
    authorizationCode?: string | null;
    nsu?: string | null;
    transactionIp?: string | null;
    installments?: number | null;
    installmentValue?: number | null;
    cardBrand?: string | null;
    last4Digits?: string | null;
    pix: {
      qrCode: string | null;
      pixCode: string | null;
      expiresAt: string | null;
    } | null;
    boleto: {
      barcode: string | null;
      digitableLine: string | null;
      expiresAt: string | null;
      url: string | null;
    } | null;
  };
  event: {
    id: string;
    name: string;
    category: string | null;
    organizer: {
      id: string;
      name: string;
      email: string;
      avatar: string | null;
    } | null;
  };
  coupon: {
    id: string;
    code: string | null;
    couponType: string | null;
    discountType: string | null;
    discountValue: number | null;
    discountPercentage: number | null;
    discountAmount: number | null;
    note: string | null;
    appliesTo: string | null;
    minCartValue: number | null;
    minQuantity: number | null;
    minAge: number | null;
    maxAge: number | null;
    maxUsage: number | null;
    usageCount: number | null;
    expiryDate: string | null;
    // backward compat
    type?: string;
  } | null;
  voucher: {
    id: string;
    code: string;
    name: string | null;
    status: string;
    usedAt: string | null;
    expiryDate: string | null;
    appliesTo: string | null;
    discountAmount: number;
  } | null;
  totalDiscount: number | null;
  transactionId: string;
  orderId: string;
  registrations?: Array<{
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
    ticket?: {
      id: string;
      name: string;
    } | null;
    ticketCategory?: {
      id: string;
      name: string;
    } | null;
  }> | null;
}

// Registration interfaces (extended)
export interface RegistrationStats {
  total: number;
  paid: number;
  cancelled: number;
  totalCollected: number;
  refunded: number;
  refundedChange: number;
  totalChange?: number;
  paidChange?: number;
  cancelledChange?: number;
  totalCollectedChange?: number;
}

/** Ver `EVENT_NOTIFICATIONS_API.md` — alinhado ao painel Central de Comunicação. */
export type EventNotificationChannel = "email" | "whatsapp" | "push";
export type EventNotificationStatus = "review" | "sent" | "denied";

export interface EventNotification {
  id: string;
  occurredAt: string;
  title: string;
  channels: EventNotificationChannel[];
  status: EventNotificationStatus;
  messageHtml?: string;
  deniedReason?: string | null;
}

export interface EventNotificationsPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface CreateEventNotificationRequest {
  title: string;
  messageHtml: string;
  channels: EventNotificationChannel[];
}

const EVENT_NOTIFICATION_CHANNELS: EventNotificationChannel[] = [
  "email",
  "whatsapp",
  "push",
];

const EVENT_NOTIFICATION_STATUSES: EventNotificationStatus[] = [
  "review",
  "sent",
  "denied",
];

function normalizeEventNotification(
  raw: Record<string, unknown>,
): EventNotification {
  const chRaw = raw.channels;
  const channels: EventNotificationChannel[] = Array.isArray(chRaw)
    ? (chRaw.filter(
      (c) =>
        typeof c === "string" &&
        (EVENT_NOTIFICATION_CHANNELS as string[]).includes(c),
    ) as EventNotificationChannel[])
    : [];

  const st = raw.status;
  const status: EventNotificationStatus =
    typeof st === "string" &&
      (EVENT_NOTIFICATION_STATUSES as string[]).includes(st)
      ? (st as EventNotificationStatus)
      : "review";

  const occurredAt =
    (typeof raw.occurredAt === "string" && raw.occurredAt) ||
    (typeof raw.occurred_at === "string" && raw.occurred_at) ||
    "";

  const messageHtml =
    (typeof raw.messageHtml === "string" && raw.messageHtml) ||
    (typeof raw.message_html === "string" && raw.message_html) ||
    undefined;

  const deniedReason =
    (typeof raw.deniedReason === "string" && raw.deniedReason) ||
    (typeof raw.denied_reason === "string" && raw.denied_reason) ||
    null;

  return {
    id: String(raw.id ?? ""),
    occurredAt,
    title: typeof raw.title === "string" ? raw.title : "",
    channels,
    status,
    messageHtml,
    deniedReason,
  };
}

/** Resposta de create/update de produto pode trazer o recurso em `product` em vez de no nível raiz. */
function unwrapProductApiPayload(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const o = raw as Record<string, unknown>;
  if (o.id != null && o.name != null) return raw;
  const p = o.product;
  if (p && typeof p === "object" && (p as Record<string, unknown>).id != null) {
    return p;
  }
  return raw;
}

export interface EventTracking {
  metaPixelId: string;
  googleAnalyticsId: string;
  googleAdsId: string;
}

export type EventTrackingPatch = Partial<{
  metaPixelId: string;
  googleAnalyticsId: string;
  googleAdsId: string;
}>;

function strTracking(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

function normalizeEventTracking(
  raw: Record<string, unknown> | null | undefined,
): EventTracking {
  const t = raw ?? {};
  return {
    metaPixelId: strTracking(t.metaPixelId) || strTracking(t.meta_pixel_id),
    googleAnalyticsId:
      strTracking(t.googleAnalyticsId) || strTracking(t.google_analytics_id),
    googleAdsId: strTracking(t.googleAdsId) || strTracking(t.google_ads_id),
  };
}

export class OrganizerService {
  constructor(private apiClient: ApiClient) { }

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
      const response = await fetch(`${apiUrl}/api/v1/upload/image`, {
        method: "POST",
        credentials: "include",
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

  // Dashboard methods (split em 3 rotas independentes — chamar em paralelo)

  /** KPIs principais + gráfico de tendência. Cache backend 30s. */
  async getEventDashboardOverview(
    eventId: string,
    params?: {
      period?: "geral" | "24h" | "7d" | "15d" | "1m" | "2m";
      ticketIds?: string[];
    },
  ): Promise<DashboardOverviewData> {
    const { data: response } = await this.apiClient.get<{
      data: DashboardOverviewData;
    }>(`/api/v1/events/${eventId}/dashboard/overview`, {
      params: {
        period: params?.period,
        ticketIds: params?.ticketIds,
      },
    });
    return response.data;
  }

  /** Tabelas paginadas: ranking, tickets (lista financeiro), produtos, lotes.
   *  Cada bloco tem paginação independente. Cache backend 30s. */
  async getEventDashboardRankings(
    eventId: string,
    params?: {
      period?: "geral" | "24h" | "7d" | "15d" | "1m" | "2m";
      ticketIds?: string[];
      ticketRankingPage?: number;
      ticketRankingLimit?: number;
      ticketsPage?: number;
      ticketsLimit?: number;
    },
  ): Promise<DashboardRankingsData> {
    const { data: response } = await this.apiClient.get<{
      data: DashboardRankingsData;
    }>(`/api/v1/events/${eventId}/dashboard/rankings`, {
      params: {
        period: params?.period,
        ticketIds: params?.ticketIds,
        ticketRankingPage: params?.ticketRankingPage,
        ticketRankingLimit: params?.ticketRankingLimit,
        ticketsPage: params?.ticketsPage,
        ticketsLimit: params?.ticketsLimit,
      },
    });
    return response.data;
  }

  /** Widgets secundários (lazy-load): cidades, heatmap, perguntas. Cache backend 60s. */
  async getEventDashboardSecondary(
    eventId: string,
    params?: {
      period?: "geral" | "24h" | "7d" | "15d" | "1m" | "2m";
      ticketIds?: string[];
    },
  ): Promise<DashboardSecondaryData> {
    const { data: response } = await this.apiClient.get<{
      data: DashboardSecondaryData;
    }>(`/api/v1/events/${eventId}/dashboard/secondary`, {
      params: {
        period: params?.period,
        ticketIds: params?.ticketIds,
      },
    });
    return response.data;
  }

  async getQuestionTextAnswers(
    eventId: string,
    questionId: string,
  ): Promise<{
    answers: Array<{
      id: string;
      userName: string | null;
      userEmail: string | null;
      userAvatarUrl: string | null;
      answer: string;
      answeredAt: string;
    }>;
  }> {
    const { data: response } = await this.apiClient.get<{
      answers: Array<{
        id: string;
        userName: string | null;
        userEmail: string | null;
        userAvatarUrl: string | null;
        answer: string;
        answeredAt: string;
      }>;
    }>(`/api/v1/events/${eventId}/questions/${questionId}/text-answers`);
    return response;
  }

  // Financial methods
  async getEventFinancial(
    eventId: string,
    params?: {
      period?: "hoje" | "7d" | "15d" | "1m" | "2m";
      page?: number;
      limit?: number;
    },
  ): Promise<FinancialData> {
    const { data: response } = await this.apiClient.get<{
      data: FinancialData;
    }>(`/api/v1/events/${eventId}/financial`, {
      params: {
        period: params?.period,
        page: params?.page,
        limit: params?.limit,
      },
    });
    return response.data;
  }

  async getEventFiscalOrders(
    eventId: string,
    params?: {
      page?: number;
      limit?: number;
      search?: string;
      period?: "7d" | "15d" | "30d" | "60d" | "all";
      valueRange?: "all" | "lt100" | "100to500" | "500to1000" | "gt1000";
    },
  ): Promise<FiscalOrdersData> {
    const { data: response } = await this.apiClient.get<{
      data: FiscalOrdersData;
    }>(`/api/v1/events/${eventId}/financial/fiscal-orders`, {
      params,
    });
    return response.data;
  }

  async exportEventFiscalData(
    eventId: string,
    params?: {
      search?: string;
      period?: "7d" | "15d" | "30d" | "60d" | "all";
      valueRange?: "all" | "lt100" | "100to500" | "500to1000" | "gt1000";
      orderIds?: string[];
      format?: "txt" | "xlsx" | "pdf";
      fields?: string[];
    },
  ): Promise<Blob> {
    const { data } = await this.apiClient.get<Blob>(
      `/api/v1/events/${eventId}/financial/fiscal-export`,
      {
        params: {
          ...params,
          fields: params?.fields?.join(","),
          orderIds: params?.orderIds?.join(","),
        },
        responseType: "blob",
      },
    );
    return data;
  }

  async getEventTransferHistory(eventId: string): Promise<{
    transfers: Transfer[];
    metrics: { totalAmount: number; totalCount: number };
  }> {
    const { data: response } = await this.apiClient.get<{
      data: {
        transfers: Transfer[];
        metrics?: { totalAmount: number; totalCount: number };
        totalTransferred?: number;
      };
    }>(`/api/v1/events/${eventId}/financial/transfers`);
    const d = response.data;
    return {
      transfers: d.transfers ?? [],
      metrics: d.metrics ?? {
        totalAmount: d.totalTransferred ?? 0,
        totalCount: d.transfers?.length ?? 0,
      },
    };
  }

  async getEventInstallments(eventId: string): Promise<{
    installments: Installment[];
    totalPending: number;
    releaseToday: number;
    totalTransactions: number;
  }> {
    const { data: response } = await this.apiClient.get<{
      data: {
        installments: Installment[];
        totalPending: number;
        releaseToday: number;
        totalTransactions: number;
      };
    }>(`/api/v1/events/${eventId}/financial/installments`);
    return response.data;
  }

  async getEventPendingReleases(
    eventId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    pending: PendingRelease[];
    totalPending: number;
    releaseToday: number;
    pagination: {
      page: number;
      limit: number;
      totalOrders: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
  }> {
    const { data: response } = await this.apiClient.get<{
      data: {
        pending: PendingRelease[];
        totalPending: number;
        releaseToday: number;
        pagination: {
          page: number;
          limit: number;
          totalOrders: number;
          totalPages: number;
          hasNextPage: boolean;
          hasPreviousPage: boolean;
        };
      };
    }>(`/api/v1/events/${eventId}/financial/pending`, {
      params: { page, limit },
    });
    return response.data;
  }

  async getEventRefunded(
    eventId: string,
    params?: {
      page?: number;
      limit?: number;
    },
  ): Promise<{
    refunded: Array<{
      id: string;
      orderId: string;
      registrationId: string;
      paymentId?: string;
      amount: number;
      refundDate: string;
      purchaseDate: string;
      paymentMethod: string;
      buyer: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        avatarUrl: string | null;
      };
      participant?: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        avatarUrl: string | null;
      };
      reason?: string;
    }>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    totalAmount: number;
  }> {
    const { data: response } = await this.apiClient.get<{
      message: string;
      data: {
        refunded: Array<{
          id: string;
          orderId: string;
          registrationId: string;
          amount: number;
          refundDate: string;
          purchaseDate: string;
          paymentMethod: string;
          buyer: {
            id: string;
            firstName: string;
            lastName: string;
            email: string;
            avatarUrl: string | null;
          };
          participant?: {
            id: string;
            firstName: string;
            lastName: string;
            email: string;
            avatarUrl: string | null;
          };
          reason?: string;
        }>;
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
        };
        totalAmount: number;
      };
    }>(`/api/v1/events/${eventId}/financial/refunded`, { params });
    return response.data;
  }

  /**
   * Estorno (TOTAL e imediato) de um pedido pago pelo ORGANIZADOR com permissão
   * financeira. Contrato: `organizer-refund-route.md`.
   * - `reason` é obrigatório (≥ 3 chars) — vai pro audit log.
   * - `pendingConfirmation: true` → Cielo aceitou mas confirma via webhook (PIX async).
   * - Não é idempotente: re-chamar pedido já estornado → 409 `PAYMENT_NOT_PAID`.
   */
  async refundOrder(
    eventId: string,
    orderId: string,
    reason: string,
  ): Promise<{
    orderId: string;
    paymentId?: string;
    cieloStatus?: string;
    pendingConfirmation: boolean;
    amount: number;
    method: string;
    refundedAt: string;
  }> {
    const { data: response } = await this.apiClient.post<{
      message: string;
      data: {
        orderId: string;
        paymentId?: string;
        cieloStatus?: string;
        pendingConfirmation: boolean;
        amount: number;
        method: string;
        refundedAt: string;
      };
    }>(`/api/v1/events/${eventId}/repasse/orders/${orderId}/refund`, { reason });
    return response.data;
  }

  async getEventChargebacks(
    eventId: string,
    params?: {
      page?: number;
      limit?: number;
    },
  ): Promise<{
    chargebacks: Array<{
      id: string;
      orderId: string;
      registrationId: string;
      paymentId?: string;
      amount: number;
      chargebackDate: string;
      purchaseDate: string;
      paymentMethod: string;
      buyer: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        avatarUrl: string | null;
      };
      participant?: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        avatarUrl: string | null;
      };
      reason?: string;
    }>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    totalAmount: number;
  }> {
    const { data: response } = await this.apiClient.get<{
      message: string;
      data: {
        chargebacks: Array<{
          id: string;
          orderId: string;
          registrationId: string;
          amount: number;
          chargebackDate: string;
          purchaseDate: string;
          paymentMethod: string;
          buyer: {
            id: string;
            firstName: string;
            lastName: string;
            email: string;
            avatarUrl: string | null;
          };
          participant?: {
            id: string;
            firstName: string;
            lastName: string;
            email: string;
            avatarUrl: string | null;
          };
          reason?: string;
        }>;
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
        };
        totalAmount: number;
      };
    }>(`/api/v1/events/${eventId}/financial/chargebacks`, { params });
    return response.data;
  }

  // Enhanced Registration methods
  async getEventRegistrationsEnhanced(
    eventId: string,
    params?: {
      page?: number;
      limit?: number;
      status?:
      | "PENDING"
      | "CONFIRMED"
      | "CANCELLED"
      | "COMPLETED"
      | "CHARGEBACK"
      | "REFUNDED";
      search?: string;
      ticketIds?: string[];
      startDate?: string;
      endDate?: string;
      sortBy?: "purchaseDate" | "amount" | "status";
      sortOrder?: "asc" | "desc";
    },
  ): Promise<{
    registrations: Registration[];
    stats: RegistrationStats;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const { data: response } = await this.apiClient.get<{
      data: {
        registrations: Registration[];
        stats: RegistrationStats;
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
        };
      };
    }>(`/api/v1/events/${eventId}/registrations`, {
      params: {
        page: params?.page,
        limit: params?.limit,
        status: params?.status,
        search: params?.search,
        ticketIds: params?.ticketIds,
        startDate: params?.startDate,
        endDate: params?.endDate,
        sortBy: params?.sortBy,
        sortOrder: params?.sortOrder,
      },
    });
    return response.data;
  }

  async getEventRegistrationStats(eventId: string): Promise<RegistrationStats> {
    const { data: response } = await this.apiClient.get<{
      data: RegistrationStats;
    }>(`/api/v1/events/${eventId}/registrations/stats`);
    return response.data;
  }

  // Payment Details methods
  async getPaymentDetailsByPayment(paymentId: string): Promise<PaymentDetails> {
    const { data: response } = await this.apiClient.get<{
      message: string;
      data: PaymentDetails;
    }>(`/api/v1/payments/payment/${paymentId}/details`);
    return response.data;
  }

  async getPaymentDetailsByTransaction(
    transactionId: string,
  ): Promise<PaymentDetails> {
    const { data: response } = await this.apiClient.get<{
      message: string;
      data: PaymentDetails;
    }>(`/api/v1/payments/transaction/${transactionId}/details`);
    return response.data;
  }

  async getPaymentDetailsByOrder(orderId: string): Promise<PaymentDetails> {
    const { data: response } = await this.apiClient.get<{
      message: string;
      data: PaymentDetails;
    }>(`/api/v1/payments/order/${orderId}/details`);
    return response.data;
  }

  async getPaymentDetailsByRegistration(
    registrationId: string,
  ): Promise<PaymentDetails> {
    const { data: response } = await this.apiClient.get<{
      message: string;
      data: PaymentDetails;
    }>(`/api/v1/registrations/${registrationId}/payment-details`);
    return response.data;
  }

  async getRegistrationById(registrationId: string): Promise<Registration> {
    const { data: response } = await this.apiClient.get<{
      data: {
        registration: Registration;
      };
    }>(`/api/v1/registrations/${registrationId}`);
    return response.data.registration;
  }

  /**
   * Baixa o PDF do ingresso de uma inscrição (QR Code + dados do participante).
   * O backend gera o PDF a partir do `receiptSnapshot` imutável e aplica o mesmo
   * controle de acesso da visualização (comprador/participante/organizador/admin).
   * Retorna o blob + o nome de arquivo sugerido no `Content-Disposition`.
   */
  async downloadRegistrationTicketPdf(
    registrationId: string,
  ): Promise<{ blob: Blob; filename: string }> {
    const response = await this.apiClient.get<Blob>(
      `/api/v1/registrations/${registrationId}/ticket-pdf`,
      { responseType: "blob" },
    );

    const contentDisposition =
      (response.headers as Record<string, string>)["content-disposition"] ?? "";
    const match = contentDisposition.match(/filename="?([^"]+)"?/);
    const filename =
      match?.[1] ?? `ingresso-${registrationId.slice(0, 8)}.pdf`;

    return { blob: response.data as unknown as Blob, filename };
  }

  /**
   * Baixa o PDF do COMPROVANTE (recibo) do pedido ao qual a inscrição pertence —
   * o mesmo documento anexado ao e-mail de confirmação. O backend gera por PEDIDO
   * e aplica o controle de acesso (comprador/organizador/admin). Retorna o blob +
   * o nome de arquivo sugerido no `Content-Disposition`.
   */
  async downloadRegistrationReceiptPdf(
    registrationId: string,
  ): Promise<{ blob: Blob; filename: string }> {
    const response = await this.apiClient.get<Blob>(
      `/api/v1/registrations/${registrationId}/receipt-pdf`,
      { responseType: "blob" },
    );

    const contentDisposition =
      (response.headers as Record<string, string>)["content-disposition"] ?? "";
    const match = contentDisposition.match(/filename="?([^"]+)"?/);
    const filename =
      match?.[1] ?? `comprovante-${registrationId.slice(0, 8)}.pdf`;

    return { blob: response.data as unknown as Blob, filename };
  }

  async contactOrganizer(
    organizationId: string,
    data: {
      name: string;
      email: string;
      phone?: string;
      cpf?: string;
      subject?: string;
      message: string;
      eventId?: string;
    },
  ): Promise<void> {
    await this.apiClient.post(
      `/api/v1/organizers/${organizationId}/contact`,
      data,
    );
  }

  /**
   * Bundle da página de gerenciamento de ingressos — `event` + `categories` +
   * `tickets` em uma única request. Substitui as 3 chamadas separadas
   * (`getEventById`, `getTicketCategories`, `getTickets`) na página de edit.
   *
   * Backend deve retornar tickets ordenados por (categoryId NULLS LAST,
   * sortOrder ASC, createdAt ASC) e categories por order ASC.
   */
  async getTicketsManagementBundle(eventId: string): Promise<{
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    event: {
      id: string;
      name: string;
      slug: string;
      kitSelectionDisplay?: any;
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    categories: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tickets: any[];
    pagination?: {
      tickets?: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    };
  }> {
    const { data: response } = await this.apiClient.get<{
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: any;
    }>(`/api/v1/events/${eventId}/tickets-management`);
    return response.data;
  }
}

