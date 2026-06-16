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
