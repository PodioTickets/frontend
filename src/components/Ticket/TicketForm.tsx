"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useOrganizerNavigate } from "@/hooks/useOrganizerNavigate";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/services/cache/QueryClient";
import {
  isIsoDateStrictlyBefore,
  parseIsoDateToLocalDayStart,
} from "@/utils/registrationPeriod";
import { organizerService } from "@/services";
import { Button } from "@/components/Button";
import { ArrowButton } from "@/components/ArrowButton";
import { Dropdown, DropdownOption } from "@/components/Dropdown";
import { Input } from "@/components/Input";
import { Radio } from "@/components/Radio";
import toast from "react-hot-toast";
import type { ModalityTemplate, ModalityGroup } from "@/services/organizer/OrganizerService";
import {
  useCreateProductModal,
  useAddExistingProductsModal,
} from "@/stores/modalStore";
import { Loading } from "../Loading";
import { UnsavedTicketChangesModal } from "./UnsavedTicketChangesModal";
import { DeleteTicketModal } from "./DeleteTicketModal";
import { cn } from "@/utils/cn";
import {
  formatRawTicket,
  markTicketPendingWrite,
  optimisticUpdateTickets,
  useTickets,
  type Ticket,
} from "@/hooks/useTickets";
import { useOrganizerPermissions } from "@/contexts/OrganizerPermissionsContext";
import { TicketBatchSection } from "./TicketBatchSection";
import { TicketProductsSection } from "./TicketProductsSection";

import type { Batch, ProductData, Product, TicketFormProps } from "./TicketForm.types";
import {
  defaultBatch,
  unwrapSavedProductFromApi,
  isPersistedBatchId,
  isBatchEndBeforeSaleStart,
  buildTicketFormSnapshot,
  sanitizeDistanceInput,
} from "./TicketForm.utils";
import {
  type TicketDraftStoredForm,
  readTicketDraft,
  writeTicketDraft,
  clearTicketDraft,
  applyTicketDraftForm,
} from "./TicketForm.draft";

export type { Batch, TicketFormData, ProductData, Product, TicketFormProps } from "./TicketForm.types";

const SALE_START_BEFORE_REGISTRATION_TOAST =
  "A data de início da venda do lote não pode ser anterior à data de início das inscrições.";

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
  const { hasPermission } = useOrganizerPermissions();
  const readOnly = !hasPermission("edit_event") && hasPermission("view_event");
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
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [formBaseline, setFormBaseline] = useState<string | null>(null);
  const [ticketHydrateNonce, setTicketHydrateNonce] = useState(0);
  const [leavePromptOpen, setLeavePromptOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const guardPushedRef = useRef(false);
  const isDirtyRef = useRef(false);
  const isNavigatingAwayRef = useRef(false);
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
  const [gender, setGender] = useState(initialData?.gender || "all");
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

  // Data from API
  const [modalityTemplates, setModalityTemplates] = useState<ModalityTemplate[]>([]);
  const [ticketCategories, setTicketCategories] = useState<ModalityGroup[]>([]);

  // Evento: usado para travar a data de início de venda dos lotes — ela não
  // pode ser anterior ao início das inscrições. Query dedicada (key `detail`)
  // que deduplica com o resto do app e funciona em todos os fluxos (organizer
  // e admin compartilham `organizerService`).
  const { data: eventDetail } = useQuery({
    queryKey: queryKeys.events.detail(eventId),
    queryFn: () => organizerService.getEventById(eventId),
    enabled: !!eventId,
    staleTime: 5 * 60 * 1000,
  });

  // `registrationStartDate` vem como ISO; derivamos o dia civil local (mesma
  // convenção de `formatDateForInput`) para comparar com o YMD do DatePicker.
  const registrationStartYmd = useMemo(() => {
    const iso = eventDetail?.registrationStartDate;
    if (!iso) return undefined;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return undefined;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }, [eventDetail?.registrationStartDate]);

  // `minDate` do DatePicker de início de venda do lote (dias anteriores ao
  // início das inscrições ficam desabilitados; o próprio dia segue selecionável).
  const saleStartMinDate = useMemo(
    () => parseIsoDateToLocalDayStart(registrationStartYmd ?? "") ?? undefined,
    [registrationStartYmd],
  );

  // Observação para o cliente (descrição do ingresso)
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

  const isDirty = formBaseline !== null && currentFormSnapshot !== formBaseline;

  const validateAndShowErrors = (): boolean => {
    const errors: Record<string, string> = {};
    if (!ticketName.trim()) errors.ticketName = "Nome é obrigatório";
    if (!selectedModality) errors.selectedModality = "Selecione uma modalidade";
    if (!distance.trim()) errors.distance = "Distância é obrigatória";
    if (batches.length === 0) {
      errors.batches = "Pelo menos um lote é obrigatório";
    } else {
      batches.forEach((b) => {
        if (!String(b.quantity).trim()) errors[`batch_quantity_${b.id}`] = "Quantidade é obrigatória";
        if (!b.price.trim()) errors[`batch_price_${b.id}`] = "Preço é obrigatório";
      });
    }
    // Restrição de idade: quando ambos os campos estão preenchidos, mínima
    // tem que ser <= máxima. Salvar com min > max gera ranges impossíveis e o
    // backend rejeita.
    if (hasAgeRestriction && minAge.trim() && maxAge.trim()) {
      const minN = parseInt(minAge, 10);
      const maxN = parseInt(maxAge, 10);
      if (Number.isFinite(minN) && Number.isFinite(maxN) && minN > maxN) {
        errors.ageRange = "A idade mínima não pode ser maior que a máxima";
      }
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const clearFieldError = (field: string) => {
    setFormErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const setFieldError = (field: string, message: string) => {
    setFormErrors((p) => ({ ...p, [field]: message }));
  };

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
        if (parsed.selectedModality) setSelectedModality(parsed.selectedModality);
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

  // Baseline inicial do formulário
  useEffect(() => {
    if (mode !== "create" || loading || createBaselineScheduledRef.current) return;
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
        ticketDescription: isEditingDescription ? editingDescription : ticketDescription,
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
      window.history.pushState({ unsavedTicketGuard: true }, "", window.location.href);
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
      window.history.pushState({ unsavedTicketGuard: true }, "", window.location.href);
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

  // Load API data
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
          const categoryId =
            ticketData.categoryId || ticketData.category?.id || ticketData.groupId || "";
          setSelectedGroupId(categoryId);

          if (ticketData.modality) {
            const template = modalityTemplates.find((t) => t.label === ticketData.modality);
            setSelectedModality(template ? template.id : ticketData.modality);
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

          if (ticketData.batches && Array.isArray(ticketData.batches) && ticketData.batches.length > 0) {
            const loadedBatches: Batch[] = ticketData.batches.map((b, index) => {
              const quantitySold = b.quantitySold ?? 0;
              return {
                id: b.id || `batch-${index}`,
                quantity: b.quantity?.toString() || "",
                // Aceita 0 como valor válido (lote gratuito/cortesia).
                price:
                  typeof b.price === "number"
                    ? `R$${(b.price / 100).toFixed(2).replace(".", ",")}`
                    : "",
                quantitySold,
                startType: (b as any).triggerType === "AFTER_PREVIOUS_SOLD_OUT" ? "previous" : "date",
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

          if (ticketData.products && Array.isArray(ticketData.products)) {
            setProducts(ticketData.products);
          } else if (ticketData.productIds && Array.isArray(ticketData.productIds)) {
            try {
              const productsResponse = await organizerService.getProducts(eventId);
              const allProducts = productsResponse?.products || [];
              const loadedProducts = ticketData.productIds
                .map((id: string) => allProducts.find((p: Product) => p.id === id))
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
          return [
            ...prevProducts,
            {
              id: normalizedProduct.id,
              product: normalizedProduct,
              productId: normalizedProduct.id,
              ticketId: ticketId || "",
            },
          ];
        });

        // Invalida o cache de produtos para que a lista de tickets mostre a imagem atualizada ao voltar
        void queryClient.invalidateQueries({ queryKey: queryKeys.events.products(eventId) });
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
                return [
                  ...prevProducts,
                  ...finalNewProducts.map((p) => ({
                    id: p.id,
                    product: p,
                    productId: p.id,
                    ticketId:
                      prevProducts.find((pp) => pp.productId === p.id)?.ticketId || "",
                  })),
                ];
              }
              return prevProducts.map((p) => ({ ...p }));
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

  const isEdit = mode === "edit";

  const releaseUnsavedHistoryGuard = () => {
    if (guardPushedRef.current) {
      guardPushedRef.current = false;
      orgNav.push(backUrl);
    }
  };

  const leaveTicketPageAfterDiscardPrompt = () => {
    isNavigatingAwayRef.current = true;
    isDirtyRef.current = false;
    if (guardPushedRef.current) {
      skipUnsavedPopStateRef.current = true;
    }
    releaseUnsavedHistoryGuard();
    orgNav.push(backUrl);
  };

  const handleBack = () => {
    if (isDirty) {
      setLeavePromptOpen(true);
      return;
    }
    orgNav.push(backUrl);
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
        ticketDescription: isEditingDescription ? editingDescription : ticketDescription,
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
      toast.success("Rascunho salvo neste dispositivo. Expira em 24 horas ou ao salvar o ingresso.");
      setLeavePromptOpen(false);
      leaveTicketPageAfterDiscardPrompt();
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível salvar o rascunho.");
    }
  };

  const handleAddBatch = () => {
    setBatches([...batches, { id: Date.now().toString(), quantity: "", price: "", startType: "date" }]);
  };

  const handleRemoveBatch = (batchId: string) => {
    if (batches.length === 1) {
      toast.error("Pelo menos um lote é obrigatório");
      return;
    }
    setBatches(batches.filter((b) => b.id !== batchId));
    setFormErrors((prev) => {
      const next = { ...prev };
      delete next[`batch_quantity_${batchId}`];
      delete next[`batch_price_${batchId}`];
      return next;
    });
  };

  const handleBatchChange = (batchId: string, field: keyof Batch, value: string) => {
    const batch = batches.find((b) => b.id === batchId);
    if (!batch) return;
    if (field === "price" && (batch.quantitySold ?? 0) > 0) return;
    setBatches(batches.map((b) => (b.id === batchId ? { ...b, [field]: value } : b)));
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
        next = { ...next, endDate: "", endTime: "" };
      }

      // Início da venda do lote não pode ser anterior ao início das inscrições.
      if (
        field === "startDate" &&
        next.startType === "date" &&
        normalized.trim() &&
        saleStartMinDate &&
        isIsoDateStrictlyBefore(normalized.trim(), saleStartMinDate)
      ) {
        toast.error(SALE_START_BEFORE_REGISTRATION_TOAST);
        return prev;
      }

      if (isBatchEndBeforeSaleStart(next)) {
        toast.error("A data de término da venda não pode ser anterior à data de início.");
        return prev;
      }
      return prev.map((b) => (b.id === batchId ? next : b));
    });
  };

  const handleCommitDescriptionField = () => {
    setTicketDescription(editingDescription.trim());
    setIsEditingDescription(false);
  };

  const handleCancelDescription = () => {
    setEditingDescription(ticketDescription);
    setIsEditingDescription(false);
  };

  const handleSubmit = async (): Promise<boolean> => {
    if (!validateAndShowErrors()) {
      toast.error("Preencha os campos obrigatórios antes de salvar.");
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

    // Backstop do minDate do picker: nenhum lote pode iniciar a venda antes do
    // início das inscrições (cobre drafts hidratados/edições fora do calendário).
    if (saleStartMinDate) {
      const batchBeforeRegistration = batches.findIndex(
        (b) =>
          b.startType === "date" &&
          !!b.startDate?.trim() &&
          isIsoDateStrictlyBefore(b.startDate.trim(), saleStartMinDate),
      );
      if (batchBeforeRegistration !== -1) {
        toast.error(`No lote ${batchBeforeRegistration + 1}, ${SALE_START_BEFORE_REGISTRATION_TOAST.charAt(0).toLowerCase()}${SALE_START_BEFORE_REGISTRATION_TOAST.slice(1)}`);
        return false;
      }
    }

    if (!eventId) {
      toast.error("Evento não encontrado");
      return false;
    }

    setSaving(true);
    try {
      const modalityLabel =
        modalityTemplates.find((t) => t.id === selectedModality)?.label || selectedModality;
      const descriptionToPersist = (
        isEditingDescription ? editingDescription : ticketDescription
      ).trim();
      const ticketData = {
        name: ticketName.trim(),
        description: isEdit ? descriptionToPersist : (descriptionToPersist || undefined),
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
            : (isEdit ? null : undefined),
        hasKit: hasKit || false,
        productIds: products.map((p) => p.productId),
        batches: batches.map((b) => {
          const priceString = b.price.replace(/[^\d,]/g, "").replace(",", ".");
          const priceInCents = Math.round((parseFloat(priceString) || 0) * 100);
          const triggerType = b.startType === "previous" ? "AFTER_PREVIOUS_SOLD_OUT" : "BY_TIME";
          const startDate =
            b.startType === "date" && b.startDate
              ? `${b.startDate}T${b.startTime || "00:00"}:00`
              : undefined;
          const endDate = b.endDate ? `${b.endDate}T${b.endTime || "23:59"}:59` : undefined;
          const base = {
            quantity: parseInt(b.quantity, 10) || 0,
            price: priceInCents,
            triggerType,
            ...(startDate ? { startDate } : {}),
            ...(endDate ? { endDate } : {}),
          };
          if (mode === "edit" && ticketId && isPersistedBatchId(b.id)) {
            return { id: b.id, ...base };
          }
          return base;
        }),
      };

      let rawSaved: unknown;
      if (mode === "edit" && ticketId) {
        rawSaved = await organizerService.updateTicket(eventId, ticketId, ticketData);
        toast.success("Ingresso atualizado com sucesso!");
      } else {
        rawSaved = await organizerService.createTicket(eventId, ticketData);
        toast.success("Ingresso criado com sucesso!");
      }

      // Optimistic update + pending-write registry: o backend tem janela de
      // eventual consistency (réplica/leitor) — o refetch logo abaixo pode
      // voltar sem o ticket recém-criado/editado. Aqui:
      // 1) Normalizamos o payload do POST/PATCH (mesmo shape do queryFn).
      // 2) Inserimos/substituímos no cache pra UI refletir já.
      // 3) Registramos como pending — o `select` do useTickets mantém o
      //    ticket visível mesmo se o refetch vier defasado, até o backend
      //    confirmar (ou o TTL expirar).
      const savedTicket: Ticket | null = rawSaved ? formatRawTicket(rawSaved) : null;
      if (savedTicket) {
        // Atualiza ambos os caches (key antiga em outras páginas + bundle da
        // página de gerenciamento). A resposta do POST/PATCH traz o join completo
        // de `products` (com `image`, `images`, `primaryImageIndex`), então
        // `formatRawTicket` já produz `productImages` populado corretamente.
        optimisticUpdateTickets(queryClient, eventId, (prev) => {
          const idx = prev.findIndex((t) => t.id === savedTicket.id);
          if (idx === -1) return [...prev, savedTicket];
          const next = [...prev];
          next[idx] = savedTicket;
          return next;
        });
        markTicketPendingWrite(
          eventId,
          savedTicket,
          mode === "edit" ? "update" : "create",
        );
      }

      // Products SIM precisa invalidar — não foi atualizado pelo PATCH.
      await queryClient.invalidateQueries({ queryKey: queryKeys.events.products(eventId) });

      // Invalida o bundle de tickets pro backend re-joinar os produtos relacionados
      // (com `images`, ordem, categoria). A resposta do POST/PATCH pode vir sem o
      // join completo, deixando o card sem imagens dos produtos atrelados.
      // O `optimisticUpdateTickets` acima já manteve o ticket visível, e
      // `pendingWrites` segura o estado caso a réplica venha defasada — então
      // não há risco de sumir da lista por eventual consistency.
      void queryClient.invalidateQueries({ queryKey: queryKeys.events.ticketsManagement(eventId) });

      window.dispatchEvent(new CustomEvent("ticketCreated"));

      if (mode === "create" && localStorageKey) {
        localStorage.removeItem(localStorageKey);
      }
      clearTicketDraft(eventId, mode, ticketId);

      setTicketDescription(descriptionToPersist);
      setEditingDescription(descriptionToPersist);
      setIsEditingDescription(false);

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
      requestAnimationFrame(() => {
        orgNav.replace(backUrl);
      });
      return true;
    } catch (error: unknown) {
      console.error("Error saving ticket:", error);
      const responseData = (error as { response?: { data?: Record<string, unknown> } })?.response?.data;
      const apiMessage = responseData?.message as string | undefined;
      const errorMessage =
        apiMessage ||
        (error instanceof Error ? error.message : null) ||
        "Erro ao salvar ingresso";

      // Erro de quantidade mínima de lote: exibir inline no campo correto
      if (apiMessage && /m[íi]nimo.*vagas/i.test(apiMessage)) {
        const serverBatchId = responseData?.batchId as string | undefined;
        const minMatch = apiMessage.match(/m[íi]nimo\s+(\d+)\s+vagas/i);
        const minRequired = minMatch ? parseInt(minMatch[1], 10) : null;

        const targetBatch = serverBatchId
          ? batches.find((b) => b.id === serverBatchId)
          : minRequired !== null
            ? batches.find((b) => parseInt(b.quantity, 10) < minRequired)
            : null;

        if (targetBatch) {
          setFormErrors((prev) => ({ ...prev, [`batch_quantity_server_${targetBatch.id}`]: apiMessage }));
        }
      }

      toast.error(errorMessage);
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Dropdown options
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
    <div className={cn(className, "max-md:pb-20 max-w-7xl w-full mx-auto")}>
      <div className="w-full flex flex-col gap-9">
        {/* Title Section */}
        <div className="flex flex-wrap items-center gap-2 border-gray-6 pb-3 pt-3 max-md:border-b md:gap-3 md:border-0 md:pb-0 -mx-4 px-4">
          <button
            type="button"
            onClick={handleBack}
            data-nav
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
                onChange={(e) => {
                  setTicketName(e.target.value);
                  if (e.target.value.trim()) clearFieldError("ticketName");
                }}
                onBlur={() => {
                  if (!ticketName.trim()) setFieldError("ticketName", "Nome é obrigatório");
                }}
                placeholder="Ex: 5K"
                maxLength={120}
                showCharCount
                className={`h-12 ${formErrors.ticketName ? "border-red-8 focus-visible:ring-red-8" : ""}`}
              />
              {formErrors.ticketName && (
                <p className="text-red-11 text-sm font-family-dm-sans">{formErrors.ticketName}</p>
              )}
            </div>

            <div className="w-full">
              {isEditingDescription ? (
                <input
                  type="text"
                  value={editingDescription}
                  onChange={(e) => setEditingDescription(e.target.value)}
                  onBlur={handleCommitDescriptionField}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCommitDescriptionField();
                    else if (e.key === "Escape") handleCancelDescription();
                  }}
                  placeholder="Adicione uma observação para o cliente..."
                  className="text-gray-11 font-normal font-manrope leading-[1.4] bg-transparent border-b border-gray-6 focus:outline-none focus:border-primary-8 w-full"
                  autoFocus
                />
              ) : (
                <div className="flex items-center gap-2">
                  <p
                    onClick={() => {
                      setIsEditingDescription(true);
                      setEditingDescription(ticketDescription);
                    }}
                    className="text-gray-11 font-normal font-manrope leading-[1.4] w-full cursor-text hover:text-gray-12 transition-colors"
                  >
                    {ticketDescription || "Adicione uma observação para o cliente..."}
                  </p>
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
              <>
                <div className="flex flex-col gap-3 mt-2 sm:flex-row sm:items-start">
                  <div className="flex flex-col gap-2 w-full sm:w-max sm:flex-1 sm:min-w-0">
                    <label className="text-gray-12 text-base font-family-dm-sans leading-[1.1]">
                      Idade mínima
                    </label>
                    <Input
                      value={minAge}
                      onChange={(e) => {
                        setMinAge(e.target.value.replace(/\D/g, ""));
                        if (formErrors.ageRange) clearFieldError("ageRange");
                      }}
                      placeholder="Ex: 18 anos"
                      inputMode="numeric"
                      className={`h-12 ${formErrors.ageRange ? "border-red-8 focus-visible:ring-red-8" : ""}`}
                    />
                  </div>
                  <div className="flex flex-col gap-2 w-full sm:w-max sm:flex-1 sm:min-w-0">
                    <label className="text-gray-12 text-base font-family-dm-sans leading-[1.1]">
                      Idade máxima
                    </label>
                    <Input
                      value={maxAge}
                      onChange={(e) => {
                        setMaxAge(e.target.value.replace(/\D/g, ""));
                        if (formErrors.ageRange) clearFieldError("ageRange");
                      }}
                      placeholder="Ex: 35 anos"
                      inputMode="numeric"
                      className={`h-12 ${formErrors.ageRange ? "border-red-8 focus-visible:ring-red-8" : ""}`}
                    />
                  </div>
                </div>
                {formErrors.ageRange && (
                  <p className="text-red-11 text-sm font-family-dm-sans">{formErrors.ageRange}</p>
                )}
              </>
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
                    className={`border rounded-lg h-12 flex items-center justify-between px-3 w-full md:w-[250px] hover:bg-gray-3 transition-colors ${formErrors.selectedModality ? "border-red-8" : "border-gray-6"}`}
                  >
                    <span className={`text-base font-family-dm-sans ${selectedModality ? "text-gray-12" : "text-gray-11"}`}>
                      {selectedModalityLabel}
                    </span>
                    <ArrowButton isOpen={isOpen} />
                  </button>
                )}
                onSelect={(option) => {
                  setSelectedModality(option.id || "");
                  if (option.id) clearFieldError("selectedModality");
                }}
              />
              {formErrors.selectedModality && (
                <p className="text-red-11 text-sm font-family-dm-sans">{formErrors.selectedModality}</p>
              )}
            </div>

            {/* Distância de prova */}
            <div className="flex flex-col gap-2 w-full shrink-0 md:w-auto">
              <label className="text-gray-12 text-base font-family-dm-sans leading-[1.1]">
                Distância de prova
              </label>
              <div className={`border rounded-lg flex gap-[10px] items-center px-3 py-4 h-12 w-full md:w-max ${formErrors.distance ? "border-red-8" : "border-gray-6"}`}>
                <div className="flex flex-1 gap-1 items-center min-w-0">
                  <Input
                    type="text"
                    value={distance}
                    onChange={(e) => {
                      setDistance(sanitizeDistanceInput(e.target.value));
                      if (e.target.value.trim()) clearFieldError("distance");
                    }}
                    onBlur={() => {
                      if (!distance.trim()) setFieldError("distance", "Distância é obrigatória");
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
                      <div className="border border-gray-6 rounded-lg flex gap-2 items-center px-3 py-2 cursor-pointer hover:bg-gray-3 transition-colors">
                        <p className="text-gray-11 text-sm font-family-dm-sans leading-[1.3]">
                          {distanceUnit}
                        </p>
                        <ArrowButton isOpen={isOpen} />
                      </div>
                    )}
                    onSelect={(option) => setDistanceUnit(option.id || "KM")}
                    position="bottom"
                    align="end"
                    className="right-0"
                  />
                </div>
              </div>
              {formErrors.distance && (
                <p className="text-red-11 text-sm font-family-dm-sans">{formErrors.distance}</p>
              )}
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
                      <span className={`text-base font-family-dm-sans ${selectedGroupId || initialGroupId ? "text-gray-12" : "text-gray-11"}`}>
                        {selectedGroupId || initialGroupId ? selectedGroupLabel : "Sem categoria"}
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
              Selecione um gênero para este ingresso ou deixe como "Geral" para todos.
            </p>
            <Dropdown
              options={genderOptions}
              trigger={(isOpen) => (
                <button
                  type="button"
                  className="border border-gray-6 rounded-lg h-12 flex items-center justify-between px-3 w-full md:w-[250px] hover:bg-gray-3 transition-colors"
                >
                  <span className={`text-base font-family-dm-sans ${gender ? "text-gray-12" : "text-gray-11"}`}>
                    {selectedGenderLabel}
                  </span>
                  <ArrowButton isOpen={isOpen} />
                </button>
              )}
              onSelect={(option) => setGender(option.id || "")}
            />
          </div>

          {/* Lotes */}
          <TicketBatchSection
            batches={batches}
            formErrors={formErrors}
            saleStartMinDate={saleStartMinDate}
            onAddBatch={handleAddBatch}
            onRemoveBatch={handleRemoveBatch}
            onBatchChange={handleBatchChange}
            onBatchSalePeriodChange={handleBatchSalePeriodChange}
            onClearFieldError={clearFieldError}
            onSetFieldError={setFieldError}
          />

          {/* Kit */}
          <div className="flex flex-col gap-4">
            <label className="text-gray-12 text-base font-family-dm-sans leading-[1.1]">
              Este ingresso possui kit?
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

          {/* Produtos do kit */}
          {(hasKit || products.length > 0) && (
            <TicketProductsSection
              products={products}
              setProducts={setProducts}
              eventId={eventId}
              ticketName={ticketName}
              selectedGroupLabel={selectedGroupLabel || ""}
              ticketBatchesTotalQuantity={ticketBatchesTotalQuantity}
              openCreateProductModal={openCreateProductModal}
              openAddExistingProductsModal={openAddExistingProductsModal}
              readOnly={readOnly}
            />
          )}
        </div>
      </div>

      {/* Footer */}
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
          disabled={saving || (mode === "edit" && !isDirty)}
          className="w-full font-bold md:w-auto md:self-end md:px-11"
        >
          {saving
            ? mode === "edit" ? "Salvando..." : "Criando..."
            : mode === "edit" ? "Salvar alterações" : "Criar ingresso"}
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
