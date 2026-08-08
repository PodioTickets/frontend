import type { Event } from "@/interfaces/event";
import type { AnticipationQuote } from "@/utils/anticipation";
import { OrganizerServiceBase } from "./OrganizerServiceBase";
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
 * Domínio de leitura/relatórios/financeiro do OrganizerService (Bloco 3, fase 2):
 * dashboard, financeiro, fiscal, repasses, parcelas, estornos, chargebacks,
 * detalhes de pagamento, inscrições enriquecidas, PDFs, contato e bundle.
 * Elo da cadeia de mixins (estende a base do apiClient).
 */
export class OrganizerReportingService extends OrganizerServiceBase {
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
    // O backend responde { data: { installments, metrics: { totalPending,
    // totalCount } } }. Antes líamos campos planos (totalPending/totalTransactions)
    // que vinham `undefined` → "R$ NaN" no card de total. Mapeamos de `metrics`,
    // com fallback ao formato plano por segurança.
    const { data: response } = await this.apiClient.get<{
      data: {
        installments?: Installment[];
        metrics?: { totalPending?: number; totalCount?: number };
        totalPending?: number;
        releaseToday?: number;
        totalTransactions?: number;
      };
    }>(`/api/v1/events/${eventId}/financial/installments`);
    const d = response.data ?? {};
    const installments = d.installments ?? [];
    return {
      installments,
      totalPending: d.metrics?.totalPending ?? d.totalPending ?? 0,
      releaseToday: d.releaseToday ?? 0,
      totalTransactions: d.metrics?.totalCount ?? d.totalTransactions ?? installments.length,
    };
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

  /**
   * Baixa o CSV do "aguardando liberação" — aba `avista` (pending) ou
   * `parcelados` (parcelas a receber). Retorna o blob + o nome de arquivo
   * sugerido no `Content-Disposition` (exige CORS exposedHeaders).
   */
  async exportFinancialPending(
    eventId: string,
    type: "avista" | "parcelados",
    fields?: string[],
  ): Promise<{ blob: Blob; filename: string }> {
    const response = await this.apiClient.get<Blob>(
      `/api/v1/events/${eventId}/financial/pending/export`,
      {
        params: {
          type,
          ...(fields && fields.length ? { fields: fields.join(",") } : {}),
        },
        responseType: "blob",
      },
    );
    const contentDisposition =
      (response.headers as Record<string, string>)["content-disposition"] ?? "";
    const match = contentDisposition.match(/filename="?([^"]+)"?/);
    const filename =
      match?.[1] ?? `aguardando-liberacao-${type}-${eventId.slice(0, 8)}.csv`;
    return { blob: response.data as unknown as Blob, filename };
  }

  /**
   * Cotação da antecipação de recebíveis: total disponível p/ antecipar, taxa
   * mensal e a lista de pedidos (oldest-first) p/ o front calcular a prévia local.
   */
  async getAnticipationQuote(eventId: string): Promise<AnticipationQuote> {
    const { data: response } = await this.apiClient.get<{ data: AnticipationQuote }>(
      `/api/v1/events/${eventId}/repasse/anticipations/quote`,
    );
    return response.data;
  }

  /** Solicita a antecipação (o backend recalcula o custo de forma autoritativa). */
  async requestAnticipation(
    eventId: string,
    amount: number,
  ): Promise<{ message: string; data: { anticipation: unknown } }> {
    const { data } = await this.apiClient.post<{ message: string; data: { anticipation: unknown } }>(
      `/api/v1/events/${eventId}/repasse/anticipations`,
      { amount },
    );
    return data;
  }

  async getEventRefunded(
    eventId: string,
    params?: {
      page?: number;
      limit?: number;
      search?: string;
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

  /**
   * Cancela um pedido GRATUITO (finalAmount 0) pelo ORGANIZADOR com permissão
   * financeira — SEM estorno (nada foi pago: sem Cielo, sem taxa de 2%). Marca o
   * pedido como cancelado, cancela as inscrições e reverte cupom/voucher.
   * - `reason` é obrigatório (≥ 3 chars) — vai pro audit log.
   * - Rejeita pedido com valor pago: 409 `ORDER_HAS_PAYMENT` (use `refundOrder`).
   */
  async cancelFreeOrder(
    eventId: string,
    orderId: string,
    reason: string,
  ): Promise<{
    orderId: string;
    paymentId?: string | null;
    cancelledAt: string;
  }> {
    const { data: response } = await this.apiClient.post<{
      message: string;
      data: {
        orderId: string;
        paymentId?: string | null;
        cancelledAt: string;
      };
    }>(`/api/v1/events/${eventId}/repasse/orders/${orderId}/cancel`, { reason });
    return response.data;
  }

  async getEventChargebacks(
    eventId: string,
    params?: {
      page?: number;
      limit?: number;
      search?: string;
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

  /**
   * Reenvia o e-mail de confirmação para o endereço informado. O backend resolve
   * o pedido a partir da inscrição, regera os anexos a partir do snapshot
   * imutável e aplica o mesmo controle de acesso dos PDFs do pedido.
   *
   * @param ticketOnly Quando `true`, envia SOMENTE o ingresso desta inscrição
   *   (sem comprovante e sem os demais ingressos do pedido) — usado pelo modal de
   *   inscrição. Omisso/`false` = pedido completo (todos os ingressos +
   *   comprovante), usado pelo modal de pedido.
   */
  async resendRegistrationEmail(
    registrationId: string,
    email: string,
    ticketOnly = false,
  ): Promise<void> {
    await this.apiClient.post(
      `/api/v1/registrations/${registrationId}/resend-email`,
      { email, ticketOnly },
    );
  }

  /**
   * Edição dos dados do participante de uma inscrição pelo ORGANIZADOR (painel de
   * inscrições). PATCH parcial — só os campos enviados são atualizados. O backend
   * grava no recibo imutável + colunas-espelho e reaplica o gate `edit_event`
   * (verdade do servidor). Retorna a inscrição re-hidratada (mesmo shape do GET)
   * para o front atualizar o estado sem refetch.
   */
  async updateRegistrationParticipant(
    registrationId: string,
    payload: {
      name?: string;
      email?: string;
      documentType?: string;
      documentNumber?: string;
      phone?: string;
      birthDate?: string;
      gender?: string;
      country?: string;
      emergencyContactName?: string;
      emergencyContactPhone?: string;
    },
  ): Promise<Registration> {
    const { data: response } = await this.apiClient.patch<{
      data: { registration: Registration };
    }>(`/api/v1/registrations/${registrationId}/participant`, payload);
    return response.data.registration;
  }

  /**
   * Edição em lote das respostas das perguntas do organizador (ORGANIZADOR).
   * Backend atualiza a tabela relacional + o recibo imutável e reaplica o gate
   * `edit_event`. Retorna a inscrição re-hidratada (mesmo shape do GET).
   */
  async updateRegistrationAnswers(
    registrationId: string,
    answers: { questionId: string; answer: string }[],
  ): Promise<Registration> {
    const { data: response } = await this.apiClient.patch<{
      data: { registration: Registration };
    }>(`/api/v1/registrations/${registrationId}/answers`, { answers });
    return response.data.registration;
  }

  /**
   * Troca da variação de um produto incluso pelo ORGANIZADOR (sem os limites do
   * comprador). Backend recalcula estoque e reaplica o gate `edit_event`. Retorna
   * a inscrição re-hidratada (mesmo shape do GET).
   */
  async updateRegistrationProductVariationAsOrganizer(
    registrationId: string,
    productId: string,
    variationId: string,
  ): Promise<Registration> {
    const { data: response } = await this.apiClient.patch<{
      data: { registration: Registration };
    }>(
      `/api/v1/registrations/${registrationId}/products/${productId}/variation/organizer`,
      { variationId },
    );
    return response.data.registration;
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
