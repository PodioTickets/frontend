"use client";

import { useState, useEffect, useRef } from "react";
import { useCreateProductModal } from "@/stores/modalStore";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Radio } from "@/components/Radio";
import { X, Plus, Info, Upload } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { TrashIcon } from "../Icons/TrashIcon";
import Image from "next/image";
import { ArrowButton } from "../ArrowButton";
import { Dropdown } from "../Dropdown";
import { organizerService } from "@/services";

interface ProductVariation {
  id: string;
  name: string;
  price: string;
  stock: string;
}

export function CreateProductModal() {
  const { isOpen, closeCreateProductModal, data, onModalSave } = useCreateProductModal();
  const [productName, setProductName] = useState("");
  const [productImage, setProductImage] = useState<string | null>(null);
  const [isIncludedInTicket, setIsIncludedInTicket] = useState(true);
  const [basePrice, setBasePrice] = useState("");
  const [isRequired, setIsRequired] = useState(true);
  const [variationTypeName, setVariationTypeName] = useState("");
  const [variations, setVariations] = useState<ProductVariation[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditing = data?.productId !== undefined;
  const eventId = data?.eventId;

  // Helper: API retorna preços em centavos; exibir em reais (formato "10,50")
  const formatPriceFromApi = (value: number | string | undefined): string => {
    if (value == null || value === "") return "";
    if (typeof value === "number") return (value / 100).toFixed(2).replace(".", ",");
    const s = String(value).trim().replace(".", ",");
    return s;
  };

  // Initialize form when modal opens
  useEffect(() => {
    if (isOpen) {
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
            : []
        );
      } else {
        // Create mode - reset form
        setProductName("");
        setProductImage(null);
        setIsIncludedInTicket(true);
        setBasePrice("");
        setIsRequired(true);
        setVariationTypeName("");
        setVariations([]);
      }
    }
  }, [isOpen, isEditing, data]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
    ];
    if (!validTypes.includes(file.type)) {
      toast.error("Formato inválido. Use JPG, PNG, GIF ou WebP.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo de 10MB.");
      return;
    }

    // Apenas criar preview, não fazer upload ainda
    const reader = new FileReader();
    reader.onloadend = () => {
      setProductImage(reader.result as string);
    };
    reader.readAsDataURL(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      const input = document.createElement("input");
      input.type = "file";
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      input.files = dataTransfer.files;
      const fakeEvent = {
        target: input,
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      handleImageSelect(fakeEvent);
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
      stock: "",
    };
    setVariations([...variations, newVariation]);
  };

  const handleRemoveVariation = (id: string) => {
    if (variations.length <= 1) {
      toast.error("É necessário ter pelo menos uma variação");
      return;
    }
    setVariations(variations.filter(v => v.id !== id));
  };

  const handleVariationChange = (id: string, field: keyof ProductVariation, value: string) => {
    setVariations(variations.map(v =>
      v.id === id ? { ...v, [field]: value } : v
    ));
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

    if (variations.length === 0) {
      toast.error("Adicione pelo menos uma variação");
      return;
    }

    if (!eventId) {
      toast.error("Evento não encontrado");
      return;
    }

    setIsSubmitting(true);

    try {
      // Enviar preços em centavos para a API
      const basePriceReais = basePrice ? parseFloat(basePrice.replace(",", ".")) : 0;
      const productData = {
        name: productName.trim(),
        image: productImage,
        isIncludedInTicket,
        basePrice: Math.round(basePriceReais * 100),
        isRequired,
        variationType: variationTypeName.trim() || undefined,
        variations: variations.map(v => {
          const priceReais = parseFloat(String(v.price || "0").replace(",", ".")) || 0;
          return {
            name: v.name,
            price: Math.round(priceReais * 100),
            stock: parseInt(v.stock) || 0,
          };
        }),
      };

      let savedProduct;
      if (isEditing && data?.productId) {
        // Atualizar produto existente
        savedProduct = await organizerService.updateProduct(eventId, data.productId, productData);
        toast.success("Produto atualizado com sucesso!");
      } else {
        // Criar novo produto
        savedProduct = await organizerService.createProduct(eventId, productData);
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

  const previewPrice = variations.length > 0 && variations.some(v => parseFloat(String(v.price || "0").replace(",", ".")) > 0)
    ? variations.find(v => parseFloat(String(v.price || "0").replace(",", ".")) > 0)?.price || basePrice || "0,00"
    : basePrice || "0,00";

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
                          Boas fotos ajudam na decisão do participante
                        </p>
                      </div>
                      {productImage ? (
                        <div className="border-2 border-gray-6 border-dashed rounded-xl p-6 flex gap-6 items-center w-full">
                          <div className="relative rounded-2xl shrink-0 size-[120px] overflow-hidden">
                            <Image
                              src={productImage}
                              alt="Product preview"
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div className="flex flex-1 flex-col gap-6">
                            <div className="flex flex-col gap-4">
                              <p className="text-gray-12 text-base font-semibold font-manrope leading-[1.1]">
                                Arraste uma imagem para este campo ou clique abaixo
                              </p>
                              <p className="text-gray-11 text-base font-family-dm-sans leading-[1.3]">
                                PNG ou JPG, máximo 10MB
                              </p>
                            </div>
                            <Button
                              onClick={() => fileInputRef.current?.click()}
                              variant="outline"
                              className="w-full border-gray-6 text-gray-12"
                            >
                              <p className="text-gray-12 text-base font-bold font-family-dm-sans leading-[1.3]">
                                Trocar imagem
                              </p>
                            </Button>
                          </div>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleImageSelect}
                            className="hidden"
                          />
                        </div>
                      ) : (
                        <div
                          onDrop={handleDrop}
                          onDragOver={handleDragOver}
                          className="border-2 border-dashed border-gray-6 rounded-xl p-6 flex flex-col gap-6 items-center justify-center min-h-[120px] cursor-pointer hover:border-primary-8 transition-colors w-full"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleImageSelect}
                            className="hidden"
                          />
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
                          placeholder="Ex: (ítem extra) Camiseta da Nike"
                          maxLength={25}
                          className="h-12 px-3"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <Info className="size-5 text-gray-11" />
                        <span className="text-gray-11 text-base font-normal font-family-dm-sans leading-[1.3]">
                          Limite de 25 Caracteres
                        </span>
                      </div>
                    </div>

                    {/* Is Included in Ticket */}
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-1">
                        <label className="text-gray-12 text-base font-normal font-family-dm-sans leading-[1.3]">
                          Este produto está incluso no ingresso?
                        </label>
                        <Info className="size-5 text-gray-11" />
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
                              onChange={(e) => handleBasePriceChange(e.target.value)}
                              placeholder="R$ 0,00"
                              className="h-12 px-3"
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <Info className="size-5 text-gray-11" />
                            <span className="text-gray-11 text-base font-normal font-family-dm-sans leading-[1.3] flex-1">
                              Você ainda poderá escolher um preço específico nas variações
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
                        <Info className="size-5 text-gray-11" />
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
                          Crie opções como tamanhos e controle estoque por variação. Você pode reaproveitar um conjunto de variações para não repetir trabalho.
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
                            <span className="text-gray-12 text-sm font-medium font-inter leading-[1.3]">
                              Preço específico
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
                                onChange={(e) => handleVariationChange(variation.id, "name", e.target.value)}
                                placeholder="Ex: P, M, G"
                                className="h-auto border-0 bg-transparent px-0 focus:ring-0 text-sm font-medium font-inter text-gray-12 focus:outline-none focus:border-0 w-full"
                              />
                            </div>
                            <div className="w-[188px] px-4 flex items-center justify-center">
                              <div className="flex gap-0.5 items-center text-sm font-semibold font-inter text-gray-12">
                                <span>R$</span>
                                <input
                                  type="text"
                                  value={variation.price}
                                  onChange={(e) => handlePriceChange(variation.id, e.target.value)}
                                  className="w-16 border-0 bg-transparent px-0 focus:ring-0 text-sm font-semibold font-inter text-gray-12 focus:outline-none focus:border-0"
                                  placeholder="0,00"
                                />
                              </div>
                            </div>
                            <div className="w-[132px] px-4 flex items-center justify-center">
                              <input
                                type="number"
                                value={variation.stock}
                                onChange={(e) => handleVariationChange(variation.id, "stock", e.target.value)}
                                className="w-16 border-0 bg-transparent px-0 focus:ring-0 text-sm font-semibold font-inter text-gray-12 focus:outline-none focus:border-0 text-center"
                                placeholder="0"
                              />
                            </div>
                            <div className="flex items-center justify-center px-4 w-[74px]">
                              <button
                                onClick={() => handleRemoveVariation(variation.id)}
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
                  <div className="w-[406px] shrink-0 flex flex-col gap-4 sticky top-5">
                    <h3 className="text-gray-12 text-xl font-bold font-manrope leading-[1.1]">
                      Prévia
                    </h3>
                    <div className="bg-gray-2 border border-gray-6 rounded-xl flex flex-col">
                      <div className="border-b border-gray-6 flex gap-3 items-center p-4">
                        <div className="border border-gray-6 rounded size-[100px] shrink-0 overflow-hidden bg-gray-3 flex items-center justify-center">
                          {productImage ? (
                            <Image
                              src={productImage}
                              alt="Product preview"
                              width={100}
                              height={100}
                              className="object-cover w-full h-full"
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-4" />
                          )}
                        </div>
                        <div className="flex flex-col justify-between py-2 flex-1">
                          <p className="text-gray-12 text-base font-semibold font-manrope leading-[1.1]">
                            {productName || "Nome do produto"}
                          </p>
                          <p className="text-gray-11 text-base font-semibold font-manrope leading-[1.1]">
                            R$ {previewPrice}
                          </p>
                        </div>
                      </div>
                      <div className="p-4">
                        <p className="text-base text-gray-12 mb-2">
                          Escolha o tamanho
                        </p>
                        <Dropdown
                          options={variations.map((variation, index) => ({
                            id: variation.id,
                            label: variation.name,
                          }))}
                          width="w-full"
                          maxHeight="max-h-[200px]"
                          selectedIds={
                            variations.map(variation => variation.id)
                          }
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
                  disabled={isSubmitting || !productName.trim()}
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
  );
}
