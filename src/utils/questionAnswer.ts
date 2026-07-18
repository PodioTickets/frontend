/**
 * Formata a resposta de uma pergunta do organizador para exibição.
 *
 * O backend persiste respostas de múltipla escolha como array (ou string JSON
 * serializada de um array, em registros legados). Para exibição, juntamos os
 * valores escolhidos com vírgula. Respostas simples (string/número) caem no
 * `String(answer)`. Ausência de resposta vira um traço.
 *
 * Fonte única de verdade — reutilizado na tela de pagamento concluído, na de
 * detalhes do ingresso do usuário e no modal de inscrição do organizador, para
 * não divergirem.
 */
export function formatAnswer(answer: unknown): string {
  if (answer == null) return "—";
  if (Array.isArray(answer)) return answer.join(", ");
  if (typeof answer === "string") {
    try {
      const parsed: unknown = JSON.parse(answer);
      if (Array.isArray(parsed)) return parsed.join(", ");
    } catch {
      /* não é JSON — usa a string crua abaixo */
    }
  }
  return String(answer) || "—";
}

/**
 * Normaliza o `appliesTo` de uma pergunta do organizador para a lista de
 * ticketIds a que ela se restringe. Retorna `null` quando a pergunta se aplica
 * a TODOS os ingressos.
 *
 * O backend pode devolver `appliesTo` como:
 *  - ausente / `null` / `"all"`      → todos os ingressos;
 *  - array de ids (`string[]`)       → só os ingressos listados;
 *  - array de objetos (`{ id }[]`)   → idem, no formato "hidratado";
 *  - string JSON de um dos arrays    → registros legados serializados.
 *
 * Qualquer forma inesperada cai no comportamento SEGURO "todos" (`null`): nunca
 * escondemos uma pergunta por engano — no pior caso ela aparece a mais, jamais
 * some indevidamente.
 */
function parseQuestionAppliesToIds(raw: unknown): string[] | null {
  if (raw == null || raw === "all") return null;
  let arr: unknown = raw;
  if (typeof raw === "string") {
    try {
      arr = JSON.parse(raw);
    } catch {
      return null; // string não-JSON e diferente de "all" → trata como "todos"
    }
  }
  if (!Array.isArray(arr)) return null;
  const ids = arr
    .map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object" && "id" in item) {
        return String((item as { id: unknown }).id);
      }
      return null;
    })
    .filter((x): x is string => !!x);
  // Vazio nunca é persistido como "específico" (o modal força ≥1 ou "all"),
  // então array vazio também significa "todos".
  return ids.length > 0 ? ids : null;
}

/**
 * Determina se uma pergunta do organizador se aplica a um ingresso específico.
 * Fonte única de verdade do vínculo pergunta↔ingresso, usada no checkout para
 * mostrar/validar apenas as perguntas do ingresso de cada participante.
 */
export function questionAppliesToTicket(
  question: { appliesTo?: unknown } | null | undefined,
  ticketId: string,
): boolean {
  const ids = parseQuestionAppliesToIds(question?.appliesTo);
  return ids === null || ids.includes(ticketId);
}
