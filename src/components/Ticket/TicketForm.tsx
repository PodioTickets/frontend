"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/services/cache/QueryClient";
import { organizerService } from "@/services";
import { Button } from "@/components/Button";
import { ArrowButton } from "@/components/ArrowButton";
import { Dropdown, DropdownOption } from "@/components/Dropdown";
import { DatePicker } from "@/components/DatePicker";
import { TimePicker } from "@/components/TimePicker";
import { Input } from "@/components/Input";
import { Radio } from "@/components/Radio";
import Image from "next/image";
import toast from "react-hot-toast";
import { Info, Plus, Trash2 } from "lucide-react";
import { PencilIcon } from "@/components/Icons/PencilIcon";
import { TrashIcon } from "@/components/Icons/TrashIcon";
import type { ModalityTemplate, ModalityGroup } from "@/services/organizer/OrganizerService";
import { useCreateProductModal, useAddExistingProductsModal } from "@/stores/modalStore";
import { Loading } from "../Loading";

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
  if (typeof value === "number") return (value / 100).toFixed(2).replace(".", ",");
  return String(value);
}

/**
 * createProduct/updateProduct podem retornar o recurso direto ou embrulhado em `product` / `data`.
 */
function unwrapSavedProductFromApi(saved: unknown): Record<string, unknown> | null {
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

/** `id` de lote persistido no backend (UUID). Demais valores são só chave de UI. */
function isPersistedBatchId(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    id.trim()
  );
}

/** Mesma regra de montagem de ISO usada no envio do formulário (início / fim da venda do lote). */
function getBatchSalePeriodBounds(batch: Batch): { startMs: number; endMs: number } | null {
  if (batch.startType !== "date" || !batch.startDate?.trim() || !batch.endDate?.trim()) {
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
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return undefined;
  const dt = new Date(y, m, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m || dt.getDate() !== d) return undefined;
  return dt;
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
  const router = useRouter();
  const queryClient = useQueryClient();
  const { openCreateProductModal, setOnModalSave: setOnCreateProductSave } = useCreateProductModal();
  const { openAddExistingProductsModal, setOnModalSave: setOnAddProductsSave } = useAddExistingProductsModal();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [ticketName, setTicketName] = useState(initialData?.ticketName || "");
  const [ticketDescription, setTicketDescription] = useState(initialData?.ticketDescription || "");
  const [selectedModality, setSelectedModality] = useState(initialData?.selectedModality || "");
  const [distance, setDistance] = useState(initialData?.distance || "");
  const [distanceUnit, setDistanceUnit] = useState(initialData?.distanceUnit || "KM");
  const [gender, setGender] = useState(initialData?.gender || "");
  const [hasAgeRestriction, setHasAgeRestriction] = useState(initialData?.hasAgeRestriction || false);
  const [minAge, setMinAge] = useState(initialData?.minAge || "");
  const [maxAge, setMaxAge] = useState(initialData?.maxAge || "");
  const [hasKit, setHasKit] = useState(initialData?.hasKit || false);
  const [selectedGroupId, setSelectedGroupId] = useState(initialData?.selectedGroupId || initialGroupId || "");
  const [batches, setBatches] = useState<Batch[]>(initialData?.batches || [defaultBatch]);
  const [products, setProducts] = useState<ProductData[]>(initialData?.products || []);

  // Data from API
  const [modalityTemplates, setModalityTemplates] = useState<ModalityTemplate[]>([]);
  const [ticketCategories, setTicketCategories] = useState<ModalityGroup[]>([]);

  // Observação para o cliente (descrição do ingresso, não da categoria)
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editingDescription, setEditingDescription] = useState("");

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
        if (parsed.ticketDescription !== undefined) setTicketDescription(parsed.ticketDescription || "");
        if (parsed.selectedModality) setSelectedModality(parsed.selectedModality);
        if (parsed.distance) setDistance(parsed.distance);
        if (parsed.distanceUnit) setDistanceUnit(parsed.distanceUnit);
        if (parsed.gender) setGender(parsed.gender);
        if (parsed.hasAgeRestriction !== undefined) setHasAgeRestriction(parsed.hasAgeRestriction);
        if (parsed.minAge) setMinAge(parsed.minAge);
        if (parsed.maxAge) setMaxAge(parsed.maxAge);
        if (parsed.hasKit !== undefined) setHasKit(parsed.hasKit);
        if (parsed.batches && Array.isArray(parsed.batches)) setBatches(parsed.batches);
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
  }, [mode, localStorageKey, ticketName, ticketDescription, selectedModality, distance, distanceUnit, gender, hasAgeRestriction, minAge, maxAge, hasKit, batches, selectedGroupId]);

  // Load API data (modality templates and categories)
  useEffect(() => {
    const loadData = async () => {
      if (!eventId) return;

      setLoading(true);
      try {
        const templates = await organizerService.getModalityTemplates().catch(() => []);
        setModalityTemplates(templates);

        const groups = await organizerService.getTicketCategories(eventId).catch(() => []);
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
      if (mode !== "edit" || !ticketId || !eventId || modalityTemplates.length === 0) return;

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
          const categoryId = ticketData.categoryId || ticketData.category?.id || ticketData.groupId || "";
          setSelectedGroupId(categoryId);

          if (ticketData.modality) {
            const template = modalityTemplates.find((t) => t.label === ticketData.modality);
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
          if (ticketData.batches && Array.isArray(ticketData.batches) && ticketData.batches.length > 0) {
            const loadedBatches: Batch[] = ticketData.batches.map((b, index) => {
              const quantitySold = b.quantitySold ?? 0;
              return {
                id: b.id || `batch-${index}`,
                quantity: b.quantity?.toString() || "",
                price: b.price
                  ? `R$${(b.price / 100).toFixed(2).replace(".", ",")}`
                  : "",
                quantitySold,
                startType: b.startDate ? "date" : "previous",
                startDate: b.startDate ? b.startDate.split("T")[0] : undefined,
                startTime: b.startDate
                  ? new Date(b.startDate).toTimeString().slice(0, 5)
                  : undefined,
                endDate: b.endDate ? b.endDate.split("T")[0] : undefined,
                endTime: b.endDate
                  ? new Date(b.endDate).toTimeString().slice(0, 5)
                  : undefined,
              };
            });
            setBatches(loadedBatches.length > 0 ? loadedBatches : [defaultBatch]);
          }

          console.log(ticketData);

          if (ticketData.products && Array.isArray(ticketData.products)) {
            setProducts(ticketData.products);
          } else if (ticketData.productIds && Array.isArray(ticketData.productIds)) {
            try {
              const productIdsToLoad = ticketData.productIds;
              const productsResponse = await organizerService.getProducts(eventId);
              const allProducts = productsResponse?.products || [];
              const loadedProducts = allProducts
                .filter((p: Product) => productIdsToLoad.includes(p.id))
                .map((p: Product): ProductData => ({
                  id: p.id,
                  product: p,
                  productId: p.id,
                  ticketId: ticketId || "",
                }));
              setProducts(loadedProducts);
            } catch (e) {
              console.error("Error loading products:", e);
            }
          }
        } else {
          toast.error("Ingresso não encontrado");
          router.push(backUrl);
        }
      } catch (error) {
        console.error("Error loading ticket:", error);
        toast.error("Erro ao carregar ingresso");
      }
    };

    loadTicket();
  }, [mode, ticketId, eventId, modalityTemplates, router, backUrl]);

  // Setup modal callbacks
  useEffect(() => {
    const createProductCallback = async (data: { product?: unknown }) => {
      try {
        const entity = unwrapSavedProductFromApi(data?.product);
        if (!entity) {
          toast.error("Não foi possível obter os dados do produto após salvar.");
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
          const existingIndex = prevProducts.findIndex((p) => p.productId === normalizedProduct.id);
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
        if (data?.products && Array.isArray(data.products) && data.products.length > 0) {
          const currentProducts = productsRef.current;
          const existingIds = new Set(currentProducts.map((p) => p.id));
          const newProducts = data.products.filter((p) => p && p.id && !existingIds.has(p.id));

          if (newProducts.length > 0) {
            setProducts((prevProducts) => {
              const prevIds = new Set(prevProducts.map((p) => p.productId));
              const finalNewProducts = newProducts.filter((p) => !prevIds.has(p.id));
              if (finalNewProducts.length > 0) {
                return [...prevProducts, ...finalNewProducts.map((p) => ({ id: p.id, product: p, productId: p.id, ticketId: prevProducts.find((pp) => pp.productId === p.id)?.ticketId || "" }))];
              }
              return prevProducts.map((p) => ({ id: p.id, product: p.product, productId: p.productId, ticketId: p.ticketId }));
            });
            toast.success(`${newProducts.length} produto(s) adicionado(s) ao ingresso`);
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

    setOnCreateProductSave(createProductCallback);
    setOnAddProductsSave(addProductsCallback);

    return () => {
      setOnCreateProductSave(undefined);
      setOnAddProductsSave(undefined);
    };
  }, [setOnCreateProductSave, setOnAddProductsSave, ticketId]);

  // Handlers
  const handleBack = () => {
    router.push(backUrl);
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

  const handleBatchChange = (batchId: string, field: keyof Batch, value: string) => {
    const batch = batches.find((b) => b.id === batchId);
    if (!batch) return;

    if (field === "price") {
      if ((batch.quantitySold ?? 0) > 0) return;
    }

    setBatches(batches.map((b) => (b.id === batchId ? { ...b, [field]: value } : b)));
  };

  const handleBatchSalePeriodChange = (
    batchId: string,
    field: "startDate" | "startTime" | "endDate" | "endTime",
    value: string | undefined
  ) => {
    const normalized = value ?? "";
    setBatches((prev) => {
      const batch = prev.find((b) => b.id === batchId);
      if (!batch) return prev;
      const next: Batch = { ...batch, [field]: normalized };
      if (isBatchEndBeforeSaleStart(next)) {
        toast.error("A data de término da venda não pode ser anterior à data de início.");
        return prev;
      }
      return prev.map((b) => (b.id === batchId ? next : b));
    });
  };

  const handleSaveDescription = async () => {
    const trimmed = editingDescription.trim();
    setTicketDescription(trimmed);

    if (mode === "edit" && ticketId && eventId) {
      try {
        await organizerService.updateTicket(eventId, ticketId, {
          description: trimmed.length > 0 ? trimmed : undefined,
        });
        await queryClient.invalidateQueries({
          queryKey: queryKeys.events.tickets(eventId),
        });
        toast.success("Observação atualizada com sucesso!");
      } catch (error: unknown) {
        console.error("Error updating ticket description:", error);
        const raw =
          error &&
          typeof error === "object" &&
          "response" in error &&
          (error as { response?: { data?: { message?: unknown } } }).response?.data
            ?.message;
        const msg = typeof raw === "string" ? raw : "Erro ao atualizar observação";
        toast.error(msg);
        return;
      }
    }

    setIsEditingDescription(false);
  };

  const handleCancelDescription = () => {
    setEditingDescription(ticketDescription);
    setIsEditingDescription(false);
  };

  const handleSubmit = async () => {
    // Validation
    if (!ticketName.trim()) {
      toast.error("Nome do ingresso é obrigatório");
      return;
    }

    if (!selectedModality) {
      toast.error("Selecione uma modalidade");
      return;
    }

    if (!batches[0]?.quantity || !batches[0]?.price) {
      toast.error("Lote 1 deve ter quantidade e preço preenchidos");
      return;
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
        `A quantidade de vagas precisa ser igual ou maior que o número já vendido (${sold}) em cada lote com vendas.`
      );
      return;
    }

    const batchWithInvalidPeriod = batches.findIndex(isBatchEndBeforeSaleStart);
    if (batchWithInvalidPeriod !== -1) {
      toast.error(
        `No lote ${batchWithInvalidPeriod + 1}, a data de término da venda não pode ser anterior à data de início.`
      );
      return;
    }

    if (!eventId) {
      toast.error("Evento não encontrado");
      return;
    }

    setSaving(true);
    try {
      const modalityLabel =
        modalityTemplates.find((t) => t.id === selectedModality)?.label || selectedModality;
      const ticketData = {
        name: ticketName.trim(),
        description: ticketDescription.trim() || undefined,
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
          if (
            mode === "edit" &&
            ticketId &&
            isPersistedBatchId(b.id)
          ) {
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

      router.push(backUrl);
    } catch (error: unknown) {
      console.error("Error saving ticket:", error);
      const errorMessage = error instanceof Error
        ? error.message
        : (error as { response?: { data?: { message?: string } } })?.response?.data?.message || "Erro ao salvar ingresso";
      toast.error(errorMessage);
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
    return [...mapped.filter((o) => !isOutros(o)), ...mapped.filter((o) => isOutros(o))];
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
    modalityTemplates.find((t) => t.id === selectedModality)?.label || "Selecione";
  const selectedGenderLabel = genderOptions.find((g) => g.id === gender)?.label || "Selecione";
  const selectedGroupLabel = Array.isArray(ticketCategories)
    ? ticketCategories.find((g) => g.id === selectedGroupId)?.name ||
    (initialGroupId ? ticketCategories.find((g) => g.id === initialGroupId)?.name : "Sem categoria")
    : "Sem categoria";

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loading />
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="w-full flex flex-col gap-9">
        {/* Title Section */}
        <div className="flex gap-3 items-center">
          <button
            onClick={handleBack}
            className="border border-gray-6 rounded-[52px] rotate-180 size-9 flex items-center justify-center hover:bg-gray-3 transition-colors cursor-pointer"
          >
            <ArrowButton isOpen={false} />
          </button>
          <h1 className="text-gray-12 text-[28px] font-bold font-family-dm-sans leading-[1.1]">
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
                maxLength={200}
                className="h-12"
              />
            </div>

            <div className="w-full">
              {isEditingDescription ? (
                <input
                  type="text"
                  value={editingDescription}
                  onChange={(e) => setEditingDescription(e.target.value)}
                  onBlur={handleSaveDescription}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSaveDescription();
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



          {/* Categoria */}
          {Array.isArray(ticketCategories) && ticketCategories.length > 0 && (
            <div className="flex flex-col gap-2">
              <label className="text-gray-12 text-base font-family-dm-sans leading-[1.1]">
                Categoria (opcional)
              </label>
              <Dropdown
                options={groupOptions}
                trigger={(isOpen) => (
                  <button className="border border-gray-7 rounded-lg h-12 flex items-center justify-between px-3 w-full hover:bg-gray-3 transition-colors">
                    <span
                      className={`text-base font-family-dm-sans ${selectedGroupId || initialGroupId ? "text-gray-12" : "text-gray-11"
                        }`}
                    >
                      {selectedGroupId || initialGroupId ? selectedGroupLabel : "Sem categoria"}
                    </span>
                    <ArrowButton isOpen={isOpen} />
                  </button>
                )}
                onSelect={(option) => setSelectedGroupId(option.id || "")}
              />
            </div>
          )}

          <div className="flex gap-4">
            {/* Modalidades */}
            <div className="flex flex-col gap-2">
              <label className="text-gray-12 text-base font-family-dm-sans leading-[1.1]">
                Modalidades
              </label>
              <Dropdown
                options={modalityOptions}
                trigger={(isOpen) => (
                  <button className="border border-gray-7 rounded-lg h-12 flex items-center justify-between px-3 w-[250px] hover:bg-gray-3 transition-colors">
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
            <div className="flex flex-col gap-2">
              <label className="text-gray-12 text-base font-family-dm-sans leading-[1.1]">
                Distância de prova
              </label>
              <div className="border border-gray-6 rounded-lg flex gap-[10px] items-center px-3 py-4 h-12 w-max">
                <div className="flex flex-1 gap-1 items-center min-w-0">
                  <Input
                    type="text"
                    value={distance}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "");
                      setDistance(value);
                    }}
                    placeholder="10"
                    className="h-auto border-0 p-0 focus-visible:ring-0 focus-visible:border-0 shadow-none text-base font-family-dm-sans text-gray-11 placeholder:text-gray-11 focus:outline-none focus:border-0 rounded-none"
                  />
                </div>
                <div className="relative shrink-0">
                  <Dropdown
                    options={[
                      { id: "KM", label: "KM", onClick: () => setDistanceUnit("KM") },
                      { id: "M", label: "M", onClick: () => setDistanceUnit("M") },
                    ]}
                    trigger={(isOpen) => (
                      <div className="border border-gray-7 rounded-lg flex gap-2 items-center px-3 py-2 cursor-pointer hover:bg-gray-3 transition-colors">
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
          </div>

          {/* Gênero */}
          <div className="flex flex-col gap-2">
            <label className="text-gray-12 text-base font-family-dm-sans leading-[1.1]">
              Gênero
            </label>
            <p className="text-gray-11 text-sm font-family-dm-sans leading-[1.3]">
              Selecione um gênero para este ingresso ou deixe como “Geral” para todos.
            </p>
            <Dropdown
              options={genderOptions}
              trigger={(isOpen) => (
                <button className="border border-gray-7 rounded-lg h-12 flex items-center justify-between px-3 w-[250px] hover:bg-gray-3 transition-colors">
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

          {/* Restrição de idade */}
          <div className="flex flex-col gap-4">
            <label className="text-gray-12 text-base font-family-dm-sans leading-[1.1]">
              Restrição de idade (opcional)
            </label>
            <div className="flex flex-col gap-2">
              <p className="text-gray-12 text-base font-family-dm-sans leading-[1.3]">
                Esse evento tem restrição de idade?
              </p>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <Radio
                    name="ageRestriction"
                    checked={hasAgeRestriction}
                    onChange={() => setHasAgeRestriction(true)}
                  />
                  <span className="text-gray-12 text-base font-family-dm-sans">Sim</span>
                </div>
                <div className="flex items-center gap-2">
                  <Radio
                    name="ageRestriction"
                    checked={!hasAgeRestriction}
                    onChange={() => setHasAgeRestriction(false)}
                  />
                  <span className="text-gray-12 text-base font-family-dm-sans">Não</span>
                </div>
              </div>
            </div>
            {hasAgeRestriction && (
              <div className="flex gap-3">
                <div className="flex flex-col gap-2 w-max">
                  <label className="text-gray-12 text-base font-family-dm-sans leading-[1.1]">
                    Idade mínima
                  </label>
                  <Input
                    value={minAge}
                    onChange={(e) => setMinAge(e.target.value)}
                    placeholder="Ex: 21 anos"
                    className="h-12"
                  />
                </div>
                <div className="flex flex-col gap-2 w-max">
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

          {/* Lotes do ingresso */}
          <div className="flex flex-col gap-6 bg-gray-3 border border-gray-6 rounded-xl p-4">
            <div className="flex flex-col gap-2">
              <h2 className="text-gray-12 text-lg font-semibold font-family-dm-sans leading-[1.1]">
                Lotes do ingresso
              </h2>
              <p className="text-gray-11 text-base font-family-dm-sans leading-[1.3]">
                Defina a quantidade, o período de venda e o valor de cada lote. Você pode criar vários lotes.
              </p>
            </div>

            {batches.map((batch, index) => {
              const sold = batch.quantitySold ?? 0;
              const qtyParsed =
                batch.quantity.trim() === "" ? NaN : parseInt(batch.quantity, 10);
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
                        onClick={() => handleRemoveBatch(batch.id)}
                        className="text-red-11 hover:text-red-12 transition-colors"
                      >
                        <Trash2 className="size-5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <label className="text-gray-12 text-sm font-family-dm-sans">
                        Quantidade de vagas
                      </label>
                      <Input
                        type="number"
                        value={batch.quantity}
                        onChange={(e) => handleBatchChange(batch.id, "quantity", e.target.value)}
                        placeholder="Ex: 500"
                        className="h-12"
                      />

                      {sold >= 1 && (
                        <div className="flex items-start gap-1">
                          <Info className="size-5 text-gray-11 shrink-0" />
                          <span className="text-gray-11 text-base font-normal font-family-dm-sans leading-[1.3]">
                            {sold} vaga{sold === 1 ? "" : "s"} {sold === 1 ? "foi" : "foram"} vendida
                            {sold === 1 ? "" : "s"}.
                            {quantityBelowSold && (
                              <span className="block mt-0.5 text-red-11">
                                A quantidade precisa ser superior ao total vendido.
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
                              onChange={() => handleBatchChange(batch.id, "startType", "date")}
                            />
                            <span className="text-gray-12 text-sm font-family-dm-sans">Por data</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Radio
                              name={`startType-${batch.id}`}
                              checked={batch.startType === "previous"}
                              onChange={() => handleBatchChange(batch.id, "startType", "previous")}
                            />
                            <span className="text-gray-12 text-sm font-family-dm-sans">
                              Quando esgotar o lote anterior
                            </span>
                          </div>
                        </div>
                      </div>

                      {batch.startType === "date" && (
                        <div className="flex gap-10">
                          <div className="flex flex-col gap-2 w-max">
                            <label className="text-gray-12 text-sm font-family-dm-sans">
                              Data de início
                            </label>
                            <div className="flex gap-2">
                              <DatePicker
                                value={batch.startDate}
                                onChange={(value) =>
                                  handleBatchSalePeriodChange(batch.id, "startDate", value)
                                }
                                maxDate={parseLocalYmd(batch.endDate)}
                                className="w-max"
                              />
                              <TimePicker
                                value={batch.startTime}
                                onChange={(value) =>
                                  handleBatchSalePeriodChange(batch.id, "startTime", value)
                                }
                                className="w-max"
                              />
                            </div>
                          </div>
                          <div className="flex flex-col gap-2">
                            <label className="text-gray-12 text-sm font-family-dm-sans">
                              Data de Término
                            </label>
                            <div className="flex gap-2">
                              <DatePicker
                                value={batch.endDate}
                                onChange={(value) =>
                                  handleBatchSalePeriodChange(batch.id, "endDate", value)
                                }
                                minDate={parseLocalYmd(batch.startDate)}
                                className="w-max"
                              />
                              <TimePicker
                                value={batch.endTime}
                                onChange={(value) =>
                                  handleBatchSalePeriodChange(batch.id, "endTime", value)
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

          {/* Este produto possui kit? */}
          <div className="flex flex-col gap-4">
            <label className="text-gray-12 text-base font-family-dm-sans leading-[1.1]">
              Este produto possui kit?
            </label>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <Radio name="hasKit" checked={hasKit} onChange={() => setHasKit(true)} />
                <span className="text-gray-12 text-base font-family-dm-sans">Sim</span>
              </div>
              <div className="flex items-center gap-2">
                <Radio name="hasKit" checked={!hasKit} onChange={() => setHasKit(false)} />
                <span className="text-gray-12 text-base font-family-dm-sans">Não</span>
              </div>
            </div>
          </div>

          {hasKit && (
            <div className="flex flex-col gap-6 bg-gray-3 border border-gray-6 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-2">
                  <h2 className="text-gray-12 text-lg font-semibold font-family-dm-sans leading-[1.1]">
                    Produtos do Ingresso
                  </h2>
                  <p className="text-gray-11 text-base font-family-dm-sans leading-[1.3]">
                    Adicione e gerencie os produtos que ficarão disponíveis neste ingresso
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="border-gray-6 text-gray-12"
                    onClick={() => {
                      if (!eventId) {
                        toast.error("Evento não encontrado");
                        return;
                      }
                      openAddExistingProductsModal({ eventId });
                    }}
                  >
                    Adicionar produtos existentes
                  </Button>
                  <Button
                    onClick={() => {
                      if (!eventId) {
                        toast.error("Evento não encontrado");
                        return;
                      }
                      openCreateProductModal({ eventId });
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
                <div className="bg-gray-2 border border-gray-6 rounded-xl p-5">
                  <div className="flex flex-wrap gap-3">
                    {products.map((product, index) => (
                      <div
                        key={product.id || `product-${index}`}
                        className="bg-gray-2 border border-gray-6 rounded-xl flex flex-col flex-1 min-w-[287px] max-w-[368px]"
                      >
                        <div className="border-b border-gray-6 flex gap-3 items-center p-4">
                          {product.product.image ? (
                            <div className="relative size-[100px] rounded border border-gray-6 overflow-hidden bg-gray-3 shrink-0">
                              <Image
                                src={product.product.image}
                                alt={product.product.name}
                                fill
                                className="object-cover rounded"
                              />
                            </div>
                          ) : (
                            <div className="relative size-[100px] rounded border border-gray-6 overflow-hidden bg-gray-3 shrink-0 flex items-center justify-center text-gray-11 text-base font-semibold font-family-dm-sans leading-[1.1]">
                              {product.product.name.slice(0, 1).toUpperCase()}
                            </div>
                          )}
                          <div className="flex flex-col justify-between h-full py-2 gap-2 flex-1 min-w-0">
                            <h3 className="text-gray-12 text-base font-semibold font-family-dm-sans leading-[1.1]">
                              {product.product.name}
                            </h3>
                            <p className="text-gray-11 text-sm font-semibold font-family-dm-sans leading-[1.3]">
                              {product.product.isIncludedInTicket
                                ? "Valor incluso no ingresso"
                                : `R$ ${formatProductPrice(product.product.basePrice)}`}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col items-end justify-center p-4">
                          <div className="flex gap-2 items-center">
                            <button
                              onClick={() => {
                                if (!eventId) {
                                  toast.error("Evento não encontrado");
                                  return;
                                }
                                openCreateProductModal({
                                  eventId,
                                  productId: product.productId,
                                  product: product.product,
                                });
                              }}
                              className="bg-gray-2 border border-gray-6 rounded-lg size-9 flex items-center justify-center hover:bg-gray-3 transition-colors"
                            >
                              <PencilIcon className="size-5 text-gray-11" />
                            </button>
                            <button
                              onClick={() => {
                                setProducts(products.filter((p) => p.productId !== product.productId));
                                toast.success("Produto removido do ingresso");
                              }}
                              className="bg-red-2 border border-red-6 rounded-lg size-9 flex items-center justify-center hover:bg-red-3 transition-colors"
                            >
                              <TrashIcon className="size-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSubmit}
            disabled={saving}
            className="text-xl font-bold px-11 h-[52px]"
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
      </div>
    </div>
  );
}
