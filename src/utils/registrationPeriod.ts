/** Mesma mensagem usada ao bloquear alteração no formulário (estilo TicketForm). */
export const REGISTRATION_END_BEFORE_START_TOAST =
  "A data de encerramento das inscrições não pode ser anterior à data de início.";

export const DATE_NOT_BEFORE_TODAY_TOAST =
  "Não é permitido selecionar uma data anterior a hoje.";

/** Início das inscrições deve ser anterior à data do evento. */
export const REGISTRATION_START_NOT_BEFORE_EVENT_TOAST =
  "A data de início das inscrições deve ser antes da data do evento.";

/** Início do dia atual (horário local) para `minDate` em pickers que não permitem datas passadas. */
export function getTodayStartLocal(): Date {
  const t = new Date();
  return new Date(t.getFullYear(), t.getMonth(), t.getDate());
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
 * `YYYY-MM-DD` do início → `Date` local (início do dia) para `minDate` no DatePicker de encerramento.
 * Dias anteriores ao início ficam desabilitados no calendário; o mesmo dia do início continua selecionável.
 */
export function getMinDateForRegistrationEndPicker(
  registrationStartDateYmd: string | undefined,
): Date | undefined {
  const rs = registrationStartDateYmd?.trim();
  if (!rs) return undefined;
  const parts = rs.split("-");
  if (parts.length !== 3) return undefined;
  const y = Number(parts[0]);
  const m = Number(parts[1]) - 1;
  const d = Number(parts[2]);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d))
    return undefined;
  const dt = new Date(y, m, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m || dt.getDate() !== d)
    return undefined;
  return dt;
}
