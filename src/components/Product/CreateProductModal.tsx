"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useCreateProductModal } from "@/stores/modalStore";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Radio } from "@/components/Radio";
import { X, Plus, Info } from "lucide-react";
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

interface ProductVariation {
  id: string;
  name: string;
  price: string;
  stock: string;
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

export function CreateProductModal() {
  const { isOpen, closeCreateProductModal, data, onModalSave } =
    useCreateProductModal();
  const [productName, setProductName] = useState("");
  const [productImage, setProductImage] = useState<string | null>(null);
  const [isIncludedInTicket, setIsIncludedInTicket] = useState(true);
  const [basePrice, setBasePrice] = useState("");
  const [isRequired, setIsRequired] = useState(true);
  const [variationTypeName, setVariationTypeName] = useState("");
  const [variations, setVariations] = useState<ProductVariation[]>([]);
  /** Padrão Figma: «Não» — liberar edição da variação pelo comprador */
  const [buyerCanEditVariation, setBuyerCanEditVariation] = useState(false);
  const [variationChangeDeadlineDays, setVariationChangeDeadlineDays] =
    useState("30");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formInitVersion, setFormInitVersion] = useState(0);
  const [productFormBaseline, setProductFormBaseline] = useState<string | null>(
    null,
  );
  const productCropRef = useRef<ImageUploadWithCropRef>(null);

  const isEditing = data?.productId !== undefined;
  const eventId = data?.eventId;

  /** Estoque inicial de cada variação nova: soma das vagas de todos os lotes do ingresso (vem do modal). */
  const defaultVariationStockFromBatches = useMemo(() => {
    const raw = data?.ticketBatchesTotalQuantity;
    if (typeof raw === "number" && Number.isFinite(raw)) {
      return String(Math.max(0, Math.floor(raw)));
    }
    return "0";
  }, [data?.ticketBatchesTotalQuantity]);

  const filledVariationsCount = variations.filter((v) => v.name.trim()).length;
  /** Criar: no mínimo 2 nomes preenchidos. Editar: no mínimo 1 (produtos legados). */
  const hasMinVariations = isEditing
    ? filledVariationsCount >= 1
    : filledVariationsCount >= 2;

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

  const productPreviewDropdownOptions = useMemo(
    () =>
      variations.map((variation) => ({
        id: variation.id,
        label: variation.name.trim() || "Variação",
        suffix: previewVariationListPriceLabel(variation.price),
      })),
    [variations, previewVariationListPriceLabel],
  );

  const productFormSnapshot = useMemo(
    () =>
      JSON.stringify({
        productName: productName.trim(),
        productImage,
        isIncludedInTicket,
        basePrice,
        isRequired,
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
      isRequired,
      variationTypeName,
      buyerCanEditVariation,
      variationChangeDeadlineDays,
      variations,
    ],
  );

  const isProductFormDirty =
    productFormBaseline !== null && productFormSnapshot !== productFormBaseline;

  // Initialize form when modal opens
  useEffect(() => {
    if (!isOpen) {
      setFormInitVersion(0);
      setProductFormBaseline(null);
      return;
    }
    if (isEditing && data?.product) {
      // Editing mode - load product data (API envia preços em centavos)
      const p = data.product;
      setProductName(p.name || "");
      setProductImage(p.image || null);
      setIsIncludedInTicket(p.isIncludedInTicket ?? true);
      setBasePrice(formatPriceFromApi(p.basePrice));
      setIsRequired(p.isRequired ?? true);
      setVariationTypeName(p.variationType || "");
      setVariations(
        Array.isArray(p.variations)
          ? p.variations.map((v: any) => ({
            id: v.id || String(Date.now() + Math.random()),
            name: v.name ?? "",
            price: formatPriceFromApi(v.price),
            stock: v.stock != null ? String(v.stock) : "",
          }))
          : [],
      );
      const buyerEdit = buyerVariationEditStateFromApiProduct(
        p as Record<string, unknown>,
      );
      setBuyerCanEditVariation(buyerEdit.allowed);
      setVariationChangeDeadlineDays(buyerEdit.deadlineDays);
    } else {
      // Create mode: 1ª variação "Padrão" + estoque = soma dos lotes; 2ª vazia (obrigatório nome para habilitar salvar)
      setProductName("");
      setProductImage(null);
      setIsIncludedInTicket(true);
      setBasePrice("");
      setIsRequired(true);
      setVariationTypeName("");
      const t = Date.now();
      setVariations([
        {
          id: `${t}-a`,
          name: "Padrão",
          price: "",
          stock: defaultVariationStockFromBatches,
        },
        {
          id: `${t}-b`,
          name: "",
          price: "",
          stock: "",
        },
      ]);
      setBuyerCanEditVariation(false);
      setVariationChangeDeadlineDays("30");
    }
    setFormInitVersion((v) => v + 1);
  }, [isOpen, isEditing, data, defaultVariationStockFromBatches]);

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
    const minRows = isEditing ? 1 : 2;
    if (variations.length <= minRows) {
      toast.error(
        minRows >= 2
          ? "É necessário ter pelo menos duas variações"
          : "É necessário ter pelo menos uma variação",
      );
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
    const cents = parseInt(numbers);
    return (cents / 100).toFixed(2).replace(".", ",");
  };

  const handlePriceChange = (id: string, value: string) => {
    const formatted = formatPrice(value);
    handleVariationChange(id, "price", formatted);
  };

  const handleBasePriceChange = (value: string) => {
    const formatted = formatPrice(value);
    setBasePrice(formatted);
  };

  const handleSave = async () => {
    if (!productName.trim()) {
      toast.error("Digite o nome do produto");
      return;
    }

    if (productName.length > 25) {
      toast.error("O nome do produto deve ter no máximo 25 caracteres");
      return;
    }

    if (!hasMinVariations) {
      toast.error(
        isEditing
          ? "Preencha o nome de pelo menos uma variação"
          : "Preencha o nome de pelo menos duas variações",
      );
      return;
    }

    if (!eventId) {
      toast.error("Evento não encontrado");
      return;
    }

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
        isRequired,
        variationType: variationTypeName.trim() || undefined,
        variations: variations
          .filter((v) => v.name.trim())
          .map((v) => {
            const priceReais =
              parseFloat(String(v.price || "0").replace(",", ".")) || 0;
            return {
              name: v.name.trim(),
              price: Math.round(priceReais * 100),
              stock: parseInt(v.stock) || 0,
            };
          }),
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
            className="fixed inset-0 bg-black/90 z-50"
            onClick={closeCreateProductModal}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gray-1 rounded-xl border border-gray-6 w-full max-w-[1192px] max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="border-b border-gray-6 flex items-center justify-between px-4 py-3 shrink-0">
                <h2 className="text-gray-12 text-[20px] font-semibold font-family-dm-sans leading-[1.3]">
                  {isEditing ? "Editar produto" : "Criação de produto"}
                </h2>
                <button
                  onClick={closeCreateProductModal}
                  className="text-gray-11 hover:text-gray-12 transition-colors p-1"
                >
                  <X className="size-6" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 min-h-0 overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-6 [&::-webkit-scrollbar-thumb]:rounded-full">
                <div className="flex flex-col gap-5 p-5">
                  {/* Left Column */}
                  <div className="flex-1 flex flex-col gap-11">
                    {/* Image Upload */}
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-col gap-3">
                        <h3 className="text-gray-12 text-lg font-semibold font-manrope leading-[1.1]">
                          Adicione uma imagem do produto
                        </h3>
                        <p className="text-gray-11 text-base font-normal font-family-dm-sans leading-[1.3]">
                          Boas fotos ajudam na decisão do participante. Depois de
                          escolher o arquivo, ajuste posição e zoom no recorte —
                          mesmo fluxo do banner e do card do evento.
                        </p>
                      </div>
                      {productImage ? (
                        <div className="border-2 border-gray-6 border-dashed rounded-xl p-6 flex gap-6 items-center w-full">
                          <div className="relative rounded-2xl shrink-0 size-[120px] overflow-hidden">
                            <ImageWithInitialFallback
                              src={productImage}
                              alt="Product preview"
                              name={productName || "Produto"}
                              fill
                              sizes="120px"
                              className="size-full"
                              letterClassName="text-4xl font-semibold"
                            />
                          </div>
                          <div className="flex flex-1 flex-col gap-6">
                            <div className="flex flex-col gap-4">
                              <p className="text-gray-12 text-base font-semibold font-manrope leading-[1.1]">
                                Arraste uma imagem para este campo ou clique
                                abaixo
                              </p>
                              <p className="text-gray-11 text-base font-family-dm-sans leading-[1.3]">
                                PNG ou JPG, máximo 10MB
                              </p>
                            </div>
                            <Button
                              type="button"
                              onClick={() => productCropRef.current?.open()}
                              variant="outline"
                              className="w-full border-gray-6 text-gray-12"
                            >
                              <p className="text-gray-12 text-base font-bold font-family-dm-sans leading-[1.3]">
                                Trocar imagem
                              </p>
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div
                          onDrop={handleDrop}
                          onDragOver={handleDragOver}
                          className="border-2 border-dashed border-gray-6 rounded-xl p-6 flex flex-col gap-6 items-center justify-center min-h-[120px] cursor-pointer hover:border-primary-8 transition-colors w-full"
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
                          <p className="text-primary-11 text-base font-bold font-family-dm-sans leading-[1.3]">
                            Arraste uma imagem para este campo ou clique aqui
                          </p>
                          <div className="flex flex-col gap-4 items-center text-center">
                            <p className="text-gray-12 text-base font-semibold font-manrope leading-[1.1]">
                              Adicionar foto
                            </p>
                            <p className="text-gray-11 text-base font-family-dm-sans leading-[1.3]">
                              PNG ou JPG, máximo 10MB
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Product Name */}
                    <div className="flex flex-col gap-2.5">
                      <div className="flex flex-col gap-2">
                        <label className="text-gray-12 text-base font-normal font-family-dm-sans leading-[1.3]">
                          Título
                        </label>
                        <Input
                          type="text"
                          value={productName}
                          onChange={(e) => setProductName(e.target.value)}
                          placeholder="Ex: Camisa Premium"
                          maxLength={25}
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
                          <span className="text-gray-12 text-sm font-normal font-family-dm-sans leading-[1.3]">
                            Sim
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Radio
                            checked={!isIncludedInTicket}
                            onChange={() => setIsIncludedInTicket(false)}
                            name="included"
                            className="size-6"
                          />
                          <span className="text-gray-12 text-sm font-normal font-family-dm-sans leading-[1.3]">
                            Não
                          </span>
                        </div>
                      </div>
                      {!isIncludedInTicket && (
                        <div className="flex flex-col gap-2.5 w-[259px]">
                          <div className="flex flex-col gap-2">
                            <label className="text-gray-12 text-base font-normal font-family-dm-sans leading-[1.3]">
                              Preço
                            </label>
                            <Input
                              type="text"
                              value={basePrice ? `R$ ${basePrice}` : ""}
                              onChange={(e) =>
                                handleBasePriceChange(e.target.value)
                              }
                              placeholder="R$ 0,00"
                              className="h-12 px-3"
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <Info className="size-5 text-gray-11" />
                            <span className="text-gray-11 text-base font-normal font-family-dm-sans leading-[1.3] flex-1">
                              Você ainda poderá escolher um preço específico nas
                              variações
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Is Required */}
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
                          <span className="text-gray-12 text-sm font-normal font-family-dm-sans leading-[1.3]">
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
                          <span className="text-gray-12 text-sm font-normal font-family-dm-sans leading-[1.3]">
                            Opcional
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Variations */}
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-col gap-3">
                        <h3 className="text-gray-12 text-lg font-semibold font-manrope leading-[1.1]">
                          Variações e estoque
                        </h3>
                        <p className="text-gray-11 text-base font-normal font-family-dm-sans leading-[1.3]">
                          Crie opções como tamanhos e controle estoque por
                          variação. Você pode reaproveitar um conjunto de
                          variações para não repetir trabalho.
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
                          onChange={(e) => setVariationTypeName(e.target.value)}
                          placeholder="Ex: Tamanhos/Cores/Variações"
                          className="h-12 px-3"
                        />
                      </div>

                      {/* Variations Table */}
                      <div className="bg-gray-2 border-[1.5px] border-gray-6 rounded-lg">
                        {/* Table Header */}
                        <div className="bg-gray-3 border-b border-gray-6 h-11 flex items-center rounded-t-lg">
                          <div className="flex-1 px-4">
                            <span className="text-gray-12 text-sm font-medium font-inter leading-[1.3]">
                              {variationTypeName.trim() || "Variações"}
                            </span>
                          </div>
                          <div className="w-[188px] px-4 flex items-center justify-center">
                            <span className="text-gray-12 text-sm font-medium font-inter leading-[1.3] flex items-center gap-1">
                              Preço específico{" "}
                              <Tooltip
                                content={
                                  <div className="flex flex-col gap-2 font-family-dm-sans font-normal text-sm leading-[1.4] text-gray-12 text-left w-full">
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
                                  className="inline-flex cursor-help text-gray-12 hover:text-gray-11 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-8 rounded"
                                  aria-label="Informação: preço específico da variação"
                                >
                                  <BookIcon className="size-5 shrink-0" />
                                </button>
                              </Tooltip>
                            </span>
                          </div>
                          <div className="w-[132px] px-4 flex items-center justify-center">
                            <span className="text-gray-12 text-sm font-medium font-inter leading-[1.3]">
                              Estoque
                            </span>
                          </div>
                          <div className="border-l border-gray-6 h-full flex items-center justify-center px-4 w-[74px]">
                            <span className="text-gray-12 text-sm font-medium font-inter leading-[1.3]">
                              Ações
                            </span>
                          </div>
                        </div>

                        {/* Variations List */}
                        {variations.map((variation) => (
                          <div
                            key={variation.id}
                            className="border-b border-gray-6 h-[52px] flex items-center"
                          >
                            <div className="flex-1 px-4">
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
                                className="h-auto border-0 bg-transparent px-0 focus:ring-0 text-sm font-medium font-inter text-gray-12 focus:outline-none focus:border-0 w-full"
                              />
                            </div>
                            <div className="w-[188px] px-4 flex items-center justify-center">
                              {isIncludedInTicket ? (
                                <span className="flex items-center gap-1 text-sm font-medium font-inter text-gray-11">
                                  Incluso
                                </span>
                              ) : (
                                <div className="flex gap-0.5 items-center text-sm font-semibold font-inter text-gray-12">
                                  <span>R$</span>
                                  <input
                                    type="text"
                                    value={variation.price}
                                    onChange={(e) =>
                                      handlePriceChange(
                                        variation.id,
                                        e.target.value,
                                      )
                                    }
                                    className="w-16 border-0 bg-transparent px-0 focus:ring-0 text-sm font-semibold font-inter text-gray-12 focus:outline-none focus:border-0"
                                    placeholder="0,00"
                                  />
                                </div>
                              )}
                            </div>
                            <div className="w-[132px] px-4 flex items-center justify-center">
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
                                className="w-16 border-0 bg-transparent px-0 focus:ring-0 text-sm font-semibold font-inter text-gray-12 focus:outline-none focus:border-0 text-center"
                                placeholder="0"
                              />
                            </div>
                            <div className="flex items-center justify-center px-4 w-[74px]">
                              <button
                                onClick={() =>
                                  handleRemoveVariation(variation.id)
                                }
                                className="bg-red-2 border-[1.5px] border-red-6 rounded-lg size-9 flex items-center justify-center hover:bg-red-3 transition-colors"
                              >
                                <TrashIcon className="size-5 text-red-12" />
                              </button>
                            </div>
                          </div>
                        ))}

                        {/* Add Variation Button */}
                        <div className="p-4 flex justify-center">
                          <button
                            onClick={handleAddVariation}
                            className="flex items-center gap-1 h-11 px-11 text-gray-11 text-base font-semibold font-family-dm-sans hover:text-gray-12 transition-colors"
                          >
                            <Plus className="size-6" />
                            Adicionar variação
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column - Preview */}
                  <div className="shrink-0 flex flex-col gap-4 sticky top-5">
                    <div className="flex flex-col gap-5 w-full">
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
                              className="text-sm text-gray-12 font-normal font-family-dm-sans leading-[1.3] cursor-pointer select-none bg-transparent border-none p-0 text-left hover:text-gray-12"
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
                              className="text-sm text-gray-12 font-normal font-family-dm-sans leading-[1.3] cursor-pointer select-none bg-transparent border-none p-0 text-left hover:text-gray-12"
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
                              className="h-9 min-w-13 w-10 shrink-0 rounded-lg border border-gray-7 bg-gray-1 px-2 text-center text-base font-normal font-family-dm-sans text-gray-11 placeholder:text-gray-11 focus:border-primary-8 focus:outline-none"
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

                    <h3 className="text-gray-12 text-xl font-bold font-manrope leading-[1.1]">
                      Prévia
                    </h3>
                    <div className="bg-gray-2 border border-gray-6 rounded-xl flex flex-col w-[406px]">
                      <div className="border-b border-gray-6 flex gap-3 items-center p-4">
                        <div className="border border-gray-6 rounded size-[100px] shrink-0 overflow-hidden bg-gray-3 relative">
                          <ImageWithInitialFallback
                            src={productImage}
                            alt="Product preview"
                            name={productName || "Nome do produto"}
                            fill
                            sizes="100px"
                            className="size-full"
                            letterClassName="text-2xl font-semibold"
                          />
                        </div>
                        <div className="flex flex-col justify-between py-2 flex-1">
                          <p className="text-gray-12 text-base font-semibold font-manrope leading-[1.1]">
                            {productName || "Nome do produto"}
                          </p>
                          {anyVariationHasSpecificPrice && (
                            <p className="text-gray-12 text-base font-semibold font-manrope leading-[1.1]">
                              R$ {basePrice.trim() ? basePrice : "0,00"}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="p-4">
                        <p className="text-base text-gray-12 mb-2">
                          Escolha a variação
                        </p>
                        <Dropdown
                          options={productPreviewDropdownOptions}
                          menuInline
                          width="w-full"
                          maxHeight="max-h-[200px]"
                          selectedIds={variations.map(
                            (variation) => variation.id,
                          )}
                          trigger={(isOpen: boolean) => (
                            <div className="w-full h-12 px-3 py-4 border border-gray-7 rounded-lg cursor-pointer hover:border-gray-8 transition-colors flex items-center justify-between">
                              <p className="text-base text-gray-11">
                                Selecione a variação
                              </p>
                              <ArrowButton isOpen={isOpen} />
                            </div>
                          )}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-gray-6 flex items-center justify-end gap-3 px-6 py-4 shrink-0">
                <Button
                  variant="outline"
                  onClick={closeCreateProductModal}
                  disabled={isSubmitting}
                  className="border-gray-6 text-gray-11 px-4 py-2"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={
                    isSubmitting ||
                    !productName.trim() ||
                    !hasMinVariations ||
                    productFormBaseline === null ||
                    !isProductFormDirty
                  }
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

          <ImageUploadWithCrop
            ref={productCropRef}
            spec={EVENT_IMAGE_SPECS.product}
            outputBaseName="produto"
            modalTitle="Ajustar imagem do produto"
            onCropped={handleProductCropped}
            onInvalidFile={(msg) => toast.error(msg)}
            onCropFailed={(msg) => toast.error(msg)}
          />
        </>
      )}
    </AnimatePresence>
  );
}

