import { brasiliaTodayCivilStart } from "@/utils/datetimeBR";

/** Mesma mensagem usada ao bloquear alteração no formulário (estilo TicketForm). */
export const REGISTRATION_END_BEFORE_START_TOAST =
  "A data de encerramento das inscrições não pode ser anterior à data de início.";

export const DATE_NOT_BEFORE_TODAY_TOAST =
  "Não é permitido selecionar uma data anterior a hoje.";

/** Início das inscrições deve ser anterior à data do evento. */
export const REGISTRATION_START_NOT_BEFORE_EVENT_TOAST =
  "A data de início das inscrições deve ser antes da data do evento.";

/** A data do evento não pode ser anterior ao encerramento das inscrições. */
export const EVENT_DATE_NOT_BEFORE_REGISTRATION_END_TOAST =
  "A data do evento não pode ser anterior ao encerramento das inscrições.";

/**
 * Início do dia de HOJE no fuso de BRASÍLIA (UTC-3 fixo), para `minDate` de pickers
 * que não permitem datas passadas.
 *
 * ⚠️ Usa o dia civil de Brasília, NÃO o fuso do dispositivo. Antes usávamos os
 * componentes locais de `new Date()`, então um device com fuso ADIANTADO (ex.: UTC/
 * Europa, ou relógio à frente) via o dia seguinte e bloqueava datas ainda válidas no
 * Brasil — ex.: às 22h BRT do dia 30, quem estava adiantado não conseguia escolher o
 * dia 30. Retorna um `Date` à meia-noite LOCAL cujos componentes de DIA são os de
 * Brasília (o resto do módulo compara só por dia civil, então o fuso do `Date` em si
 * é irrelevante).
 */
export function getTodayStartLocal(): Date {
  // Fonte única: dia civil de HOJE em Brasília (ver datetimeBR). Mantido aqui só
  // como alias por compatibilidade com os callers deste módulo.
  return brasiliaTodayCivilStart();
}

/** `YYYY-MM-DD` → início do dia no fuso local, ou null se inválido. */
export function parseIsoDateToLocalDayStart(ymd: string): Date | null {
  const s = ymd?.trim();
  if (!s) return null;
  const parts = s.split("-");
  if (parts.length !== 3) return null;
  const y = Number(parts[0]);
  const m = Number(parts[1]) - 1;
  const d = Number(parts[2]);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) {
    return null;
  }
  const dt = new Date(y, m, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m || dt.getDate() !== d) {
    return null;
  }
  return dt;
}

/** Compara só o dia civil local: `true` se `ymd` for anterior ao dia de `boundaryDayStart`. */
export function isIsoDateStrictlyBefore(
  ymd: string,
  boundaryDayStart: Date,
): boolean {
  const parsed = parseIsoDateToLocalDayStart(ymd);
  if (!parsed) return false;
  const b = new Date(
    boundaryDayStart.getFullYear(),
    boundaryDayStart.getMonth(),
    boundaryDayStart.getDate(),
  );
  return parsed < b;
}

/**
 * `true` quando o INSTANTE de início das inscrições (data + HORA) NÃO é anterior ao início
 * do dia do evento (eventDate às 00:00) — viola "o início deve ser antes da data do evento".
 * Comparação por DATETIME (por horas): usa `registrationStartTime` (vazio = 00:00). O evento
 * não tem horário neste form, então a referência é a meia-noite do dia do evento. Usado no
 * onChange e no submit.
 */
export function isRegistrationStartNotBeforeEvent(
  registrationStartDateYmd: string | undefined,
  registrationStartTime: string | undefined,
  eventDateYmd: string | undefined,
): boolean {
  const rs = registrationStartDateYmd?.trim();
  const ed = eventDateYmd?.trim();
  if (!rs || !ed) return false;
  const time = registrationStartTime?.trim() || "00:00";
  const startMs = new Date(`${rs}T${time}:00`).getTime();
  const eventStartMs = new Date(`${ed}T00:00:00`).getTime();
  if (Number.isNaN(startMs) || Number.isNaN(eventStartMs)) return false;
  return startMs >= eventStartMs;
}

/**
 * `true` quando o DIA do EVENTO é anterior ao DIA de ENCERRAMENTO das inscrições —
 * viola "o evento não pode acontecer antes das inscrições fecharem". Comparação por
 * DIA civil (o form não tem hora do evento); o MESMO dia é permitido (inscrições
 * podem encerrar no dia do evento). Usado no onChange e no submit.
 */
export function isEventDateBeforeRegistrationEnd(
  eventDateYmd: string | undefined,
  registrationEndDateYmd: string | undefined,
): boolean {
  const eventDay = parseIsoDateToLocalDayStart(eventDateYmd?.trim() ?? "");
  const endDay = parseIsoDateToLocalDayStart(registrationEndDateYmd?.trim() ?? "");
  if (!eventDay || !endDay) return false;
  return eventDay < endDay;
}

/**
 * `minDate` do picker da DATA DO EVENTO: o MAIOR entre "hoje" (BRT) e o dia de
 * ENCERRAMENTO das inscrições — impede escolher data anterior ao encerramento.
 */
export function getMinDateForEventPicker(
  registrationEndDateYmd: string | undefined,
): Date {
  const today = getTodayStartLocal();
  const endDay = parseIsoDateToLocalDayStart(registrationEndDateYmd?.trim() ?? "");
  return endDay && endDay > today ? endDay : today;
}

/**
 * `maxDate` do picker de ENCERRAMENTO das inscrições: o dia do EVENTO (encerramento
 * não pode ser depois do evento). `undefined` quando não há data de evento.
 */
export function getMaxDateForRegistrationEndPicker(
  eventDateYmd: string | undefined,
): Date | undefined {
  return parseIsoDateToLocalDayStart(eventDateYmd?.trim() ?? "") ?? undefined;
}

export type RegistrationPeriodFields = {
  registrationStartDate: string;
  registrationStartTime: string;
  registrationEndDate: string;
  registrationEndTime: string;
};

/**
 * Compara início e fim das inscrições quando ambas as datas existem (horário vazio = 00:00).
 * Usado no onChange (bloquear + toast) e no submit.
 */
export function wouldRegistrationEndBeforeStart(
  next: RegistrationPeriodFields,
): boolean {
  const rs = next.registrationStartDate?.trim();
  const re = next.registrationEndDate?.trim();
  if (!rs || !re) return false;
  const rst = next.registrationStartTime?.trim() || "00:00";
  const ret = next.registrationEndTime?.trim() || "00:00";
  const startMs = new Date(`${rs}T${rst}:00`).getTime();
  const endMs = new Date(`${re}T${ret}:59`).getTime();
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) return false;
  return endMs < startMs;
}

/**
 * `minDate` do picker de ENCERRAMENTO das inscrições: o MAIOR entre "hoje" (BRT)
 * e o DIA de INÍCIO das inscrições. Ancorar em Brasília (e não retornar
 * `undefined`) é essencial: os pickers do evento desligam o `disablePastDates`
 * do device — quem enforça o "não pode no passado" é SÓ este `minDate`. Sem o
 * floor de hoje, com início vazio, dava pra escolher datas passadas. O mesmo dia
 * do início continua selecionável (comparação por dia civil).
 */
export function getMinDateForRegistrationEndPicker(
  registrationStartDateYmd: string | undefined,
): Date {
  const today = getTodayStartLocal();
  const startDay = parseIsoDateToLocalDayStart(
    registrationStartDateYmd?.trim() ?? "",
  );
  return startDay && startDay > today ? startDay : today;
}
