/**
 * Helpers de INPUT de data no formato brasileiro (dd/mm/aaaa). Separado de
 * `datetimeBR.ts` (que formata/parseia datas do servidor em UTC) porque aqui a
 * preocupação é só a máscara progressiva do campo e a conversão para o formato
 * de API (YYYY-MM-DD) — sem fuso horário envolvido.
 */

/** Máscara progressiva dd/mm/aaaa a partir dos dígitos digitados. */
export function maskDateBR(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

/**
 * Converte "dd/mm/aaaa" → "aaaa-mm-dd" (formato de API). Retorna string vazia
 * quando incompleto ou inválido (dia/mês fora de faixa, ano < 1900), permitindo
 * usar o retorno vazio como sinal de "data inválida".
 */
export function brDateToYmd(value: string): string {
  const m = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return "";
  const [, dd, mm, yyyy] = m;
  const day = Number(dd);
  const month = Number(mm);
  const year = Number(yyyy);
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900) return "";
  return `${yyyy}-${mm}-${dd}`;
}
