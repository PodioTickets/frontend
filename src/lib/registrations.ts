import type { LucideIcon } from "lucide-react";
import { CheckCircle, XCircle } from "lucide-react";
import type {
  Registration,
  RegistrationStats,
} from "@/services/organizer/OrganizerService";

/**
 * Lógica pura compartilhada das páginas de inscrições (registrations).
 *
 * Antes vivia DUPLICADA byte a byte entre
 * `app/admin/.../registrations/page.tsx` e a mesma de `organizer/...`.
 * Centralizar aqui mantém a única fonte de verdade e permite testar a lógica
 * isoladamente (sem montar a página inteira).
 */

export const REG_API_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "CANCELLED",
  "COMPLETED",
  "CHARGEBACK",
  "REFUNDED",
] as const;

export type RegistrationApiStatus = (typeof REG_API_STATUSES)[number];

export function toRegistrationApiStatus(
  s: string,
): RegistrationApiStatus | undefined {
  return (REG_API_STATUSES as readonly string[]).includes(s)
    ? (s as RegistrationApiStatus)
    : undefined;
}

/** Inscrição na listagem (API pode incluir order/payment, ticket agregado e user estendido). */
export type RegistrationListRow = Omit<Registration, "user"> & {
  user: Registration["user"] & { cpf?: string; avatarUrl?: string };
  ticketId?: string;
  createdAt?: string;
  ticket?: {
    name?: string;
    price?: number;
    total?: number;
    category?: { name?: string };
  };
  order?: {
    id?: string;
    finalAmount: number;
    payment?: {
      status?: string;
      metadata?: unknown;
      refundType?: string;
    };
  };
};

export function normalizeRegistrationStats(raw: unknown): RegistrationStats {
  if (!raw || typeof raw !== "object") {
    return { total: 0, paid: 0, cancelled: 0, totalCollected: 0, refunded: 0, refundedChange: 0 };
  }
  const r = raw as Record<string, unknown>;
  const nested = r.weekOverWeek ?? r.week_over_week;
  const src: Record<string, unknown> =
    nested && typeof nested === "object"
      ? { ...r, ...(nested as Record<string, unknown>) }
      : r;
  const optNum = (v: unknown): number | undefined => {
    if (typeof v === "number" && !Number.isNaN(v)) return v;
    if (typeof v === "string" && v.trim() !== "") {
      const n = Number(v);
      return Number.isNaN(n) ? undefined : n;
    }
    return undefined;
  };
  return {
    total: Number(src.total) || 0,
    paid: Number(src.paid) || 0,
    cancelled: Number(src.cancelled) || 0,
    totalCollected: Number(src.totalCollected ?? src.total_collected) || 0,
    totalChange: optNum(src.totalChange ?? src.total_change),
    paidChange: optNum(src.paidChange ?? src.paid_change),
    refunded: optNum(src.refunded) || 0,
    refundedChange: optNum(src.refundedChange) || 0,
    cancelledChange: optNum(src.cancelledChange ?? src.cancelled_change),
    totalCollectedChange: optNum(
      src.totalCollectedChange ?? src.total_collected_change,
    ),
  };
}

/** Mescla totais da listagem com variação semanal do endpoint de stats, se a lista não enviar *Change. */
export function mergeRegistrationStatsWithTrendFallback(
  listStats: unknown,
  aggregateStats: RegistrationStats | null,
): RegistrationStats {
  const a = normalizeRegistrationStats(listStats);
  if (!aggregateStats) return a;
  const b = normalizeRegistrationStats(aggregateStats);
  return {
    ...a,
    totalChange: a.totalChange ?? b.totalChange,
    paidChange: a.paidChange ?? b.paidChange,
    cancelledChange: a.cancelledChange ?? b.cancelledChange,
    totalCollectedChange: a.totalCollectedChange ?? b.totalCollectedChange,
  };
}

/**
 * Valor já em % (ex.: 12,3). Variações entre 0 e 0,5 arredondavam a 0 e sumiam — usa mínimo 1%.
 * Não trata fração 0–1 (ex.: 0,15 = 15%); nesse caso o backend deve enviar 15 ou o endpoint /stats.
 */
export function registrationsWeekOverWeekPercent(change: number): number {
  const n = Number(change);
  if (!Number.isFinite(n) || Math.abs(n) < 1e-12) return 0;
  const a = Math.abs(n);
  const rounded = Math.round(a);
  if (rounded !== 0) return rounded;
  return 1;
}

/** Status final de um registro (resolve estorno/chargeback sobre o status base). */
export function getFinalStatus(registration: RegistrationListRow): string {
  const paymentStatus = registration.order?.payment?.status;
  const registrationStatus = registration.status;
  const paymentMetadata = registration.order?.payment?.metadata;
  const refundType = registration.order?.payment?.refundType;

  return paymentMetadata && refundType
    ? refundType === "REFUND" ? "REFUNDED" : refundType === "CHARGEBACK" ? "CHARGEBACK" : refundType
    : paymentStatus === "REFUNDED" || paymentStatus === "CHARGEBACK"
      ? paymentStatus
      : registrationStatus;
}

export interface RegistrationStatusBadge {
  label: string;
  className: string;
  icon: LucideIcon;
}

/** Badge visual (label + classes + ícone) para um status de inscrição. */
export function getRegistrationStatusBadge(status: string): RegistrationStatusBadge {
  const statusMap: Record<string, RegistrationStatusBadge> = {
    CONFIRMED: {
      label: "Pago",
      className: "bg-green-10/20 text-green-11",
      icon: CheckCircle,
    },
    CANCELLED: {
      label: "Cancelada",
      className: "bg-red-10/20 text-red-11",
      icon: XCircle,
    },
    COMPLETED: {
      label: "Pago",
      className: "bg-blue-10/20 text-blue-11",
      icon: CheckCircle,
    },
    CHARGEBACK: {
      label: "ChargeBack",
      className: "bg-red-10 text-red-11",
      icon: XCircle,
    },
    REFUNDED: {
      label: "Estornado",
      className: "bg-red-10 text-red-11",
      icon: XCircle,
    },
    PENDING: {
      label: "Pendente",
      className: "bg-yellow-10/20 text-yellow-11",
      icon: XCircle,
    },
  };
  return statusMap[status] || statusMap.PENDING || {
    label: "Desconhecido",
    className: "bg-gray-10/20 text-gray-11",
    icon: XCircle,
  };
}
