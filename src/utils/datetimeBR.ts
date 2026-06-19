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
