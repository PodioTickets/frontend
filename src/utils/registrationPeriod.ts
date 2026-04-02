/** Mesma mensagem usada ao bloquear alteração no formulário (estilo TicketForm). */
export const REGISTRATION_END_BEFORE_START_TOAST =
  "A data de encerramento das inscrições não pode ser anterior à data de início.";

export type RegistrationPeriodFields = {
  registrationStartDate: string;
  registrationStartTime: string;
  registrationEndDate: string;
  registrationEndTime: string;
};

/**
 * Compara início e fim das inscrições quando ambas as datas existem (horas opcionais: 00:00 / 23:59).
 * Usado no onChange (bloquear + toast) e no submit.
 */
export function wouldRegistrationEndBeforeStart(
  next: RegistrationPeriodFields,
): boolean {
  const rs = next.registrationStartDate?.trim();
  const re = next.registrationEndDate?.trim();
  if (!rs || !re) return false;
  const rst = next.registrationStartTime?.trim() || "00:00";
  const ret = next.registrationEndTime?.trim() || "23:59";
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
