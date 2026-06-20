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
import { X, Plus, Info, MoreVertical, Pencil } from "lucide-react";
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
import { CalendarIcon } from "../Icons/CalendarIcon";
import { LoadingAnimation } from "@/components/Loading";
import { cn } from "@/utils/cn";
import { isSemInteresseVariation } from "@/utils/semInteresseVariation";
import { useEvent } from "@/hooks/useEvent";
import { formatDateBR, toUtcDate } from "@/utils/datetimeBR";
import {
  variationStockToPersist,
  categoryLabelFromTicket,
  buyerVariationEditStateFromApiProduct,
  sanitizeVariationTypeLabelInput,
  parsePriceReais,
  formatPriceFromApi,
  variationHasMeaningfulSpecificPrice,
  maskPriceInputFromDigits as formatPrice,
  validateProductForm,
} from "@/lib/productValidation";
import type {
  ProductVariation,
  LinkedTicketListItem,
  MobileVariationDraft,
} from "@/components/Product/CreateProductModal.types";
import { useProductLinkedTickets } from "@/components/Product/useProductLinkedTickets";
import { useProductImageUpload } from "@/components/Product/useProductImageUpload";
import { ProductLinkedTicketsConfirmDialog } from "@/components/Product/ProductLinkedTicketsConfirmDialog";
import { useProductVariations } from "@/components/Product/useProductVariations";
import { ProductPreview } from "@/components/Product/ProductPreview";
import { ProductVariationMobileSheets } from "@/components/Product/ProductVariationMobileSheets";
import { ProductVariations } from "@/components/Product/ProductVariations";


export function CreateProductModal() {
  const {
    isOpen,
    closeCreateProductModal,
    data,
    onModalSave,
    onModalProductDelete,
  } = useCreateProductModal();
  const [productName, setProductName] = useState("");
  const {
    productImages,
    setProductImages,
    primaryImageIndex,
    setPrimaryImageIndex,
    productCropRef,
    cropTargetIndexRef,
    handleProductCropped,
    handleDrop,
    handleDragOver,
  } = useProductImageUpload();
  const [isIncludedInTicket, setIsIncludedInTicket] = useState(true);
  const [basePrice, setBasePrice] = useState("");
  const [variationTypeName, setVariationTypeName] = useState("");
  const {
    variations,
    setVariations,
    defaultVariationStockFromBatches,
    mobileMoreMenuVariationId,
    setMobileMoreMenuVariationId,
    mobileVariationDraft,
    setMobileVariationDraft,
    mobileVariationDraftError,
    setMobileVariationDraftError,
    handleAddVariation,
    handleRemoveVariation,
    handleVariationChange,
    handlePriceChange,
    openMobileEditVariation,
    openMobileAddVariation,
    closeMobileVariationDraft,
    handleMobileDraftPriceChange,
    saveMobileVariationDraft,
    handleMobileRemoveVariation,
  } = useProductVariations({
    ticketBatchesTotalQuantity: data?.ticketBatchesTotalQuantity,
  });
  const [isRequired, setIsRequired] = useState(true);
  const [buyerCanEditVariation, setBuyerCanEditVariation] = useState(false);
  const [variationChangeDeadlineDays, setVariationChangeDeadlineDays] =
    useState("30");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false);
  /** Edição: carregamento do produto via API ao abrir o modal. */
  const [productFetchStatus, setProductFetchStatus] = useState<
    "idle" | "loading" | "loaded" | "error"
  >("idle");
  const [formInitVersion, setFormInitVersion] = useState(0);
  const [productFormBaseline, setProductFormBaseline] = useState<string | null>(
    null,
  );
  /** Variação «Sem interesse» criada pelo backend: não exibimos ao organizador, mas reenviamos no PATCH se o produto continuar fora do ingresso. */
  const organizerHiddenSemInteresseRef = useRef<ProductVariation | null>(null);

  // ─── Mobile-only: bottom sheets para edição/criação de variação (Figma 3428:160661 + 3428:161019) ───
  // Mobile não edita inputs inline — abre bottom sheet "Mais opções" (Editar/Remover)
  // que por sua vez abre "Editar/Adicionar variação" com inputs nome/preço/estoque.

  const isEditing = data?.productId !== undefined;
  const isReadOnly = data?.readOnly === true;
  const eventId = data?.eventId;
  const isProductLoading = isEditing && productFetchStatus === "loading";

  /* Data do evento — base do aviso "Participantes podem alterar até dia X".
   * O modal roda fora dos providers de página (zustand global), então busca
   * o evento por conta própria; só quando aberto, pra não custar nada parado. */
  const { event: modalEvent } = useEvent(eventId ?? null, isOpen && !!eventId);

  /* Data-limite = data do evento − N dias, em UTC (padrão datetimeBR: o
   * servidor manda o instante pretendido; aritmética em UTC evita o bug de
   * "−1 dia" perto da meia-noite). Null (sem evento/dias vazio) esconde o box. */
  const variationDeadlineDateLabel = useMemo(() => {
    const days = parseInt(variationChangeDeadlineDays, 10);
    const base = toUtcDate(modalEvent?.eventDate);
    if (!base || !Number.isFinite(days)) return null;
    const limit = new Date(base.getTime());
    limit.setUTCDate(limit.getUTCDate() - days);
    return formatDateBR(limit, { day: "numeric", month: "long", year: "numeric" });
  }, [modalEvent?.eventDate, variationChangeDeadlineDays]);

  /** Estoque inicial de cada variação nova: soma das vagas de todos os lotes do ingresso (vem do modal). */

  const filledVariationsCount = variations.filter((v) => v.name.trim()).length;
  /** Criar e editar: no mínimo 1 nome de variação preenchido. */
  const hasMinVariations = filledVariationsCount >= 1;

  /**
   * Coluna "Total vendidos": só aparece quando há venda real (`soldCount > 0`)
   * em ALGUMA variação. Sem nenhuma venda (criação, ou edição de produto que
   * ainda não vendeu) a coluna fica oculta.
   */
  const showSoldColumn = variations.some((v) => (v.soldCount ?? 0) > 0);

  /**
   * Política atual (espelha `holdsStock` do backend): TODO produto segura o
   * próprio estoque da variação — inclusive incluso+obrigatório. Por isso a
   * coluna de Estoque aparece SEMPRE e o estoque é exigido (> 0) na validação.
   * (Antes incluso+obrigatório era gated só pela vaga do ingresso e a coluna
   * ficava oculta; agora o organizador pode limitar o item independentemente.)
   */
  const productHoldsStock = true;

  /**
   * Primeiro nome de variação duplicado (trim + case-insensitive pt-BR), ou
   * null se todos são únicos. Detecção em tempo real para o erro inline abaixo
   * da lista — espelha a regra do `validateBeforeSave` (que só avisa via toast
   * no save). Plain const (React Compiler memoiza) — evita o lint de
   * `preserve-manual-memoization` com função local.
   */
  const duplicateVariationName: string | null = (() => {
    const seen = new Set<string>();
    for (const v of variations) {
      const trimmed = v.name.trim();
      if (!trimmed) continue;
      const key = trimmed.toLocaleLowerCase("pt-BR");
      if (seen.has(key)) return trimmed;
      seen.add(key);
    }
    return null;
  })();


  /** Produto não incluso: preço base obrigatório e > 0. */
  const basePriceInvalidNotIncluded =
    !isIncludedInTicket && parsePriceReais(basePrice) <= 0;



  /** Alguma variação com preço específico realmente diferente de zero. */
  const anyVariationHasSpecificPrice = useMemo(
    () => variations.some((v) => variationHasMeaningfulSpecificPrice(v.price)),
    [variations],
  );

  /**
   * Prévia do dropdown (espelha `previewVariationListPriceLabelForProduct` do checkout):
   *  - Sem nenhum preço específico (> 0): não exibe preço.
   *  - Variação COM preço específico: mostra o valor cheio (TOTAL absoluto, não
   *    subtrai a base) — variação 30 → mostra 30, tanto incluso quanto não.
   *  - Variação SEM preço específico (mas outras têm): incluso não mostra preço
   *    (base já paga no ingresso); não incluso mostra a base.
   */
  const previewVariationListPriceLabel = useCallback(
    (variationPriceStr: string): string | undefined => {
      // Produto incluso → nunca exibe preço (grátis no ingresso).
      if (isIncludedInTicket) {
        return undefined;
      }
      if (!anyVariationHasSpecificPrice) {
        return undefined;
      }
      const fmt = (n: number) =>
        n.toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
      if (!variationHasMeaningfulSpecificPrice(variationPriceStr)) {
        const base = parseFloat(String(basePrice || "0").replace(",", ".")) || 0;
        return `R$ ${fmt(base)}`;
      }
      const v =
        parseFloat(String(variationPriceStr || "0").replace(",", ".")) || 0;
      return `R$ ${fmt(v)}`;
    },
    [anyVariationHasSpecificPrice, basePrice, isIncludedInTicket],
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
        productImages,
        primaryImageIndex,
        isIncludedInTicket,
        isRequired,
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
      productImages,
      primaryImageIndex,
      isIncludedInTicket,
      isRequired,
      basePrice,
      variationTypeName,
      buyerCanEditVariation,
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
      const imgs = Array.isArray(rec.images) ? rec.images.filter((i: unknown) => typeof i === "string") : [];
      const singleImg = rec.image ?? rec.image_url ?? rec.imageUrl;
      const loadedImages = imgs.length > 0 ? imgs : (typeof singleImg === "string" && singleImg ? [singleImg] : []);
      setProductImages(loadedImages);
      setPrimaryImageIndex(typeof rec.primaryImageIndex === "number" ? rec.primaryImageIndex : 0);
      const included =
        rec.isIncludedInTicket ?? rec.is_included_in_ticket;
      setIsIncludedInTicket(included !== false);
      setBasePrice(
        formatPriceFromApi(
          (rec.basePrice ?? rec.base_price) as number | string | undefined,
        ),
      );
      setIsRequired(rec.isRequired !== false);
      setVariationTypeName(
        sanitizeVariationTypeLabelInput(
          String(rec.variationType ?? rec.variation_type ?? ""),
        ),
      );
      const rawVars = rec.variations;
      /* O backend pode devolver as variações em ordem diferente da criação
       * (ex.: `createdAt DESC`), invertendo p,m,g → g,m,p ao reabrir o modal.
       * Ordenação preferindo `sortOrder` (índice persistido no save — contrato
       * pedido ao backend) e caindo pro `createdAt` ASC enquanto o backend não
       * expõe o `sortOrder`. Sort ESTÁVEL: sem nenhuma das chaves mantém a
       * ordem que a API devolveu — nunca piora. */
      const variationSortOrder = (v: unknown): number | null => {
        const r = v && typeof v === "object" ? (v as Record<string, unknown>) : {};
        const s = r.sortOrder ?? r.sort_order;
        const n = typeof s === "number" ? s : typeof s === "string" ? Number(s) : NaN;
        return Number.isFinite(n) ? n : null;
      };
      const variationCreatedAtMs = (v: unknown): number | null => {
        const r = v && typeof v === "object" ? (v as Record<string, unknown>) : {};
        const c = r.createdAt ?? r.created_at;
        const ms =
          typeof c === "string" || typeof c === "number" ? new Date(c).getTime() : NaN;
        return Number.isNaN(ms) ? null : ms;
      };
      const vars = (Array.isArray(rawVars) ? [...rawVars] : []).sort((a, b) => {
        const sa = variationSortOrder(a);
        const sb = variationSortOrder(b);
        if (sa !== null && sb !== null) return sa - sb;
        const ta = variationCreatedAtMs(a);
        const tb = variationCreatedAtMs(b);
        if (ta !== null && tb !== null) return ta - tb;
        return 0;
      });
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
            // Inteiro de campo da API (camelCase/snake_case); null se ausente.
            const toApiInt = (val: unknown): number | undefined => {
              if (val == null || val === "") return undefined;
              const n = typeof val === "number" ? val : parseInt(String(val), 10);
              return Number.isFinite(n) ? n : undefined;
            };
            return {
              id: String(row.id ?? `v-${Date.now()}-${i}`),
              name: String(row.name ?? row.variation_name ?? ""),
              price: formatPriceFromApi(
                (row.price ?? row.unit_price) as number | string | undefined,
              ),
              // Campo de estoque UNIFICADO = restante disponível
              // (`availableStock`). O "total" deixou de existir na UI; o limite
              // é derivado no save (restante + vendidas). Fallback ao limite
              // (`stock`) p/ respostas legadas sem `availableStock`.
              stock:
                row.availableStock != null
                  ? String(row.availableStock)
                  : row.available_stock != null
                    ? String(row.available_stock)
                    : row.stock != null
                      ? String(row.stock)
                      : row.quantity != null
                        ? String(row.quantity)
                        : "",
              persistedStock: toApiInt(row.stock ?? row.quantity),
              persistedAvailable: toApiInt(row.availableStock ?? row.available_stock),
              soldCount: toApiInt(row.soldCount ?? row.sold_count),
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
      organizerHiddenSemInteresseRef.current = null;
      return;
    }

    setDeleteConfirmOpen(false);
    setSaveConfirmOpen(false);

    if (!isEditing) {
      setProductFetchStatus("idle");
      setProductName("");
      setProductImages([]);
      setPrimaryImageIndex(0);
      setIsIncludedInTicket(true);
      setIsRequired(true);
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

  const linkedTicketsResolved = useProductLinkedTickets({
    isOpen,
    eventId,
    productId: data?.productId,
    linkedTickets: data?.linkedTickets,
    linkedTicketNames: data?.linkedTicketNames,
  });


  const handleBasePriceChange = (value: string) => {
    const raw = value.replace(/^R\$\s*/i, "").trim();
    const formatted = formatPrice(raw);
    setBasePrice(formatted === "" ? "0,00" : formatted);
  };

  const validateBeforeSave = (): boolean => {
    if (isProductLoading) return false;
    const result = validateProductForm({
      productName,
      variations,
      eventId,
      productHoldsStock,
      isIncludedInTicket,
      basePrice,
    });
    if (!result.ok) {
      toast.error(result.message);
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
      const primaryImage = productImages[primaryImageIndex] ?? productImages[0] ?? null;
      const baseProductPayload = {
        name: productName.trim(),
        image: primaryImage,
        images: productImages.length > 0 ? productImages : undefined,
        primaryImageIndex: productImages.length > 1 ? primaryImageIndex : undefined,
        isIncludedInTicket,
        basePrice: Math.round(basePriceReais * 100),
        isRequired: isIncludedInTicket ? isRequired : false,
        // Vazio = SEM tipo de variação. Enviamos "" (não `undefined`): no update
        // o backend stripa `undefined` e manteria o tipo antigo, então limpar o
        // campo no modal não surtia efeito. "" é gravado e LIMPA o campo. `null`
        // não serve (o DTO valida `@IsString()`).
        variationType: variationTypeName.trim(),
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
                // Campo = restante disponível; deriva o LIMITE preservando
                // vendas e holds (delta sobre o limite persistido).
                stock: variationStockToPersist(v),
              };
            });
          const hidden = organizerHiddenSemInteresseRef.current;
          const all =
            !isIncludedInTicket && hidden
              ? [
                ...fromForm,
                {
                  name: hidden.name.trim(),
                  price:
                    Math.round(
                      (parseFloat(String(hidden.price || "0").replace(",", ".")) || 0) * 100,
                    ),
                  stock: variationStockToPersist(hidden),
                },
              ]
              : fromForm;
          // `sortOrder` = índice na ordem final do array, pro backend persistir
          // e devolver as variações na ordem em que o organizador as definiu.
          return all.map((v, i) => ({ ...v, sortOrder: i }));
        })(),
        // Edição de variação pós-compra só é válida para produtos inclusos.
        // Defesa em profundidade: força `false`/0 caso o estado tenha sido
        // carregado de um produto legado (criado antes desta regra).
        buyerVariationEditAllowed: isIncludedInTicket && buyerCanEditVariation,
        variationEditDeadlineDays:
          isIncludedInTicket && buyerCanEditVariation ? deadlineDays : 0,
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
                      isReadOnly ? "Visualizar produto" : "Editar produto"
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
                <div className={cn("flex flex-col gap-5 p-5 max-md:gap-8 max-md:p-4", isReadOnly && "pointer-events-none select-none opacity-70")}>
                  <div className="flex min-h-0 flex-col gap-11 max-md:gap-8 md:flex-1">
                    <div className="flex flex-col gap-6">
                      <div className="flex flex-col gap-1">
                        <h3 className="text-gray-12 font-semibold font-manrope leading-[1.1] text-lg">
                          Adicione imagens do produto
                        </h3>
                        <p className="text-sm font-normal font-family-dm-sans leading-[1.3] text-gray-11">
                          Boas fotos ajudam na decisão do participante
                        </p>
                      </div>
                      <div className="flex flex-col gap-3 p-3 md:p-4 border-2 rounded-xl border-dashed border-gray-6 w-full md:w-max">
                        <div className="flex flex-wrap gap-2 md:gap-3">
                          {productImages.map((img, idx) => (
                            <div key={idx} className="relative">
                              <button
                                type="button"
                                onClick={() => setPrimaryImageIndex(idx)}
                                className={cn(
                                  "relative size-[80px] md:size-[100px] shrink-0 overflow-hidden rounded-xl border-2 transition-colors",
                                  idx === primaryImageIndex
                                    ? "border-primary-8"
                                    : "border-gray-6 hover:border-gray-9"
                                )}
                                aria-label={idx === primaryImageIndex ? "Imagem principal" : "Definir como principal"}
                              >
                                <ImageWithInitialFallback
                                  src={img}
                                  alt={`Foto ${idx + 1}`}
                                  name={productName || "Produto"}
                                  fill
                                  sizes="(max-width: 768px) 80px, 100px"
                                  className="size-full object-cover border-0 border-transparent"
                                  letterClassName="text-2xl font-semibold"
                                />
                                {idx === primaryImageIndex && (
                                  <div className="absolute bottom-0 left-0 right-0 bg-primary-4 text-center flex items-center justify-center py-0.5 md:py-1">
                                    <span className="text-[9px] md:text-[10px] font-semibold text-primary-11 font-manrope leading-none">
                                      Principal
                                    </span>
                                  </div>
                                )}
                              </button>
                              {/* Botões sobrepostos */}
                              <div className="absolute -right-1.5 -top-1.5 flex flex-col gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setProductImages(prev => {
                                      const updated = prev.filter((_, i) => i !== idx);
                                      setPrimaryImageIndex(pi => {
                                        if (pi >= updated.length) return Math.max(0, updated.length - 1);
                                        if (pi > idx) return pi - 1;
                                        return pi;
                                      });
                                      return updated;
                                    });
                                  }}
                                  className="flex size-6 items-center justify-center rounded border border-gray-6 bg-gray-1 text-gray-11 shadow-sm hover:bg-red-50 hover:text-red-500 hover:border-red-200"
                                  aria-label="Remover foto"
                                  title="Remover foto"
                                >
                                  <X className="size-3" />
                                </button>
                              </div>
                            </div>
                          ))}

                          {/* Slot de adicionar foto */}
                          {productImages.length < 7 && (
                            <div
                              onDrop={handleDrop}
                              onDragOver={handleDragOver}
                              className="flex size-[80px] md:size-[100px] shrink-0 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border border-gray-6 transition-colors hover:border-primary-8"
                              onClick={() => {
                                cropTargetIndexRef.current = null;
                                productCropRef.current?.open();
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  cropTargetIndexRef.current = null;
                                  productCropRef.current?.open();
                                }
                              }}
                              role="button"
                              tabIndex={0}
                              aria-label="Adicionar foto"
                            >
                              <Plus className="size-7 md:size-8 text-gray-12" />
                            </div>
                          )}
                        </div>
                        <h1 className="font-bold text-primary-11 font-family-dm-sans text-sm md:text-base">
                          <span className="md:hidden">Toque para adicionar fotos</span>
                          <span className="hidden md:inline">Arraste uma imagem para este campo ou clique aqui</span>
                        </h1>
                        <p className="font-family-dm-sans text-gray-11 text-xs md:text-base">
                          Até 7 fotos · PNG ou JPG, máximo 10MB cada
                        </p>
                      </div>
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
                          placeholder="Ex: Kit basico, camisa, mochila"
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
                              setIsRequired(false);
                              // Edição de variação pós-compra só faz sentido
                              // para produtos inclusos no ingresso — desliga
                              // automaticamente ao sair do modo "incluso".
                              setBuyerCanEditVariation(false);
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
                            {basePriceInvalidNotIncluded ? (
                              <p className="text-red-11 text-sm font-family-dm-sans leading-[1.3]">
                                Informe um valor acima de R$ 0,00.
                              </p>
                            ) : null}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Is Required */}
                    {isIncludedInTicket && (
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-1">
                          <label className="text-gray-12 text-base font-normal font-family-dm-sans leading-[1.3]">
                            Este produto é obrigatório ou opcional?
                          </label>
                          <Tooltip
                            content={
                              <p className="font-family-dm-sans font-normal text-sm leading-[1.4] text-gray-12 text-left">
                                Se for obrigatório, o participante deverá
                                selecioná-lo para concluir a inscrição.
                              </p>
                            }
                            position="topRight"
                          >
                            <button
                              type="button"
                              className="inline-flex cursor-help text-gray-11 hover:text-gray-12 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-8 rounded"
                              aria-label="Informação: produto obrigatório ou opcional"
                            >
                              <BookIcon className="size-5 shrink-0" />
                            </button>
                          </Tooltip>
                        </div>
                        <div className="flex gap-2.5">
                          <div className="flex items-center gap-2">
                            <Radio
                              checked={isRequired}
                              onChange={() => setIsRequired(true)}
                              name="required"
                              className="size-6"
                            />
                            <span className="text-base font-normal font-family-dm-sans leading-[1.3] text-gray-12 md:text-sm">
                              Obrigatório
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Radio
                              checked={!isRequired}
                              onChange={() => setIsRequired(false)}
                              name="required"
                              className="size-6"
                            />
                            <span className="text-base font-normal font-family-dm-sans leading-[1.3] text-gray-12 md:text-sm">
                              Opcional
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

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

                      <ProductVariations
                        variationTypeName={variationTypeName}
                        setVariationTypeName={setVariationTypeName}
                        variations={variations}
                        isIncludedInTicket={isIncludedInTicket}
                        productHoldsStock={productHoldsStock}
                        showSoldColumn={showSoldColumn}
                        duplicateVariationName={duplicateVariationName}
                        handleVariationChange={handleVariationChange}
                        handlePriceChange={handlePriceChange}
                        handleRemoveVariation={handleRemoveVariation}
                        handleAddVariation={handleAddVariation}
                        openMobileAddVariation={openMobileAddVariation}
                        setMobileMoreMenuVariationId={setMobileMoreMenuVariationId}
                      />
                    </div>
                  </div>

                  {/* Right Column - Preview */}
                  <ProductPreview
                    isIncludedInTicket={isIncludedInTicket}
                    buyerCanEditVariation={buyerCanEditVariation}
                    setBuyerCanEditVariation={setBuyerCanEditVariation}
                    variationChangeDeadlineDays={variationChangeDeadlineDays}
                    setVariationChangeDeadlineDays={setVariationChangeDeadlineDays}
                    variationDeadlineDateLabel={variationDeadlineDateLabel}
                    productPreviewDropdownOptions={productPreviewDropdownOptions}
                    productImages={productImages}
                    primaryImageIndex={primaryImageIndex}
                    productName={productName}
                    basePrice={basePrice}
                    variationTypeName={variationTypeName}
                  />
                </div>
              </div>

              {/* Footer */}
              {!isReadOnly && <div
                data-fixed-bottom-bar="true"
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
              </div>}
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

          <ProductVariationMobileSheets
            mobileMoreMenuVariationId={mobileMoreMenuVariationId}
            setMobileMoreMenuVariationId={setMobileMoreMenuVariationId}
            openMobileEditVariation={openMobileEditVariation}
            handleMobileRemoveVariation={handleMobileRemoveVariation}
            mobileVariationDraft={mobileVariationDraft}
            setMobileVariationDraft={setMobileVariationDraft}
            mobileVariationDraftError={mobileVariationDraftError}
            setMobileVariationDraftError={setMobileVariationDraftError}
            closeMobileVariationDraft={closeMobileVariationDraft}
            handleMobileDraftPriceChange={handleMobileDraftPriceChange}
            saveMobileVariationDraft={saveMobileVariationDraft}
            isIncludedInTicket={isIncludedInTicket}
            productHoldsStock={productHoldsStock}
          />

          <ProductLinkedTicketsConfirmDialog
            open={deleteConfirmOpen}
            idBase="delete-product"
            busy={isDeleting}
            onBackdropClose={() => setDeleteConfirmOpen(false)}
            gapClassName="gap-11"
            title="Deletar produto permanentemente?"
            description="Ao deletar este produto, ele será removido de todos os ingressos vinculados:"
            items={linkedTicketsResolved}
            bulletClassName="bg-red-11"
            emptyFallback={
              <p className="text-gray-11 text-sm font-normal font-family-dm-sans leading-[1.3] text-center">
                Este produto pode estar vinculado a outros ingressos do evento. A
                exclusão removerá o produto de todos eles.
              </p>
            }
            footer={
              <>
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
              </>
            }
          />

          {/* Confirmação ao salvar — mesma lista de ingressos vinculados */}
          <ProductLinkedTicketsConfirmDialog
            open={saveConfirmOpen}
            idBase="save-product"
            busy={isSubmitting}
            onBackdropClose={() => setSaveConfirmOpen(false)}
            gapClassName="gap-8"
            title={isEditing ? "Salvar alterações no produto?" : "Criar produto?"}
            description={
              isEditing
                ? "Este produto está vinculado aos seguintes ingressos. As alterações serão refletidas em todos eles:"
                : "O produto será vinculado ao kit destes ingressos:"
            }
            items={linkedTicketsResolved}
            bulletClassName="bg-primary-9"
            footer={
              <>
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
              </>
            }
          />
        </>
      )}
    </AnimatePresence>
  );
}

