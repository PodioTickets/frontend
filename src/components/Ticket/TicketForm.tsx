"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useOrganizerNavigate } from "@/hooks/useOrganizerNavigate";
import { useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { queryKeys } from "@/services/cache/QueryClient";
import { organizerService } from "@/services";
import { Button } from "@/components/Button";
import { ArrowButton } from "@/components/ArrowButton";
import { Dropdown, DropdownOption } from "@/components/Dropdown";
import { DatePicker } from "@/components/DatePicker";
import { TimePicker } from "@/components/TimePicker";
import { Input } from "@/components/Input";
import { Radio } from "@/components/Radio";
import { ImageWithInitialFallback } from "@/components/ImageWithInitialFallback";
import toast from "react-hot-toast";
import { Info, Plus, Trash2 } from "lucide-react";
import { PencilIcon } from "@/components/Icons/PencilIcon";
import { TrashIcon } from "@/components/Icons/TrashIcon";
import type {
  ModalityTemplate,
  ModalityGroup,
} from "@/services/organizer/OrganizerService";
import {
  useCreateProductModal,
  useAddExistingProductsModal,
} from "@/stores/modalStore";
import { Loading } from "../Loading";
import { UnsavedTicketChangesModal } from "./UnsavedTicketChangesModal";
import { DeleteTicketModal } from "./DeleteTicketModal";
import { TicketAdvancedKitDisplayOptions } from "./TicketAdvancedKitDisplayOptions";
import { cn } from "@/utils/cn";
import { useTickets } from "@/hooks/useTickets";
import { RemoveIcon } from "../Icons/RemoveIcon";
import { ExcludeIcon } from "../Icons/Organizer/ExcludeIcon";

// Types
export interface Batch {
  id: string;
  quantity: string;
  price: string;
  /** Quando > 0, o preço não pode mais ser editado (lote já teve vendas). */
  quantitySold?: number;
  startType: "date" | "previous";
  startDate?: string;
  startTime?: string;
  endDate?: string;
  endTime?: string;
}

export interface TicketFormData {
  ticketName: string;
  ticketDescription?: string;
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
}

export interface ProductData {
  id: string;
  product: Product;
  productId: string;
  ticketId: string;
}

export interface Product {
  id: string;
  name: string;
  image?: string;
  /** API retorna em centavos (number); exibição em reais */
  basePrice?: number | string;
  isIncludedInTicket?: boolean;
}

function formatProductPrice(value: number | string | undefined): string {
  if (value == null || value === "") return "0,00";
  if (typeof value === "number")
    return (value / 100).toFixed(2).replace(".", ",");
  return String(value);
}

/**
 * createProduct/updateProduct podem retornar o recurso direto ou embrulhado em `product` / `data`.
 */
function unwrapSavedProductFromApi(
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
  if (
    inner &&
    typeof inner === "object" &&
    ok(inner as Record<string, unknown>)
  ) {
    return inner as Record<string, unknown>;
  }
  const data = o.data;
  if (data && typeof data === "object" && ok(data as Record<string, unknown>)) {
    return data as Record<string, unknown>;
  }
  return null;
}

export interface TicketFormProps {
  eventId: string;
  ticketId?: string;
  initialGroupId?: string;
  initialData?: Partial<TicketFormData>;
  backUrl: string;
  mode: "create" | "edit";
  localStorageKey?: string;
  className?: string;
}

const defaultBatch: Batch = {
  id: "1",
  quantity: "",
  price: "",
  startType: "date",
};

function SortableTicketProductCard({
  product,
  onEdit,
  onRemove,
  dragDisabled,
}: {
  product: ProductData;
  onEdit: () => void;
  onRemove: () => void;
  dragDisabled?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: product.productId,
    disabled: dragDisabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-gray-2 border border-gray-6 rounded-xl flex flex-col flex-1 min-w-0 md:min-w-[287px] ${isDragging ? "z-10 opacity-70 shadow-lg ring-2 ring-primary-8/25" : ""
        } ${dragDisabled
          ? ""
          : "cursor-grab touch-none active:cursor-grabbing [&_.ticket-product-actions]:cursor-default"
        }`}
      {...(dragDisabled ? {} : attributes)}
      {...(dragDisabled ? {} : listeners)}
    >
      <div className="border-b border-gray-6 flex flex-col gap-3 p-3 md:flex-row md:items-center md:gap-3 md:p-4">
        <div className="relative mx-auto aspect-square w-full max-h-[132px] max-w-[132px] rounded border border-gray-6 overflow-hidden bg-gray-3 shrink-0 md:mx-0 md:size-[100px] md:max-h-none md:max-w-none md:aspect-auto">
          <ImageWithInitialFallback
            src={product.product.image}
            alt={product.product.name}
            name={product.product.name}
            fallbackId={product.productId}
            fill
            sizes="(max-width: 768px) 132px, 100px"
            className="size-full rounded border-transparent border-0"
            letterClassName="text-base font-semibold font-family-dm-sans"
          />
        </div>
        <div className="flex flex-col justify-center gap-1.5 flex-1 min-w-0 md:justify-between md:py-2 md:gap-2">
          <h3 className="text-gray-12 text-sm font-semibold font-family-dm-sans leading-[1.1] line-clamp-2 md:text-base md:truncate md:line-clamp-none">
            {product.product.name}
          </h3>
          <p className="text-gray-11 text-xs font-semibold font-family-dm-sans leading-[1.3] md:text-sm">
            {product.product.isIncludedInTicket
              ? "Valor incluso no ingresso"
              : `R$ ${formatProductPrice(product.product.basePrice)}`}
          </p>
        </div>
      </div>

      <div
        className="ticket-product-actions flex flex-row items-center justify-end gap-2 p-3 md:flex-col md:items-end md:justify-center md:p-4"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="flex gap-2 items-center">
          <button
            type="button"
            title="Editar"
            onClick={onEdit}
            className="bg-gray-2 border border-gray-6 rounded-lg size-9 flex items-center justify-center hover:bg-gray-3 transition-colors"
          >
            <PencilIcon className="size-5 text-gray-11" />
          </button>
          <button
            type="button"
            title="Remover"
            onClick={onRemove}
            className="bg-red-2 border border-red-6 rounded-lg size-9 flex items-center justify-center hover:bg-red-3 transition-colors"
          >
            <ExcludeIcon className="size-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

/** `id` de lote persistido no backend (UUID). Demais valores são só chave de UI. */
function isPersistedBatchId(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    id.trim(),
  );
}

/** Mesma regra de montagem de ISO usada no envio do formulário (início / fim da venda do lote). */
function getBatchSalePeriodBounds(
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

function isBatchEndBeforeSaleStart(batch: Batch): boolean {
  const bounds = getBatchSalePeriodBounds(batch);
  if (!bounds) return false;
  return bounds.endMs < bounds.startMs;
}

function parseLocalYmd(dateStr: string | undefined): Date | undefined {
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

function buildTicketFormSnapshot(p: {
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

const TICKET_DRAFT_TTL_MS = 24 * 60 * 60 * 1000;
const TICKET_DRAFT_VERSION = 1;

type TicketDraftStoredForm = {
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
};

type TicketDraftEnvelope = {
  v: number;
  savedAt: number;
  form: TicketDraftStoredForm;
};

function ticketDraftStorageKey(
  eventId: string,
  mode: "create" | "edit",
  ticketId?: string,
): string {
  if (mode === "edit" && ticketId)
    return `podioTicketDraft:v${TICKET_DRAFT_VERSION}:${eventId}:edit:${ticketId}`;
  return `podioTicketDraft:v${TICKET_DRAFT_VERSION}:${eventId}:create`;
}

function readTicketDraft(
  eventId: string,
  mode: "create" | "edit",
  ticketId?: string,
): TicketDraftStoredForm | null {
  if (typeof window === "undefined") return null;
  const key = ticketDraftStorageKey(eventId, mode, ticketId);
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TicketDraftEnvelope;
    if (
      !parsed ||
      parsed.v !== TICKET_DRAFT_VERSION ||
      typeof parsed.savedAt !== "number" ||
      !parsed.form ||
      typeof parsed.form !== "object"
    ) {
      localStorage.removeItem(key);
      return null;
    }
    if (Date.now() - parsed.savedAt > TICKET_DRAFT_TTL_MS) {
      localStorage.removeItem(key);
      return null;
    }
    return parsed.form;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
}

function writeTicketDraft(
  eventId: string,
  mode: "create" | "edit",
  ticketId: string | undefined,
  form: TicketDraftStoredForm,
): void {
  const env: TicketDraftEnvelope = {
    v: TICKET_DRAFT_VERSION,
    savedAt: Date.now(),
    form,
  };
  localStorage.setItem(
    ticketDraftStorageKey(eventId, mode, ticketId),
    JSON.stringify(env),
  );
}

function clearTicketDraft(
  eventId: string,
  mode: "create" | "edit",
  ticketId?: string,
): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ticketDraftStorageKey(eventId, mode, ticketId));
}

function applyTicketDraftForm(
  draft: TicketDraftStoredForm,
  a: {
    setTicketName: (v: string) => void;
    setTicketDescription: (v: string) => void;
    setSelectedModality: (v: string) => void;
    setDistance: (v: string) => void;
    setDistanceUnit: (v: string) => void;
    setGender: (v: string) => void;
    setHasAgeRestriction: (v: boolean) => void;
    setMinAge: (v: string) => void;
    setMaxAge: (v: string) => void;
    setHasKit: (v: boolean) => void;
    setSelectedGroupId: (v: string) => void;
    setBatches: (v: Batch[]) => void;
    setProducts: (v: ProductData[]) => void;
  },
): void {
  a.setTicketName(draft.ticketName ?? "");
  a.setTicketDescription(draft.ticketDescription ?? "");
  a.setSelectedModality(draft.selectedModality ?? "");
  a.setDistance(draft.distance ?? "");
  a.setDistanceUnit(draft.distanceUnit || "KM");
  a.setGender(draft.gender ?? "");
  a.setHasAgeRestriction(!!draft.hasAgeRestriction);
  a.setMinAge(draft.minAge ?? "");
  a.setMaxAge(draft.maxAge ?? "");
  a.setHasKit(!!draft.hasKit);
  a.setSelectedGroupId(draft.selectedGroupId ?? "");
  if (Array.isArray(draft.batches) && draft.batches.length > 0) {
    a.setBatches(draft.batches);
  }
  if (Array.isArray(draft.products)) {
    a.setProducts(draft.products);
  }
}

/** Dígitos e no máximo um ponto decimal (ex.: 6.1 km). Vírgula vira ponto. */
function sanitizeDistanceInput(raw: string): string {
  const normalized = raw.replace(/,/g, ".").replace(/[^\d.]/g, "");
  const dot = normalized.indexOf(".");
  if (dot === -1) return normalized;
  return (
    normalized.slice(0, dot + 1) + normalized.slice(dot + 1).replace(/\./g, "")
  );
}

export function TicketForm({
  eventId,
  ticketId,
  initialGroupId = "",
  initialData,
  backUrl,
  mode,
  localStorageKey,
  className = "",
}: TicketFormProps) {
  const orgNav = useOrganizerNavigate();
  const queryClient = useQueryClient();
  const { deleteTicket } = useTickets(eventId, !!eventId);
  const {
    openCreateProductModal,
    setOnModalSave: setOnCreateProductSave,
    setOnModalProductDelete: setOnCreateProductDelete,
  } = useCreateProductModal();
  const { openAddExistingProductsModal, setOnModalSave: setOnAddProductsSave } =
    useAddExistingProductsModal();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formBaseline, setFormBaseline] = useState<string | null>(null);
  const [ticketHydrateNonce, setTicketHydrateNonce] = useState(0);
  const [leavePromptOpen, setLeavePromptOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const guardPushedRef = useRef(false);
  const isDirtyRef = useRef(false);
  /** Evita que o sync isDirty → ref e o efeito do guard rodem durante saída confirmada (modal / rascunho). */
  const isNavigatingAwayRef = useRef(false);
  /** Um history.back() intencional (liberar guard) dispara popstate; sem isso o handler reabre o modal. */
  const skipUnsavedPopStateRef = useRef(false);
  const createBaselineScheduledRef = useRef(false);

  // Form state
  const [ticketName, setTicketName] = useState(initialData?.ticketName || "");
  const [ticketDescription, setTicketDescription] = useState(
    initialData?.ticketDescription || "",
  );
  const [selectedModality, setSelectedModality] = useState(
    initialData?.selectedModality || "",
  );
  const [distance, setDistance] = useState(initialData?.distance || "");
  const [distanceUnit, setDistanceUnit] = useState(
    initialData?.distanceUnit || "KM",
  );
  const [gender, setGender] = useState(initialData?.gender || "");
  const [hasAgeRestriction, setHasAgeRestriction] = useState(
    initialData?.hasAgeRestriction || false,
  );
  const [minAge, setMinAge] = useState(initialData?.minAge || "");
  const [maxAge, setMaxAge] = useState(initialData?.maxAge || "");
  const [hasKit, setHasKit] = useState(initialData?.hasKit || false);
  const [selectedGroupId, setSelectedGroupId] = useState(
    initialData?.selectedGroupId || initialGroupId || "",
  );
  const [batches, setBatches] = useState<Batch[]>(
    initialData?.batches || [defaultBatch],
  );
  /** Soma das quantidades dos lotes — usada no modal de produto como estoque padrão das variações. */
  const ticketBatchesTotalQuantity = useMemo(
    () =>
      batches.reduce((acc, b) => {
        const n = parseInt(String(b.quantity).trim(), 10);
        return acc + (Number.isFinite(n) ? n : 0);
      }, 0),
    [batches],
  );
  const [products, setProducts] = useState<ProductData[]>(
    initialData?.products || [],
  );
  const [activeProductDragId, setActiveProductDragId] = useState<string | null>(
    null,
  );
  const productDndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleTicketProductsDragStart = useCallback((e: DragStartEvent) => {
    setActiveProductDragId(e.active.id as string);
  }, []);

  const handleTicketProductsDragCancel = useCallback(() => {
    setActiveProductDragId(null);
  }, []);

  const handleTicketProductsDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveProductDragId(null);
      if (!over || active.id === over.id) return;

      const oldIndex = products.findIndex((p) => p.productId === active.id);
      const newIndex = products.findIndex((p) => p.productId === over.id);
      if (oldIndex < 0 || newIndex < 0) return;

      setProducts(arrayMove(products, oldIndex, newIndex));
    },
    [products],
  );

  const activeDragProduct = useMemo(
    () =>
      activeProductDragId
        ? products.find((p) => p.productId === activeProductDragId)
        : undefined,
    [activeProductDragId, products],
  );

  // Data from API
  const [modalityTemplates, setModalityTemplates] = useState<
    ModalityTemplate[]
  >([]);
  const [ticketCategories, setTicketCategories] = useState<ModalityGroup[]>([]);

  // Observação para o cliente (descrição do ingresso, não da categoria)
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editingDescription, setEditingDescription] = useState("");

  const effectiveTicketDescription = isEditingDescription
    ? editingDescription
    : ticketDescription;

  const currentFormSnapshot = useMemo(
    () =>
      buildTicketFormSnapshot({
        ticketName,
        ticketDescription: effectiveTicketDescription,
        selectedModality,
        distance,
        distanceUnit,
        gender,
        hasAgeRestriction,
        minAge,
        maxAge,
        hasKit,
        selectedGroupId,
        batches,
        products,
      }),
    [
      ticketName,
      effectiveTicketDescription,
      selectedModality,
      distance,
      distanceUnit,
      gender,
      hasAgeRestriction,
      minAge,
      maxAge,
      hasKit,
      selectedGroupId,
      batches,
      products,
    ],
  );

  const isDirty =
    formBaseline !== null && currentFormSnapshot !== formBaseline;

  // Refs for product management
  const productsRef = useRef(products);
  const isProcessingRef = useRef(false);

  useEffect(() => {
    productsRef.current = products;
  }, [products]);

  // Load form data from localStorage (only for create mode)
  useEffect(() => {
    if (mode !== "create" || !localStorageKey || !eventId) return;

    const saved = localStorage.getItem(localStorageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.ticketName) setTicketName(parsed.ticketName);
        if (parsed.ticketDescription !== undefined)
          setTicketDescription(parsed.ticketDescription || "");
        if (parsed.selectedModality)
          setSelectedModality(parsed.selectedModality);
        if (parsed.distance) setDistance(parsed.distance);
        if (parsed.distanceUnit) setDistanceUnit(parsed.distanceUnit);
        if (parsed.gender) setGender(parsed.gender);
        if (parsed.hasAgeRestriction !== undefined)
          setHasAgeRestriction(parsed.hasAgeRestriction);
        if (parsed.minAge) setMinAge(parsed.minAge);
        if (parsed.maxAge) setMaxAge(parsed.maxAge);
        if (parsed.hasKit !== undefined) setHasKit(parsed.hasKit);
        if (parsed.batches && Array.isArray(parsed.batches))
          setBatches(parsed.batches);
        if (parsed.selectedGroupId) setSelectedGroupId(parsed.selectedGroupId);
      } catch (e) {
        console.error("Error loading ticket form data from localStorage:", e);
      }
    }
  }, [mode, localStorageKey, eventId]);

  // Save form data to localStorage (only for create mode)
  const prevFormDataRef = useRef<string>("");
  useEffect(() => {
    if (mode !== "create" || !localStorageKey) return;

    const formDataToSave = {
      ticketName,
      ticketDescription,
      selectedModality,
      distance,
      distanceUnit,
      gender,
      hasAgeRestriction,
      minAge,
      maxAge,
      hasKit,
      batches,
      selectedGroupId,
    };
    const formDataString = JSON.stringify(formDataToSave);

    if (formDataString !== prevFormDataRef.current) {
      prevFormDataRef.current = formDataString;
      localStorage.setItem(localStorageKey, formDataString);
    }
  }, [
    mode,
    localStorageKey,
    ticketName,
    ticketDescription,
    selectedModality,
    distance,
    distanceUnit,
    gender,
    hasAgeRestriction,
    minAge,
    maxAge,
    hasKit,
    batches,
    selectedGroupId,
  ]);

  // Baseline inicial do formulário (criar: após carregar templates; editar: após hidratar ingresso)
  useEffect(() => {
    if (mode !== "create" || loading || createBaselineScheduledRef.current)
      return;
    createBaselineScheduledRef.current = true;
    const draft = readTicketDraft(eventId, "create");
    if (draft) {
      applyTicketDraftForm(draft, {
        setTicketName,
        setTicketDescription,
        setSelectedModality,
        setDistance,
        setDistanceUnit,
        setGender,
        setHasAgeRestriction,
        setMinAge,
        setMaxAge,
        setHasKit,
        setSelectedGroupId,
        setBatches,
        setProducts,
      });
      toast.success("Recuperamos um rascunho salvo neste dispositivo.");
    }
    setTicketHydrateNonce((n) => n + 1);
  }, [mode, loading, eventId]);

  useEffect(() => {
    if (ticketHydrateNonce === 0) return;
    setFormBaseline(
      buildTicketFormSnapshot({
        ticketName,
        ticketDescription: isEditingDescription
          ? editingDescription
          : ticketDescription,
        selectedModality,
        distance,
        distanceUnit,
        gender,
        hasAgeRestriction,
        minAge,
        maxAge,
        hasKit,
        selectedGroupId,
        batches,
        products,
      }),
    );
    // Intencional: capturar estado só quando o nonce de hydrate muda (não a cada tecla).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketHydrateNonce]);

  useEffect(() => {
    if (isNavigatingAwayRef.current) return;
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  useEffect(() => {
    if (isNavigatingAwayRef.current) return;
    if (!isDirty) {
      if (guardPushedRef.current) {
        guardPushedRef.current = false;
        window.history.back();
      }
      return;
    }
    if (!guardPushedRef.current) {
      window.history.pushState(
        { unsavedTicketGuard: true },
        "",
        window.location.href,
      );
      guardPushedRef.current = true;
    }
  }, [isDirty]);

  useEffect(() => {
    const onPopState = () => {
      if (skipUnsavedPopStateRef.current) {
        skipUnsavedPopStateRef.current = false;
        return;
      }
      if (!isDirtyRef.current) return;
      window.history.pushState(
        { unsavedTicketGuard: true },
        "",
        window.location.href,
      );
      setLeavePromptOpen(true);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  // Load API data (modality templates and categories)
  useEffect(() => {
    const loadData = async () => {
      if (!eventId) return;

      setLoading(true);
      try {
        const templates = await organizerService
          .getModalityTemplates()
          .catch(() => []);
        setModalityTemplates(templates);

        const groups = await organizerService
          .getTicketCategories(eventId)
          .catch(() => []);
        setTicketCategories(Array.isArray(groups) ? groups : []);
      } catch (error) {
        console.error("Error loading data:", error);
        toast.error("Erro ao carregar dados");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [eventId]);

  // Load existing ticket data (only for edit mode)
  useEffect(() => {
    const loadTicket = async () => {
      if (
        mode !== "edit" ||
        !ticketId ||
        !eventId ||
        modalityTemplates.length === 0
      )
        return;

      try {
        const ticket = await organizerService.getTicketById(ticketId);
        if (ticket) {
          const ticketData = ticket as {
            name?: string;
            groupId?: string;
            categoryId?: string;
            category?: { id?: string; name?: string };
            modality?: string;
            distance?: number;
            distanceUnit?: string;
            gender?: string;
            ageLimit?: { min?: number; max?: number };
            hasKit?: boolean;
            batches?: Array<{
              id?: string;
              quantity?: number;
              price?: number;
              quantitySold?: number;
              startDate?: string;
              endDate?: string;
            }>;
            products?: ProductData[];
            productIds?: string[];
          };

          setTicketName(ticketData.name || "");
          setTicketDescription((ticketData as any).description || "");
          // Prioriza categoryId, depois category.id, depois groupId (compatibilidade)
          const categoryId =
            ticketData.categoryId ||
            ticketData.category?.id ||
            ticketData.groupId ||
            "";
          setSelectedGroupId(categoryId);

          if (ticketData.modality) {
            const template = modalityTemplates.find(
              (t) => t.label === ticketData.modality,
            );
            if (template) {
              setSelectedModality(template.id);
            } else {
              setSelectedModality(ticketData.modality);
            }
          }

          setDistance(ticketData.distance?.toString() || "");
          setDistanceUnit(ticketData.distanceUnit || "KM");
          setGender(ticketData.gender || "");

          if (ticketData.ageLimit) {
            setHasAgeRestriction(true);
            setMinAge(ticketData.ageLimit.min?.toString() || "");
            setMaxAge(ticketData.ageLimit.max?.toString() || "");
          }

          setHasKit(ticketData.hasKit || false);

          // Load batches
          if (
            ticketData.batches &&
            Array.isArray(ticketData.batches) &&
            ticketData.batches.length > 0
          ) {
            const loadedBatches: Batch[] = ticketData.batches.map(
              (b, index) => {
                const quantitySold = b.quantitySold ?? 0;
                return {
                  id: b.id || `batch-${index}`,
                  quantity: b.quantity?.toString() || "",
                  price: b.price
                    ? `R$${(b.price / 100).toFixed(2).replace(".", ",")}`
                    : "",
                  quantitySold,
                  startType: b.startDate ? "date" : "previous",
                  startDate: b.startDate
                    ? b.startDate.split("T")[0]
                    : undefined,
                  startTime: b.startDate
                    ? new Date(b.startDate).toTimeString().slice(0, 5)
                    : undefined,
                  endDate: b.endDate ? b.endDate.split("T")[0] : undefined,
                  endTime: b.endDate
                    ? new Date(b.endDate).toTimeString().slice(0, 5)
                    : undefined,
                };
              },
            );
            setBatches(
              loadedBatches.length > 0 ? loadedBatches : [defaultBatch],
            );
          }

          console.log(ticketData);

          if (ticketData.products && Array.isArray(ticketData.products)) {
            setProducts(ticketData.products);
          } else if (
            ticketData.productIds &&
            Array.isArray(ticketData.productIds)
          ) {
            try {
              const productIdsToLoad = ticketData.productIds;
              const productsResponse =
                await organizerService.getProducts(eventId);
              const allProducts = productsResponse?.products || [];
              const loadedProducts = productIdsToLoad
                .map((id: string) =>
                  allProducts.find((p: Product) => p.id === id),
                )
                .filter((p): p is Product => p != null)
                .map(
                  (p: Product): ProductData => ({
                    id: p.id,
                    product: p,
                    productId: p.id,
                    ticketId: ticketId || "",
                  }),
                );
              setProducts(loadedProducts);
            } catch (e) {
              console.error("Error loading products:", e);
            }
          }
          const draftForm = readTicketDraft(eventId, "edit", ticketId);
          if (draftForm) {
            applyTicketDraftForm(draftForm, {
              setTicketName,
              setTicketDescription,
              setSelectedModality,
              setDistance,
              setDistanceUnit,
              setGender,
              setHasAgeRestriction,
              setMinAge,
              setMaxAge,
              setHasKit,
              setSelectedGroupId,
              setBatches,
              setProducts,
            });
            toast.success("Recuperamos um rascunho salvo neste dispositivo.");
          }
          setTicketHydrateNonce((n) => n + 1);
        } else {
          toast.error("Ingresso não encontrado");
          orgNav.push(backUrl);
        }
      } catch (error) {
        console.error("Error loading ticket:", error);
        toast.error("Erro ao carregar ingresso");
      }
    };

    loadTicket();
  }, [mode, ticketId, eventId, modalityTemplates, orgNav, backUrl]);

  // Setup modal callbacks
  useEffect(() => {
    const createProductCallback = async (data: { product?: unknown }) => {
      try {
        const entity = unwrapSavedProductFromApi(data?.product);
        if (!entity) {
          toast.error(
            "Não foi possível obter os dados do produto após salvar.",
          );
          return;
        }

        let formattedBasePrice: string | undefined = undefined;
        const bp = entity.basePrice;
        if (bp !== undefined && bp !== null) {
          if (typeof bp === "number") {
            formattedBasePrice = (bp / 100).toFixed(2).replace(".", ",");
          } else if (typeof bp === "string") {
            formattedBasePrice = bp;
          }
        }

        const id = String(entity.id ?? "").trim();
        const name = String(entity.name ?? "").trim();
        const normalizedProduct: Product = {
          id,
          name,
          image: typeof entity.image === "string" ? entity.image : undefined,
          isIncludedInTicket: entity.isIncludedInTicket !== false,
          basePrice: formattedBasePrice,
        };

        if (!id || !name) {
          toast.error("Dados do produto inválidos");
          return;
        }

        setProducts((prevProducts) => {
          const existingIndex = prevProducts.findIndex(
            (p) => p.productId === normalizedProduct.id,
          );
          if (existingIndex >= 0) {
            const updated = [...prevProducts];
            updated[existingIndex] = {
              id: normalizedProduct.id,
              product: normalizedProduct,
              productId: normalizedProduct.id,
              ticketId: prevProducts[existingIndex].ticketId,
            };
            return updated;
          }
          const newTicketId = ticketId || "";
          return [
            ...prevProducts,
            {
              id: normalizedProduct.id,
              product: normalizedProduct,
              productId: normalizedProduct.id,
              ticketId: newTicketId,
            },
          ];
        });
      } catch (error) {
        console.error("Error in createProductCallback:", error);
      }
    };

    const addProductsCallback = async (data: { products?: Product[] }) => {
      if (isProcessingRef.current) return;
      isProcessingRef.current = true;

      try {
        if (
          data?.products &&
          Array.isArray(data.products) &&
          data.products.length > 0
        ) {
          const currentProducts = productsRef.current;
          const existingIds = new Set(currentProducts.map((p) => p.id));
          const newProducts = data.products.filter(
            (p) => p && p.id && !existingIds.has(p.id),
          );

          if (newProducts.length > 0) {
            setProducts((prevProducts) => {
              const prevIds = new Set(prevProducts.map((p) => p.productId));
              const finalNewProducts = newProducts.filter(
                (p) => !prevIds.has(p.id),
              );
              if (finalNewProducts.length > 0) {
                return [
                  ...prevProducts,
                  ...finalNewProducts.map((p) => ({
                    id: p.id,
                    product: p,
                    productId: p.id,
                    ticketId:
                      prevProducts.find((pp) => pp.productId === p.id)
                        ?.ticketId || "",
                  })),
                ];
              }
              return prevProducts.map((p) => ({
                id: p.id,
                product: p.product,
                productId: p.productId,
                ticketId: p.ticketId,
              }));
            });
            toast.success(
              `${newProducts.length} produto(s) adicionado(s) ao ingresso`,
            );
          } else {
            toast.error("Produto(s) já adicionado(s) ao ingresso");
          }
        }
      } catch (error) {
        console.error("Error in addProductsCallback:", error);
        throw error;
      } finally {
        setTimeout(() => {
          isProcessingRef.current = false;
        }, 100);
      }
    };

    const deleteProductCallback = async (payload: { productId?: string }) => {
      const id = String(payload?.productId ?? "").trim();
      if (!id) return;
      setProducts((prev) => prev.filter((p) => p.productId !== id));
    };

    setOnCreateProductSave(createProductCallback);
    setOnCreateProductDelete(deleteProductCallback);
    setOnAddProductsSave(addProductsCallback);

    return () => {
      setOnCreateProductSave(undefined);
      setOnCreateProductDelete(undefined);
      setOnAddProductsSave(undefined);
    };
  }, [setOnCreateProductSave, setOnCreateProductDelete, setOnAddProductsSave, ticketId]);

  const releaseUnsavedHistoryGuard = () => {
    if (guardPushedRef.current) {
      guardPushedRef.current = false;
      orgNav.push(`/organizer/events/${eventId}/edit/tickets`);
    }
  };

  /** Sai da página do ingresso após confirmar no modal: não reabrir o modal no popstate do history.back(). */
  const leaveTicketPageAfterDiscardPrompt = () => {
    isNavigatingAwayRef.current = true;
    isDirtyRef.current = false;
    if (guardPushedRef.current) {
      skipUnsavedPopStateRef.current = true;
    }
    releaseUnsavedHistoryGuard();
    orgNav.push(`/organizer/events/${eventId}/edit/tickets`);
  };

  // Handlers
  const handleBack = () => {
    if (isDirty) {
      setLeavePromptOpen(true);
      return;
    }
    orgNav.push(`/organizer/events/${eventId}/edit/tickets`);
  };

  const handleConfirmDeleteTicket = useCallback(async () => {
    if (!ticketId) return;
    await deleteTicket(ticketId);
    window.dispatchEvent(new CustomEvent("ticketCreated"));
    orgNav.push(backUrl);
  }, [ticketId, deleteTicket, orgNav, backUrl]);

  const handleSaveDraftAndLeave = () => {
    try {
      const formPayload: TicketDraftStoredForm = {
        ticketName,
        ticketDescription: isEditingDescription
          ? editingDescription
          : ticketDescription,
        selectedModality,
        distance,
        distanceUnit,
        gender,
        hasAgeRestriction,
        minAge,
        maxAge,
        hasKit,
        selectedGroupId,
        batches,
        products,
      };
      writeTicketDraft(eventId, mode, ticketId, formPayload);
      toast.success(
        "Rascunho salvo neste dispositivo. Expira em 24 horas ou ao salvar o ingresso.",
      );
      setLeavePromptOpen(false);
      leaveTicketPageAfterDiscardPrompt();
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível salvar o rascunho.");
    }
  };

  const handleAddBatch = () => {
    const newBatch: Batch = {
      id: Date.now().toString(),
      quantity: "",
      price: "",
      startType: "date",
    };
    setBatches([...batches, newBatch]);
  };

  const handleRemoveBatch = (batchId: string) => {
    if (batches.length === 1) {
      toast.error("Pelo menos um lote é obrigatório");
      return;
    }
    setBatches(batches.filter((b) => b.id !== batchId));
  };

  const handleBatchChange = (
    batchId: string,
    field: keyof Batch,
    value: string,
  ) => {
    const batch = batches.find((b) => b.id === batchId);
    if (!batch) return;

    if (field === "price") {
      if ((batch.quantitySold ?? 0) > 0) return;
    }

    setBatches(
      batches.map((b) => (b.id === batchId ? { ...b, [field]: value } : b)),
    );
  };

  const handleBatchSalePeriodChange = (
    batchId: string,
    field: "startDate" | "startTime" | "endDate" | "endTime",
    value: string | undefined,
  ) => {
    const normalized = value ?? "";
    setBatches((prev) => {
      const batch = prev.find((b) => b.id === batchId);
      if (!batch) return prev;

      let next: Batch = { ...batch, [field]: normalized };

      if (
        field === "startDate" &&
        batch.startType === "date" &&
        normalized.trim() !== (batch.startDate?.trim() ?? "")
      ) {
        next = {
          ...next,
          endDate: "",
          endTime: "",
        };
      }

      if (isBatchEndBeforeSaleStart(next)) {
        toast.error(
          "A data de término da venda não pode ser anterior à data de início.",
        );
        return prev;
      }
      return prev.map((b) => (b.id === batchId ? next : b));
    });
  };

  /** Confirma a observação só no estado local; persistência no botão «Salvar alterações». */
  const handleCommitDescriptionField = () => {
    const trimmed = editingDescription.trim();
    setTicketDescription(trimmed);
    setIsEditingDescription(false);
  };

  const handleCancelDescription = () => {
    setEditingDescription(ticketDescription);
    setIsEditingDescription(false);
  };

  const handleSubmit = async (): Promise<boolean> => {
    // Validation
    if (!ticketName.trim()) {
      toast.error("Nome do ingresso é obrigatório");
      return false;
    }

    if (!selectedModality) {
      toast.error("Selecione uma modalidade");
      return false;
    }

    if (!batches[0]?.quantity || !batches[0]?.price) {
      toast.error("Lote 1 deve ter quantidade e preço preenchidos");
      return false;
    }

    const invalidBatch = batches.find((b) => {
      const sold = b.quantitySold ?? 0;
      if (sold <= 0) return false;
      const q = parseInt(b.quantity, 10);
      return Number.isNaN(q) || q < sold;
    });
    if (invalidBatch) {
      const sold = invalidBatch.quantitySold ?? 0;
      toast.error(
        `A quantidade de vagas precisa ser igual ou maior que o número já vendido (${sold}) em cada lote com vendas.`,
      );
      return false;
    }

    const batchWithInvalidPeriod = batches.findIndex(isBatchEndBeforeSaleStart);
    if (batchWithInvalidPeriod !== -1) {
      toast.error(
        `No lote ${batchWithInvalidPeriod + 1}, a data de término da venda não pode ser anterior à data de início.`,
      );
      return false;
    }

    if (!eventId) {
      toast.error("Evento não encontrado");
      return false;
    }

    setSaving(true);
    try {
      const modalityLabel =
        modalityTemplates.find((t) => t.id === selectedModality)?.label ||
        selectedModality;
      const descriptionToPersist = (
        isEditingDescription ? editingDescription : ticketDescription
      ).trim();
      const ticketData = {
        name: ticketName.trim(),
        description: descriptionToPersist || undefined,
        categoryId: selectedGroupId || initialGroupId || undefined,
        modality: modalityLabel,
        distance: distance || undefined,
        distanceUnit: distanceUnit || "KM",
        gender: gender || undefined,
        ageLimit:
          hasAgeRestriction && (minAge || maxAge)
            ? {
              min: minAge ? parseInt(minAge) : undefined,
              max: maxAge ? parseInt(maxAge) : undefined,
            }
            : undefined,
        hasKit: hasKit || false,
        productIds: products.map((p) => p.productId),
        batches: batches.map((b) => {
          // Convert price from "R$129,90" format to number in cents
          const priceString = b.price.replace(/[^\d,]/g, "").replace(",", ".");
          const priceInReais = parseFloat(priceString) || 0;
          // Convert to cents (multiply by 100) to ensure 2 decimal places are preserved
          const priceInCents = Math.round(priceInReais * 100);

          const startDate =
            b.startType === "date" && b.startDate
              ? `${b.startDate}T${b.startTime || "00:00"}:00`
              : undefined;
          const endDate = b.endDate
            ? `${b.endDate}T${b.endTime || "23:59"}:59`
            : undefined;

          const base = {
            quantity: parseInt(b.quantity, 10) || 0,
            price: priceInCents,
            ...(startDate ? { startDate } : {}),
            ...(endDate ? { endDate } : {}),
          };

          // PATCH/PUT: lote já salvo envia `id` (UUID); lote novo omite `id`
          if (mode === "edit" && ticketId && isPersistedBatchId(b.id)) {
            return { id: b.id, ...base };
          }
          return base;
        }),
      };

      if (mode === "edit" && ticketId) {
        await organizerService.updateTicket(eventId, ticketId, ticketData);
        toast.success("Ingresso atualizado com sucesso!");
      } else {
        await organizerService.createTicket(eventId, ticketData);
        toast.success("Ingresso criado com sucesso!");
      }

      // Invalidate and refetch queries
      await queryClient.invalidateQueries({
        queryKey: queryKeys.events.tickets(eventId),
      });
      await queryClient.refetchQueries({
        queryKey: queryKeys.events.tickets(eventId),
      });

      // Dispatch custom event
      window.dispatchEvent(new CustomEvent("ticketCreated"));

      // Clear localStorage if in create mode
      if (mode === "create" && localStorageKey) {
        localStorage.removeItem(localStorageKey);
      }
      clearTicketDraft(eventId, mode, ticketId);

      setTicketDescription(descriptionToPersist);
      setEditingDescription(descriptionToPersist);
      setIsEditingDescription(false);

      // Antes de history.back(): o popstate handler usa isDirtyRef; se ainda estiver true, abre o modal de saída.
      setFormBaseline(
        buildTicketFormSnapshot({
          ticketName,
          ticketDescription: descriptionToPersist,
          selectedModality,
          distance,
          distanceUnit,
          gender,
          hasAgeRestriction,
          minAge,
          maxAge,
          hasKit,
          selectedGroupId,
          batches,
          products,
        }),
      );
      isDirtyRef.current = false;

      releaseUnsavedHistoryGuard();
      // replace + frame seguinte: evita corrida entre history.back() do guard e o App Router
      requestAnimationFrame(() => {
        orgNav.replace(backUrl);
      });
      return true;
    } catch (error: unknown) {
      console.error("Error saving ticket:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : (error as { response?: { data?: { message?: string } } })?.response
            ?.data?.message || "Erro ao salvar ingresso";
      toast.error(errorMessage);
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Build dropdown options — "Outros" sempre por último (alinhado a constants)
  const modalityOptions: DropdownOption[] = (() => {
    const mapped = modalityTemplates.map((template) => ({
      id: template.id,
      label: template.label,
      icon: template.icon,
      onClick: () => setSelectedModality(template.id),
    }));
    const isOutros = (o: DropdownOption) =>
      o.id === "outros" || o.label?.trim().toLowerCase() === "outros";
    return [
      ...mapped.filter((o) => !isOutros(o)),
      ...mapped.filter((o) => isOutros(o)),
    ];
  })();

  const genderOptions: DropdownOption[] = [
    { id: "all", label: "Geral", onClick: () => setGender("all") },
    { id: "male", label: "Masculino", onClick: () => setGender("male") },
    { id: "female", label: "Feminino", onClick: () => setGender("female") },
  ];

  const groupOptions: DropdownOption[] = [
    { id: "", label: "Sem categoria", onClick: () => setSelectedGroupId("") },
    ...(Array.isArray(ticketCategories)
      ? ticketCategories.map((group) => ({
        id: group.id,
        label: group.name,
        onClick: () => setSelectedGroupId(group.id),
      }))
      : []),
  ];

  const selectedModalityLabel =
    modalityTemplates.find((t) => t.id === selectedModality)?.label ||
    "Selecione";
  const selectedGenderLabel =
    genderOptions.find((g) => g.id === gender)?.label || "Selecionar";
  const selectedGroupLabel = Array.isArray(ticketCategories)
    ? ticketCategories.find((g) => g.id === selectedGroupId)?.name ||
    (initialGroupId
      ? ticketCategories.find((g) => g.id === initialGroupId)?.name
      : "Sem categoria")
    : "Sem categoria";

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loading />
      </div>
    );
  }

  return (
    <div className={cn(className, "max-md:pb-20")}>
      <div className="w-full flex flex-col gap-9">
        {/* Title Section */}
        <div className="flex flex-wrap items-center gap-2 border-gray-6 pb-3 pt-3 max-md:border-b md:gap-3 md:border-0 md:pb-0 -mx-4 px-4">
          <button
            type="button"
            onClick={handleBack}
            className="md:border border-gray-6 rotate-180 flex items-center justify-center hover:bg-gray-3 transition-colors cursor-pointer shrink-0 size-8 rounded-lg md:size-9 md:rounded-[52px]"
          >
            <ArrowButton isOpen={false} />
          </button>
          <h1 className="text-gray-12 min-w-0 font-manrope text-base font-extrabold leading-[1.1] md:font-dm-sans md:text-[28px] md:font-bold">
            {mode === "edit" ? "Editar ingresso" : "Criação de ingresso"}
          </h1>
        </div>

        {/* Form Section */}
        <div className="flex flex-col gap-9">
          {/* Nome do ingresso */}
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-2">
              <label className="text-gray-12 text-base font-family-dm-sans leading-[1.1]">
                Nome do ingresso
              </label>
              <Input
                value={ticketName}
                onChange={(e) => setTicketName(e.target.value)}
                placeholder="Ex: 5K"
                maxLength={120}
                showCharCount
                className="h-12"
              />
            </div>

            <div className="w-full">
              {isEditingDescription ? (
                <input
                  type="text"
                  value={editingDescription}
                  onChange={(e) => setEditingDescription(e.target.value)}
                  onBlur={handleCommitDescriptionField}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleCommitDescriptionField();
                    } else if (e.key === "Escape") {
                      handleCancelDescription();
                    }
                  }}
                  placeholder="Adicione uma observação para o cliente..."
                  className="text-gray-11 font-normal font-manrope leading-[1.4] bg-transparent border-b border-gray-6 focus:outline-none focus:border-primary-8 w-full"
                  autoFocus
                />
              ) : (
                <div className="flex items-center gap-2">
                  {ticketDescription ? (
                    <p
                      onClick={() => {
                        setIsEditingDescription(true);
                        setEditingDescription(ticketDescription);
                      }}
                      className="text-gray-11 font-normal font-manrope leading-[1.4] w-full cursor-text hover:text-gray-12 transition-colors"
                    >
                      {ticketDescription}
                    </p>
                  ) : (
                    <p
                      onClick={() => {
                        setIsEditingDescription(true);
                        setEditingDescription("");
                      }}
                      className="text-gray-11 font-normal font-manrope leading-[1.4] w-full cursor-text hover:text-gray-11 transition-colors"
                    >
                      Adicione uma observação para o cliente...
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Restrição de idade */}
          <div className="flex flex-col gap-2">
            <label className="text-gray-12 text-base font-family-dm-sans leading-[1.1]">
              Restrição de idade
            </label>
            <div className="flex flex-col gap-2">
              <p className="text-gray-11 text-sm font-family-dm-sans leading-[1.3]">
                Esse evento tem restrição de idade?
              </p>
              <div className="flex gap-4 mt-2">
                <div className="flex items-center gap-2">
                  <Radio
                    name="ageRestriction"
                    checked={hasAgeRestriction}
                    onChange={() => setHasAgeRestriction(true)}
                  />
                  <span className="text-gray-12 text-base font-family-dm-sans">
                    Sim
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Radio
                    name="ageRestriction"
                    checked={!hasAgeRestriction}
                    onChange={() => setHasAgeRestriction(false)}
                  />
                  <span className="text-gray-12 text-base font-family-dm-sans">
                    Não
                  </span>
                </div>
              </div>
            </div>
            {hasAgeRestriction && (
              <div className="flex flex-col gap-3 mt-2 sm:flex-row sm:items-start">
                <div className="flex flex-col gap-2 w-full sm:w-max sm:flex-1 sm:min-w-0">
                  <label className="text-gray-12 text-base font-family-dm-sans leading-[1.1]">
                    Idade mínima
                  </label>
                  <Input
                    value={minAge}
                    onChange={(e) => setMinAge(e.target.value)}
                    placeholder="Ex: 18 anos"
                    className="h-12"
                  />
                </div>
                <div className="flex flex-col gap-2 w-full sm:w-max sm:flex-1 sm:min-w-0">
                  <label className="text-gray-12 text-base font-family-dm-sans leading-[1.1]">
                    Idade máxima
                  </label>
                  <Input
                    value={maxAge}
                    onChange={(e) => setMaxAge(e.target.value)}
                    placeholder="Ex: 35 anos"
                    className="h-12"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-start">
            {/* Modalidades */}
            <div className="flex flex-col gap-2 w-full shrink-0 md:w-auto">
              <label className="text-gray-12 text-base font-family-dm-sans leading-[1.1]">
                Modalidades
              </label>
              <Dropdown
                options={modalityOptions}
                trigger={(isOpen) => (
                  <button
                    type="button"
                    className="border border-gray-6 rounded-lg h-12 flex items-center justify-between px-3 w-full md:w-[250px] hover:bg-gray-3 transition-colors"
                  >
                    <span
                      className={`text-base font-family-dm-sans ${selectedModality ? "text-gray-12" : "text-gray-11"
                        }`}
                    >
                      {selectedModalityLabel}
                    </span>
                    <ArrowButton isOpen={isOpen} />
                  </button>
                )}
                onSelect={(option) => setSelectedModality(option.id || "")}
              />
            </div>

            {/* Distância de prova */}
            <div className="flex flex-col gap-2 w-full shrink-0 md:w-auto">
              <label className="text-gray-12 text-base font-family-dm-sans leading-[1.1]">
                Distância de prova
              </label>
              <div className="border border-gray-6 rounded-lg flex gap-[10px] items-center px-3 py-4 h-12 w-full md:w-max">
                <div className="flex flex-1 gap-1 items-center min-w-0">
                  <Input
                    type="text"
                    value={distance}
                    onChange={(e) =>
                      setDistance(sanitizeDistanceInput(e.target.value))
                    }
                    placeholder="10"
                    className="h-auto border-0 p-0 focus-visible:ring-0 focus-visible:border-0 shadow-none text-base font-family-dm-sans text-gray-11 placeholder:text-gray-11 focus:outline-none focus:border-0 rounded-none"
                  />
                </div>
                <div className="relative shrink-0">
                  <Dropdown
                    options={[
                      {
                        id: "KM",
                        label: "KM",
                        onClick: () => setDistanceUnit("KM"),
                      },
                      {
                        id: "M",
                        label: "M",
                        onClick: () => setDistanceUnit("M"),
                      },
                    ]}
                    trigger={(isOpen) => (
                      <div className="border border-gray-6 rounded-lg flex gap-2 items-center px-3 py-2 cursor-pointer hover:bg-gray-3 transition-colors">
                        <div className="flex gap-1 items-center">
                          <p className="text-gray-11 text-sm font-family-dm-sans leading-[1.3]">
                            {distanceUnit}
                          </p>
                        </div>
                        <div className="flex items-center justify-center shrink-0">
                          <ArrowButton isOpen={isOpen} />
                        </div>
                      </div>
                    )}
                    onSelect={(option) => setDistanceUnit(option.id || "KM")}
                    position="bottom"
                    align="end"
                    className="right-0"
                  />
                </div>
              </div>
            </div>

            {Array.isArray(ticketCategories) && ticketCategories.length > 0 ? (
              <div className="flex flex-col gap-2 w-full md:flex-1 md:min-w-[200px]">
                <label className="text-gray-12 text-base font-family-dm-sans leading-[1.1]">
                  Categoria
                </label>
                <Dropdown
                  options={groupOptions}
                  width="w-full"
                  trigger={(isOpen) => (
                    <button
                      type="button"
                      className="border border-gray-6 rounded-lg h-12 flex items-center justify-between px-3 w-full hover:bg-gray-3 transition-colors"
                    >
                      <span
                        className={`text-base font-family-dm-sans ${selectedGroupId || initialGroupId
                          ? "text-gray-12"
                          : "text-gray-11"
                          }`}
                      >
                        {selectedGroupId || initialGroupId
                          ? selectedGroupLabel
                          : "Sem categoria"}
                      </span>
                      <ArrowButton isOpen={isOpen} />
                    </button>
                  )}
                  onSelect={(option) => setSelectedGroupId(option.id || "")}
                />
              </div>
            ) : null}
          </div>

          {/* Gênero */}
          <div className="flex flex-col gap-2">
            <label className="text-gray-12 text-base font-family-dm-sans leading-[1.1]">
              Gênero
            </label>
            <p className="text-gray-11 text-sm font-family-dm-sans leading-[1.3]">
              Selecione um gênero para este ingresso ou deixe como “Geral” para
              todos.
            </p>
            <Dropdown
              options={genderOptions}
              trigger={(isOpen) => (
                <button
                  type="button"
                  className="border border-gray-6 rounded-lg h-12 flex items-center justify-between px-3 w-full md:w-[250px] hover:bg-gray-3 transition-colors"
                >
                  <span
                    className={`text-base font-family-dm-sans ${gender ? "text-gray-12" : "text-gray-11"}`}
                  >
                    {selectedGenderLabel}
                  </span>
                  <ArrowButton isOpen={isOpen} />
                </button>
              )}
              onSelect={(option) => setGender(option.id || "")}
            />
          </div>

          {/* Lotes do ingresso */}
          <div className="flex flex-col gap-6 bg-gray-3 border border-gray-6 rounded-xl p-4">
            <div className="flex flex-col gap-2">
              <h2 className="text-gray-12 text-lg font-semibold font-family-dm-sans leading-[1.1]">
                Lotes do ingresso
              </h2>
              <p className="text-gray-11 text-base font-family-dm-sans leading-[1.3]">
                Defina a quantidade, o período de venda e o valor de cada lote.
                Você pode criar vários lotes.
              </p>
            </div>

            {batches.map((batch, index) => {
              const sold = batch.quantitySold ?? 0;
              const qtyParsed =
                batch.quantity.trim() === ""
                  ? NaN
                  : parseInt(batch.quantity, 10);
              const qtyNum = Number.isNaN(qtyParsed) ? 0 : qtyParsed;
              const quantityBelowSold =
                sold > 0 && !Number.isNaN(qtyParsed) && qtyParsed < sold;
              const priceLocked = sold > 0;

              return (
                <div
                  key={batch.id}
                  className="flex flex-col gap-4 p-5 bg-gray-2 border border-gray-6 rounded-xl"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-gray-12 text-lg font-bold font-family-dm-sans leading-[1.1]">
                      Lote {index + 1} {index === 0 && "(Obrigatório)"}
                    </h3>
                    {index > 0 && (
                      <button
                        type="button"
                        title="Remover lote"
                        onClick={() => handleRemoveBatch(batch.id)}
                        className="text-red-11 hover:text-red-12 transition-colors"
                      >
                        <Trash2 className="size-5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <label className="text-gray-12 text-sm font-family-dm-sans">
                        Quantidade de vagas
                      </label>
                      <Input
                        type="text"
                        inputMode="numeric"
                        autoComplete="off"
                        value={batch.quantity}
                        onChange={(e) =>
                          handleBatchChange(
                            batch.id,
                            "quantity",
                            e.target.value.replace(/\D/g, ""),
                          )
                        }
                        placeholder="Ex: 500"
                        className="h-12"
                      />

                      {sold >= 1 && (
                        <div className="flex items-start gap-1">
                          <Info className="size-5 text-gray-11 shrink-0" />
                          <span className="text-gray-11 text-base font-normal font-family-dm-sans leading-[1.3]">
                            {sold} vaga{sold === 1 ? "" : "s"}{" "}
                            {sold === 1 ? "foi" : "foram"} vendida
                            {sold === 1 ? "" : "s"}.
                            {quantityBelowSold && (
                              <span className="block mt-0.5 text-red-11">
                                A quantidade precisa ser superior ao total
                                vendido.
                              </span>
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-gray-12 text-sm font-family-dm-sans">
                        Preço do ingresso
                      </label>
                      <Input
                        type="text"
                        value={batch.price}
                        onChange={(e) => {
                          if (priceLocked) return;
                          const value = e.target.value.replace(/\D/g, "");
                          const formatted = value
                            ? `R$${(parseInt(value) / 100).toFixed(2).replace(".", ",")}`
                            : "";
                          handleBatchChange(batch.id, "price", formatted);
                        }}
                        placeholder="R$0,00"
                        readOnly={priceLocked}
                        className={`h-12 ${priceLocked ? "bg-gray-4 text-gray-11 cursor-not-allowed" : ""}`}
                      />
                      {priceLocked && (
                        <div className="flex items-center gap-1">
                          <Info className="size-5 text-gray-11" />
                          <span className="text-gray-11 text-base font-normal font-family-dm-sans leading-[1.3]">
                            Preço não pode ser alterado — já possui vendas
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {index > 0 && (
                    <>
                      <div className="flex flex-col gap-2">
                        <p className="text-gray-12 text-sm font-family-dm-sans">
                          Como este lote começa a ser vendido?
                        </p>
                        <div className="flex gap-4">
                          <div className="flex items-center gap-2">
                            <Radio
                              name={`startType-${batch.id}`}
                              checked={batch.startType === "date"}
                              onChange={() =>
                                handleBatchChange(batch.id, "startType", "date")
                              }
                            />
                            <span className="text-gray-12 text-sm font-family-dm-sans">
                              Por data
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Radio
                              name={`startType-${batch.id}`}
                              checked={batch.startType === "previous"}
                              onChange={() =>
                                handleBatchChange(
                                  batch.id,
                                  "startType",
                                  "previous",
                                )
                              }
                            />
                            <span className="text-gray-12 text-sm font-family-dm-sans">
                              Quando esgotar o lote anterior
                            </span>
                          </div>
                        </div>
                      </div>

                      {batch.startType === "date" && (
                        <div className="flex flex-col gap-6 md:flex-row md:gap-10">
                          <div className="flex flex-col gap-2 w-full md:w-max">
                            <label className="text-gray-12 text-sm font-family-dm-sans">
                              Data de início
                            </label>
                            <div className="flex gap-2">
                              <DatePicker
                                value={batch.startDate}
                                onChange={(value) =>
                                  handleBatchSalePeriodChange(
                                    batch.id,
                                    "startDate",
                                    value,
                                  )
                                }
                                maxDate={parseLocalYmd(batch.endDate)}
                                className="w-max"
                              />
                              <TimePicker
                                value={batch.startTime}
                                onChange={(value) =>
                                  handleBatchSalePeriodChange(
                                    batch.id,
                                    "startTime",
                                    value,
                                  )
                                }
                                className="w-max"
                              />
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 w-full md:w-max">
                            <label className="text-gray-12 text-sm font-family-dm-sans">
                              Data de Término
                            </label>
                            <div className="flex gap-2">
                              <DatePicker
                                value={batch.endDate}
                                onChange={(value) =>
                                  handleBatchSalePeriodChange(
                                    batch.id,
                                    "endDate",
                                    value,
                                  )
                                }
                                minDate={parseLocalYmd(batch.startDate)}
                                className="w-max"
                              />
                              <TimePicker
                                value={batch.endTime}
                                onChange={(value) =>
                                  handleBatchSalePeriodChange(
                                    batch.id,
                                    "endTime",
                                    value,
                                  )
                                }
                                className="w-max"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}

            <div className="flex justify-center w-full">
              <Button
                variant="outline"
                onClick={handleAddBatch}
                className="border-gray-6 text-gray-12 w-full"
              >
                <Plus className="size-5" />
                Adicionar lote
              </Button>
            </div>
          </div>

          {/* Este ingresso possui kit? */}
          <div className="flex flex-col gap-4">
            <label className="text-gray-12 text-base font-family-dm-sans leading-[1.1]">
              Este ingresso possui kit?
            </label>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <Radio
                  name="hasKit"
                  checked={hasKit}
                  onChange={() => setHasKit(true)}
                />
                <span className="text-gray-12 text-base font-family-dm-sans">
                  Sim
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Radio
                  name="hasKit"
                  checked={!hasKit}
                  onChange={() => setHasKit(false)}
                />
                <span className="text-gray-12 text-base font-family-dm-sans">
                  Não
                </span>
              </div>
            </div>
          </div>

          {hasKit && (
            <div
              id="ticket-form-kit-products"
              className="flex flex-col gap-6 bg-gray-3 border border-gray-6 rounded-xl p-4"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-6">
                <div className="flex flex-col gap-2">
                  <h2 className="text-gray-12 text-lg font-semibold font-family-dm-sans leading-[1.1]">
                    Produtos do Ingresso
                  </h2>
                  <p className="text-gray-11 text-base font-family-dm-sans leading-[1.3]">
                    Adicione e gerencie os produtos do kit que ficarão
                    disponíveis neste ingresso.
                  </p>
                </div>
                <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:shrink-0">
                  <Button
                    variant="outline"
                    className="border-gray-6 text-gray-12 w-full md:w-auto"
                    onClick={() => {
                      if (!eventId) {
                        toast.error("Evento não encontrado");
                        return;
                      }
                      openAddExistingProductsModal({
                        eventId,
                        excludeProductIds: products.map((p) =>
                          String(p.productId || p.id || "").trim(),
                        ).filter(Boolean),
                      });
                    }}
                  >
                    Adicionar produtos existentes
                  </Button>
                  <Button
                    className="w-full md:w-auto"
                    onClick={() => {
                      if (!eventId) {
                        toast.error("Evento não encontrado");
                        return;
                      }
                      openCreateProductModal({
                        eventId,
                        ticketBatchesTotalQuantity,
                        linkedTicketNames: ticketName.trim()
                          ? [ticketName.trim()]
                          : [],
                      });
                    }}
                  >
                    <Plus className="size-5" />
                    Criar um novo produto
                  </Button>
                </div>
              </div>

              {products.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 border border-gray-6 rounded-xl">
                  <p className="text-gray-11 text-base font-family-dm-sans">
                    Nenhum produto adicionado ainda
                  </p>
                </div>
              ) : (
                <div
                  className="bg-gray-2 border border-gray-6 rounded-xl p-5"
                >
                  <DndContext
                    sensors={productDndSensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleTicketProductsDragStart}
                    onDragEnd={handleTicketProductsDragEnd}
                    onDragCancel={handleTicketProductsDragCancel}
                  >
                    <SortableContext
                      items={products.map((p) => p.productId)}
                      strategy={rectSortingStrategy}
                    >
                      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                        {products.map((product) => (
                          <SortableTicketProductCard
                            key={product.productId}
                            product={product}
                            dragDisabled={products.length < 2}
                            onEdit={() => {
                              if (!eventId) {
                                toast.error("Evento não encontrado");
                                return;
                              }
                              openCreateProductModal({
                                eventId,
                                productId: product.productId,
                                product: product.product,
                                ticketBatchesTotalQuantity,
                                linkedTicketNames: ticketName.trim()
                                  ? [ticketName.trim()]
                                  : [],
                              });
                            }}
                            onRemove={() => {
                              setProducts((prev) =>
                                prev.filter(
                                  (p) =>
                                    p.productId !== product.productId,
                                ),
                              );
                              toast.success("Produto removido do ingresso");
                            }}
                          />
                        ))}
                      </div>
                    </SortableContext>
                    <DragOverlay dropAnimation={null}>
                      {activeDragProduct ? (
                        <div className="bg-gray-2 border border-gray-6 rounded-xl flex flex-col flex-1 min-w-[287px] max-w-[368px] shadow-2xl opacity-95 cursor-grabbing">
                          <div className="border-b border-gray-6 flex gap-3 items-center p-4">
                            <div className="flex flex-col justify-center min-w-0 flex-1 py-1">
                              <p className="text-gray-12 text-base font-semibold font-family-dm-sans truncate">
                                {activeDragProduct.product.name}
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </DragOverlay>
                  </DndContext>
                </div>
              )}
            </div>
          )}
        </div>

      </div>

      {/* Footer — barra fixa no mobile (Figma) */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 flex flex-col gap-3 border-t border-gray-6 bg-gray-1 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:static md:z-auto md:mt-9 md:flex-row md:items-center md:justify-between md:border-0 md:bg-transparent md:p-0 md:pb-0",
          mode === "edit" && ticketId ? "" : "md:justify-end",
        )}
      >
        {mode === "edit" && ticketId ? (
          <Button
            type="button"
            variant="destructive"
            onClick={() => setDeleteModalOpen(true)}
            className="w-full py-0 bg-red-11 text-red-2 font-bold font-manrope leading-[1.1] rounded-lg transition-colors duration-200 flex items-center justify-center hover:bg-red-12 disabled:pointer-events-none disabled:opacity-50 md:w-auto"
          >
            Deletar ingresso
          </Button>
        ) : null}
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={saving || !isDirty}
          className="w-full font-bold md:w-auto md:self-end md:px-11"
        >
          {saving
            ? mode === "edit"
              ? "Salvando..."
              : "Criando..."
            : mode === "edit"
              ? "Salvar alterações"
              : "Criar ingresso"}
        </Button>
      </div>

      <UnsavedTicketChangesModal
        open={leavePromptOpen}
        onClose={() => setLeavePromptOpen(false)}
        onSave={handleSaveDraftAndLeave}
        onLeaveWithoutSaving={() => {
          setLeavePromptOpen(false);
          leaveTicketPageAfterDiscardPrompt();
        }}
      />

      <DeleteTicketModal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        ticketName={ticketName.trim() || undefined}
        onConfirm={handleConfirmDeleteTicket}
      />
    </div>
  );
}

