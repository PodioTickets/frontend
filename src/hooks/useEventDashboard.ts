"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { organizerService, userService } from "@/services";
import toast from "react-hot-toast";
import { useTickets } from "@/hooks/useTickets";
import { useEvent } from "@/hooks/useEvent";
import {
  useDashboardOverview,
  useDashboardRankings,
  useDashboardSecondary,
} from "@/hooks/useDashboard";
import type { Question } from "@/interfaces/event";
import type { BestSellingVariationItem } from "@/components/Organizer/BestSellingVariations";
import type { TextAnswerRow } from "@/components/Organizer/QuestionDetailsDrawer";
import {
  LOTS_NEAR_DEPLETION_PAGE_SIZE,
  TICKETS_WITH_LOTS_PAGE_SIZE,
  TICKET_RANKING_PAGE_SIZE,
} from "@/lib/dashboard";

/**
 * Controller compartilhado das páginas de dashboard do evento (admin/organizer).
 * Concentra TODO o estado, as 3 queries do dashboard (overview/rankings/secondary),
 * os memos derivados e os efeitos. Antes esse bloco (~360 linhas) era duplicado
 * byte a byte entre as duas páginas.
 *
 * O que NÃO entra aqui (difere por superfície): o header, o redirect de login e
 * o `useEventPermissionGuard` (organizer-only) — ficam na página. O redirect de
 * "não autenticado" é injetado via `onUnauthenticated`.
 */
export function useEventDashboard(
  eventId: string,
  onUnauthenticated: () => void,
) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [authChecked, setAuthChecked] = useState(false);
  const [periodFilter, setPeriodFilter] = useState("geral");
  const [selectedTicketIds, setSelectedTicketIds] = useState<string[]>([]);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [selectedProductName, setSelectedProductName] = useState<string | null>(null);
  const [textAnswerRows, setTextAnswerRows] = useState<TextAnswerRow[] | undefined>(undefined);
  const [textAnswersLoading, setTextAnswersLoading] = useState(false);
  const [lotsNearDepletionPage, setLotsNearDepletionPage] = useState(1);
  const [ticketRankingPage, setTicketRankingPage] = useState(1);
  const [ticketsWithLotsPage, setTicketsWithLotsPage] = useState(1);
  const [ticketsWithLotsExpanded, setTicketsWithLotsExpanded] = useState<Set<string>>(new Set());
  /* `useTickets` mantido só pro filter modal — a lista de lotes agora vem do
   * endpoint `/dashboard/rankings` com paginação server-side. */
  const { tickets } = useTickets(eventId, true);

  const { event } = useEvent(eventId, authChecked && !!eventId);

  const dashboardEnabled = authChecked && !!eventId;
  const period = periodFilter as
    | "geral" | "24h" | "7d" | "15d" | "1m" | "2m";
  const ticketIds =
    selectedTicketIds.length > 0 ? selectedTicketIds : undefined;

  const overviewQuery = useDashboardOverview(
    eventId,
    { period, ticketIds },
    dashboardEnabled,
  );
  const rankingsQuery = useDashboardRankings(
    eventId,
    {
      period,
      ticketIds,
      ticketRankingPage,
      ticketRankingLimit: TICKET_RANKING_PAGE_SIZE,
      ticketsPage: ticketsWithLotsPage,
      ticketsLimit: TICKETS_WITH_LOTS_PAGE_SIZE,
    },
    dashboardEnabled,
  );
  const secondaryQuery = useDashboardSecondary(
    eventId,
    { period, ticketIds },
    dashboardEnabled,
  );

  const isFirstLoad =
    !overviewQuery.data && !rankingsQuery.data && !secondaryQuery.data;
  const loading =
    overviewQuery.isLoading ||
    rankingsQuery.isLoading ||
    secondaryQuery.isLoading
      ? isFirstLoad
      : false;

  const ticketsWithLotsList = rankingsQuery.data?.tickets?.data?.tickets ?? [];
  const ticketsWithLotsTotalPages =
    rankingsQuery.data?.tickets?.data?.pagination?.totalPages || 1;
  const ticketRankingTotalPagesServer =
    rankingsQuery.data?.ticketRanking?.pagination?.totalPages || 1;

  const toggleTicketsWithLotsRow = (id: string) => {
    setTicketsWithLotsExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const dashboardData = useMemo(() => {
    const overview = overviewQuery.data;
    const rankings = rankingsQuery.data;
    const secondary = secondaryQuery.data;

    /* Helper de formatação de labels do chart pra period=geral: a API retorna
     * "mai/26", mapeamos pra "Mai/2026" pra UX consistente com os outros
     * formatos. Movido pra closure pra não vazar do useMemo. */
    const formatChartLabels = (originalData: any) => {
      if (
        periodFilter !== "geral" ||
        !originalData?.labels ||
        !Array.isArray(originalData.labels)
      ) {
        return originalData;
      }
      const monthMap: { [k: string]: string } = {
        jan: "Jan", fev: "Fev", mar: "Mar", abr: "Abr",
        mai: "Mai", jun: "Jun", jul: "Jul", ago: "Ago",
        set: "Set", out: "Out", nov: "Nov", dez: "Dez",
      };
      const monthNames = [
        "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
        "Jul", "Ago", "Set", "Out", "Nov", "Dez",
      ];
      const currentYear = new Date().getFullYear();
      const currentCentury = Math.floor(currentYear / 100) * 100;
      const expandYear = (yearShort: string) => {
        const n = parseInt(yearShort, 10);
        let full = currentCentury + n;
        if (full > currentYear + 10) full = currentCentury - 100 + n;
        return full;
      };
      const formattedLabels = originalData.labels.map((label: any) => {
        const labelStr = String(label || "").trim();
        if (!labelStr) return label;
        // "mai/26"
        let m = labelStr.match(/^(\w+)\/(\d{2})$/);
        if (m) {
          const name =
            monthMap[m[1].toLowerCase()] ||
            m[1].charAt(0).toUpperCase() + m[1].slice(1);
          return `${name}/${expandYear(m[2])}`;
        }
        // "05/26"
        m = labelStr.match(/^(\d{1,2})\/(\d{2})$/);
        if (m) {
          const monthNum = parseInt(m[1], 10);
          if (monthNum < 1 || monthNum > 12) return labelStr;
          return `${monthNames[monthNum - 1]}/${expandYear(m[2])}`;
        }
        // "mai/2026" — já completo, só capitaliza
        m = labelStr.match(/^(\w+)\/(\d{4})$/);
        if (m) {
          const name = monthMap[m[1].toLowerCase()] || m[1];
          return `${name}/${m[2]}`;
        }
        return labelStr;
      });
      return {
        labels: formattedLabels,
        revenue: originalData.revenue,
        dailyData: originalData.dailyData,
      };
    };

    return {
      netRevenue: overview?.metrics.netRevenue ?? 0,
      netRevenueChange: overview?.metrics.netRevenueChange ?? 0,
      averageTicket: overview?.metrics.averageTicket ?? 0,
      averageTicketChange: overview?.metrics.averageTicketChange ?? 0,
      totalRegistrations: overview?.metrics.totalRegistrations ?? 0,
      totalRegistrationsChange: overview?.metrics.totalRegistrationsChange ?? 0,
      cancellations: overview?.metrics.cancellations ?? 0,
      cancellationsStatus: overview?.metrics.cancellationsStatus ?? "Normal",
      refunds: overview?.metrics.refunds ?? 0,
      refundsStatus: overview?.metrics.refundsStatus ?? "Normal",
      registrationsTrend: {
        amount: overview?.registrationsTrend.amount ?? 0,
        change: overview?.registrationsTrend.change ?? 0,
        confirmed: overview?.registrationsTrend.confirmed ?? 0,
        canceled: overview?.registrationsTrend.canceled ?? 0,
        refunded: overview?.registrationsTrend.refunded ?? 0,
        chartData: formatChartLabels(
          overview?.registrationsTrend.chartData ?? { labels: [], revenue: [] },
        ),
      },
      ticketRanking: (rankings?.ticketRanking.data ?? []).map((t) => ({
        name: t.name,
        category: t.category,
        quantity: t.quantity,
        total: t.total,
      })),
      topCities: (secondary?.topCities ?? []).map((c) => ({
        city: c.city,
        state: c.state,
        participants: c.participants,
      })),
      lotsNearDepletion: (rankings?.lotsNearDepletion ?? []).map((l) => ({
        name: l.ticketName,
        status: l.status,
        sold: l.sold,
        total: l.total,
        remaining: l.remaining,
        percentageSold: l.percentageSold,
        activeBatch: l.activeBatch ?? null,
      })),
      salesHeatmap: secondary?.salesHeatmap ?? [],
      dailyData: [],
      topProductVariations: (rankings?.topProductVariations ?? []).map((p) => ({
        productId: p.productId,
        productName: p.productName,
        productImage: p.productImage ?? null,
        totalSoldAmount: p.totalSoldAmount,
        variations: (p.variations ?? []).map((v) => ({
          variationId: v.variationId ?? null,
          variationName: v.variationName ?? "—",
          quantitySold: v.quantitySold ?? 0,
          percentage: v.percentage,
          remainingStock: v.remainingStock ?? undefined,
          totalStock: v.totalStock ?? undefined,
        })),
      })),
      mostAnsweredQuestions: (secondary?.mostAnsweredQuestions ?? []).map(
        (q) => ({
          questionId: q.questionId,
          question: q.question,
          order: q.order,
          participantCount: q.participantCount,
          type: q.type ?? "text",
          options: q.options ?? [],
          isRequired: q.isRequired ?? false,
          answersRanking: (q.answersRanking ?? []).map((a) => ({
            answer: a.answer,
            count: a.count,
            percentage: a.percentage,
          })),
        }),
      ),
      /* Distribuição de vendas por método de pagamento — vem do endpoint
       * de rankings (buildSalesByPaymentMethod no backend). */
      salesByPaymentMethod: rankings?.salesByPaymentMethod ?? {
        items: [],
        totals: { salesCount: 0, totalAmount: 0 },
      },
    };
  }, [overviewQuery.data, rankingsQuery.data, secondaryQuery.data, periodFilter]);

  useEffect(() => {
    if (authLoading) return;

    const hasToken = userService.isAuthenticated();
    if (!hasToken && !isAuthenticated) {
      onUnauthenticated();
      return;
    }

    if (!authChecked) {
      setAuthChecked(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAuthenticated]);

  /* Erros das queries → toast (react-query lida com retry automático). */
  useEffect(() => {
    const err =
      overviewQuery.error || rankingsQuery.error || secondaryQuery.error;
    if (err) {
      console.error("Error loading dashboard:", err);
      toast.error("Erro ao carregar dados");
    }
  }, [overviewQuery.error, rankingsQuery.error, secondaryQuery.error]);

  const lotsNearDepletionList = dashboardData.lotsNearDepletion;
  const lotsNearDepletionTotalPages = Math.max(
    1,
    Math.ceil(lotsNearDepletionList.length / LOTS_NEAR_DEPLETION_PAGE_SIZE),
  );

  useEffect(() => {
    setLotsNearDepletionPage(1);
  }, [lotsNearDepletionList]);

  useEffect(() => {
    setLotsNearDepletionPage((p) =>
      Math.min(Math.max(1, p), lotsNearDepletionTotalPages),
    );
  }, [lotsNearDepletionTotalPages]);

  // Reset das páginas de ranking server-side quando o filtro de período ou
  // ingressos muda — sem isso a paginação fica numa página inexistente.
  useEffect(() => {
    setTicketRankingPage(1);
    setTicketsWithLotsPage(1);
  }, [periodFilter, selectedTicketIds]);

  const lotsNearDepletionSliceStart =
    (lotsNearDepletionPage - 1) * LOTS_NEAR_DEPLETION_PAGE_SIZE;
  const paginatedLotsNearDepletion = useMemo(() => {
    return lotsNearDepletionList.slice(
      lotsNearDepletionSliceStart,
      lotsNearDepletionSliceStart + LOTS_NEAR_DEPLETION_PAGE_SIZE,
    );
  }, [lotsNearDepletionList, lotsNearDepletionSliceStart]);

  /* Ranking de ingressos agora paginado server-side via `/dashboard/rankings`.
   * Lista já vem pré-paginada — render direto, total vem da pagination. */
  const ticketRankingList = dashboardData.ticketRanking;
  const ticketRankingTotalPages = ticketRankingTotalPagesServer;
  const ticketRankingSliceStart =
    (ticketRankingPage - 1) * TICKET_RANKING_PAGE_SIZE;
  const paginatedTicketRanking = ticketRankingList;

  // Um item por produto (soma de todas as variações)
  const bestSellingVariations = useMemo((): BestSellingVariationItem[] => {
    const top = dashboardData.topProductVariations ?? [];
    return top.map((product) => {
      const variations = product.variations ?? [];
      const totalQty = variations.reduce((s, v) => s + (v.quantitySold ?? 0), 0);
      const totalStock = variations.reduce((s, v) => s + (v.totalStock ?? 0), 0);
      const remainingStock = variations.reduce((s, v) => s + (v.remainingStock ?? 0), 0);
      return {
        id: product.productId,
        productId: product.productId,
        productName: product.productName,
        variationName: "",
        quantity: totalQty,
        totalCents: product.totalSoldAmount,
        remainingStock: totalStock > 0 ? remainingStock : undefined,
        totalStock: totalStock > 0 ? totalStock : undefined,
      };
    });
  }, [dashboardData.topProductVariations]);

  const uniqueProductNames = useMemo(
    () => [...new Set(bestSellingVariations.map((i) => i.productName))],
    [bestSellingVariations]
  );
  const selectedProductIndex = selectedProductName
    ? uniqueProductNames.indexOf(selectedProductName) + 1
    : 0;
  const totalProducts = uniqueProductNames.length;

  const selectedProductFromApi = useMemo(
    () => (dashboardData.topProductVariations ?? []).find((p) => p.productName === selectedProductName) ?? null,
    [dashboardData.topProductVariations, selectedProductName]
  );

  const selectedProductVariations = useMemo(() => {
    if (!selectedProductName) return [];
    if (selectedProductFromApi?.variations?.length) {
      return selectedProductFromApi.variations.map((v) => {
        const stockStr =
          v.remainingStock != null && v.totalStock != null
            ? v.totalStock.toLocaleString("pt-BR")
            : "—";
        const stockStatus: "Esgotado" | "Normal" | undefined =
          v.remainingStock != null ? (v.remainingStock === 0 ? "Esgotado" : "Normal") : undefined;
        return {
          variationName: v.variationName,
          quantitySold: String(v.quantitySold),
          percentage: v.percentage ?? 0,
          stock: stockStr,
          stockStatus,
        };
      });
    }
    const items = bestSellingVariations.filter((i) => i.productName === selectedProductName);
    const totalQty = items.reduce((s, i) => s + (i.quantity ?? 0), 0);
    return items.map((item) => {
      const qty = item.quantity ?? 0;
      const pct = item.percentage ?? (totalQty > 0 ? Math.round((qty / totalQty) * 100) : 0);
      const hasRevenue = (item.totalCents ?? 0) > 0;
      const stockStr =
        item.remainingStock != null && item.totalStock != null
          ? `${item.remainingStock.toLocaleString("pt-BR")} / ${item.totalStock.toLocaleString("pt-BR")}`
          : "—";
      const stockStatus: "Esgotado" | "Normal" | undefined =
        item.remainingStock != null ? (item.remainingStock === 0 ? "Esgotado" : "Normal") : undefined;
      return {
        variationName: item.variationName,
        quantitySold: hasRevenue
          ? `R$ ${((item.totalCents ?? 0) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          : String(qty),
        percentage: pct,
        stock: stockStr,
        stockStatus,
      };
    });
  }, [selectedProductName, selectedProductFromApi, bestSellingVariations]);
  const selectedProductTotalRevenue: number = useMemo(() => {
    if (!selectedProductName) return 0;
    return bestSellingVariations
      .filter((i) => i.productName === selectedProductName)
      .reduce((s, i) => s + (i.totalCents ?? 0), 0);
  }, [selectedProductName, bestSellingVariations]);
  const selectedProductQuantitySold: number = useMemo(() => {
    if (!selectedProductName) return 0;
    return bestSellingVariations
      .filter((i) => i.productName === selectedProductName)
      .reduce((s, i) => s + (i.quantity ?? 0), 0);
  }, [selectedProductName, bestSellingVariations]);

  const selectedProductTotalStock: number | undefined = useMemo(() => {
    if (!selectedProductFromApi?.variations?.length) return undefined;
    const sum = selectedProductFromApi.variations.reduce((s, v) => s + (v.totalStock ?? 0), 0);
    return sum > 0 ? sum : undefined;
  }, [selectedProductFromApi]);

  const selectedProductTotalRevenueLabel = useMemo(() => {
    const cents =
      selectedProductFromApi?.totalSoldAmount != null
        ? selectedProductFromApi.totalSoldAmount
        : selectedProductTotalRevenue;
    return cents > 0
      ? `R$ ${(cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : "—";
  }, [selectedProductFromApi?.totalSoldAmount, selectedProductTotalRevenue]);

  const sortedQuestions = useMemo(() => {
    const questions = (event?.questions ?? []) as Question[];
    return [...questions].sort((a, b) => a.order - b.order);
  }, [event?.questions]);

  // Listagem de perguntas: da API mostAnsweredQuestions (participantCount, answersRanking, type, etc.)
  const questionsListing = useMemo(() => {
    const fromApi = dashboardData.mostAnsweredQuestions ?? [];
    if (fromApi.length > 0) {
      return fromApi.map((q) => ({
        id: q.questionId,
        question: q.question,
        answerSummary: `${q.participantCount} resposta${q.participantCount !== 1 ? "s" : ""}`,
      }));
    }
    return sortedQuestions.map((q) => ({
      id: q.id,
      question: q.question,
      answerSummary: q.type === "text" ? "Texto livre" : "Maioria: —",
    }));
  }, [dashboardData.mostAnsweredQuestions, sortedQuestions]);

  const apiQuestions = dashboardData.mostAnsweredQuestions ?? [];

  const selectedQuestionFromApi = selectedQuestionId && apiQuestions.length > 0
    ? apiQuestions.find((q) => q.questionId === selectedQuestionId) ?? null
    : null;

  const selectedQuestion: Question | null = useMemo(() => {
    if (!selectedQuestionId) return null;
    if (selectedQuestionFromApi) {
      return {
        id: selectedQuestionFromApi.questionId,
        eventId: "",
        question: selectedQuestionFromApi.question,
        type: (selectedQuestionFromApi.type || "text") as Question["type"],
        options: selectedQuestionFromApi.options,
        isRequired: selectedQuestionFromApi.isRequired ?? false,
        order: selectedQuestionFromApi.order,
        createdAt: "",
        updatedAt: "",
      };
    }
    return sortedQuestions.find((q) => q.id === selectedQuestionId) ?? null;
  }, [selectedQuestionId, selectedQuestionFromApi, sortedQuestions]);

  const selectedQuestionAnswerRows = useMemo((): { label: string; percentage: number; count: number }[] | undefined => {
    if (!selectedQuestionFromApi?.answersRanking?.length) return undefined;
    if (selectedQuestion?.type === "text" || selectedQuestion?.type === "number") return undefined;
    return selectedQuestionFromApi.answersRanking.map((a) => ({
      label: a.answer,
      percentage: a.percentage,
      count: a.count,
    }));
  }, [selectedQuestionFromApi, selectedQuestion?.type]);

  // Lazy fetch: text answers only when a text/number question drawer is opened
  useEffect(() => {
    if (!selectedQuestionId) {
      setTextAnswerRows(undefined);
      return;
    }
    const qType = selectedQuestion?.type;
    if (qType !== "text" && qType !== "number") {
      setTextAnswerRows(undefined);
      return;
    }
    let cancelled = false;
    setTextAnswerRows(undefined);
    setTextAnswersLoading(true);
    organizerService
      .getQuestionTextAnswers(eventId, selectedQuestionId)
      .then((res) => {
        if (cancelled) return;
        setTextAnswerRows(
          res.answers.map((a) => ({
            id: a.id,
            userName: a.userName ?? "Participante",
            userEmail: a.userEmail ?? undefined,
            userAvatarUrl: a.userAvatarUrl ?? undefined,
            answer: a.answer,
            answeredAt: a.answeredAt,
          }))
        );
      })
      .catch(() => {
        if (!cancelled) setTextAnswerRows([]);
      })
      .finally(() => {
        if (!cancelled) setTextAnswersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedQuestionId, selectedQuestion?.type, eventId]);

  const selectedQuestionIndex = selectedQuestionId
    ? (apiQuestions.length > 0
      ? apiQuestions.findIndex((q) => q.questionId === selectedQuestionId) + 1
      : sortedQuestions.findIndex((q) => q.id === selectedQuestionId) + 1)
    : 0;
  const totalQuestions = apiQuestions.length > 0 ? apiQuestions.length : sortedQuestions.length;

  return {
    loading,
    eventId,
    event,
    dashboardData,
    tickets,
    periodFilter,
    setPeriodFilter,
    selectedTicketIds,
    setSelectedTicketIds,
    isTicketModalOpen,
    setIsTicketModalOpen,
    // ticket ranking
    paginatedTicketRanking,
    ticketRankingSliceStart,
    ticketRankingPage,
    setTicketRankingPage,
    ticketRankingTotalPages,
    // lots near depletion
    paginatedLotsNearDepletion,
    lotsNearDepletionSliceStart,
    lotsNearDepletionPage,
    setLotsNearDepletionPage,
    lotsNearDepletionTotalPages,
    // questions
    questionsListing,
    selectedQuestionId,
    setSelectedQuestionId,
    selectedQuestion,
    selectedQuestionIndex,
    totalQuestions,
    selectedQuestionAnswerRows,
    textAnswerRows,
    textAnswersLoading,
    selectedQuestionFromApi,
    apiQuestions,
    sortedQuestions,
    // products
    selectedProductName,
    setSelectedProductName,
    selectedProductFromApi,
    selectedProductIndex,
    totalProducts,
    selectedProductQuantitySold,
    selectedProductTotalStock,
    selectedProductTotalRevenueLabel,
    selectedProductVariations,
    uniqueProductNames,
    // tickets with lots
    ticketsWithLotsList,
    ticketsWithLotsExpanded,
    toggleTicketsWithLotsRow,
    ticketsWithLotsPage,
    setTicketsWithLotsPage,
    ticketsWithLotsTotalPages,
  };
}
