import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { maskPriceInputFromDigits as formatPrice } from "@/lib/productValidation";
import type {
  ProductVariation,
  MobileVariationDraft,
} from "@/components/Product/CreateProductModal.types";

/**
 * Estado e handlers das VARIAÇÕES do produto (`CreateProductModal`), incluindo
 * os bottom-sheets mobile. Extraído no Bloco 3 (Fase 4). A UI (tabela desktop +
 * cards/sheets mobile) continua no componente, consumindo o que o hook expõe.
 *
 * Calcula internamente `defaultVariationStockFromBatches` (estoque inicial de
 * variação nova = vagas totais dos lotes do ingresso) — usado tanto aqui quanto
 * na hidratação/reset do formulário (que recebe o valor de volta).
 */
export function useProductVariations(params: {
  ticketBatchesTotalQuantity?: unknown;
}) {
  const { ticketBatchesTotalQuantity } = params;

  const [variations, setVariations] = useState<ProductVariation[]>([]);
  const [mobileMoreMenuVariationId, setMobileMoreMenuVariationId] = useState<
    string | null
  >(null);
  const [mobileVariationDraft, setMobileVariationDraft] =
    useState<MobileVariationDraft | null>(null);
  const [mobileVariationDraftError, setMobileVariationDraftError] = useState<
    string | null
  >(null);

  /** Estoque inicial de cada variação nova: soma das vagas de todos os lotes do ingresso. */
  const defaultVariationStockFromBatches = useMemo(() => {
    const raw = ticketBatchesTotalQuantity;
    if (typeof raw === "number" && Number.isFinite(raw)) {
      return String(Math.max(0, Math.floor(raw)));
    }
    return "0";
  }, [ticketBatchesTotalQuantity]);

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

  const handlePriceChange = (id: string, value: string) => {
    const formatted = formatPrice(value);
    handleVariationChange(id, "price", formatted === "" ? "0,00" : formatted);
  };

  // ─── Handlers dos bottom sheets mobile de variação ───
  const openMobileEditVariation = (id: string) => {
    const v = variations.find((x) => x.id === id);
    if (!v) return;
    setMobileVariationDraft({
      target: id,
      name: v.name,
      price: v.price,
      stock: v.stock,
    });
    setMobileVariationDraftError(null);
    setMobileMoreMenuVariationId(null);
  };

  const openMobileAddVariation = () => {
    setMobileVariationDraft({
      target: "new",
      name: "",
      price: "",
      stock: defaultVariationStockFromBatches,
    });
    setMobileVariationDraftError(null);
  };

  const closeMobileVariationDraft = () => {
    setMobileVariationDraft(null);
    setMobileVariationDraftError(null);
  };

  const handleMobileDraftPriceChange = (value: string) => {
    if (!mobileVariationDraft) return;
    const formatted = formatPrice(value);
    setMobileVariationDraft({
      ...mobileVariationDraft,
      price: formatted === "" ? "" : formatted,
    });
  };

  const saveMobileVariationDraft = () => {
    if (!mobileVariationDraft) return;
    const name = mobileVariationDraft.name.trim();
    if (!name) {
      setMobileVariationDraftError("Informe o nome da variação.");
      return;
    }
    // Nome único dentro do produto (ignora a própria variação ao editar).
    const nameKey = name.toLocaleLowerCase("pt-BR");
    const isDuplicateName = variations.some(
      (v) =>
        v.id !== mobileVariationDraft.target &&
        v.name.trim().toLocaleLowerCase("pt-BR") === nameKey,
    );
    if (isDuplicateName) {
      setMobileVariationDraftError("Já existe uma variação com esse nome.");
      return;
    }
    if (mobileVariationDraft.target === "new") {
      const newVariation: ProductVariation = {
        id: Date.now().toString(),
        name,
        price: mobileVariationDraft.price || "",
        stock: mobileVariationDraft.stock || defaultVariationStockFromBatches,
      };
      setVariations([...variations, newVariation]);
    } else {
      const targetId = mobileVariationDraft.target;
      setVariations(
        variations.map((v) =>
          v.id === targetId
            ? {
                ...v,
                name,
                price: mobileVariationDraft.price,
                stock: mobileVariationDraft.stock,
              }
            : v,
        ),
      );
    }
    closeMobileVariationDraft();
  };

  const handleMobileRemoveVariation = (id: string) => {
    setMobileMoreMenuVariationId(null);
    handleRemoveVariation(id);
  };

  return {
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
  };
}
