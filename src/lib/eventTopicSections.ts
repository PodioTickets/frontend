import type { Event, Topic } from "@/interfaces/event";

/** Tópico “Detalhes do evento” quando ainda não existe registro `isDefault` persistido na API. */
export const DEFAULT_TOPIC_SENTINEL = "__default__";

/** Tópico criado no modal mas ainda não enviado à API (persistido ao salvar a página). */
export const PENDING_TOPIC_PREFIX = "__pending_topic__";

export function isPendingTopicId(id: string): boolean {
  return id.startsWith(PENDING_TOPIC_PREFIX);
}

export function newPendingTopicId(): string {
  const uuid =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : String(Date.now());
  return `${PENDING_TOPIC_PREFIX}${uuid}`;
}

export type TopicSectionRow = {
  id: string;
  title: string;
  content: string;
  allowDelete: boolean;
  variant: "default" | "topic";
};

/** Tópicos habilitados ordenados — página pública / prévia (somente registros de tópico, sem `description`). */
export function getEnabledTopicsSorted(event: Pick<Event, "topics">): Topic[] {
  return [...(event.topics || [])]
    .filter((t) => t.isEnabled)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

/**
 * Ordem dos ids para PATCH .../topics/reorder (índice = `order` na API).
 * Sentinela `__default__` sem tópico persistido é ignorada (só entram ids reais no evento).
 */
export function topicIdsInUiOrder(
  rows: TopicSectionRow[],
  defaultTopicApiId: string | null
): string[] {
  const ids: string[] = [];
  for (const row of rows) {
    if (row.id === DEFAULT_TOPIC_SENTINEL) {
      if (defaultTopicApiId) ids.push(defaultTopicApiId);
      continue;
    }
    ids.push(row.id);
  }
  return ids;
}

/** Monta a lista do organizador (criar/editar tópicos). Não usa `event.description`. */
/** Rascunho de tópicos para prévia sem salvar a página (sessionStorage). */
export type TopicsPreviewDraftV1 = {
  v: 1;
  eventId: string;
  sections: TopicSectionRow[];
};

const TOPICS_PREVIEW_STORAGE_KEY = "podiotickets.organizerTopicsPreview.v1";

/**
 * Fallback em memória (módulo-level). O módulo NÃO é recriado em navegação
 * client-side do Next (tópicos → prévia → voltar = mesma sessão JS), então
 * este valor sobrevive ao round-trip da prévia mesmo se o sessionStorage
 * falhar (quota estourada por conteúdo grande, modo privado, etc.).
 *
 * Era exatamente a causa do bug "as alterações somem ao voltar da prévia":
 * o `setItem` lançava em silêncio (catch vazio) e o draft sumia. Com o
 * fallback em memória, o draft NUNCA se perde no round-trip.
 */
let memoryDraft: TopicsPreviewDraftV1 | null = null;

function isValidDraft(
  d: TopicsPreviewDraftV1 | null,
  eventId: string,
): d is TopicsPreviewDraftV1 {
  return (
    !!d && d.v === 1 && d.eventId === eventId && Array.isArray(d.sections)
  );
}

export function writeTopicsPreviewDraft(draft: TopicsPreviewDraftV1): void {
  // Memória primeiro — sempre funciona, sem quota. Garante a preservação
  // mesmo que o sessionStorage abaixo falhe.
  memoryDraft = draft;
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(TOPICS_PREVIEW_STORAGE_KEY, JSON.stringify(draft));
  } catch {
    /* quota / modo privado — o fallback em memória cobre a navegação client-side */
  }
}

export function readTopicsPreviewDraft(
  eventId: string,
): TopicsPreviewDraftV1 | null {
  // 1) sessionStorage (sobrevive a full reload). 2) memória (sobrevive a
  // falha do sessionStorage no round-trip client-side).
  if (typeof window !== "undefined") {
    try {
      const raw = sessionStorage.getItem(TOPICS_PREVIEW_STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw) as TopicsPreviewDraftV1;
        if (isValidDraft(data, eventId)) return data;
      }
    } catch {
      /* ignore — cai no fallback de memória */
    }
  }
  return isValidDraft(memoryDraft, eventId) ? memoryDraft : null;
}

export function clearTopicsPreviewDraft(): void {
  memoryDraft = null;
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(TOPICS_PREVIEW_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Campos necessários para renderizar blocos de tópico na prévia do organizador. */
export type TopicPreviewSection = {
  id: string;
  title: string;
  content: string;
  isDefault: boolean;
};

export function topicSectionRowsToPreviewSections(
  rows: TopicSectionRow[],
): TopicPreviewSection[] {
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    content: r.content,
    isDefault: !r.allowDelete,
  }));
}

export function buildTopicSectionsFromEvent(
  event: Pick<Event, "topics">,
  options?: { onlyEnabled?: boolean }
): { sections: TopicSectionRow[]; defaultTopicApiId: string | null } {
  let allTopics: Topic[] = event.topics || [];
  if (options?.onlyEnabled) {
    allTopics = allTopics.filter((t) => t.isEnabled);
  }

  if (allTopics.length === 0) {
    return {
      sections: [
        {
          id: DEFAULT_TOPIC_SENTINEL,
          title: "Detalhes do evento (Obrigatório)",
          content: "",
          allowDelete: false,
          variant: "default",
        },
      ],
      defaultTopicApiId: null,
    };
  }

  const sorted = [...allTopics].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const defaultTopic = sorted.find((t) => t.isDefault);

  if (defaultTopic) {
    return {
      sections: sorted.map((t) => ({
        id: t.id,
        title: t.isDefault
          ? t.title?.trim() || "Detalhes do evento (Obrigatório)"
          : t.title,
        content: t.content,
        allowDelete: !t.isDefault,
        variant: t.isDefault ? "default" : "topic",
      })),
      defaultTopicApiId: defaultTopic.id,
    };
  }

  return {
    sections: [
      {
        id: DEFAULT_TOPIC_SENTINEL,
        title: "Detalhes do evento (Obrigatório)",
        content: "",
        allowDelete: false,
        variant: "default",
      },
      ...sorted.map((t) => ({
        id: t.id,
        title: t.title,
        content: t.content,
        allowDelete: true,
        variant: "topic" as const,
      })),
    ],
    defaultTopicApiId: null,
  };
}
