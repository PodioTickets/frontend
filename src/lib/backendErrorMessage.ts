/**
 * Tradução/normalização de mensagens de erro vindas do backend para textos
 * amigáveis em português.
 *
 * Motivação: alguns endpoints (ex.: criação/edição/publicação de evento) lançam
 * exceções com mensagens em inglês (`An event with the same name and date already
 * exists...`). Essas mensagens vazavam direto para o `toast` do organizador. Aqui
 * centralizamos a tradução para manter TODAS as mensagens consistentes e amigáveis.
 *
 * Estratégia (segura por padrão):
 * - Dicionário exato para as mensagens conhecidas do backend (case-insensitive,
 *   trim). A maioria das mensagens do backend já está em PT — essas passam direto.
 * - Padrões genéricos (ex.: `Missing permission: <key>`) tratados por regex.
 * - Fallback: mantém a mensagem original (não inventamos texto) e, na ausência de
 *   mensagem, usa o `fallback` do chamador.
 *
 * Performance: dicionário montado uma única vez (module-scope), lookup O(1) por
 * chave normalizada. Sem dependências externas.
 */

/**
 * Mapa de mensagens EXATAS do backend (chave normalizada em minúsculas) → PT.
 * Chaves sempre em minúsculas/trim para lookup case-insensitive.
 */
const EXACT_TRANSLATIONS: Record<string, string> = {
  // Criação de evento (events.service.create)
  "an event with the same name and date already exists for this organization":
    "Já existe um evento com o mesmo nome e data nesta organização. Altere o nome ou a data.",

  // Exclusão de evento
  "only the organization owner can delete events":
    "Apenas o proprietário da organização pode excluir eventos.",

  // Envio para análise / publicação
  "event must have at least one active ticket before submitting for review":
    "O evento precisa ter ao menos um ingresso ativo antes de ser enviado para análise.",
  "event must have complete location information before submitting for review":
    "O evento precisa ter as informações de local completas antes de ser enviado para análise.",

  // Diversos (edição de evento / tópicos / local)
  "slug is required": "O identificador (slug) do evento é obrigatório.",
  "topicids must not contain duplicates":
    "A lista de tópicos não pode conter itens duplicados.",
  "topic not found": "Tópico não encontrado.",
  "location not found": "Local não encontrado.",
  "transfer not found": "Repasse não encontrado.",
};

/**
 * Regras por padrão (regex) — aplicadas quando não há match exato. Cada entrada
 * recebe a mensagem ORIGINAL (não normalizada) e devolve a tradução ou `null`.
 */
const PATTERN_TRANSLATIONS: Array<(msg: string) => string | null> = [
  // `Missing permission: create_event` (e variantes de outras keys)
  (msg) =>
    /^missing permission\s*:/i.test(msg.trim())
      ? "Você não tem permissão para realizar esta ação."
      : null,
];

/**
 * Traduz uma única mensagem do backend para PT amigável. Passa direto quando a
 * mensagem já é amigável/em PT (não reconhecida como inglês conhecido).
 */
export function translateBackendMessage(message: string): string {
  const trimmed = message.trim();
  if (!trimmed) return trimmed;

  const exact = EXACT_TRANSLATIONS[trimmed.toLowerCase()];
  if (exact) return exact;

  for (const rule of PATTERN_TRANSLATIONS) {
    const translated = rule(trimmed);
    if (translated) return translated;
  }

  return trimmed;
}

type AxiosLikeError = {
  response?: {
    data?: {
      message?: string | string[];
      errors?: Array<{ message?: string } | string>;
    };
  };
  message?: string;
};

/**
 * Extrai a mensagem de um erro no formato Axios/Nest e devolve já traduzida.
 *
 * Ordem de precedência (igual ao padrão que já existia espalhado nos catch):
 * 1. `response.data.message` (string ou array de strings do class-validator)
 * 2. `response.data.errors[].message`
 * 3. `error.message`
 * 4. `fallback` do chamador
 *
 * @param error   Erro capturado (unknown/any de um `try/catch`).
 * @param fallback Texto amigável quando não há mensagem alguma no erro.
 */
export function getFriendlyBackendError(
  error: unknown,
  fallback = "Ocorreu um erro. Tente novamente.",
): string {
  const err = error as AxiosLikeError;

  const rawMessage = err?.response?.data?.message;
  if (Array.isArray(rawMessage) && rawMessage.length) {
    return rawMessage
      .map((m) => translateBackendMessage(String(m)))
      .join(", ");
  }
  if (typeof rawMessage === "string" && rawMessage.trim()) {
    return translateBackendMessage(rawMessage);
  }

  const errors = err?.response?.data?.errors;
  if (Array.isArray(errors) && errors.length) {
    return errors
      .map((e) =>
        translateBackendMessage(
          typeof e === "string" ? e : e?.message || "",
        ),
      )
      .filter(Boolean)
      .join(", ");
  }

  if (typeof err?.message === "string" && err.message.trim()) {
    return translateBackendMessage(err.message);
  }

  return fallback;
}
