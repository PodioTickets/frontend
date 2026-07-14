/** Chave usada na API e no drawer para ingressos sem categoria. */
export const UNCATEGORIZED_CATEGORY_KEY = "uncategorized";

/** Valores persistidos no backend (evento). */
export type KitImagesLayoutApi = "ON_TICKETS" | "ON_CATEGORIES";

/** Alinhado a `KitImageLayoutMode` do drawer (evita import circular). */
export type KitImageLayoutDrawerMode = "on_tickets" | "on_categories";

export interface EventKitSelectionDisplay {
  /** Exibir imagens do kit na tela de escolha de ingressos (radio Sim/Não). */
  showKitImagesOnSelection: boolean;
  /** Onde destacar imagens quando `showKitImagesOnSelection` é true. */
  kitImagesLayout: KitImagesLayoutApi;
  /** Modo por ingresso: ticketId → URL da imagem principal (o nome "Product" é histórico). */
  primaryKitProductByTicketId: Record<string, string>;
  /** Modo por categoria: categoryId ou `uncategorized` → URL da imagem principal. */
  primaryKitProductByCategoryId: Record<string, string>;
  /**
   * Imagens OCULTAS na tela de escolha (não aparecem pro participante). Mesma
   * identidade do resto da feature: URL da imagem. ticketId → lista de URLs.
   */
  hiddenKitImageUrlsByTicketId: Record<string, string[]>;
  /** Imagens ocultas no modo por categoria: categoryId/`uncategorized` → URLs. */
  hiddenKitImageUrlsByCategoryId: Record<string, string[]>;
}

export function defaultEventKitSelectionDisplay(): EventKitSelectionDisplay {
  return {
    showKitImagesOnSelection: true,
    kitImagesLayout: "ON_TICKETS",
    primaryKitProductByTicketId: {},
    primaryKitProductByCategoryId: {},
    hiddenKitImageUrlsByTicketId: {},
    hiddenKitImageUrlsByCategoryId: {},
  };
}

/**
 * Estado INICIAL ao CRIAR ingressos de um evento novo (sem baseline salvo).
 * Diferente do default de LEITURA (`defaultEventKitSelectionDisplay`): aqui o
 * radio "Deseja exibir as imagens do kit..." começa em "Não" por decisão de
 * produto. NÃO usar no parse/fallback de eventos existentes — isso esconderia
 * imagens de eventos já publicados que não persistiram o campo.
 */
export function initialEventKitSelectionDisplayForCreation(): EventKitSelectionDisplay {
  return {
    ...defaultEventKitSelectionDisplay(),
    showKitImagesOnSelection: false,
  };
}

/** Normaliza resposta da API (camelCase ou snake_case). */
export function parseEventKitSelectionDisplay(
  raw: unknown
): EventKitSelectionDisplay {
  const base = defaultEventKitSelectionDisplay();
  if (!raw || typeof raw !== "object") {
    return { ...base };
  }
  const o = raw as Record<string, unknown>;
  const show =
    o.showKitImagesOnSelection ?? o.show_kit_images_on_selection;
  const layout = o.kitImagesLayout ?? o.kit_images_layout;
  const byTicket =
    o.primaryKitProductByTicketId ?? o.primary_kit_product_by_ticket_id;
  const byCat =
    o.primaryKitProductByCategoryId ?? o.primary_kit_product_by_category_id;
  const hiddenByTicket =
    o.hiddenKitImageUrlsByTicketId ?? o.hidden_kit_image_urls_by_ticket_id;
  const hiddenByCat =
    o.hiddenKitImageUrlsByCategoryId ?? o.hidden_kit_image_urls_by_category_id;

  return {
    showKitImagesOnSelection:
      typeof show === "boolean" ? show : base.showKitImagesOnSelection,
    kitImagesLayout:
      layout === "ON_CATEGORIES" ||
      layout === "on_categories" ||
      layout === "NAS_CATEGORIAS"
        ? "ON_CATEGORIES"
        : "ON_TICKETS",
    primaryKitProductByTicketId:
      byTicket && typeof byTicket === "object" && !Array.isArray(byTicket)
        ? { ...(byTicket as Record<string, string>) }
        : {},
    primaryKitProductByCategoryId:
      byCat && typeof byCat === "object" && !Array.isArray(byCat)
        ? { ...(byCat as Record<string, string>) }
        : {},
    hiddenKitImageUrlsByTicketId: parseHiddenUrlsMap(hiddenByTicket),
    hiddenKitImageUrlsByCategoryId: parseHiddenUrlsMap(hiddenByCat),
  };
}

/** Normaliza `Record<string, string[]>` tolerando shapes inválidos (dropa não-strings). */
function parseHiddenUrlsMap(raw: unknown): Record<string, string[]> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!Array.isArray(value)) continue;
    const urls = value.filter(
      (u): u is string => typeof u === "string" && u.trim().length > 0,
    );
    if (urls.length > 0) out[key] = urls;
  }
  return out;
}

export function layoutToDrawerMode(
  layout: EventKitSelectionDisplay["kitImagesLayout"]
): KitImageLayoutDrawerMode {
  return layout === "ON_CATEGORIES" ? "on_categories" : "on_tickets";
}

export function drawerModeToApiLayout(
  mode: KitImageLayoutDrawerMode
): KitImagesLayoutApi {
  return mode === "on_categories" ? "ON_CATEGORIES" : "ON_TICKETS";
}
