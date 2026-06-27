/**
 * Formatação de data/hora em pt-BR que PRESERVA o horário enviado pelo servidor,
 * sem shift de fuso. O backend já manda o instante na timezone pretendida (ISO,
 * geralmente com `Z`); chamar `toLocaleDateString/TimeString("pt-BR")` sem
 * `timeZone` reaplicaria o fuso do navegador (ex.: -3h no Brasil, mas qualquer
 * deslocamento em runtimes/SSR com TZ diferente), exibindo a hora errada.
 *
 * Estes helpers SEMPRE formatam em UTC e tratam date-only (`YYYY-MM-DD`) como
 * meia-noite UTC — eliminando tanto o shift de hora quanto o clássico bug de
 * "-1 dia" em datas sem componente de tempo.
 *
 * Use no lugar de `new Date(x).toLocaleDateString("pt-BR", opts)`,
 * `toLocaleTimeString` e `new Intl.DateTimeFormat("pt-BR", opts).format(x)` —
 * passe as MESMAS `options`; `timeZone` é forçado para "UTC".
 */

export type DateInput = string | number | Date | null | undefined;

/**
 * Converte a entrada num `Date` representando o instante correto. Date-only
 * `YYYY-MM-DD` vira meia-noite UTC explícita (evita interpretação local).
 * Retorna `null` para valores ausentes/ inválidos.
 */
export function toUtcDate(value: DateInput): Date | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === "number") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const s = value.trim();
  if (!s) return null;
  // Date-only (sem hora) → ancora em meia-noite UTC.
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const d = new Date(`${s}T00:00:00.000Z`);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Converte um `Date` vindo de um DATE-PICKER (react-day-picker) — que representa
 * o DIA CIVIL clicado pelo usuário, ancorado em meia-noite LOCAL — para a string
 * `YYYY-MM-DD` desse mesmo dia.
 *
 * ⚠️ Use os componentes LOCAIS (getFullYear/Month/Date), NÃO `toISOString()`:
 * `toISOString` converte pra UTC e, dependendo do fuso do navegador, desloca o
 * dia (ex.: meia-noite local a leste de UTC cai no dia anterior). Como o backend
 * interpreta esse parâmetro como um DIA CIVIL (fronteiras BRT), enviar o dia
 * exatamente como foi escolhido elimina o skew de fuso nos filtros.
 */
export function toCivilDayString(value: Date | null | undefined): string | undefined {
  if (!value || Number.isNaN(value.getTime())) return undefined;
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const DEFAULT_DATE_OPTS: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
};

const DEFAULT_TIME_OPTS: Intl.DateTimeFormatOptions = {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
};

/**
 * Formata data/hora em pt-BR no fuso UTC (sem shift). Passe as mesmas `options`
 * que usaria no `Intl.DateTimeFormat`. Default: `dd/mm/aaaa`.
 * Retorna "" para valores ausentes/ inválidos.
 */
export function formatDateTimeBR(
  value: DateInput,
  options: Intl.DateTimeFormatOptions = DEFAULT_DATE_OPTS,
): string {
  const d = toUtcDate(value);
  if (!d) return "";
  return new Intl.DateTimeFormat("pt-BR", { ...options, timeZone: "UTC" }).format(d);
}

/** Atalho: só a DATA (default `dd/mm/aaaa`), UTC. */
export function formatDateBR(
  value: DateInput,
  options: Intl.DateTimeFormatOptions = DEFAULT_DATE_OPTS,
): string {
  return formatDateTimeBR(value, options);
}

/** Atalho: só a HORA (default `HH:mm`, 24h), UTC. */
export function formatTimeBR(
  value: DateInput,
  options: Intl.DateTimeFormatOptions = DEFAULT_TIME_OPTS,
): string {
  return formatDateTimeBR(value, options);
}

/**
 * Fuso de Brasília. Sem horário de verão desde 2019 (UTC-3 fixo), mas usamos o
 * nome da timezone (não offset cravado) pra o runtime resolver corretamente
 * também datas históricas.
 */
const TZ_BR = "America/Sao_Paulo";

/**
 * Formata um INSTANTE REAL (ex.: data/hora de pagamento/compra, criação do
 * pedido) no fuso de BRASÍLIA. Diferente dos helpers UTC acima: estes são para
 * timestamps que representam um momento real no tempo (ISO com `Z`), onde o
 * usuário espera ver o horário local de Brasília.
 *
 * ⚠️ NÃO use para a data "wall-clock" do evento — essa é naïve (sem fuso) e deve
 * continuar nos helpers UTC, senão o dia desloca.
 */
export function formatInstantBRT(
  value: DateInput,
  options: Intl.DateTimeFormatOptions = { ...DEFAULT_DATE_OPTS, ...DEFAULT_TIME_OPTS },
): string {
  const d = toUtcDate(value);
  if (!d) return "";
  return new Intl.DateTimeFormat("pt-BR", { ...options, timeZone: TZ_BR }).format(d);
}

/** Atalho: só a DATA do instante (default `dd/mm/aaaa`), fuso de Brasília. */
export function formatDateBRT(
  value: DateInput,
  options: Intl.DateTimeFormatOptions = DEFAULT_DATE_OPTS,
): string {
  return formatInstantBRT(value, options);
}

/** Atalho: só a HORA do instante (default `HH:mm`, 24h), fuso de Brasília. */
export function formatTimeBRT(
  value: DateInput,
  options: Intl.DateTimeFormatOptions = DEFAULT_TIME_OPTS,
): string {
  return formatInstantBRT(value, options);
}

/**
 * Converte um INSTANTE (ISO com `Z`) que representa o FIM de um dia civil em BRT
 * — ex.: validade de cupom/voucher, gravada no backend como fim do dia BRT em UTC
 * (`(dia+1)T02:59:59.999Z`) — de volta para o DIA CIVIL `YYYY-MM-DD` em Brasília.
 * Usado no date-picker (edição) e no dirty-check desses modais.
 *
 * Lê sempre no fuso de Brasília (−3h), então é compatível também com o formato
 * LEGADO (`T23:59:59.999Z`, fim do dia em UTC): ambos resolvem para o mesmo dia.
 * Date-only `YYYY-MM-DD` passa direto (já é um dia civil, sem shift). Retorna ""
 * para valores ausentes/ inválidos.
 */
export function toCivilDayBRT(value: DateInput): string {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    return value.trim();
  }
  const d = toUtcDate(value);
  if (!d) return "";
  const brt = new Date(d.getTime() - 3 * 60 * 60 * 1000);
  const y = brt.getUTCFullYear();
  const m = String(brt.getUTCMonth() + 1).padStart(2, "0");
  const day = String(brt.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Janela do evento (abertura/encerramento das inscrições, realização) é WALL-CLOCK
 * gravada como UTC pelo backend (server em UTC: "09:30Z" = 09:30 no horário de
 * Brasília pretendido). Para COMPARAR com o tempo real (`Date.now()`), o instante
 * real é esse wall-clock interpretado em BRT (UTC-3) → +3h sobre o valor UTC.
 *
 * Sem isso, comparar o wall-clock-UTC direto com `Date.now()` faz a janela abrir/
 * fechar 3h CEDO no Brasil (ex.: "encerra 09:30" bloqueava às 06:30 BRT).
 *
 * ⚠️ Use SÓ para comparação/countdown. O DISPLAY continua nos helpers UTC
 * (`formatDateTimeBR`), que mostram o wall-clock como digitado (09:30). Retorna
 * `Date` do instante real, ou `null`.
 */
export function eventWindowInstant(value: DateInput): Date | null {
  const d = toUtcDate(value);
  if (!d) return null;
  return new Date(d.getTime() + 3 * 60 * 60 * 1000);
}

const MONTHS_BR_SHORT = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

/**
 * Formata um INSTANTE REAL no formato custom "DD Mon, AAAA" (ex.: "24 Jun, 2026")
 * no fuso de Brasília — usado nas listas/tabelas de admin/organizador. BRT é UTC-3
 * fixo; deslocamos −3h e lemos os componentes UTC pra obter o wall-clock de Brasília
 * sem depender do fuso do runtime. Retorna "" para valores ausentes/ inválidos.
 */
export function formatDateBRTShort(value: DateInput): string {
  const d = toUtcDate(value);
  if (!d) return "";
  const brt = new Date(d.getTime() - 3 * 60 * 60 * 1000);
  return `${String(brt.getUTCDate()).padStart(2, "0")} ${MONTHS_BR_SHORT[brt.getUTCMonth()]}, ${brt.getUTCFullYear()}`;
}
