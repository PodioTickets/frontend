"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { organizerService, userService } from "@/services";
import {
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  TrendingUp,
  Users,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import { Loading } from "@/components/Loading";
import { AdminEventHeader } from "@/components/Admin/AdminEventHeader";
import { RevenueChart } from "@/components/Organizer/RevenueChart";
import { SalesHeatmap } from "@/components/Organizer/SalesHeatmap";
import type { SalesHeatmapData } from "@/services/organizer/OrganizerService";
import { ArrowButton } from "@/components/ArrowButton";
import { SelectTicketsFilterModal } from "@/components/Registrations/SelectTicketsFilterModal";
import { useTickets } from "@/hooks/useTickets";
import { useEvent } from "@/hooks/useEvent";
import {
  useDashboardOverview,
  useDashboardRankings,
  useDashboardSecondary,
} from "@/hooks/useDashboard";
import { ArrowUpIcon } from "@/components/Icons/ArrowUpIcon";
import { ShopIcon } from "@/components/Icons/ShopIcon";
import { CartIcon } from "@/components/Icons/CartIcon";
import { CheckIcon } from "@/components/Icons/Organizer/CheckIcon";
import { DolarIcon } from "@/components/Icons/Organizer/DolarIcon";
import { BestSellingVariations } from "@/components/Organizer/BestSellingVariations";
import { SalesByPaymentMethod } from "@/components/Organizer/SalesByPaymentMethod";
import { QuestionsListing } from "@/components/Organizer/QuestionsListing";
import { QuestionDetailsDrawer, type TextAnswerRow } from "@/components/Organizer/QuestionDetailsDrawer";
import { ProductDetailsDrawer } from "@/components/Organizer/ProductDetailsDrawer";
import type { Question } from "@/interfaces/event";
import type { BestSellingVariationItem } from "@/components/Organizer/BestSellingVariations";
import { Tooltip } from "@/components/Tooltip";
import { cn } from "@/utils/cn";
import { TicketsWithLotsList } from "@/components/Financial/TicketsWithLotsList";
import { mapTicketsToFinancialList } from "@/utils/financialTickets";
import { formatRawTicket } from "@/hooks/useTickets";
import type { FinancialTicket } from "@/services/organizer/OrganizerService";

const LOTS_NEAR_DEPLETION_PAGE_SIZE = 4;
const TICKETS_WITH_LOTS_PAGE_SIZE = 10;
const TICKET_RANKING_PAGE_SIZE = 4;

function LotsNearDepletionPaginationBar({
  page,
  totalPages,
  onPageChange,
  compact,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  compact?: boolean;
}) {
  if (totalPages <= 1) return null;
  const btnClass =
    "size-8 rounded-lg border border-gray-6 bg-gray-1 hover:bg-gray-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-gray-1 flex items-center justify-center transition-colors";
  const textClass = compact
    ? "font-family-dm-sans text-xs text-gray-11 tabular-nums"
    : "font-family-dm-sans text-sm text-gray-11 tabular-nums";
  return (
    <div className="flex items-center justify-center gap-3 px-4 py-3 border-t border-gray-6">
      <button
        type="button"
        className={btnClass}
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        aria-label="Página anterior"
      >
        <ChevronLeft className="size-4 text-gray-11" />
      </button>
      <span className={textClass}>
        {page} / {totalPages}
      </span>
      <button
        type="button"
        className={btnClass}
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        aria-label="Próxima página"
      >
        <ChevronRight className="size-4 text-gray-11" />
      </button>
    </div>
  );
}

function dashboardWeekOverWeekPercent(change: number): number {
  return Math.round(Math.abs(Number(change)));
}

function showDashboardWeekOverWeek(change: number): boolean {
  return dashboardWeekOverWeekPercent(change) !== 0;
}

function periodComparisonLabel(period: string): string | null {
  switch (period) {
    case "24h": return "vs. ontem";
    case "7d": return "vs. semana passada";
    case "15d": return "vs. 15 dias atrás";
    case "1m": return "vs. mês passado";
    case "2m": return "vs. 2 meses atrás";
    default: return null;
  }
}

function DashboardRankingTruncatedLabel({
  text,
  emptyDisplay = "—",
  mobileTapAriaLabel,
  lineClassName,
}: {
  text: string;
  emptyDisplay?: string;
  mobileTapAriaLabel: string;
  lineClassName: string;
}) {
  const [hoverTrigger, setHoverTrigger] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const sync = () => setHoverTrigger(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const display = text.trim() || emptyDisplay;

  return (
    <Tooltip
      key={hoverTrigger ? "md" : "sm"}
      className="block w-full max-w-full min-w-0"
      trigger={hoverTrigger ? "hover" : "click"}
      position="topRight"
      content={
        <p className="font-family-dm-sans font-normal text-sm leading-[1.3] text-gray-12 text-left wrap-break-word">
          {display}
        </p>
      }
      contentClassName="max-w-[min(320px,calc(100vw-2rem))] w-max min-w-0 px-3 py-2 gap-0 !items-stretch"
    >
      {hoverTrigger ? (
        <span className={cn(lineClassName, "block cursor-help")}>{display}</span>
      ) : (
        <button
          type="button"
          className={cn(
            lineClassName,
            "text-left cursor-pointer rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-8"
          )}
          aria-label={mobileTapAriaLabel}
        >
          {display}
        </button>
      )}
    </Tooltip>
  );
}

function DashboardRankingCategoryLabel({ category }: { category: string }) {
  return (
    <DashboardRankingTruncatedLabel
      text={category}
      mobileTapAriaLabel="Toque para ver o nome completo da categoria"
      lineClassName="font-family-dm-sans font-normal text-[14px] leading-[1.3] text-gray-11 overflow-hidden text-ellipsis whitespace-nowrap w-full max-w-full min-w-0"
    />
  );
}

function DashboardRankingTicketNameLabel({
  name,
  size = "md",
}: {
  name: string;
  size?: "md" | "sm";
}) {
  const sizeClass = size === "sm" ? "text-sm" : "text-[14px]";
  return (
    <DashboardRankingTruncatedLabel
      text={name}
      mobileTapAriaLabel="Toque para ver o nome completo do ingresso"
      lineClassName={`font-family-dm-sans font-semibold ${sizeClass} leading-[1.3] text-gray-12 overflow-hidden text-ellipsis whitespace-nowrap w-full max-w-full min-w-0`}
    />
  );
}

export default function EventDashboardPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;
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

  /* Dashboard split em 3 queries independentes via react-query.
   * - `placeholderData: keepPreviousData` (no hook) mantém dados antigos
   *   visíveis durante refetch → zero flash ao paginar.
   * - Cada query tem queryKey por params → paginar só rankings não invalida
   *   overview/secondary.
   * - Cache `staleTime` 30s/60s reaproveita resposta backend (cache Redis 30s/60s).
   * - `useEvent` cobre o eventInfo (mesma queryKey usada por outras pages). */
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

  /* Loading full-screen apenas na 1ª carga (nenhuma das queries tem data ainda).
   * Refetch ao paginar mantém os dados antigos (`keepPreviousData`) — sem flash. */
  const isFirstLoad =
    !overviewQuery.data && !rankingsQuery.data && !secondaryQuery.data;
  const loading =
    overviewQuery.isLoading ||
    rankingsQuery.isLoading ||
    secondaryQuery.isLoading
      ? isFirstLoad
      : false;

  /* Lista "Ingressos de lotes" — derivada do rankings (paginação server-side). */
  const ticketsWithLotsList: FinancialTicket[] = useMemo(() => {
    const raw = rankingsQuery.data?.tickets?.data?.tickets ?? [];
    return mapTicketsToFinancialList(raw.map(formatRawTicket));
  }, [rankingsQuery.data]);
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

  /* `dashboardData` derivada das 3 queries — substitui o `useState` legacy
   * com `setDashboardData` no `loadData`. Mesmo shape pra render não mudar. */
  const dashboardData = useMemo(() => {
    const overview = overviewQuery.data;
    const rankings = rankingsQuery.data;
    const secondary = secondaryQuery.data;

    /* Helper de formatação de labels do chart pra period=geral: a API retorna
     * "mai/26", mapeamos pra "Mai/2026" pra UX consistente com os outros formatos. */
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
        let m = labelStr.match(/^(\w+)\/(\d{2})$/);
        if (m) {
          const name =
            monthMap[m[1].toLowerCase()] ||
            m[1].charAt(0).toUpperCase() + m[1].slice(1);
          return `${name}/${expandYear(m[2])}`;
        }
        m = labelStr.match(/^(\d{1,2})\/(\d{2})$/);
        if (m) {
          const monthNum = parseInt(m[1], 10);
          if (monthNum < 1 || monthNum > 12) return labelStr;
          return `${monthNames[monthNum - 1]}/${expandYear(m[2])}`;
        }
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
      /* Distribuição de vendas por método de pagamento. */
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
      router.push("/admin/login");
      return;
    }

    if (!authChecked) {
      setAuthChecked(true);
    }
  }, [authLoading, isAuthenticated, router]);

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

  const selectedQuestionAnswerRows = useMemo((): { label: string; percentage: number; count: number }[] | undefined => {
    if (!selectedQuestionFromApi?.answersRanking?.length) return undefined;
    return selectedQuestionFromApi.answersRanking.map((a) => ({
      label: a.answer,
      percentage: a.percentage,
      count: a.count,
    }));
  }, [selectedQuestionFromApi]);

  const selectedQuestionIndex = selectedQuestionId
    ? (apiQuestions.length > 0
      ? apiQuestions.findIndex((q) => q.questionId === selectedQuestionId) + 1
      : sortedQuestions.findIndex((q) => q.id === selectedQuestionId) + 1)
    : 0;
  const totalQuestions = apiQuestions.length > 0 ? apiQuestions.length : sortedQuestions.length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-2 flex items-center justify-center">
        <Loading />
      </div>
    );
  }

  const periodOptions = [
    { value: "geral", label: "Geral" },
    { value: "24h", label: "Hoje" },
    { value: "7d", label: "7D" },
    { value: "15d", label: "15D" },
    { value: "1m", label: "1M" },
    { value: "2m", label: "2M" },
  ];

  const getTicketButtonLabel = () => {
    if (selectedTicketIds.length === 0) {
      return "Todos os ingressos";
    }
    if (selectedTicketIds.length === 1) {
      const ticket = tickets.find((t) => t.id === selectedTicketIds[0]);
      return ticket?.name || "1 ingresso selecionado";
    }
    return `${selectedTicketIds.length} ingressos selecionados`;
  };

  return (
    <div className="min-h-screen bg-gray-2">
      <AdminEventHeader
        eventId={eventId}
        eventName={event?.name}
        eventSlug={event?.slug}
      />

      {/* Desktop content */}
      <div className="hidden md:block max-w-7xl mx-auto px-4 lg:px-6 2xl:px-0 py-8">
        {/* Title and Description - conforme Figma */}
        <div className="mb-8 flex flex-col gap-1">
          <h1 className="font-manrope font-bold text-[20px] leading-[1.3] text-gray-12">
            Dashboard
          </h1>
          <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-11">
            Acompanhe o desempenho do seu evento em tempo real
          </p>
        </div>

        {/* Filters - segment + dropdown */}
        <div className="mb-6 flex items-center gap-3 flex-wrap">
          {/* Period Filter - Segment Buttons */}
          <div className="bg-gray-3 flex items-center p-1 rounded-xl h-[48px]">
            {periodOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setPeriodFilter(option.value)}
                className={`px-4 py-2 rounded-xl text-[14px] font-family-dm-sans border transition-all ease-in-out cursor-pointer duration-200 font-medium h-[40px] flex items-center ${periodFilter === option.value
                  ? "bg-gray-1 border-gray-6 text-gray-12"
                  : "text-gray-11 hover:text-gray-12 border-transparent"
                  }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* Ticket Filter Button */}
          <button
            onClick={() => setIsTicketModalOpen(true)}
            className="flex items-center gap-2 px-4 py-3 rounded-xl border border-gray-6 bg-gray-1 text-gray-12 hover:bg-gray-3 transition-colors cursor-pointer min-w-[187px] h-[48px]"
          >
            <span className="text-[14px] font-family-dm-sans font-normal flex-1 text-left">{getTicketButtonLabel()}</span>
            <ArrowButton />
          </button>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-4 gap-3 mb-8 w-full">
          {/* Receita Líquida */}
          <div className="bg-gray-1 border border-gray-6 rounded-xl h-[133px] flex flex-col">
            <div className="flex items-center justify-between px-4 pt-3 pb-2 h-[44px]">
              <p className="font-family-dm-sans font-normal text-[16px] text-gray-11">Receita Líquida</p>
              <div className="w-[28px] h-[28px] p-1 rounded-lg bg-blue-4 flex items-center justify-center">
                <CartIcon className="size-5 text-blue-12" />
              </div>
            </div>
            <div className="px-4 h-[49px] flex items-center">
              <p className="font-manrope font-bold text-[24px] leading-[1.1] text-gray-12">
                R$ {(dashboardData.netRevenue / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            {showDashboardWeekOverWeek(dashboardData.netRevenueChange) && periodComparisonLabel(periodFilter) ? (
              <div className="px-4 pb-3 pt-1 h-[40px] flex items-center gap-2">
                {dashboardData.netRevenueChange >= 0 ? (
                  <ArrowUpIcon className="size-3 text-primary-11" />
                ) : (
                  <ArrowDown className="size-6 text-red-11" />
                )}
                <span className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-primary-11">
                  {dashboardWeekOverWeekPercent(dashboardData.netRevenueChange)}% {periodComparisonLabel(periodFilter)}
                </span>
              </div>
            ) : null}
          </div>

          {/* Ticket Médio */}
          <div className="bg-gray-1 border border-gray-6 rounded-xl h-[133px] flex flex-col">
            <div className="flex items-center justify-between px-4 pt-3 pb-2 h-[44px]">
              <p className="font-family-dm-sans font-normal text-[16px] text-gray-11">Ticket Médio</p>
              <div className="w-[28px] h-[28px] p-1 rounded-lg bg-[#EBE4FF] flex items-center justify-center">
                <DolarIcon className="size-5 text-[#202020]" />
              </div>
            </div>
            <div className="px-4 h-[49px] flex items-center">
              <p className="font-manrope font-bold text-[24px] leading-[1.1] text-gray-12">
                R$ {(dashboardData.averageTicket / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            {showDashboardWeekOverWeek(dashboardData.averageTicketChange) && periodComparisonLabel(periodFilter) ? (
              <div className="px-4 pb-3 pt-1 h-[40px] flex items-center gap-2">
                {dashboardData.averageTicketChange >= 0 ? (
                  <ArrowUpIcon className="size-3 text-primary-11" />
                ) : (
                  <ArrowDown className="size-6 text-red-11" />
                )}
                <span className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-primary-11">
                  {dashboardWeekOverWeekPercent(dashboardData.averageTicketChange)}% {periodComparisonLabel(periodFilter)}
                </span>
              </div>
            ) : null}
          </div>

          {/* Inscrições Confirmadas */}
          <div className="bg-gray-1 border border-gray-6 rounded-xl h-[133px] flex flex-col">
            <div className="flex items-center justify-between px-4 pt-3 pb-2 h-[44px]">
              <p className="font-family-dm-sans font-normal text-[16px] text-gray-11">Inscrições Confirmadas</p>
              <div className="w-[28px] h-[28px] p-1 rounded-lg bg-primary-4 flex items-center justify-center">
                <CheckIcon className="size-5 text-gray-12" />
              </div>
            </div>
            <div className="px-4 h-[49px] flex items-center">
              <p className="font-manrope font-bold text-[24px] leading-[1.1] text-gray-12">
                {dashboardData.totalRegistrations.toLocaleString("pt-BR")}
              </p>
            </div>
            {showDashboardWeekOverWeek(dashboardData.totalRegistrationsChange) && periodComparisonLabel(periodFilter) ? (
              <div className="px-4 pb-3 pt-1 h-[40px] flex items-center gap-2">
                {dashboardData.totalRegistrationsChange >= 0 ? (
                  <ArrowUpIcon className="size-3 text-primary-11" />
                ) : (
                  <ArrowDown className="size-6 text-red-11" />
                )}
                <span className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-primary-11">
                  {dashboardWeekOverWeekPercent(dashboardData.totalRegistrationsChange)}% {periodComparisonLabel(periodFilter)}
                </span>
              </div>
            ) : null}
          </div>

          {/* Cancelamentos */}
          <div className="bg-gray-1 border border-gray-6 rounded-xl h-[133px] flex flex-col">
            <div className="flex items-center justify-between px-4 pt-3 pb-2 h-[44px]">
              <p className="font-family-dm-sans font-normal text-[16px] text-gray-11">Cancelamentos</p>
              <div className="w-[28px] h-[28px] p-1 rounded-lg bg-red-4 flex items-center justify-center">
                <XCircle className="size-5 text-red-12" />
              </div>
            </div>
            <div className="flex-1 flex">
              <div className="flex-1 flex flex-col border-r border-gray-6">
                <div className="px-4 pt-4 pb-3 h-[49px] flex items-start">
                  <p className="font-manrope font-bold text-[24px] leading-[1.1] text-gray-12">
                    {dashboardData.cancellations}
                  </p>
                </div>
                <div className="px-4 pb-3 pt-1 flex-1 flex items-center">
                  <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-11">
                    Cancelados
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="flex gap-3 mb-8 w-full">
          {/* Tendência de Inscrições */}
          <div className="bg-gray-1 border border-gray-6 rounded-xl p-4 w-3/4">
            <div className="mb-4">
              <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-11">Tendência de inscrições</p>
            </div>
            <div className="flex items-center gap-3 mb-4">
              <p className="font-manrope font-bold text-[24px] leading-[1.1] text-gray-12">
                R$ {(dashboardData.registrationsTrend.amount / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              {showDashboardWeekOverWeek(dashboardData.registrationsTrend.change) && periodComparisonLabel(periodFilter) ? (
                <div className="flex items-center gap-1">
                  {dashboardData.registrationsTrend.change >= 0 ? (
                    <ArrowUpIcon className="size-3 text-primary-11" />
                  ) : (
                    <ArrowDown className="size-6 text-red-11" />
                  )}
                  <span className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-primary-11">
                    {dashboardWeekOverWeekPercent(dashboardData.registrationsTrend.change)}% {periodComparisonLabel(periodFilter)}
                  </span>
                </div>
              ) : null}
            </div>
            <RevenueChart
              data={{
                labels: dashboardData.registrationsTrend.chartData?.labels ?? [],
                revenue: dashboardData.registrationsTrend.chartData?.revenue?.map((val: number) => val / 100) ?? [],
                dailyData: dashboardData.registrationsTrend.chartData?.dailyData,
              }}
            />
          </div>

          {/* Ranking de Ingressos */}
          <div className="bg-gray-1 border border-gray-6 rounded-xl">
            <div className="px-4 py-5 border-b border-gray-6 flex items-center justify-between">
              <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-11">Ranking de ingressos</p>
            </div>
            <div>
              {/* Header */}
              <div className="grid grid-cols-[199px_81px_112px] border-b border-gray-6 bg-gray-4">
                <div className="px-4 py-4">
                  <p className="font-inter font-medium text-[14px] leading-[1.3] text-gray-12">Nome</p>
                </div>
                <div className="px-4 py-4 flex items-center justify-center">
                  <p className="font-inter font-medium text-[14px] leading-[1.3] text-gray-12">Qt</p>
                </div>
                <div className="px-4 py-4 flex items-center justify-end">
                  <p className="font-inter font-medium text-[14px] leading-[1.3] text-gray-12">Total</p>
                </div>
              </div>
              {/* Rows */}
              {paginatedTicketRanking.map((ticket, index) => (
                <div
                  key={ticketRankingSliceStart + index}
                  className="grid grid-cols-[199px_81px_112px] border-b border-gray-6 last:border-b-0 bg-gray-1"
                >
                  <div className="px-4 py-3 flex flex-col gap-2 justify-center">
                    <DashboardRankingCategoryLabel category={ticket.category} />
                    <DashboardRankingTicketNameLabel name={ticket.name} />
                  </div>
                  <div className="px-4 py-3 flex items-center justify-center">
                    <p className="font-inter font-semibold text-[14px] leading-[1.3] text-gray-12">{ticket.quantity.toLocaleString("pt-BR")}</p>
                  </div>
                  <div className="px-4 py-3 flex items-center justify-end">
                    <p className="font-inter font-semibold text-[14px] leading-[1.3] text-gray-12">
                      R$ {(ticket.total / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <LotsNearDepletionPaginationBar
              page={ticketRankingPage}
              totalPages={ticketRankingTotalPages}
              onPageChange={setTicketRankingPage}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-8 w-full">
          <div className="min-h-[311px]">
            <SalesByPaymentMethod data={dashboardData.salesByPaymentMethod} />
          </div>
          <div className="min-h-[311px]">
            <QuestionsListing
              items={questionsListing}
              onItemClick={(item) => {
                setSelectedQuestionId(item.id);
              }}
            />
          </div>
        </div>

        <QuestionDetailsDrawer
          isOpen={!!selectedQuestionId}
          onClose={() => setSelectedQuestionId(null)}
          question={selectedQuestion}
          questionIndex={selectedQuestionIndex}
          totalQuestions={totalQuestions}
          answerRows={selectedQuestionAnswerRows}
          textAnswerRows={textAnswerRows}
          textAnswersLoading={textAnswersLoading}
          totalParticipants={selectedQuestionFromApi?.participantCount ?? 0}
          responseRate={
            dashboardData.totalRegistrations > 0 && selectedQuestionFromApi
              ? Math.round((selectedQuestionFromApi.participantCount / dashboardData.totalRegistrations) * 100)
              : undefined
          }
          onPrevious={
            selectedQuestionIndex > 1
              ? () => {
                if (apiQuestions.length > 0) {
                  const prev = apiQuestions[selectedQuestionIndex - 2];
                  if (prev) setSelectedQuestionId(prev.questionId);
                } else {
                  const prev = sortedQuestions[selectedQuestionIndex - 2];
                  if (prev) setSelectedQuestionId(prev.id);
                }
              }
              : undefined
          }
          onNext={
            selectedQuestionIndex < totalQuestions && totalQuestions > 0
              ? () => {
                if (apiQuestions.length > 0) {
                  const next = apiQuestions[selectedQuestionIndex];
                  if (next) setSelectedQuestionId(next.questionId);
                } else {
                  const next = sortedQuestions[selectedQuestionIndex];
                  if (next) setSelectedQuestionId(next.id);
                }
              }
              : undefined
          }
        />

        <ProductDetailsDrawer
          isOpen={!!selectedProductName}
          onClose={() => setSelectedProductName(null)}
          productName={selectedProductName ?? ""}
          productImageUrl={selectedProductFromApi?.productImage ?? undefined}
          productIndex={selectedProductIndex}
          totalProducts={totalProducts}
          quantitySold={selectedProductQuantitySold}
          totalStock={selectedProductTotalStock}
          totalRevenue={selectedProductTotalRevenueLabel}
          variationRows={selectedProductVariations}
          onPrevious={
            selectedProductIndex > 1
              ? () => setSelectedProductName(uniqueProductNames[selectedProductIndex - 2] ?? null)
              : undefined
          }
          onNext={
            selectedProductIndex < totalProducts && totalProducts > 0
              ? () => setSelectedProductName(uniqueProductNames[selectedProductIndex] ?? null)
              : undefined
          }
        />


        {/* Bottom Section */}
        <div className="grid grid-cols-[392px_1fr] gap-3 w-full">
          {/* Ingressos Próximos de Esgotamento */}
          <div className="bg-gray-1 border border-gray-6 rounded-xl">
            <div className="px-4 py-5 border-b border-gray-6 flex items-center justify-between">
              <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-11">Ingressos próximos de esgotamento</p>
            </div>
            <div>
              {paginatedLotsNearDepletion.map((lot, index) => {
                const globalIndex = lotsNearDepletionSliceStart + index;
                const percentage = lot.percentageSold;
                const getStatusColor = (status: string) => {
                  if (status === "Crítico") return "bg-red-11";
                  if (status === "Atenção") return "bg-yellow-11";
                  return "bg-gray-11";
                };
                return (
                  <div key={`${globalIndex}-${lot.name}`} className="px-4 py-2 border-b border-gray-6 last:border-b-0">
                    <div className="flex-1 min-w-0 mb-3">
                      <DashboardRankingTicketNameLabel name={`${lot.name}`} />
                    </div>
                    <div className="mb-3">
                      <div className="relative h-3 bg-gray-6 rounded-full overflow-hidden">
                        <div
                          className={`absolute left-0 top-0 h-full rounded-full ${getStatusColor(lot.status)}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className={`px-2 py-1 rounded ${getStatusColor(lot.status)} text-sm font-family-dm-sans font-normal text-gray-1 shrink-0`}>
                        {lot.status}
                      </div>
                      <div>
                        <span className="font-family-dm-sans font-normal text-sm leading-[1.3] text-gray-11">Lote atual: </span>
                        <span className="font-family-dm-sans font-semibold text-sm leading-[1.3] text-gray-12">{lot.activeBatch?.label ?? "—"}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <LotsNearDepletionPaginationBar
              page={lotsNearDepletionPage}
              totalPages={lotsNearDepletionTotalPages}
              onPageChange={setLotsNearDepletionPage}
            />
          </div>

          {/* Heatmap de Dias e Horários */}
          <div className="bg-gray-1 border border-gray-6 rounded-xl">
            <SalesHeatmap data={dashboardData.salesHeatmap} />
          </div>
        </div>

        {/* Cities Section */}
        <div className="grid grid-cols-2 gap-3 mt-8 w-full">
          {dashboardData.topCities.map((city, index) => {
            const isFirst = index === 0;
            return (
              <div
                key={index}
                className={`${isFirst ? "bg-primary-2 border-primary-6" : "bg-blue-2 border-blue-6"} border rounded-lg p-3`}
              >
                <div className={`inline-block px-2 py-1 rounded text-[14px] font-family-dm-sans font-medium mb-2 ${isFirst ? "bg-primary-5 text-primary-12" : "bg-blue-5 text-blue-12"}`}>
                  {isFirst ? "1º Cidade com mais vendas" : "2º Cidade com mais vendas"}
                </div>
                <p className="font-family-dm-sans font-semibold text-[16px] text-gray-12 mb-2">{city.city}</p>
                <p className="font-family-dm-sans font-normal text-[14px] text-gray-11">
                  QT de compradores: <span className="font-family-dm-sans font-semibold text-[14px] leading-[1.3] text-gray-12">{city.participants}</span>
                </p>
              </div>
            )
          })}
        </div>

        {/* Ingressos de lotes — desktop (componente compartilhado com financeiro). */}
        <div className="mt-8 w-full">
          <TicketsWithLotsList
            tickets={ticketsWithLotsList}
            expandedRows={ticketsWithLotsExpanded}
            onToggleRow={toggleTicketsWithLotsRow}
            page={ticketsWithLotsPage}
            totalPages={ticketsWithLotsTotalPages}
            onPageChange={setTicketsWithLotsPage}
          />
        </div>
      </div>

      {/* Mobile content (Figma) */}
      <div className="md:hidden max-w-7xl mx-auto px-4 pb-8">
        <div className="mb-5 mt-4">
          <h1 className="font-manrope font-bold text-xl leading-[1.1] text-gray-12 mb-1">
            Dashboard
          </h1>
          <p className="font-family-dm-sans font-normal text-base leading-[1.3] text-gray-11">
            Acompanhe o desempenho do seu evento em tempo real
          </p>
        </div>

        {/* Period + ticket filter */}
        <div className="flex flex-col gap-3 mb-5">
          <div className="bg-gray-3 flex items-center p-1 rounded-xl h-12 overflow-x-auto [&::-webkit-scrollbar]:hidden">
            {periodOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setPeriodFilter(option.value)}
                className={`shrink-0 px-4 py-2 rounded-xl text-sm font-family-dm-sans font-medium border transition-all cursor-pointer h-10 flex items-center ${periodFilter === option.value ? "bg-gray-1 border-gray-6 text-gray-12" : "text-gray-11 hover:text-gray-12 border-transparent"}`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setIsTicketModalOpen(true)}
            className="flex items-center gap-2 px-4 py-3 rounded-xl border border-gray-6 bg-gray-1 text-gray-12 hover:bg-gray-3 transition-colors cursor-pointer w-full h-12"
          >
            <span className="text-sm font-family-dm-sans font-normal flex-1 text-left truncate">{getTicketButtonLabel()}</span>
            <ArrowButton />
          </button>
        </div>

        {/* 2x2 metric cards */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-gray-1 border border-gray-6 rounded-xl flex flex-col min-h-[143px]">
            <div className="flex items-center justify-between px-3 pt-3 pb-2">
              <p className="font-family-dm-sans font-normal text-base text-gray-11">Receita Líquida</p>
              <div className="w-7 h-7 p-1 rounded-lg bg-blue-4 flex items-center justify-center shrink-0">
                <CartIcon className="size-5 text-blue-12" />
              </div>
            </div>
            <div className="px-3 flex-1 flex items-center">
              <p className="font-manrope font-bold text-xl leading-[1.1] text-gray-12">
                R$ {(dashboardData.netRevenue / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            {showDashboardWeekOverWeek(dashboardData.netRevenueChange) && periodComparisonLabel(periodFilter) ? (
              <div className="px-3 pb-3 pt-1 flex items-center gap-2">
                {dashboardData.netRevenueChange >= 0 ? <ArrowUpIcon className="size-3 text-primary-11" /> : <ArrowDown className="size-4 text-red-11" />}
                <span className="font-family-dm-sans font-normal text-sm text-primary-11">
                  {dashboardWeekOverWeekPercent(dashboardData.netRevenueChange)}% {periodComparisonLabel(periodFilter)}
                </span>
              </div>
            ) : null}
          </div>
          <div className="bg-gray-1 border border-gray-6 rounded-xl flex flex-col min-h-[143px]">
            <div className="flex items-center justify-between px-3 pt-3 pb-2">
              <p className="font-family-dm-sans font-normal text-base text-gray-11">Ticket Médio</p>
              <div className="w-7 h-7 p-1 rounded-lg bg-primary-4 flex items-center justify-center shrink-0">
                <CheckIcon className="size-5 text-gray-12" />
              </div>
            </div>
            <div className="px-3 flex-1 flex items-center">
              <p className="font-manrope font-bold text-xl leading-[1.1] text-gray-12">
                R$ {(dashboardData.averageTicket / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            {showDashboardWeekOverWeek(dashboardData.averageTicketChange) && periodComparisonLabel(periodFilter) ? (
              <div className="px-3 pb-3 pt-1 flex items-center gap-2">
                {dashboardData.averageTicketChange >= 0 ? <ArrowUpIcon className="size-3 text-primary-11" /> : <ArrowDown className="size-4 text-red-11" />}
                <span className="font-family-dm-sans font-normal text-sm text-primary-11">
                  {dashboardWeekOverWeekPercent(dashboardData.averageTicketChange)}% {periodComparisonLabel(periodFilter)}
                </span>
              </div>
            ) : null}
          </div>
          <div className="bg-gray-1 border border-gray-6 rounded-xl flex flex-col min-h-[143px]">
            <div className="flex items-center justify-between px-3 pt-3 pb-2">
              <p className="font-family-dm-sans font-normal text-base text-gray-11">Inscrições Confirmadas</p>
              <div className="w-7 h-7 p-1 rounded-lg bg-[#EBE4FF] flex items-center justify-center shrink-0">
                <DolarIcon className="size-5 text-gray-12" />
              </div>
            </div>
            <div className="px-3 flex-1 flex items-center">
              <p className="font-manrope font-bold text-xl leading-[1.1] text-gray-12">
                {dashboardData.totalRegistrations.toLocaleString("pt-BR")}
              </p>
            </div>
            {showDashboardWeekOverWeek(dashboardData.totalRegistrationsChange) && periodComparisonLabel(periodFilter) ? (
              <div className="px-3 pb-3 pt-1 flex items-center gap-2">
                {dashboardData.totalRegistrationsChange >= 0 ? <ArrowUpIcon className="size-3 text-primary-11" /> : <ArrowDown className="size-4 text-red-11" />}
                <span className="font-family-dm-sans font-normal text-sm text-primary-11">
                  {dashboardWeekOverWeekPercent(dashboardData.totalRegistrationsChange)}% {periodComparisonLabel(periodFilter)}
                </span>
              </div>
            ) : null}
          </div>
          <div className="bg-gray-1 border border-gray-6 rounded-xl flex flex-col min-h-[171px]">
            <div className="flex items-center justify-between px-3 pt-3 pb-2">
              <p className="font-family-dm-sans font-normal text-base text-gray-11 leading-tight">Cancelamentos</p>
              <div className="w-7 h-7 p-1 rounded-lg bg-red-4 flex items-center justify-center shrink-0">
                <XCircle className="size-5 text-red-12" />
              </div>
            </div>
            <div className="flex-1 flex">
              <div className="flex-1 flex flex-col justify-center py-3 px-3 border-r border-gray-6">
                <p className="font-manrope font-bold text-xl leading-[1.1] text-gray-12">{dashboardData.cancellations}</p>
                <p className="font-family-dm-sans font-normal text-sm text-gray-11 mt-1">Cancelados</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tendência de inscrições - chart */}
        <div className="bg-gray-1 border border-gray-6 rounded-xl p-4 mb-6">
          <p className="font-family-dm-sans font-normal text-base text-gray-11 mb-2">Tendência de inscrições</p>
          <div className="flex items-center gap-2 mb-4">
            <p className="font-manrope font-bold text-xl leading-[1.1] text-gray-12">
              R$ {(dashboardData.registrationsTrend.amount / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            {showDashboardWeekOverWeek(dashboardData.registrationsTrend.change) && periodComparisonLabel(periodFilter) ? (
              <div className="flex items-center gap-1">
                {dashboardData.registrationsTrend.change >= 0 ? <ArrowUpIcon className="size-3 text-primary-11" /> : <ArrowDown className="size-4 text-red-11" />}
                <span className="font-family-dm-sans font-normal text-sm text-primary-11">
                  {dashboardWeekOverWeekPercent(dashboardData.registrationsTrend.change)}% {periodComparisonLabel(periodFilter)}
                </span>
              </div>
            ) : null}
          </div>
          <div className="min-h-0 w-full">
            <RevenueChart
              data={{
                labels: dashboardData.registrationsTrend.chartData?.labels ?? [],
                revenue: dashboardData.registrationsTrend.chartData?.revenue?.map((val: number) => val / 100) ?? [],
                dailyData: dashboardData.registrationsTrend.chartData?.dailyData,
              }}
            />
          </div>
        </div>

        {/* Ranking de ingressos - mobile list */}
        <div className="bg-gray-1 border border-gray-6 rounded-xl mb-6">
          <div className="px-4 py-3 border-b border-gray-6 flex items-center justify-between">
            <p className="font-family-dm-sans font-normal text-base text-gray-11">Ranking de ingressos</p>
          </div>
          <div className="divide-y divide-gray-6">
            {paginatedTicketRanking.map((ticket, index) => (
              <div key={ticketRankingSliceStart + index} className="px-4 py-3 flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <DashboardRankingCategoryLabel category={ticket.category} />
                  <DashboardRankingTicketNameLabel name={ticket.name} size="sm" />
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <p className="font-inter font-semibold text-sm text-gray-12">{ticket.quantity.toLocaleString("pt-BR")}</p>
                  <p className="font-inter font-semibold text-sm text-gray-12">
                    R$ {(ticket.total / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <LotsNearDepletionPaginationBar
            page={ticketRankingPage}
            totalPages={ticketRankingTotalPages}
            onPageChange={setTicketRankingPage}
            compact
          />
        </div>

        {/* Vendas por forma de pagamento — mobile */}
        <div className="mb-6">
          <SalesByPaymentMethod data={dashboardData.salesByPaymentMethod} />
        </div>

        {/* Perguntas - mobile */}
        <div className="mb-6">
          <QuestionsListing
            items={questionsListing}
            onItemClick={(item) => setSelectedQuestionId(item.id)}
          />
        </div>

        {/* Ingressos próximos de esgotamento - mobile */}
        <div className="bg-gray-1 border border-gray-6 rounded-xl mb-6">
          <div className="px-4 py-3 border-b border-gray-6">
            <p className="font-family-dm-sans font-normal text-base text-gray-11">Ingressos próximos de esgotamento</p>
          </div>
          <div className="divide-y divide-gray-6">
            {paginatedLotsNearDepletion.map((lot, index) => {
              const globalIndex = lotsNearDepletionSliceStart + index;
              const percentage = (lot.sold / lot.total) * 100;
              const getStatusColor = (status: string) => {
                if (status === "Crítico") return "bg-red-11";
                if (status === "Atenção") return "bg-yellow-11";
                return "bg-gray-11";
              };
              return (
                <div key={`${globalIndex}-${lot.name}`} className="px-4 py-3">
                  <div className="flex items-center justify-between mb-2 gap-2 min-w-0">
                    <div className="flex-1 min-w-0">
                      <DashboardRankingTicketNameLabel name={lot.name} size="sm" />
                    </div>
                    <span className={`px-2 py-0.5 rounded text-xs font-family-dm-sans text-gray-1 shrink-0 ${getStatusColor(lot.status)}`}>{lot.status}</span>
                  </div>
                  <div className="h-2 bg-gray-6 rounded-full overflow-hidden mb-2">
                    <div className={`h-full rounded-full ${getStatusColor(lot.status)}`} style={{ width: `${percentage}%` }} />
                  </div>
                  <div className="flex justify-between text-sm text-gray-11">
                    <span>Status: <span className="font-semibold text-gray-12">{lot.status}</span></span>
                    <span>Lote atual: <span className="font-semibold text-gray-12">{lot.activeBatch?.label ?? "—"}</span></span>
                  </div>
                </div>
              );
            })}
          </div>
          <LotsNearDepletionPaginationBar
            page={lotsNearDepletionPage}
            totalPages={lotsNearDepletionTotalPages}
            onPageChange={setLotsNearDepletionPage}
            compact
          />
        </div>

        {/* Heatmap - mobile */}
        <div className="bg-gray-1 border border-gray-6 rounded-xl mb-6 overflow-hidden">
          <SalesHeatmap data={dashboardData.salesHeatmap} />
        </div>

        {/* Cidades - mobile */}
        <div className="grid grid-cols-1 gap-3">
          {dashboardData.topCities.map((city, index) => {
            const isFirst = index === 0;
            return (
              <div
                key={index}
                className={`${isFirst ? "bg-primary-2 border-primary-6" : "bg-blue-2 border-blue-6"} border rounded-xl p-3`}
              >
                <div className={`inline-block px-2 py-1 rounded text-sm font-family-dm-sans font-medium mb-2 ${isFirst ? "bg-primary-5 text-primary-12" : "bg-blue-5 text-blue-12"}`}>
                  {isFirst ? "1º Cidade com mais vendas" : "2º Cidade com mais vendas"}
                </div>
                <p className="font-family-dm-sans font-semibold text-base text-gray-12 mb-1">{city.city}</p>
                <p className="font-family-dm-sans font-normal text-sm text-gray-11">
                  QT de compradores: <span className="font-semibold text-gray-12">{city.participants}</span>
                </p>
              </div>
            );
          })}
        </div>

        {/* Ingressos de lotes - mobile (componente compartilhado com financeiro). */}
        <div className="mt-6">
          <TicketsWithLotsList
            tickets={ticketsWithLotsList}
            expandedRows={ticketsWithLotsExpanded}
            onToggleRow={toggleTicketsWithLotsRow}
            page={ticketsWithLotsPage}
            totalPages={ticketsWithLotsTotalPages}
            onPageChange={setTicketsWithLotsPage}
          />
        </div>
      </div>

      {/* Modal de seleção de ingressos */}
      <SelectTicketsFilterModal
        isOpen={isTicketModalOpen}
        onClose={() => setIsTicketModalOpen(false)}
        onConfirm={(ids) => setSelectedTicketIds(ids)}
        eventId={eventId}
        selectedTicketIds={selectedTicketIds}
      />
    </div>
  );
}
