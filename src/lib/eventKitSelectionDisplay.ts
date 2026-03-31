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
  /** Modo por ingresso: ticketId → productId da imagem principal. */
  primaryKitProductByTicketId: Record<string, string>;
  /** Modo por categoria: categoryId ou `uncategorized` → productId. */
  primaryKitProductByCategoryId: Record<string, string>;
}

export function defaultEventKitSelectionDisplay(): EventKitSelectionDisplay {
  return {
    showKitImagesOnSelection: true,
    kitImagesLayout: "ON_TICKETS",
    primaryKitProductByTicketId: {},
    primaryKitProductByCategoryId: {},
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
  };
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
