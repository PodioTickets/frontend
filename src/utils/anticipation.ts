/**
 * Espelho FRONTEND do motor de antecipação do backend
 * (`server/src/app/repasse/anticipation-engine.ts`) — mesma conta, para a prévia
 * AO VIVO no modal (recomendado/taxa conforme o usuário digita). O backend é a
 * verdade (recalcula no request); aqui é só UX. Regras em `frontend/adiantamento.md`.
 */

export interface AnticipationUnit {
  unitId: string;
  orderId: string;
  paymentId: string;
  installmentNumber: number | null;
  gross: number; // centavos
  daysUntilRelease: number;
}

export interface AnticipationQuote {
  /** Antecipação habilitada para a organização (admin liga por org; default false).
   *  `false` → cotação zerada; o modal exibe "não habilitada". Ausente = legado (trata como true). */
  enabled?: boolean;
  /** Total antecipável BRUTO (Σ unidades) — "Valor disponível". */
  availableTotal: number;
  /** Compat legado (== availableTotal). */
  anticipatableTotal?: number;
  /** Líquido máximo se antecipar tudo — teto do que o organizador recebe hoje. */
  maxReceivable: number;
  /** Taxa mensal da organização (fração; 0.1 = 10%). */
  monthlyRate: number;
  units: AnticipationUnit[];
}

export interface AnticipationResult {
  consumedUnitIds: string[];
  consumedGross: number;
  realCost: number;
  recommendedNet: number;
  receive: number;
  effectiveFee: number;
  effectiveRatePct: number;
}

/** Custo (centavos) de antecipar UMA unidade agora. */
export function unitCost(gross: number, daysUntilRelease: number, monthlyRate: number): number {
  return Math.round(gross * monthlyRate * (daysUntilRelease / 30));
}

/** Ordena do MAIS BARATO (menos dias) ao mais caro; desempata por gross. */
function sortCheapestFirst(units: AnticipationUnit[]): AnticipationUnit[] {
  return [...units].sort(
    (a, b) => a.daysUntilRelease - b.daysUntilRelease || a.gross - b.gross,
  );
}

/**
 * Calcula a antecipação para RECEBER `requestedNet` (líquido) consumindo as
 * unidades mais baratas por INTEIRO. Idêntico ao backend.
 */
export function computeAnticipation(
  units: AnticipationUnit[],
  requestedNet: number,
  monthlyRate: number,
): AnticipationResult {
  const empty: AnticipationResult = {
    consumedUnitIds: [],
    consumedGross: 0,
    realCost: 0,
    recommendedNet: 0,
    receive: 0,
    effectiveFee: 0,
    effectiveRatePct: 0,
  };
  if (requestedNet <= 0 || units.length === 0) return empty;

  const sorted = sortCheapestFirst(units);
  let cumGross = 0;
  let cumCost = 0;
  const consumed: string[] = [];
  for (const u of sorted) {
    cumGross += u.gross;
    cumCost += unitCost(u.gross, u.daysUntilRelease, monthlyRate);
    consumed.push(u.unitId);
    if (cumGross - cumCost >= requestedNet) break;
  }

  const recommendedNet = cumGross - cumCost;
  const receive = Math.max(0, Math.min(requestedNet, recommendedNet));
  const effectiveFee = cumGross - receive;
  const effectiveRatePct = cumGross > 0 ? (effectiveFee / cumGross) * 100 : 0;

  return {
    consumedUnitIds: consumed,
    consumedGross: cumGross,
    realCost: cumCost,
    recommendedNet,
    receive,
    effectiveFee,
    effectiveRatePct,
  };
}
