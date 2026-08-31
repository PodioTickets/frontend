import type { Event } from "@/interfaces/event";
import type { EventKitSelectionDisplay } from "@/lib/eventKitSelectionDisplay";

/**
 * Tipos e normalizadores do OrganizerService, extraídos do arquivo-monstro
 * (Bloco 3). Re-exportados por OrganizerService.ts para compat retroativa dos
 * imports existentes (`from ".../OrganizerService"`).
 */

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
  // Chaves PIX — substituição completa quando enviada (mesma semântica do admin).
  // Permite o organizador gerir suas chaves pela tela de Configurações.
  pixKeys?: PixKeyItemPayload[];
}

/** Item de chave PIX no payload de criação/atualização de organização. */
export interface PixKeyItemPayload {
  key: string;
  keyType: string;
  isDefault?: boolean;
  bankName?: string;
  accountHolderName?: string;
  accountHolderDocument?: string;
}

/**
 * Payload do auto-cadastro público de organizador
 * (`POST /api/v1/auth/register/organizer`). PF: `document`/`legalName` são
 * omitidos (derivados do CPF/nome fantasia no backend).
 */
export interface OrganizerSignupRequest {
  completeName: string;
  email: string;
  password: string;
  personType: "PF" | "PJ";
  document?: string; // CNPJ (apenas dígitos) — PJ
  legalName?: string; // Razão social — PJ
  tradeName: string; // Nome fantasia
  ownerName: string; // Nome do responsável
  ownerDocument: string; // CPF do responsável (apenas dígitos)
  zipCode: string;
  street: string;
  number?: string;
  neighborhood: string;
  city: string;
  state: string;
  orgEmail: string; // E-mail de contato da organização
  whatsapp: string; // Apenas dígitos
  phone?: string; // Apenas dígitos
  turnstileToken?: string;
}

/** Usuário retornado pelo signup (mesmo shape do login), p/ auto-login. */
export interface OrganizerSignupUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  documentNumber?: string;
  role: string;
  accountType?: string;
  avatarUrl?: string | null;
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
    avatarUrl?: string | null;
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
  /** Taxa de organizador personalizada habilitada (default false). Quando true, o
   *  organizador pode definir a taxa TOTAL do evento até `maxTotalFeePercent` na etapa
   *  financeira; quando false, o teto é 6% fixo. */
  customFeeEnabled?: boolean;
  /** Teto da taxa TOTAL (%) por evento quando `customFeeEnabled` (escala 0–100; default 6). */
  maxTotalFeePercent?: number;
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
  /** Avatar do ator da ação; null/ausente quando sem conta ou sem foto. */
  userAvatarUrl?: string | null;
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

  // Avatar do ator: campo achatado do backend (`userAvatarUrl`) ou aninhado no
  // `actor`/`user`. Ausente → undefined (cai nas iniciais no componente).
  const userAvatarUrl =
    typeof raw.userAvatarUrl === "string"
      ? raw.userAvatarUrl
      : typeof actor?.avatarUrl === "string"
        ? actor.avatarUrl
        : null;

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
    userAvatarUrl,
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

export function normalizeMemberDetailResponse(
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
  /** Vagas do evento (teto de participantes). `null` limpa o teto; omitido mantém. */
  maxParticipants?: number | null;
  googleMapsLink?: string;
  /**
   * Local do evento por coordenadas (seleção no mapa). `null` limpa o campo;
   * omitido mantém. `googleMapsLink` é derivado destas no build.
   */
  latitude?: number | null;
  longitude?: number | null;
  locationName?: string | null;
  bannerUrl?: string;
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
// `*Change`: variação % vs período anterior. `null` = SEM baseline (período
// anterior = 0) → o front exibe "novo" em vez de um percentual inventado.
export interface DashboardMetrics {
  netRevenue: number;
  netRevenueChange: number | null;
  averageTicket: number;
  averageTicketChange: number | null;
  totalRegistrations: number;
  totalRegistrationsChange: number | null;
  cancellations: number;
  cancellationsStatus: "Normal" | "Atenção" | "Crítico";
  refunds: number;
  refundsStatus: "Normal" | "Atenção" | "Crítico";
}

export interface RegistrationsTrend {
  amount: number;
  change: number | null;
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
  /** 1 por PEDIDO pago — MESMA agregação do mapa de calor (`purchaseLocations`
   *  somado por cidade), pra card e mapa nunca divergirem. */
  purchases: number;
}

/** Compras por local (endereço de cobrança) — alimenta o mapa de calor geográfico. */
export interface PurchaseLocation {
  /** Bairro do billing (quando informado) — precisão maior que só a cidade. */
  neighborhood?: string;
  city: string;
  state?: string;
  /** 1 por PEDIDO pago. */
  purchases: number;
  /** Coordenadas resolvidas pelo geocoding do BACKEND (cache global). Ausentes
   *  enquanto o local está PENDENTE de geocoding — aparecem na carga seguinte. */
  lat?: number;
  lng?: number;
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
  /** Compras por bairro/cidade/UF (billing) — mapa de calor geográfico. */
  purchaseLocations: PurchaseLocation[];
  /** Bairros ainda aguardando geocoding no backend (0 = mapa completo). Guia o
   *  WebSocket do dashboard (assina updates enquanto > 0). */
  geocodingPending?: number;
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
  installmentNumber?: number; // posição da parcela (1..totalInstallments)
  totalInstallments?: number; // total de parcelas do pedido
  isLastInstallment?: boolean;
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

export function normalizeEventNotification(
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
export function unwrapProductApiPayload(raw: unknown): unknown {
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

export function normalizeEventTracking(
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
