import { organizerService } from "@/services";
import type { ModalityGroup } from "@/services/organizer/OrganizerService";

export const CATEGORY_SORTABLE_ID_PREFIX = "cat-sort-";

export function categorySortableId(categoryId: string) {
  return `${CATEGORY_SORTABLE_ID_PREFIX}${categoryId}`;
}

export function parseCategorySortableId(id: string): string | null {
  if (!id.startsWith(CATEGORY_SORTABLE_ID_PREFIX)) return null;
  return id.slice(CATEGORY_SORTABLE_ID_PREFIX.length);
}

/** Uma requisição PATCH .../categories/reorder — ordem do array = sortOrder 0, 1, 2… */
export async function persistTicketCategoryOrderApi(
  eventId: string,
  ordered: ModalityGroup[],
) {
  if (ordered.length === 0) return;
  const categoryIds = ordered.map((c) => c.id);
  await organizerService.reorderTicketCategories(eventId, categoryIds);
}
