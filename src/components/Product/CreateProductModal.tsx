"use client";

import {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  Fragment,
} from "react";
import { useCreateProductModal } from "@/stores/modalStore";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Radio } from "@/components/Radio";
import { X, Plus, Info, MoreVertical } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { TrashIcon } from "../Icons/TrashIcon";
import { ImageWithInitialFallback } from "@/components/ImageWithInitialFallback";
import { ArrowButton } from "../ArrowButton";
import { Dropdown } from "../Dropdown";
import { organizerService } from "@/services";
import { Tooltip } from "@/components/Tooltip";
import {
  ImageUploadWithCrop,
  type ImageUploadWithCropRef,
} from "@/components/ImageUploadWithCrop";
import { EVENT_IMAGE_SPECS } from "@/lib/eventImageSpecs";
import { BookIcon } from "../Icons/BookIcon";
import { LoadingAnimation } from "@/components/Loading";
import { cn } from "@/utils/cn";
import { isSemInteresseVariation } from "@/utils/semInteresseVariation";

interface ProductVariation {
  id: string;
  name: string;
  price: string;
  stock: string;
}

type LinkedTicketListItem = { name: string; categoryLabel: string };

function categoryLabelFromTicket(t: Record<string, unknown>): string {
  const nested = t.category as { name?: string } | undefined;
  const fromNested =
    typeof nested?.name === "string" ? nested.name.trim() : "";
  if (fromNested) return fromNested;
  const snake = t.category_name;
  if (typeof snake === "string" && snake.trim()) return snake.trim();
  const cid = t.categoryId ?? t.category_id;
  if (cid == null || cid === "") return "Sem categoria";
  return "Sem categoria";
}

/** Lê campos da API (camelCase ou snake_case) para o formulário de edição. */
function buyerVariationEditStateFromApiProduct(p: Record<string, unknown> | null | undefined): {
  allowed: boolean;
  deadlineDays: string;
} {
  if (!p || typeof p !== "object") {
    return { allowed: false, deadlineDays: "30" };
  }
  const rawAllowed =
    p.buyerVariationEditAllowed ?? p.buyer_variation_edit_allowed;
  const allowed =
    rawAllowed === true ||
    rawAllowed === "true" ||
    rawAllowed === 1 ||
    rawAllowed === "1";
  const rawDays =
    p.variationEditDeadlineDays ?? p.variation_edit_deadline_days;
  const n =
    typeof rawDays === "number" && Number.isFinite(rawDays)
      ? rawDays
      : parseInt(String(rawDays ?? "").replace(/\D/g, ""), 10);
  if (!allowed) {
    return { allowed: false, deadlineDays: "30" };
  }
  if (Number.isFinite(n) && n >= 0) {
    return { allowed: true, deadlineDays: String(n) };
  }
  return { allowed: true, deadlineDays: "30" };
}

/** Nome do tipo de variação: só letras, números e espaços (sem . , - etc.). */
function sanitizeVariationTypeLabelInput(value: string): string {
  return value.replace(/[^\p{L}\p{N}\s]/gu, "");
}

export function CreateProductModal() {
  const {
    isOpen,
    closeCreateProductModal,
    data,
    onModalSave,
    onModalProductDelete,
  } = useCreateProductModal();
  const [productName, setProductName] = useState("");
  const [productImage, setProductImage] = useState<string | null>(null);
  const [isIncludedInTicket, setIsIncludedInTicket] = useState(true);
  const [basePrice, setBasePrice] = useState("");
  const [variationTypeName, setVariationTypeName] = useState("");
  const [variations, setVariations] = useState<ProductVariation[]>([]);
  /** Padrão Figma: «Não» — liberar edição da variação pelo comprador */
  const [buyerCanEditVariation, setBuyerCanEditVariation] = useState(false);
  const [variationChangeDeadlineDays, setVariationChangeDeadlineDays] =
    useState("30");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false);
  const [linkedTicketsResolved, setLinkedTicketsResolved] = useState<
    LinkedTicketListItem[]
  >([]);
  /** Edição: carregamento do produto via API ao abrir o modal. */
  const [productFetchStatus, setProductFetchStatus] = useState<
    "idle" | "loading" | "loaded" | "error"
  >("idle");
  const [formInitVersion, setFormInitVersion] = useState(0);
  const [productFormBaseline, setProductFormBaseline] = useState<string | null>(
    null,
  );
  const productCropRef = useRef<ImageUploadWithCropRef>(null);
  /** Variação «Sem interesse» criada pelo backend: não exibimos ao organizador, mas reenviamos no PATCH se o produto continuar fora do ingresso. */
  const organizerHiddenSemInteresseRef = useRef<ProductVariation | null>(null);

  const isEditing = data?.productId !== undefined;
  const eventId = data?.eventId;
  const isProductLoading = isEditing && productFetchStatus === "loading";

  /** Estoque inicial de cada variação nova: soma das vagas de todos os lotes do ingresso (vem do modal). */
  const defaultVariationStockFromBatches = useMemo(() => {
    const raw = data?.ticketBatchesTotalQuantity;
    if (typeof raw === "number" && Number.isFinite(raw)) {
      return String(Math.max(0, Math.floor(raw)));
    }
    return "0";
  }, [data?.ticketBatchesTotalQuantity]);

  const filledVariationsCount = variations.filter((v) => v.name.trim()).length;
  /** Criar e editar: no mínimo 1 nome de variação preenchido. */
  const hasMinVariations = filledVariationsCount >= 1;

  /** Valor em reais a partir do texto "10,50" / "0,00". */
  const parsePriceReais = (formatted: string): number => {
    const n = parseFloat(
      String(formatted ?? "")
        .replace(",", ".")
        .trim(),
    );
    return Number.isFinite(n) ? n : 0;
  };

  /** Produto não incluso: preço base obrigatório e > 0. */
  const basePriceInvalidNotIncluded =
    !isIncludedInTicket && parsePriceReais(basePrice) <= 0;

  // Helper: API retorna preços em centavos; exibir em reais (formato "10,50")
  const formatPriceFromApi = (value: number | string | undefined): string => {
    if (value == null || value === "") return "";
    if (typeof value === "number")
      return (value / 100).toFixed(2).replace(".", ",");
    const s = String(value).trim().replace(".", ",");
    return s;
  };

  /** Campo «preço específico» com valor numérico ≠ 0 (vazio ou 0 / 0,00 = sem preço específico na prévia). */
  const variationHasMeaningfulSpecificPrice = (price: string | undefined) => {
    const s = String(price ?? "").trim();
    if (s === "") return false;
    const n = parseFloat(s.replace(",", "."));
    return Number.isFinite(n) && n !== 0;
  };

  /** Alguma variação com preço específico realmente diferente de zero. */
  const anyVariationHasSpecificPrice = useMemo(
    () => variations.some((v) => variationHasMeaningfulSpecificPrice(v.price)),
    [variations],
  );

  /**
   * Prévia do dropdown: sem nenhum preço específico (> 0), não exibe preço nas linhas.
   * Com pelo menos um: nas demais variações mostra o preço base;
   * onde há preço específico, acréscimo sobre a base (≥ base) ou total (< base).
   */
  const previewVariationListPriceLabel = useCallback(
    (variationPriceStr: string): string | undefined => {
      const fmt = (n: number) =>
        n.toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
      if (!anyVariationHasSpecificPrice) {
        return undefined;
      }
      const base = parseFloat(String(basePrice || "0").replace(",", ".")) || 0;
      if (!variationHasMeaningfulSpecificPrice(variationPriceStr)) {
        return `R$ ${fmt(base)}`;
      }
      const v =
        parseFloat(String(variationPriceStr || "0").replace(",", ".")) || 0;
      if (v < base) {
        return `R$ ${fmt(v)}`;
      }
      return `R$ ${fmt(Math.max(0, v - base))}`;
    },
    [anyVariationHasSpecificPrice, basePrice],
  );

  /** Prévia do comprador: não lista opt-out «sem interesse» (existe só no fluxo interno/checkout). */
  const productPreviewDropdownOptions = useMemo(() => {
    return variations
      .filter((v) => !isSemInteresseVariation({ name: v.name }))
      .map((variation) => ({
        id: variation.id,
        label: variation.name.trim() || "Variação",
        suffix: previewVariationListPriceLabel(variation.price),
      }));
  }, [variations, previewVariationListPriceLabel]);

  const productFormSnapshot = useMemo(
    () =>
      JSON.stringify({
        productName: productName.trim(),
        productImage,
        isIncludedInTicket,
        basePrice,
        variationTypeName: variationTypeName.trim(),
        buyerCanEditVariation,
        variationChangeDeadlineDays,
        variations: variations.map((v) => ({
          name: v.name.trim(),
          price: v.price,
          stock: v.stock,
        })),
      }),
    [
      productName,
      productImage,
      isIncludedInTicket,
      basePrice,
      variationTypeName,
      variationChangeDeadlineDays,
      variations,
    ],
  );

  const isProductFormDirty =
    productFormBaseline !== null && productFormSnapshot !== productFormBaseline;

  const hydrateFormFromProduct = useCallback(
    (p: unknown, emptyVariationsStockFallback: string) => {
      const rec = p && typeof p === "object" ? (p as Record<string, unknown>) : {};
      setProductName(String(rec.name ?? ""));
      const img = rec.image ?? rec.image_url ?? rec.imageUrl;
      setProductImage(typeof img === "string" ? img : null);
      const included =
        rec.isIncludedInTicket ?? rec.is_included_in_ticket;
      setIsIncludedInTicket(included !== false);
      setBasePrice(
        formatPriceFromApi(
          (rec.basePrice ?? rec.base_price) as number | string | undefined,
        ),
      );
      setVariationTypeName(
        sanitizeVariationTypeLabelInput(
          String(rec.variationType ?? rec.variation_type ?? ""),
        ),
      );
      const rawVars = rec.variations;
      const vars = Array.isArray(rawVars) ? rawVars : [];
      organizerHiddenSemInteresseRef.current = null;
      if (vars.length === 0) {
        setVariations([
          {
            id: `${Date.now()}-a`,
            name: "Padrão",
            price: "",
            stock: emptyVariationsStockFallback,
          },
        ]);
      } else {
        const mapped: ProductVariation[] = vars.map(
          (v: unknown, i: number) => {
            const row =
              v && typeof v === "object" ? (v as Record<string, unknown>) : {};
            return {
              id: String(row.id ?? `v-${Date.now()}-${i}`),
              name: String(row.name ?? row.variation_name ?? ""),
              price: formatPriceFromApi(
                (row.price ?? row.unit_price) as number | string | undefined,
              ),
              stock:
                row.stock != null
                  ? String(row.stock)
                  : row.quantity != null
                    ? String(row.quantity)
                    : "",
            };
          },
        );
        const hidden =
          mapped.find((row) => isSemInteresseVariation({ name: row.name })) ??
          null;
        organizerHiddenSemInteresseRef.current = hidden;
        const visible = mapped.filter(
          (row) => !isSemInteresseVariation({ name: row.name }),
        );
        setVariations(
          visible.length > 0
            ? visible
            : [
              {
                id: `${Date.now()}-a`,
                name: "Padrão",
                price: "",
                stock: emptyVariationsStockFallback,
              },
            ],
        );
      }
      const buyerEdit = buyerVariationEditStateFromApiProduct(rec);
      setBuyerCanEditVariation(buyerEdit.allowed);
      setVariationChangeDeadlineDays(buyerEdit.deadlineDays);
    },
    [],
  );

  // Abrir modal: criar = estado inicial; editar = GET /products/:id
  useEffect(() => {
    if (!isOpen) {
      setFormInitVersion(0);
      setProductFormBaseline(null);
      setProductFetchStatus("idle");
      setSaveConfirmOpen(false);
      setLinkedTicketsResolved([]);
      organizerHiddenSemInteresseRef.current = null;
      return;
    }

    setDeleteConfirmOpen(false);
    setSaveConfirmOpen(false);

    if (!isEditing) {
      setProductFetchStatus("idle");
      setProductName("");
      setProductImage(null);
      setIsIncludedInTicket(true);
      setBasePrice("");
      setVariationTypeName("");
      organizerHiddenSemInteresseRef.current = null;
      const t = Date.now();
      setVariations([
        {
          id: `${t}-a`,
          name: "Padrão",
          price: "",
          stock: defaultVariationStockFromBatches,
        },
      ]);
      setBuyerCanEditVariation(false);
      setVariationChangeDeadlineDays("30");
      setFormInitVersion((v) => v + 1);
      return;
    }

    const productId = data?.productId;
    if (!productId) {
      setProductFetchStatus("error");
      setFormInitVersion((v) => v + 1);
      return;
    }

    let cancelled = false;
    setProductFetchStatus("loading");

    const cachedProduct = data?.product;

    (async () => {
      try {
        const raw = await organizerService.getProductById(productId);
        if (cancelled) return;
        if (!raw || typeof raw !== "object") {
          throw new Error("Resposta inválida");
        }
        hydrateFormFromProduct(raw, defaultVariationStockFromBatches);
        setProductFetchStatus("loaded");
      } catch (e) {
        console.error("Error loading product:", e);
        if (!cancelled) {
          toast.error(
            "Não foi possível carregar os dados do produto. Usando informações em cache, se houver.",
          );
          if (cachedProduct && typeof cachedProduct === "object") {
            hydrateFormFromProduct(
              cachedProduct,
              defaultVariationStockFromBatches,
            );
          }
          setProductFetchStatus("error");
        }
      } finally {
        if (!cancelled) {
          setFormInitVersion((v) => v + 1);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // cache em `cachedProduct` veio de `data.product` na abertura; não incluir `data.product` nas deps para não refazer GET por referência nova
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isOpen,
    isEditing,
    data?.productId,
    defaultVariationStockFromBatches,
    hydrateFormFromProduct,
  ]);

  useEffect(() => {
    if (!isOpen) {
      setProductFormBaseline(null);
      return;
    }
    if (formInitVersion === 0) return;
    setProductFormBaseline(productFormSnapshot);
    // Baseline só quando o formulário é (re)inicializado — não incluir productFormSnapshot nas deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, formInitVersion]);

  useEffect(() => {
    if (!isOpen || !eventId) return;

    let cancelled = false;
    const productId = data?.productId;

    const itemsFromModalProp = (): LinkedTicketListItem[] => {
      const lt = data?.linkedTickets;
      if (Array.isArray(lt) && lt.length > 0) {
        return lt
          .map((x: { name?: unknown; categoryName?: unknown; category?: unknown }) => {
            const name = String(x?.name ?? "").trim();
            const catRaw = x?.categoryName ?? x?.category;
            const categoryLabel =
              typeof catRaw === "string" && catRaw.trim()
                ? catRaw.trim()
                : "—";
            return { name, categoryLabel };
          })
          .filter((x) => x.name);
      }
      const raw = data?.linkedTicketNames;
      if (!Array.isArray(raw)) return [];
      return raw
        .map((n) => ({
          name: String(n ?? "").trim(),
          categoryLabel: "—",
        }))
        .filter((x) => x.name);
    };

    const mergeByTicketName = (
      fromApi: LinkedTicketListItem[],
      fromModal: LinkedTicketListItem[],
    ): LinkedTicketListItem[] => {
      const seen = new Set<string>();
      const out: LinkedTicketListItem[] = [];
      for (const item of fromApi) {
        if (seen.has(item.name)) continue;
        seen.add(item.name);
        out.push(item);
      }
      for (const item of fromModal) {
        if (seen.has(item.name)) continue;
        seen.add(item.name);
        out.push(item);
      }
      return out;
    };

    (async () => {
      const modalItems = itemsFromModalProp();
      if (!productId) {
        if (!cancelled) setLinkedTicketsResolved(modalItems);
        return;
      }
      try {
        const res = await organizerService.getTickets(eventId, {
          page: 1,
          limit: 500,
        });
        if (cancelled) return;
        const tickets = res.tickets || [];
        const pid = String(productId);
        const fromApi = tickets
          .filter(
            (t: { productIds?: string[] }) =>
              Array.isArray(t.productIds) &&
              t.productIds.some((id) => String(id) === pid),
          )
          .map((t: Record<string, unknown>) => ({
            name: String(t.name ?? "").trim(),
            categoryLabel: categoryLabelFromTicket(t),
          }))
          .filter((x) => x.name);
        if (!cancelled) {
          setLinkedTicketsResolved(mergeByTicketName(fromApi, modalItems));
        }
      } catch {
        if (!cancelled) setLinkedTicketsResolved(modalItems);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    isOpen,
    eventId,
    data?.productId,
    data?.linkedTicketNames,
    data?.linkedTickets,
  ]);

  const handleProductCropped = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setProductImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      productCropRef.current?.openWithFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleAddVariation = () => {
    const newVariation: ProductVariation = {
      id: Date.now().toString(),
      name: "",
      price: "",
      stock: defaultVariationStockFromBatches,
    };
    setVariations([...variations, newVariation]);
  };

  const handleRemoveVariation = (id: string) => {
    if (variations.length <= 1) {
      toast.error("É necessário ter pelo menos uma variação");
      return;
    }
    setVariations(variations.filter((v) => v.id !== id));
  };

  const handleVariationChange = (
    id: string,
    field: keyof ProductVariation,
    value: string,
  ) => {
    setVariations(
      variations.map((v) => (v.id === id ? { ...v, [field]: value } : v)),
    );
  };

  const formatPrice = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (!numbers) return "";
    const cents = parseInt(numbers, 10);
    return (cents / 100).toFixed(2).replace(".", ",");
  };

  const handlePriceChange = (id: string, value: string) => {
    const formatted = formatPrice(value);
    handleVariationChange(
      id,
      "price",
      formatted === "" ? "0,00" : formatted,
    );
  };

  const handleBasePriceChange = (value: string) => {
    const raw = value.replace(/^R\$\s*/i, "").trim();
    const formatted = formatPrice(raw);
    setBasePrice(formatted === "" ? "0,00" : formatted);
  };

  const validateBeforeSave = (): boolean => {
    if (isProductLoading) return false;

    if (!productName.trim()) {
      toast.error("Digite o nome do produto");
      return false;
    }

    if (productName.length > 100) {
      toast.error("O nome do produto deve ter no máximo 100 caracteres");
      return false;
    }

    if (!hasMinVariations) {
      toast.error("Preencha o nome de pelo menos uma variação");
      return false;
    }

    if (!eventId) {
      toast.error("Evento não encontrado");
      return false;
    }

    if (!isIncludedInTicket && parsePriceReais(basePrice) <= 0) {
      toast.error("Informe um preço maior que zero para o produto.");
      return false;
    }

    return true;
  };

  const executeSave = async () => {
    setIsSubmitting(true);

    try {
      // Enviar preços em centavos para a API
      const basePriceReais = basePrice
        ? parseFloat(basePrice.replace(",", "."))
        : 0;
      const daysParsed = parseInt(
        String(variationChangeDeadlineDays || "0").replace(/\D/g, ""),
        10,
      );
      const deadlineDays = buyerCanEditVariation
        ? variationChangeDeadlineDays.trim() === ""
          ? 30
          : Math.max(0, Number.isFinite(daysParsed) ? daysParsed : 30)
        : 0;
      const baseProductPayload = {
        name: productName.trim(),
        image: productImage,
        isIncludedInTicket,
        basePrice: Math.round(basePriceReais * 100),
        isRequired: isIncludedInTicket,
        variationType: variationTypeName.trim() || undefined,
        variations: (() => {
          const fromForm = variations
            .filter((v) => v.name.trim())
            .filter((v) => !isSemInteresseVariation({ name: v.name }))
            .map((v) => {
              const priceReais =
                parseFloat(String(v.price || "0").replace(",", ".")) || 0;
              return {
                name: v.name.trim(),
                price: Math.round(priceReais * 100),
                stock: parseInt(v.stock, 10) || 0,
              };
            });
          const hidden = organizerHiddenSemInteresseRef.current;
          if (!isIncludedInTicket && hidden) {
            const priceReais =
              parseFloat(String(hidden.price || "0").replace(",", ".")) || 0;
            return [
              ...fromForm,
              {
                name: hidden.name.trim(),
                price: Math.round(priceReais * 100),
                stock: parseInt(hidden.stock, 10) || 0,
              },
            ];
          }
          return fromForm;
        })(),
        buyerVariationEditAllowed: buyerCanEditVariation,
        variationEditDeadlineDays: buyerCanEditVariation ? deadlineDays : 0,
      };
      const productData = baseProductPayload;

      let savedProduct;
      if (isEditing && data?.productId) {
        savedProduct = await organizerService.updateProduct(
          eventId,
          data.productId,
          productData,
        );
        toast.success("Produto atualizado com sucesso!");
      } else {
        // Criar novo produto
        savedProduct = await organizerService.createProduct(
          eventId,
          productData,
        );
        toast.success("Produto criado com sucesso!");
      }

      // Call the callback if it exists, but don't fail the whole operation if it errors
      if (onModalSave) {
        try {
          await onModalSave({ product: savedProduct, isEditing });
        } catch (callbackError) {
          console.error("Error in onModalSave callback:", callbackError);
          // Don't show error toast here - the product was already saved successfully
          // The callback error is logged but doesn't prevent the modal from closing
        }
      }

      closeCreateProductModal();
    } catch (error: any) {
      console.error("Error saving product:", error);
      toast.error(error.response?.data?.message || "Erro ao salvar produto");
    } finally {
      setIsSubmitting(false);
    }
  };

  const requestSave = () => {
    if (!validateBeforeSave()) return;
    if (linkedTicketsResolved.length > 0) {
      setSaveConfirmOpen(true);
      return;
    }
    void executeSave();
  };

  const confirmSaveAfterDialog = () => {
    if (!validateBeforeSave()) return;
    setSaveConfirmOpen(false);
    void executeSave();
  };

  const performDeleteProduct = async () => {
    if (!isEditing || !data?.productId || !eventId) return;
    setIsDeleting(true);
    try {
      await organizerService.deleteProduct(eventId, data.productId);
      toast.success("Produto excluído com sucesso");
      setDeleteConfirmOpen(false);
      if (onModalProductDelete) {
        try {
          await onModalProductDelete({ productId: data.productId });
        } catch (callbackError) {
          console.error("Error in onModalProductDelete callback:", callbackError);
        }
      }
      closeCreateProductModal();
    } catch (error: any) {
      console.error("Error deleting product:", error);
      toast.error(error.response?.data?.message || "Erro ao deletar produto");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/60 md:bg-black/90"
            onClick={() => {
              if (deleteConfirmOpen || saveConfirmOpen) return;
              closeCreateProductModal();
            }}
          />

          {/* Modal — animação só com opacity: scale/y no motion aplicam transform e no mobile
              quebram position:fixed do rodapé + scroll (faixa branca / modal “subindo”). */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed inset-0 z-50 flex max-md:min-h-0 max-md:items-stretch max-md:p-0 md:items-center md:justify-center md:p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={cn(
                "relative flex min-h-0 w-full flex-col overflow-hidden bg-gray-1 shadow-2xl pt-16 md:pt-0",
                "max-md:h-dvh max-md:max-h-dvh max-md:rounded-none max-md:border-0",
                "md:max-h-[80vh] md:max-w-[1192px] md:rounded-xl md:border md:border-gray-6",
              )}
            >
              {isProductLoading ? (
                <div
                  className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-gray-1/90 backdrop-blur-[2px]"
                  aria-busy
                  aria-label="Carregando produto"
                >
                  <LoadingAnimation />
                </div>
              ) : null}
              {/* Header */}
              <div
                className={cn(
                  "flex shrink-0 items-center justify-between border-b border-gray-6",
                  "max-md:h-[52px] max-md:bg-gray-2 max-md:px-4 max-md:py-2",
                  "md:px-4 md:py-3",
                )}
              >
                <div className="flex min-w-0 flex-1 items-center gap-2 md:contents">
                  <button
                    type="button"
                    onClick={() => {
                      if (deleteConfirmOpen) {
                        setDeleteConfirmOpen(false);
                        return;
                      }
                      if (saveConfirmOpen) {
                        setSaveConfirmOpen(false);
                        return;
                      }
                      closeCreateProductModal();
                    }}
                    className="flex size-8 shrink-0 items-center justify-center rounded-lg md:border border-gray-6 text-gray-12 hover:bg-gray-3 md:hidden"
                    aria-label="Voltar"
                  >
                    <ArrowButton isOpen={false} className="rotate-180" />
                  </button>
                  <h2
                    className={cn(
                      "min-w-0 text-gray-12 leading-[1.1]",
                      "max-md:font-manrope max-md:text-base max-md:font-extrabold",
                      "md:text-[20px] md:font-semibold md:font-family-dm-sans md:leading-[1.3]",
                    )}
                  >
                    {isEditing ? (
                      "Editar produto"
                    ) : (
                      <>
                        <span className="md:hidden">Criar produto</span>
                        <span className="hidden md:inline">
                          Criação de produto
                        </span>
                      </>
                    )}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (deleteConfirmOpen) {
                      setDeleteConfirmOpen(false);
                      return;
                    }
                    if (saveConfirmOpen) {
                      setSaveConfirmOpen(false);
                      return;
                    }
                    closeCreateProductModal();
                  }}
                  className="hidden p-1 text-gray-11 transition-colors hover:text-gray-12 md:block"
                  aria-label="Fechar"
                >
                  <X className="size-6" />
                </button>
              </div>

              {/* Content */}
              <div className="min-h-0 flex-1 overflow-y-auto [overflow-anchor:none] max-md:pb-36 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-6 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-2">
                <div className="flex flex-col gap-5 p-5 max-md:gap-8 max-md:p-4">
                  {/* Left Column — flex-1 só no md+ evita a coluna “esticar” no mobile e gerar faixa vazia */}
                  <div className="flex min-h-0 flex-col gap-11 max-md:gap-8 md:flex-1">
                    {/* Image Upload */}
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-col gap-3">
                        <h3
                          className={cn(
                            "text-gray-12 font-semibold font-manrope leading-[1.1]",
                            "max-md:text-lg",
                            "md:text-lg",
                          )}
                        >
                          Adicione uma imagem do produto
                        </h3>
                        <p className="hidden text-base font-normal font-family-dm-sans leading-[1.3] text-gray-11 md:block">
                          Boas fotos ajudam na decisão do participante. Depois de
                          escolher o arquivo, ajuste posição e zoom no recorte —
                          mesmo fluxo do banner e do card do evento.
                        </p>
                        <p className="text-sm font-normal font-family-dm-sans leading-[1.3] text-gray-11 md:hidden">
                          Boas fotos ajudam na decisão do participante
                        </p>
                      </div>
                      {productImage ? (
                        <div
                          className={cn(
                            "flex w-full items-center gap-6 rounded-xl border-2 border-dashed border-gray-6",
                            "max-md:flex-col max-md:items-stretch max-md:p-4",
                            "md:flex-row md:p-6",
                          )}
                        >
                          <div className="relative size-[120px] shrink-0 overflow-hidden rounded-2xl">
                            <ImageWithInitialFallback
                              src={productImage}
                              alt="Product preview"
                              name={productName || "Produto"}
                              fill
                              sizes="120px"
                              className="size-full border-transparent border-0"
                              letterClassName="text-4xl font-semibold"
                            />
                            <button
                              type="button"
                              onClick={() => setProductImage(null)}
                              className="absolute -right-1 -top-1 flex size-7 items-center justify-center rounded-full border border-gray-6 bg-gray-1 text-gray-11 shadow-sm hover:bg-gray-2 md:hidden"
                              aria-label="Remover imagem"
                            >
                              <X className="size-4" />
                            </button>
                          </div>
                          <div className="flex flex-1 flex-col gap-4 md:gap-6">
                            <div className="hidden flex-col gap-4 md:flex">
                              <p className="text-base font-semibold font-manrope leading-[1.1] text-gray-12">
                                Arraste uma imagem para este campo ou clique
                                abaixo
                              </p>
                              <p className="text-base font-family-dm-sans leading-[1.3] text-gray-11">
                                PNG ou JPG, máximo 10MB
                              </p>
                            </div>
                            <p className="text-sm font-family-dm-sans leading-[1.3] text-gray-11 md:hidden">
                              PNG ou JPG, máximo 10MB
                            </p>
                            <div className="flex flex-row md:flex-col gap-2 sm:flex-row">
                              <Button
                                type="button"
                                onClick={() => productCropRef.current?.open()}
                                variant="outline"
                                className="w-full border-gray-6 text-gray-12 max-md:flex-1 md:w-full"
                              >
                                <span className="text-base font-bold font-family-dm-sans leading-[1.3] text-gray-12">
                                  <span className="md:hidden">Alterar imagem</span>
                                  <span className="hidden md:inline">
                                    Trocar imagem
                                  </span>
                                </span>
                              </Button>
                              <button
                                type="button"
                                onClick={() => setProductImage(null)}
                                className="text-base font-semibold text-gray-11 underline decoration-gray-11 hover:text-gray-12 md:hidden"
                              >
                                Limpar imagem
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div
                          onDrop={handleDrop}
                          onDragOver={handleDragOver}
                          className="flex min-h-[120px] w-full cursor-pointer flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-gray-6 p-6 transition-colors hover:border-primary-8 max-md:min-h-[100px] max-md:py-8"
                          onClick={() => productCropRef.current?.open()}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              productCropRef.current?.open();
                            }
                          }}
                          role="button"
                          tabIndex={0}
                        >
                          <p className="hidden text-base font-bold font-family-dm-sans leading-[1.3] text-primary-11 md:block">
                            Arraste uma imagem para este campo ou clique aqui
                          </p>
                          <div className="flex flex-col items-center gap-3 text-center md:gap-4">
                            <p className="text-base font-semibold font-manrope leading-[1.1] text-gray-12">
                              Adicionar foto
                            </p>
                            <p className="text-sm font-family-dm-sans leading-[1.3] text-gray-11 md:text-base">
                              PNG ou JPG, máximo 10MB
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Product Name */}
                    <div className="flex flex-col gap-2.5">
                      <div className="flex flex-col gap-2">
                        <label className="text-base font-normal font-family-dm-sans leading-[1.3] text-gray-12">
                          <span className="md:hidden">
                            Nome descritivo do produto
                          </span>
                          <span className="hidden md:inline">Título</span>
                        </label>
                        <Input
                          type="text"
                          value={productName}
                          onChange={(e) => setProductName(e.target.value)}
                          placeholder="Ex: (item extra) Camiseta da Nike"
                          maxLength={100}
                          showCharCount
                          className="h-12 px-3"
                        />
                      </div>
                    </div>

                    {/* Is Included in Ticket */}
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-1">
                        <label className="text-gray-12 text-base font-normal font-family-dm-sans leading-[1.3]">
                          Este produto está incluso no ingresso?
                        </label>
                        <Tooltip
                          content={
                            <p className="font-family-dm-sans font-normal text-sm leading-[1.4] text-gray-12 text-left">
                              Ao comprar este ingresso,
                              <br /> o participante receberá
                              este produto sem custo adicional.
                            </p>
                          }
                          position="topRight"
                        >
                          <button
                            type="button"
                            className="inline-flex cursor-help text-gray-11 hover:text-gray-12 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-8 rounded"
                            aria-label="Informação: produto incluso no ingresso"
                          >
                            <BookIcon className="size-5 shrink-0" />
                          </button>
                        </Tooltip>
                      </div>
                      <div className="flex gap-2.5">
                        <div className="flex items-center gap-2">
                          <Radio
                            checked={isIncludedInTicket}
                            onChange={() => setIsIncludedInTicket(true)}
                            name="included"
                            className="size-6"
                          />
                          <span className="text-base font-normal font-family-dm-sans leading-[1.3] text-gray-12 md:text-sm">
                            Sim
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Radio
                            checked={!isIncludedInTicket}
                            onChange={() => {
                              setIsIncludedInTicket(false);
                              setBasePrice((p) =>
                                (p ?? "").trim() === "" ? "0,00" : p,
                              );
                              setVariations((vs) =>
                                vs.map((v) => ({
                                  ...v,
                                  price:
                                    (v.price ?? "").trim() === ""
                                      ? "0,00"
                                      : v.price,
                                })),
                              );
                            }}
                            name="included"
                            className="size-6"
                          />
                          <span className="text-base font-normal font-family-dm-sans leading-[1.3] text-gray-12 md:text-sm">
                            Não
                          </span>
                        </div>
                      </div>
                      {!isIncludedInTicket && (
                        <div className="flex w-full max-w-full flex-col gap-2.5 md:w-[259px]">
                          <div className="flex flex-col gap-2">
                            <label className="text-gray-12 text-base font-normal font-family-dm-sans leading-[1.3]">
                              Preço
                            </label>
                            <Input
                              type="text"
                              inputMode="numeric"
                              value={`R$ ${basePrice || "0,00"}`}
                              onChange={(e) =>
                                handleBasePriceChange(e.target.value)
                              }
                              placeholder="R$ 0,00"
                              aria-invalid={basePriceInvalidNotIncluded}
                              className={`h-12 px-3 ${basePriceInvalidNotIncluded ? "border-red-8 focus-visible:border-red-8 focus-visible:ring-red-8/30" : ""}`}
                            />
                            <div className="flex items-start gap-2 md:hidden">
                              <Info
                                className="mt-0.5 size-5 shrink-0 text-gray-11"
                                aria-hidden
                              />
                              <p className="text-sm font-normal font-family-dm-sans leading-[1.3] text-gray-11">
                                Você ainda poderá escolher um preço específico nas
                                variações
                              </p>
                            </div>
                            {basePriceInvalidNotIncluded ? (
                              <p className="text-red-11 text-sm font-family-dm-sans leading-[1.3]">
                                Informe um valor acima de R$ 0,00.
                              </p>
                            ) : null}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Variations */}
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-col gap-3">
                        <h3 className="text-lg font-semibold font-manrope leading-[1.1] text-gray-12">
                          Variações e estoque
                        </h3>
                        <p className="text-base font-normal font-family-dm-sans leading-[1.3] text-gray-11">
                          <span className="md:hidden">
                            Crie opções como tamanhos e controle estoque por
                            variação.
                          </span>
                          <span className="hidden md:inline">
                            Crie opções como tamanhos e controle estoque por
                            variação. Você pode reaproveitar um conjunto de
                            variações para não repetir trabalho.
                          </span>
                        </p>
                      </div>

                      {/* Variation Name Input */}
                      <div className="flex flex-col gap-2">
                        <label className="text-gray-12 text-base font-normal font-family-dm-sans leading-[1.3]">
                          Digite o nome da variação:
                        </label>
                        <Input
                          type="text"
                          value={variationTypeName}
                          onChange={(e) =>
                            setVariationTypeName(
                              sanitizeVariationTypeLabelInput(e.target.value),
                            )
                          }
                          placeholder={`Ex: "Tamanho/cor/variação"`}
                          className="h-12 px-3"
                        />

                      </div>

                      {/* Variations: mobile = cards (Figma); desktop = tabela */}
                      <div
                        className={cn(
                          "flex flex-col",
                          "max-md:gap-3 max-md:border-0 max-md:bg-transparent",
                          "md:rounded-lg md:border-[1.5px] md:border-gray-6 md:bg-gray-2",
                        )}
                      >
                        {/* Table Header — desktop */}
                        <div className="hidden h-11 items-center rounded-t-lg border-b border-gray-6 bg-gray-3 md:flex">
                          <div className="flex-1 px-4">
                            <span className="text-sm font-medium font-inter leading-[1.3] text-gray-12">
                              {variationTypeName.trim() || "Variações"}
                            </span>
                          </div>
                          <div className="flex w-[188px] items-center justify-center px-4">
                            <span className="flex items-center gap-1 text-sm font-medium font-inter leading-[1.3] text-gray-12">
                              Preço específico{" "}
                              <Tooltip
                                content={
                                  <div className="flex w-full flex-col gap-2 text-left font-family-dm-sans text-sm font-normal leading-[1.4] text-gray-12">
                                    <p>
                                      Defina um preço específico para esta
                                      variação, caso ela tenha um valor diferente
                                      do produto principal.
                                    </p>
                                    <p>
                                      Por exemplo: a camiseta custa R$50, mas a
                                      variação na cor azul pode custar R$60.
                                    </p>
                                    <p>
                                      Se este campo não for preenchido, o sistema
                                      utilizará automaticamente o preço padrão do
                                      produto.
                                    </p>
                                  </div>
                                }
                                position="topRight"
                              >
                                <button
                                  type="button"
                                  className="inline-flex cursor-help rounded text-gray-12 hover:text-gray-11 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-8"
                                  aria-label="Informação: preço específico da variação"
                                >
                                  <BookIcon className="size-5 shrink-0" />
                                </button>
                              </Tooltip>
                            </span>
                          </div>
                          <div className="flex w-[132px] items-center justify-center px-4">
                            <span className="text-sm font-medium font-inter leading-[1.3] text-gray-12">
                              Estoque
                            </span>
                          </div>
                          <div className="flex h-full w-[74px] items-center justify-center border-l border-gray-6 px-4">
                            <span className="text-sm font-medium font-inter leading-[1.3] text-gray-12">
                              Ações
                            </span>
                          </div>
                        </div>

                        {/* Variations List */}
                        {variations.map((variation) => (
                          <Fragment key={variation.id}>
                            {/* Mobile — Figma 3428:160533 */}
                            <div className="flex flex-col gap-4 rounded-lg border border-gray-6 bg-gray-1 px-3 py-4 md:hidden">
                              <div className="flex w-full items-start justify-between gap-2">
                                <div className="flex min-w-0 flex-1 flex-col gap-3">
                                  <p className="text-sm font-normal font-family-dm-sans leading-[1.3] text-gray-11">
                                    Nome da variação
                                  </p>
                                  <input
                                    type="text"
                                    value={variation.name}
                                    onChange={(e) =>
                                      handleVariationChange(
                                        variation.id,
                                        "name",
                                        e.target.value,
                                      )
                                    }
                                    placeholder="Ex: P, M, G"
                                    className="w-full border-0 bg-transparent p-0 text-sm font-semibold font-family-dm-sans leading-[1.3] text-gray-12 placeholder:text-gray-11 focus:border-0 focus:outline-none focus:ring-0"
                                  />
                                </div>
                                <Dropdown
                                  menuInPortal
                                  align="end"
                                  position="bottom"
                                  width="w-52"
                                  options={[
                                    {
                                      id: "remove",
                                      label: "Remover variação",
                                      onClick: () =>
                                        handleRemoveVariation(variation.id),
                                    },
                                  ]}
                                  trigger={(open) => (
                                    <button
                                      type="button"
                                      className="flex size-8 shrink-0 items-center justify-center rounded-lg text-gray-11 transition-colors hover:bg-gray-3"
                                      aria-label="Ações da variação"
                                      aria-expanded={open}
                                    >
                                      <MoreVertical className="size-6" />
                                    </button>
                                  )}
                                />
                              </div>
                              <div className="flex w-full items-start justify-between gap-4">
                                <div className="flex flex-col gap-3">
                                  <p className="text-sm font-normal font-family-dm-sans leading-[1.3] text-gray-11">
                                    Preço específico
                                  </p>
                                  {isIncludedInTicket ? (
                                    <p className="text-sm font-semibold font-family-dm-sans leading-[1.3] text-gray-12">
                                      Incluso
                                    </p>
                                  ) : (
                                    <div className="flex items-baseline gap-0.5 text-sm font-semibold font-family-dm-sans leading-[1.3] text-gray-12">
                                      <span>R$</span>
                                      <input
                                        type="text"
                                        inputMode="numeric"
                                        value={variation.price || "0,00"}
                                        onChange={(e) =>
                                          handlePriceChange(
                                            variation.id,
                                            e.target.value,
                                          )
                                        }
                                        className="min-w-0 max-w-[140px] border-0 bg-transparent p-0 focus:border-0 focus:outline-none focus:ring-0"
                                        placeholder="0,00"
                                      />
                                    </div>
                                  )}
                                </div>
                                <div className="flex flex-col items-end gap-3">
                                  <p className="text-right text-sm font-normal font-family-dm-sans leading-[1.3] text-gray-11">
                                    Estoque
                                  </p>
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="number"
                                      value={variation.stock}
                                      onChange={(e) =>
                                        handleVariationChange(
                                          variation.id,
                                          "stock",
                                          e.target.value,
                                        )
                                      }
                                      className="w-14 border-0 bg-transparent p-0 text-right text-sm font-semibold font-family-dm-sans leading-[1.3] text-gray-12 focus:outline-none focus:ring-0"
                                      placeholder="0"
                                    />
                                    <span className="text-sm font-semibold font-family-dm-sans leading-[1.3] text-gray-12">
                                      Un
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Desktop — linha da tabela */}
                            <div className="hidden border-b border-gray-6 md:flex md:h-[52px] md:items-center">
                              <div className="flex flex-1 px-4">
                                <input
                                  type="text"
                                  value={variation.name}
                                  onChange={(e) =>
                                    handleVariationChange(
                                      variation.id,
                                      "name",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="Ex: P, M, G"
                                  className="h-auto w-full border-0 bg-transparent px-0 text-sm font-medium font-inter text-gray-12 focus:border-0 focus:outline-none focus:ring-0"
                                />
                              </div>
                              <div className="flex w-[188px] items-center justify-center px-4">
                                {isIncludedInTicket ? (
                                  <span className="flex items-center gap-1 text-sm font-medium font-inter text-gray-11">
                                    Incluso
                                  </span>
                                ) : (
                                  <div className="flex items-center gap-0.5 text-sm font-semibold font-inter text-gray-12">
                                    <span>R$</span>
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      value={variation.price || "0,00"}
                                      onChange={(e) =>
                                        handlePriceChange(
                                          variation.id,
                                          e.target.value,
                                        )
                                      }
                                      className="w-16 border-0 bg-transparent px-0 focus:border-0 focus:outline-none focus:ring-0"
                                      placeholder="0,00"
                                    />
                                  </div>
                                )}
                              </div>
                              <div className="flex w-[132px] items-center justify-center px-4">
                                <input
                                  type="number"
                                  value={variation.stock}
                                  onChange={(e) =>
                                    handleVariationChange(
                                      variation.id,
                                      "stock",
                                      e.target.value,
                                    )
                                  }
                                  className="w-16 border-0 bg-transparent px-0 text-center text-sm font-semibold font-inter text-gray-12 focus:outline-none focus:ring-0"
                                  placeholder="0"
                                />
                              </div>
                              <div className="flex w-[74px] items-center justify-center px-4">
                                <button
                                  type="button"
                                  title="Remover variação"
                                  onClick={() =>
                                    handleRemoveVariation(variation.id)
                                  }
                                  className="flex size-9 items-center justify-center rounded-lg border-[1.5px] border-red-6 bg-red-2 transition-colors hover:bg-red-3"
                                >
                                  <TrashIcon className="size-5 text-red-12" />
                                </button>
                              </div>
                            </div>
                          </Fragment>
                        ))}

                        {/* Add Variation Button */}
                        <div className="flex justify-center p-4 max-md:pt-0 md:border-t md:border-gray-6">
                          <button
                            type="button"
                            onClick={handleAddVariation}
                            className="flex h-11 items-center gap-1 px-6 text-base font-semibold font-family-dm-sans text-gray-11 transition-colors hover:text-gray-12 md:px-11"
                          >
                            <Plus className="size-6" />
                            Adicionar variação
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column - Preview */}
                  <div className="flex w-full shrink-0 flex-col gap-4 md:sticky md:top-5">
                    <div className="flex w-full flex-col gap-3 md:gap-5">
                      <div className="flex flex-col gap-3">
                        <p className="text-gray-12 text-base font-normal font-family-dm-sans leading-[1.3]">
                          Deseja liberar a edição da variação pelo comprador?
                        </p>
                        <div className="flex flex-wrap items-center gap-x-[10px] gap-y-2">
                          <div className="flex items-center gap-2">
                            <Radio
                              name="buyerVariationEdit"
                              checked={buyerCanEditVariation}
                              onChange={() => setBuyerCanEditVariation(true)}
                            />
                            <button
                              type="button"
                              className="cursor-pointer select-none border-none bg-transparent p-0 text-left text-base font-normal font-family-dm-sans leading-[1.3] text-gray-12 hover:text-gray-12 md:text-sm"
                              onClick={() => setBuyerCanEditVariation(true)}
                            >
                              Sim
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                            <Radio
                              name="buyerVariationEdit"
                              checked={!buyerCanEditVariation}
                              onChange={() => setBuyerCanEditVariation(false)}
                            />
                            <button
                              type="button"
                              className="cursor-pointer select-none border-none bg-transparent p-0 text-left text-base font-normal font-family-dm-sans leading-[1.3] text-gray-12 hover:text-gray-12 md:text-sm"
                              onClick={() => setBuyerCanEditVariation(false)}
                            >
                              Não
                            </button>
                          </div>
                        </div>
                      </div>
                      {buyerCanEditVariation && (
                        <div className="flex flex-col gap-3">
                          <p className="text-gray-12 text-base font-normal font-family-dm-sans leading-[1.3]">
                            Até quantos dias antes do evento o participante
                            pode alterar a variação?
                          </p>
                          <div className="flex flex-wrap items-center gap-2">
                            <input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              maxLength={4}
                              value={variationChangeDeadlineDays}
                              onChange={(e) =>
                                setVariationChangeDeadlineDays(
                                  e.target.value
                                    .replace(/\D/g, "")
                                    .slice(0, 4),
                                )
                              }
                              className="h-9 min-w-13 w-10 shrink-0 rounded-lg border border-gray-6 bg-gray-1 px-2 text-center text-base font-normal font-family-dm-sans text-gray-11 placeholder:text-gray-11 focus:border-primary-8 focus:outline-none"
                              placeholder="30"
                              aria-label="Dias antes do evento para alterar variação"
                            />
                            <span className="text-base font-normal font-family-dm-sans leading-[1.3] text-gray-11">
                              dias antes do evento
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    <h3 className="text-lg font-bold font-manrope leading-[1.1] text-gray-12 md:text-xl">
                      Prévia
                    </h3>
                    <div className="flex w-full flex-col rounded-xl border border-gray-6 bg-gray-2 md:w-[406px]">
                      <div
                        className={cn(
                          "flex items-center gap-3 p-4",
                          buyerCanEditVariation && "border-b border-gray-6",
                        )}
                      >
                        <div className="relative size-[100px] shrink-0 overflow-hidden rounded border border-gray-6 bg-gray-3">
                          <ImageWithInitialFallback
                            src={productImage}
                            alt="Product preview"
                            name={productName || "Nome do produto"}
                            fill
                            sizes="100px"
                            className="size-full border-transparent border-0"
                            letterClassName="text-2xl font-semibold"
                          />
                        </div>
                        <div className="flex flex-col justify-between flex-1 gap-4">
                          <p className="text-gray-12 text-base font-semibold font-manrope leading-[1.1]">
                            {productName || "Nome do produto"}
                          </p>
                          {isIncludedInTicket ? (
                            <p className="text-gray-12 text-base font-manrope leading-[1.1]">
                              Incluso no ingresso
                            </p>
                          ) : (
                            <p className="text-gray-12 text-base font-manrope leading-[1.1]">
                              R$ {basePrice.trim() ? basePrice : "0,00"}
                            </p>
                          )}
                        </div>
                      </div>
                      {productPreviewDropdownOptions.length > 0 ? (
                        <div className="p-4 hidden md:block">
                          <p className="mb-2 text-base text-gray-12">
                            Escolha a variação - {variationTypeName.trim() || "Variações"}
                          </p>
                          <Dropdown
                            options={productPreviewDropdownOptions}
                            menuInPortal
                            position="bottom"
                            align="start"
                            width="w-full"
                            maxHeight="max-h-[200px]"
                            trigger={(isOpen: boolean) => (
                              <div className="flex h-12 w-full cursor-pointer items-center justify-between rounded-lg border border-gray-6 px-3 py-4 transition-colors hover:border-gray-8">
                                <p className="text-base text-gray-11">
                                  <span className="">
                                    Selecione a variação
                                  </span>
                                </p>
                                <ArrowButton isOpen={isOpen} />
                              </div>
                            )}
                          />
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div
                className={cn(
                  "flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-gray-6",
                  "max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:z-60 max-md:flex-col max-md:items-stretch max-md:bg-gray-1 max-md:p-4",
                  "md:px-6 md:py-4",
                )}
              >
                {isEditing ? (
                  <div className="min-w-0 max-md:w-full">
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => setDeleteConfirmOpen(true)}
                      disabled={isSubmitting || isDeleting || isProductLoading}
                      className="px-4 py-2 max-md:w-full"
                    >
                      Deletar produto
                    </Button>
                  </div>
                ) : null}
                <div
                  className={cn(
                    "ml-auto flex flex-wrap items-center justify-end gap-3",
                    "max-md:ml-0 max-md:w-full max-md:flex-nowrap max-md:gap-2",
                  )}
                >
                  <Button
                    variant="outline"
                    onClick={closeCreateProductModal}
                    disabled={isSubmitting || isDeleting || isProductLoading}
                    className="border-gray-6 px-4 py-2 text-gray-11 max-md:min-h-11 max-md:flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={requestSave}
                    disabled={
                      isSubmitting ||
                      isDeleting ||
                      isProductLoading ||
                      !productName.trim() ||
                      !hasMinVariations ||
                      productFormBaseline === null ||
                      !isProductFormDirty ||
                      basePriceInvalidNotIncluded
                    }
                    className="max-md:min-h-11 max-md:flex-1"
                  >
                    {isSubmitting
                      ? "Salvando..."
                      : isEditing
                        ? "Salvar alterações"
                        : "Criar produto"}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>

          <ImageUploadWithCrop
            ref={productCropRef}
            spec={EVENT_IMAGE_SPECS.product}
            outputBaseName="produto"
            modalTitle="Ajustar imagem do produto"
            onCropped={handleProductCropped}
            onInvalidFile={(msg) => toast.error(msg)}
            onCropFailed={(msg) => toast.error(msg)}
          />

          {/* Confirmação de exclusão (Figma: modal sobre o fluxo de produto) */}
          <AnimatePresence>
            {deleteConfirmOpen && (
              <>
                <motion.div
                  key="delete-backdrop"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="fixed inset-0 z-60 bg-[rgba(32,32,32,0.9)]"
                  onClick={() => {
                    if (!isDeleting) setDeleteConfirmOpen(false);
                  }}
                />
                <motion.div
                  key="delete-modal"
                  initial={{ opacity: 0, scale: 0.95, y: 16 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 16 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="fixed inset-0 z-61 flex items-center justify-center p-4 pointer-events-none"
                >
                  <div
                    className="bg-gray-1 rounded-xl w-full max-w-[652px] flex flex-col gap-11 pt-6 pb-5 px-5 shadow-2xl pointer-events-auto max-h-[min(90vh,720px)] min-h-0"
                    onClick={(e) => e.stopPropagation()}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="delete-product-title"
                    aria-describedby="delete-product-desc"
                  >
                    <div className="flex flex-col gap-6 items-stretch shrink-0">
                      <div className="flex flex-col gap-4 items-center text-center">
                        <h2
                          id="delete-product-title"
                          className="text-gray-12 text-xl font-semibold font-family-dm-sans leading-[1.3]"
                        >
                          Deletar produto permanentemente?
                        </h2>
                        <p
                          id="delete-product-desc"
                          className="text-gray-11 text-base font-normal font-family-dm-sans leading-[1.3] max-w-full"
                        >
                          Ao deletar este produto, ele será removido de todos os
                          ingressos vinculados:
                        </p>
                      </div>
                      <div className="max-h-[min(50vh,420px)] min-h-0 overflow-y-auto rounded-xl bg-gray-3 p-4 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-6 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-2">
                        {linkedTicketsResolved.length > 0 ? (
                          <ul className="flex flex-col gap-3">
                            {linkedTicketsResolved.map((row, idx) => (
                              <li
                                key={`${row.name}-${idx}`}
                                className="flex items-center gap-2"
                              >
                                <span
                                  className="mt-1.5 size-1.5 shrink-0 rounded-full bg-red-11"
                                  aria-hidden
                                />
                                <div className="min-w-0 flex-1">
                                  {row.categoryLabel !== "—" ? (
                                    <span className="block text-xs font-normal font-family-dm-sans leading-[1.3] text-gray-11">
                                      {row.categoryLabel}
                                    </span>
                                  ) : null}
                                  <span className="wrap-break-word text-sm font-medium font-family-dm-sans leading-[1.3] text-gray-12">
                                    {row.name}
                                  </span>
                                </div>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-gray-11 text-sm font-normal font-family-dm-sans leading-[1.3] text-center">
                            Este produto pode estar vinculado a outros ingressos
                            do evento. A exclusão removerá o produto de todos eles.
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-3 shrink-0 flex-wrap">
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => void performDeleteProduct()}
                        disabled={isDeleting}
                        className="font-manrope text-base rounded-lg"
                      >
                        {isDeleting ? "Deletando..." : "Deletar produto"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setDeleteConfirmOpen(false)}
                        disabled={isDeleting}
                        className="border-gray-6 text-gray-12 font-manrope text-base rounded-lg"
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* Confirmação ao salvar — mesma lista de ingressos vinculados */}
          <AnimatePresence>
            {saveConfirmOpen && (
              <>
                <motion.div
                  key="save-backdrop"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="fixed inset-0 z-60 bg-[rgba(32,32,32,0.9)]"
                  onClick={() => {
                    if (!isSubmitting) setSaveConfirmOpen(false);
                  }}
                />
                <motion.div
                  key="save-modal"
                  initial={{ opacity: 0, scale: 0.95, y: 16 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 16 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="pointer-events-none fixed inset-0 z-61 flex items-center justify-center p-4"
                >
                  <div
                    className="pointer-events-auto flex max-h-[min(90vh,720px)] min-h-0 w-full max-w-[652px] flex-col gap-8 rounded-xl bg-gray-1 px-5 pb-5 pt-6 shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="save-product-title"
                    aria-describedby="save-product-desc"
                  >
                    <div className="flex shrink-0 flex-col items-stretch gap-6">
                      <div className="flex flex-col items-center gap-4 text-center">
                        <h2
                          id="save-product-title"
                          className="text-xl font-semibold font-family-dm-sans leading-[1.3] text-gray-12"
                        >
                          {isEditing
                            ? "Salvar alterações no produto?"
                            : "Criar produto?"}
                        </h2>
                        <p
                          id="save-product-desc"
                          className="max-w-full text-base font-normal font-family-dm-sans leading-[1.3] text-gray-11"
                        >
                          {isEditing ? (
                            <>
                              Este produto está vinculado aos seguintes
                              ingressos. As alterações serão refletidas em todos
                              eles:
                            </>
                          ) : (
                            <>
                              O produto será vinculado ao kit destes ingressos:
                            </>
                          )}
                        </p>
                      </div>
                      <div className="max-h-[min(50vh,420px)] min-h-0 overflow-y-auto rounded-xl bg-gray-3 p-4 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-6 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-2">
                        <ul className="flex flex-col gap-3">
                          {linkedTicketsResolved.map((row, idx) => (
                            <li
                              key={`save-${row.name}-${idx}`}
                              className="flex items-center gap-2"
                            >
                              <span
                                className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary-9"
                                aria-hidden
                              />
                              <div className="min-w-0 flex-1">
                                {row.categoryLabel !== "—" ? (
                                  <span className="block text-xs font-normal font-family-dm-sans leading-[1.3] text-gray-11">
                                    {row.categoryLabel}
                                  </span>
                                ) : null}
                                <span className="wrap-break-word text-sm font-medium font-family-dm-sans leading-[1.3] text-gray-12">
                                  {row.name}
                                </span>

                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setSaveConfirmOpen(false)}
                        disabled={isSubmitting}
                        className="rounded-lg border-gray-6 font-manrope text-base text-gray-12"
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="button"
                        onClick={confirmSaveAfterDialog}
                        disabled={isSubmitting}
                        className="rounded-lg font-manrope text-base"
                      >
                        {isSubmitting
                          ? "Salvando..."
                          : isEditing
                            ? "Salvar alterações"
                            : "Criar produto"}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </>
      )}
    </AnimatePresence>
  );
}

