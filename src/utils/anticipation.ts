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

/** Unidade com custo/líquido pré-computados (líquido = gross − custo). */
interface PricedUnit extends AnticipationUnit {
  cost: number;
  net: number;
}

function priceUnits(units: AnticipationUnit[], monthlyRate: number): PricedUnit[] {
  return units.map((u) => {
    const cost = unitCost(u.gross, u.daysUntilRelease, monthlyRate);
    return { ...u, cost, net: u.gross - cost };
  });
}

/** Orçamento de OPERAÇÕES da DP (n × estados). Acima disso a DP ESCALA a resolução
 *  do líquido (near-ótimo, nunca subcobre) p/ manter tempo/memória limitados. */
const DP_OP_BUDGET = 20_000_000;
/** Até este nº de unidades, força bruta EXATA (2^n) — evita alocar arrays grandes. */
const BRUTE_MAX_N = 16;

/** Monta {ids,gross,cost} na ordem de entrada a partir de um predicado de escolha. */
function collectPicked(
  units: PricedUnit[],
  isPicked: (idx: number) => boolean,
): { ids: string[]; gross: number; cost: number } {
  const ids: string[] = [];
  let gross = 0;
  let cost = 0;
  for (let idx = 0; idx < units.length; idx++) {
    if (!isPicked(idx)) continue;
    ids.push(units[idx].unitId);
    gross += units[idx].gross;
    cost += units[idx].cost;
  }
  return { ids, gross, cost };
}

/**
 * NÚCLEO da otimização: dentre TODOS os recebíveis, escolhe o subconjunto que
 * minimiza o GROSS consumido com `líquido ≥ requestedNet` — a MENOR taxa efetiva
 * para receber o valor pedido (a sobra vira taxa). Desempate: menor `recommendedNet`
 * (recomendado + colado no valor digitado). Subset-sum (knapsack) por unidades
 * INTEIRAS. Idêntico ao backend (anticipation-engine.ts).
 */
function minGrossSubsetForNet(
  units: PricedUnit[],
  requestedNet: number,
): { ids: string[]; gross: number; cost: number } {
  if (requestedNet <= 0) return { ids: [], gross: 0, cost: 0 };
  return units.length <= BRUTE_MAX_N
    ? bruteMinGross(units, requestedNet)
    : dpMinGross(units, requestedNet);
}

/** Força bruta exata (2^n): menor (gross, depois líquido) com líquido ≥ X. */
function bruteMinGross(
  units: PricedUnit[],
  X: number,
): { ids: string[]; gross: number; cost: number } {
  const n = units.length;
  const limit = 1 << n;
  let bestGross = Number.POSITIVE_INFINITY;
  let bestNet = Number.POSITIVE_INFINITY;
  let bestMask = 0;
  for (let mask = 1; mask < limit; mask++) {
    let net = 0;
    let gross = 0;
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) {
        net += units[i].net;
        gross += units[i].gross;
      }
    }
    if (net < X) continue;
    if (gross < bestGross || (gross === bestGross && net < bestNet)) {
      bestGross = gross;
      bestNet = net;
      bestMask = mask;
    }
  }
  return collectPicked(units, (idx) => (bestMask & (1 << idx)) !== 0);
}

/**
 * DP 0/1: menor gross para líquido ≥ X (estado capado em X), desempate por menor
 * líquido real. Para n grande a resolução do líquido é ESCALADA por `r` (piso →
 * nunca subcobre; near-ótimo só quando r > 1).
 */
function dpMinGross(
  units: PricedUnit[],
  X: number,
): { ids: string[]; gross: number; cost: number } {
  const n = units.length;
  const maxStates = Math.max(1, Math.floor(DP_OP_BUDGET / n));
  const r = Math.max(1, Math.ceil(X / maxStates));
  const R = Math.ceil(X / r);
  const INF = Number.POSITIVE_INFINITY;
  const dpGross = new Float64Array(R + 1).fill(INF);
  const dpNet = new Float64Array(R + 1).fill(INF);
  const fromUnit = new Int32Array(R + 1).fill(-1);
  const fromPrev = new Int32Array(R + 1).fill(-1);
  dpGross[0] = 0;
  dpNet[0] = 0;

  for (let ui = 0; ui < n; ui++) {
    const g = units[ui].gross;
    const realNet = units[ui].net;
    const ns = Math.floor(realNet / r);
    if (ns <= 0) continue;
    for (let k = R; k >= 0; k--) {
      if (dpGross[k] === INF) continue;
      const nk = k + ns >= R ? R : k + ns;
      const cg = dpGross[k] + g;
      const cn = dpNet[k] + realNet;
      if (cg < dpGross[nk] || (cg === dpGross[nk] && cn < dpNet[nk])) {
        dpGross[nk] = cg;
        dpNet[nk] = cn;
        fromUnit[nk] = ui;
        fromPrev[nk] = k;
      }
    }
  }

  if (dpGross[R] === INF) return collectPicked(units, () => true);

  const picked = new Set<number>();
  let k = R;
  while (k > 0) {
    const ui = fromUnit[k];
    if (ui < 0) break;
    picked.add(ui);
    k = fromPrev[k];
  }
  return collectPicked(units, (idx) => picked.has(idx));
}

/**
 * Calcula a antecipação para RECEBER `requestedNet` (líquido) ao MENOR custo: dentre
 * TODOS os recebíveis, escolhe o subconjunto que minimiza o gross com líquido ≥
 * pedido (= menor taxa; a sobra vira taxa), desempatando pelo recomendado mais perto
 * do valor digitado. Idêntico ao backend — este é só o espelho da UX (prévia ao vivo).
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

  const priced = priceUnits(units, monthlyRate);

  const finalize = (
    ids: string[],
    cumGross: number,
    cumCost: number,
  ): AnticipationResult => {
    const recommendedNet = cumGross - cumCost;
    const receive = Math.max(0, Math.min(requestedNet, recommendedNet));
    const effectiveFee = cumGross - receive;
    const effectiveRatePct = cumGross > 0 ? (effectiveFee / cumGross) * 100 : 0;
    return {
      consumedUnitIds: ids,
      consumedGross: cumGross,
      realCost: cumCost,
      recommendedNet,
      receive,
      effectiveFee,
      effectiveRatePct,
    };
  };

  // Inalcançável mesmo consumindo tudo → consome tudo (recebe o líquido total).
  const totalNet = priced.reduce((s, u) => s + u.net, 0);
  if (totalNet < requestedNet) {
    const cumGross = priced.reduce((s, u) => s + u.gross, 0);
    const cumCost = priced.reduce((s, u) => s + u.cost, 0);
    return finalize(priced.map((u) => u.unitId), cumGross, cumCost);
  }

  // Otimização GLOBAL (subset-sum) sobre todos os recebíveis.
  const pick = minGrossSubsetForNet(priced, requestedNet);
  return finalize(pick.ids, pick.gross, pick.cost);
}
