import type { Batch, ProductData } from "./TicketForm.types";

export const defaultBatch: Batch = {
  id: "1",
  quantity: "",
  price: "",
  startType: "date",
};

export function formatProductPrice(value: number | string | undefined): string {
  if (value == null || value === "") return "0,00";
  if (typeof value === "number")
    return (value / 100).toFixed(2).replace(".", ",");
  return String(value);
}

/**
 * createProduct/updateProduct podem retornar o recurso direto ou embrulhado em `product` / `data`.
 */
export function unwrapSavedProductFromApi(
  saved: unknown,
): Record<string, unknown> | null {
  if (!saved || typeof saved !== "object") return null;
  const o = saved as Record<string, unknown>;
  const ok = (x: Record<string, unknown>) =>
    x.id != null &&
    String(x.id).trim() !== "" &&
    x.name != null &&
    String(x.name).trim() !== "";

  if (ok(o)) return o;
  const inner = o.product;
  if (inner && typeof inner === "object" && ok(inner as Record<string, unknown>)) {
    return inner as Record<string, unknown>;
  }
  const data = o.data;
  if (data && typeof data === "object" && ok(data as Record<string, unknown>)) {
    return data as Record<string, unknown>;
  }
  return null;
}

/** `id` de lote persistido no backend (UUID). Demais valores são só chave de UI. */
export function isPersistedBatchId(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    id.trim(),
  );
}

/** Mesma regra de montagem de ISO usada no envio do formulário (início / fim da venda do lote). */
export function getBatchSalePeriodBounds(
  batch: Batch,
): { startMs: number; endMs: number } | null {
  if (
    batch.startType !== "date" ||
    !batch.startDate?.trim() ||
    !batch.endDate?.trim()
  ) {
    return null;
  }
  const startTime = batch.startTime?.trim() || "00:00";
  const endTime = batch.endTime?.trim() || "23:59";
  const start = new Date(`${batch.startDate.trim()}T${startTime}:00`);
  const end = new Date(`${batch.endDate.trim()}T${endTime}:59`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }
  return { startMs: start.getTime(), endMs: end.getTime() };
}

export function isBatchEndBeforeSaleStart(batch: Batch): boolean {
  const bounds = getBatchSalePeriodBounds(batch);
  if (!bounds) return false;
  return bounds.endMs < bounds.startMs;
}

export function parseLocalYmd(dateStr: string | undefined): Date | undefined {
  const s = dateStr?.trim();
  if (!s) return undefined;
  const parts = s.split("-");
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

export function buildTicketFormSnapshot(p: {
  ticketName: string;
  ticketDescription: string;
  selectedModality: string;
  distance: string;
  distanceUnit: string;
  gender: string;
  hasAgeRestriction: boolean;
  minAge: string;
  maxAge: string;
  hasKit: boolean;
  selectedGroupId: string;
  batches: Batch[];
  products: ProductData[];
}): string {
  const batchesNorm = p.batches.map((b) => ({
    id: b.id,
    quantity: b.quantity,
    price: b.price,
    quantitySold: b.quantitySold ?? 0,
    startType: b.startType,
    startDate: b.startDate ?? "",
    startTime: b.startTime ?? "",
    endDate: b.endDate ?? "",
    endTime: b.endTime ?? "",
  }));
  const productIds = p.products.map((x) => x.productId).join(",");
  return JSON.stringify({
    ticketName: p.ticketName,
    ticketDescription: p.ticketDescription,
    selectedModality: p.selectedModality,
    distance: p.distance,
    distanceUnit: p.distanceUnit,
    gender: p.gender,
    hasAgeRestriction: p.hasAgeRestriction,
    minAge: p.minAge,
    maxAge: p.maxAge,
    hasKit: p.hasKit,
    selectedGroupId: p.selectedGroupId,
    batches: batchesNorm,
    productIds,
  });
}

/** Dígitos e no máximo um ponto decimal (ex.: 6.1 km). Vírgula vira ponto. */
export function sanitizeDistanceInput(raw: string): string {
  const normalized = raw.replace(/,/g, ".").replace(/[^\d.]/g, "");
  const dot = normalized.indexOf(".");
  if (dot === -1) return normalized;
  return (
    normalized.slice(0, dot + 1) + normalized.slice(dot + 1).replace(/\./g, "")
  );
}
