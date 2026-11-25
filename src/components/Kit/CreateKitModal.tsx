"use client";

import { useState, useEffect, useMemo } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { ArrowButton } from "../ArrowButton";
import { CalendarIcon } from "../Icons/CalendarIcon";
import { ImageUploadWithCrop } from "@/components/ImageUploadWithCrop";
import { EVENT_IMAGE_SPECS } from "@/lib/eventImageSpecs";
import { useEvent } from "@/hooks/useEvent";
import { formatDateBR, toUtcDate } from "@/utils/datetimeBR";
import { cn } from "@/utils/cn";
import {
  buyerVariationEditStateFromApiProduct,
  parsePriceReais,
  formatPriceFromApi,
  maskPriceInputFromDigits as formatPrice,
} from "@/lib/productValidation";
import { useProductImageUpload } from "@/components/Product/useProductImageUpload";
import { KitVariationsSection, YesNo } from "./KitVariationsSection";
import { KitImageGallery, KIT_MAX_IMAGES } from "./KitImageGallery";
import { KitPreviewModal } from "./KitPreviewModal";
import { KitOverlayDialog } from "./KitOverlayDialog";
import {
  groupsFromApiProduct,
  validateGroups,
  variationGroupsPayload,
  type KitVariationGroup,
} from "./kitVariationGroups";

/** Fotos do kit: formatos e tamanho aceitos (mesma regra do produto), e o erro que os explica. */
const KIT_IMAGE_ACCEPT = "image/jpeg,image/jpg,image/png";
const KIT_IMAGE_MAX_MB = 10;
const KIT_IMAGE_RULE_ERROR = "PNG ou JPG, máximo 10MB cada";

/** O que o modal entrega ao salvar (preços em centavos; `variationGroups` no formato da API planejada). */
export interface KitFormPayload {
  name: string;
  image: string | null;
  images?: string[];
  primaryImageIndex?: number;
  isIncludedInTicket: boolean;
  /** Obrigatório = seção do kit no checkout, sem "Sem interesse"; opcional = "Produtos adicionais". */
  isRequired: boolean;
  basePrice: number;
  variationGroups: ReturnType<typeof variationGroupsPayload>;
  buyerVariationEditAllowed: boolean;
  variationEditDeadlineDays: number;
}

const Divider = () => <div className="h-px w-full shrink-0 bg-gray-4" />;

/**
 * Modal "Criação de kit" / "Editar kit" (Figma "Criação de kit · fluxo e estados ·
 * sem foto na variação", seção 7799:145391). SEPARADO do modal de produto: o kit
 * tem várias variações (cada uma com opções e estoque próprio opcional).
 *
 * Apresentacional: não chama API nem usa store — quem abre decide o que fazer com o
 * `KitFormPayload` em `onSave` (o fluxo de kit ainda está sendo definido).
 */
export function CreateKitModal({
  isOpen,
  onClose,
  eventId,
  kit,
  readOnly = false,
  onSave,
  onDelete,
}: {
  isOpen: boolean;
  onClose: () => void;
  /** Evento do kit — base do aviso "Participantes podem alterar até dia X". */
  eventId?: string;
  /** Edição: kit no formato da API (com `variationGroups`). Ausente = criação. */
  kit?: unknown;
  readOnly?: boolean;
  onSave: (payload: KitFormPayload) => Promise<void> | void;
  /** Edição: mostra "Excluir kit" no rodapé (com confirmação). */
  onDelete?: () => Promise<void> | void;
}) {
  const isEditing = kit != null;
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
  const [isIncludedInTicket, setIsIncludedInTicket] = useState(false);
  const [isRequired, setIsRequired] = useState(false);
  const [basePrice, setBasePrice] = useState("");
  const [hasVariations, setHasVariations] = useState<boolean | null>(false);
  const [groups, setGroups] = useState<KitVariationGroup[]>([]);
  const [buyerCanEditVariation, setBuyerCanEditVariation] = useState(false);
  const [variationChangeDeadlineDays, setVariationChangeDeadlineDays] = useState("30");
  /** "Configurações adicionais" (mesmo padrão do modal de cupom): fechado ao criar; na edição abre se a opção já está ligada. */
  const [showAdvanced, setShowAdvanced] = useState(false);
  /** Erros por variação aparecem só depois de tentar criar/salvar (Figma tela 08). */
  const [showGroupErrors, setShowGroupErrors] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [baseline, setBaseline] = useState<string | null>(null);

  const { event } = useEvent(eventId ?? null, isOpen && !!eventId);

  /* Data-limite = data do evento − N dias, em UTC (padrão datetimeBR). */
  const variationDeadlineDateLabel = useMemo(() => {
    const days = parseInt(variationChangeDeadlineDays, 10);
    const base = toUtcDate(event?.eventDate);
    if (!base || !Number.isFinite(days)) return null;
    const limit = new Date(base.getTime());
    limit.setUTCDate(limit.getUTCDate() - days);
    return formatDateBR(limit, { day: "numeric", month: "long", year: "numeric" });
  }, [event?.eventDate, variationChangeDeadlineDays]);

  const basePriceInvalid = !isIncludedInTicket && parsePriceReais(basePrice) <= 0;
  /** O aviso de preço só aparece depois que o organizador mexe no campo. */
  const showBasePriceError = basePriceInvalid && basePrice !== "";
  const activeGroups = hasVariations ? groups : [];
  const groupErrors = useMemo(
    () => (showGroupErrors ? validateGroups(hasVariations ? groups : [], isIncludedInTicket) : {}),
    [showGroupErrors, groups, hasVariations, isIncludedInTicket],
  );

  const snapshot = JSON.stringify({
    productName: productName.trim(),
    productImages,
    primaryImageIndex,
    isIncludedInTicket,
    isRequired,
    basePrice,
    hasVariations,
    groups: groups.map((g) => [g.name, g.options.map((o) => [o.name, o.stockLimited, o.available])]),
    buyerCanEditVariation,
    variationChangeDeadlineDays,
  });
  const isDirty = baseline !== null && snapshot !== baseline;

  // Abrir: criação = vazio; edição = hidrata do kit recebido. Baseline no próximo render.
  useEffect(() => {
    if (!isOpen) {
      setBaseline(null);
      setPreviewOpen(false);
      setDeleteConfirmOpen(false);
      return;
    }
    setShowGroupErrors(false);
    const rec = kit && typeof kit === "object" ? (kit as Record<string, unknown>) : null;
    if (!rec) {
      setProductName("");
      setProductImages([]);
      setPrimaryImageIndex(0);
      setIsIncludedInTicket(false);
      setIsRequired(false);
      setBasePrice("");
      setHasVariations(false);
      setGroups([]);
      setBuyerCanEditVariation(false);
      setVariationChangeDeadlineDays("30");
      setShowAdvanced(false);
    } else {
      setProductName(String(rec.name ?? ""));
      const imgs = Array.isArray(rec.images) ? rec.images.filter((i): i is string => typeof i === "string") : [];
      setProductImages(imgs.length > 0 ? imgs : typeof rec.image === "string" && rec.image ? [rec.image] : []);
      setPrimaryImageIndex(typeof rec.primaryImageIndex === "number" ? rec.primaryImageIndex : 0);
      setIsIncludedInTicket(rec.isIncludedInTicket === true);
      setIsRequired(rec.isRequired === true);
      setBasePrice(formatPriceFromApi(rec.basePrice as number | string | undefined));
      const loaded = groupsFromApiProduct(rec);
      setGroups(loaded);
      setHasVariations(loaded.length > 0);
      const buyerEdit = buyerVariationEditStateFromApiProduct(rec);
      setBuyerCanEditVariation(buyerEdit.allowed);
      setVariationChangeDeadlineDays(buyerEdit.deadlineDays);
      setShowAdvanced(buyerEdit.allowed);
    }
    setBaseline("pending");
    // Setters do hook de imagens são estáveis; `kit` só importa na abertura.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (baseline === "pending") setBaseline(snapshot);
  }, [baseline, snapshot]);

  const handleBasePriceChange = (value: string) => {
    const formatted = formatPrice(value.replace(/^R\$\s*/i, "").trim());
    setBasePrice(formatted === "" ? "0,00" : formatted);
  };

  const save = async () => {
    if (!productName.trim()) return void toast.error("Digite o nome do kit");
    if (hasVariations && groups.length === 0) {
      return void toast.error("Escolha uma variação ou marque que o kit não tem variação.");
    }
    if (Object.keys(validateGroups(activeGroups, isIncludedInTicket)).length > 0) {
      setShowGroupErrors(true);
      return;
    }
    const daysParsed = parseInt(variationChangeDeadlineDays.replace(/\D/g, ""), 10);
    const buyerEditAllowed = activeGroups.length > 0 && buyerCanEditVariation;
    setIsSubmitting(true);
    try {
      await onSave({
        name: productName.trim(),
        image: productImages[primaryImageIndex] ?? productImages[0] ?? null,
        images: productImages.length > 0 ? productImages : undefined,
        primaryImageIndex: productImages.length > 1 ? primaryImageIndex : undefined,
        isIncludedInTicket,
        isRequired,
        basePrice: Math.round(parsePriceReais(basePrice) * 100),
        variationGroups: variationGroupsPayload(activeGroups, isIncludedInTicket),
        buyerVariationEditAllowed: buyerEditAllowed,
        variationEditDeadlineDays: buyerEditAllowed ? (Number.isFinite(daysParsed) ? daysParsed : 30) : 0,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete();
      setDeleteConfirmOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const removeImage = (idx: number) =>
    setProductImages((prev) => {
      const updated = prev.filter((_, i) => i !== idx);
      setPrimaryImageIndex((pi) => {
        if (pi === idx) return 0;
        if (pi > idx) return pi - 1;
        return Math.min(pi, Math.max(0, updated.length - 1));
      });
      return updated;
    });

  const busy = isSubmitting || isDeleting;
  const saveDisabled =
    busy || !productName.trim() || hasVariations === null || basePriceInvalid || (isEditing && !isDirty);
  const labelClass = "font-family-dm-sans text-base leading-[1.3] text-gray-12";
  const questionClass = "font-family-dm-sans text-sm font-medium leading-[1.3] text-gray-12";

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/60 md:bg-black/90"
            onClick={() => {
              if (!previewOpen && !deleteConfirmOpen) onClose();
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
              role="dialog"
              aria-modal="true"
              aria-labelledby="kit-modal-title"
              className={cn(
                "relative flex min-h-0 w-full flex-col overflow-hidden bg-gray-1",
                "max-md:h-dvh max-md:max-h-dvh max-md:rounded-none max-md:border-0",
                "md:max-h-[90vh] md:max-w-[1000px] md:rounded-2xl md:border md:border-gray-6 md:shadow-[0px_8px_12px_0px_rgba(0,0,0,0.3)]",
              )}
            >
              {/* Cabeçalho */}
              <div className="flex shrink-0 items-center gap-3 border-b border-gray-4 px-4 py-4 md:px-6 md:py-5">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-gray-6 hover:bg-gray-3"
                  aria-label="Voltar"
                >
                  <ArrowButton isOpen={false} className="rotate-180" />
                </button>
                <h2 id="kit-modal-title" className="min-w-0 flex-1 font-manrope text-xl font-semibold leading-[1.1] text-gray-12">
                  {isEditing ? (readOnly ? "Visualizar kit" : "Editar kit") : "Criação de kit"}
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-gray-11 transition-colors hover:text-gray-12"
                  aria-label="Fechar"
                >
                  <X className="size-6" />
                </button>
              </div>

              {/* Corpo */}
              <div className="min-h-0 flex-1 overflow-y-auto [overflow-anchor:none] max-md:pb-36 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-6 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-2">
                <div className={cn("flex flex-col gap-6 p-4 md:p-6", readOnly && "pointer-events-none select-none opacity-70")}>
                  <div className="flex flex-col gap-2">
                    <label htmlFor="kit-name" className={labelClass}>
                      Nome descritivo do kit
                    </label>
                    <Input
                      id="kit-name"
                      type="text"
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                      placeholder="Ex: Kit Ultimate — 10K Corrida da Liberdade"
                      maxLength={100}
                      className="h-12 px-3"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <p className={questionClass}>Este kit está incluso no ingresso?</p>
                    <YesNo value={isIncludedInTicket} name="Este kit está incluso no ingresso?" onChange={setIsIncludedInTicket} />
                  </div>

                  <div className="flex flex-col gap-2">
                    <p className={questionClass}>Este kit é obrigatório?</p>
                    <YesNo value={isRequired} name="Este kit é obrigatório?" onChange={setIsRequired} />
                    <p className="font-family-dm-sans text-sm leading-[1.3] text-gray-11">
                      {isRequired
                        ? "O participante precisa escolher o kit para concluir a inscrição."
                        : "Aparece em Produtos adicionais; o participante pode marcar Sem interesse."}
                    </p>
                  </div>

                  {!isIncludedInTicket && (
                    <div className="flex w-full flex-col gap-2 md:w-[280px]">
                      <label htmlFor="kit-price" className={labelClass}>
                        Preço do kit
                      </label>
                      <Input
                        id="kit-price"
                        type="text"
                        inputMode="numeric"
                        value={`R$ ${basePrice || "0,00"}`}
                        onChange={(e) => handleBasePriceChange(e.target.value)}
                        placeholder="R$ 0,00"
                        aria-invalid={showBasePriceError}
                        className={cn(
                          "h-12 px-3",
                          showBasePriceError && "border-red-8 focus-visible:border-red-8 focus-visible:ring-red-8/30",
                        )}
                      />
                      {showBasePriceError && (
                        <p className="font-family-dm-sans text-sm leading-[1.3] text-red-11">Informe um valor acima de R$ 0,00.</p>
                      )}
                    </div>
                  )}

                  <Divider />

                  <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-1">
                      <h3 className="font-manrope text-lg font-semibold leading-[1.1] text-gray-12">Adicione imagens do kit</h3>
                      <p className="font-family-dm-sans text-sm font-normal leading-[1.3] text-gray-11">
                        Boas fotos ajudam na decisão do participante
                      </p>
                    </div>
                    <KitImageGallery
                      images={productImages}
                      primaryIndex={primaryImageIndex}
                      productName={productName}
                      onAdd={() => {
                        cropTargetIndexRef.current = null;
                        productCropRef.current?.open();
                      }}
                      onRemove={removeImage}
                      onMakePrimary={setPrimaryImageIndex}
                      onDrop={(e) => {
                        if (productImages.length >= KIT_MAX_IMAGES) return void e.preventDefault();
                        handleDrop(e);
                      }}
                      onDragOver={handleDragOver}
                    />
                  </div>

                  <Divider />

                  <KitVariationsSection
                    hasVariations={hasVariations}
                    setHasVariations={(v) => {
                      setHasVariations(v);
                      if (!v) setShowGroupErrors(false);
                    }}
                    groups={groups}
                    setGroups={(updater) => setGroups(updater)}
                    isIncludedInTicket={isIncludedInTicket}
                    errors={groupErrors}
                  />

                  {activeGroups.length > 0 && (
                    <div className="flex flex-col gap-5">
                      <button
                        type="button"
                        onClick={() => setShowAdvanced((v) => !v)}
                        aria-expanded={showAdvanced}
                        className="pointer-events-auto flex cursor-pointer items-center gap-2 self-start text-primary-11 transition-colors hover:text-primary-12"
                      >
                        <span className="font-family-dm-sans text-base font-medium leading-[1.3]">Configurações adicionais</span>
                        <ArrowButton isOpen={showAdvanced} />
                      </button>
                      <AnimatePresence initial={false}>
                        {showAdvanced && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="flex flex-col gap-6 overflow-hidden"
                          >
                            <div className="flex flex-col gap-2">
                              <p className={questionClass}>Deseja liberar a edição da variação pelo comprador?</p>
                              <YesNo
                                value={buyerCanEditVariation}
                                name="Deseja liberar a edição da variação pelo comprador?"
                                onChange={setBuyerCanEditVariation}
                              />
                            </div>
                            {buyerCanEditVariation && (
                              <div className="flex flex-col gap-4">
                                <div className="flex flex-col gap-2">
                                  <p className={questionClass}>
                                    Até quantos dias antes do evento o participante pode alterar a variação?
                                  </p>
                                  <div className="flex w-fit items-stretch overflow-hidden rounded-xl border border-gray-7 bg-gray-1 focus-within:border-primary-8">
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      maxLength={4}
                                      value={variationChangeDeadlineDays}
                                      onChange={(e) => setVariationChangeDeadlineDays(e.target.value.replace(/\D/g, "").slice(0, 4))}
                                      className="w-18 shrink-0 bg-transparent px-2 py-3 text-center font-family-dm-sans text-base font-semibold leading-[1.3] text-gray-12 outline-none placeholder:text-gray-11"
                                      placeholder="30"
                                      aria-label="Dias antes do evento para alterar a variação"
                                    />
                                    <div className="flex items-center border-l border-gray-6 bg-gray-3 px-4 py-3">
                                      <span className="font-family-dm-sans text-sm leading-[1.3] text-gray-11">Dias antes do evento</span>
                                    </div>
                                  </div>
                                </div>
                                {variationDeadlineDateLabel && (
                                  <div className="flex w-full items-center gap-2 rounded-lg border border-primary-6 bg-primary-3 px-3 py-2">
                                    <CalendarIcon className="size-5 shrink-0 text-primary-12" />
                                    <p className="font-family-dm-sans text-sm leading-[1.3] text-primary-12">
                                      Participantes podem alterar até dia {variationDeadlineDateLabel}. Após esta data, o participante
                                      não poderá mais editar a variação do produto.
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {(hasVariations === false || activeGroups.length > 0) && (
                    <>
                      <Divider />
                      <div className="pointer-events-auto">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setPreviewOpen(true)}
                          className="h-11 border-gray-6 px-5 font-manrope text-base font-bold text-gray-12"
                        >
                          Visualizar prévia
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Rodapé */}
              {!readOnly && (
                <div
                  data-fixed-bottom-bar="true"
                  className={cn(
                    "flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-gray-4",
                    "max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:z-60 max-md:flex-col max-md:items-stretch max-md:bg-gray-1 max-md:p-4",
                    "md:px-6 md:py-4",
                  )}
                >
                  {isEditing && onDelete ? (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setDeleteConfirmOpen(true)}
                      disabled={busy}
                      className="px-0 text-red-11 hover:bg-transparent hover:text-red-12 max-md:order-last"
                    >
                      Excluir kit
                    </Button>
                  ) : null}
                  <div className="ml-auto flex items-center justify-end gap-3 max-md:ml-0 max-md:w-full max-md:gap-2">
                    <Button
                      variant="outline"
                      onClick={onClose}
                      disabled={busy}
                      className="border-gray-6 px-8 text-gray-12 max-md:min-h-11 max-md:flex-1"
                    >
                      Cancelar
                    </Button>
                    <Button onClick={() => void save()} disabled={saveDisabled} className="px-8 max-md:min-h-11 max-md:flex-1">
                      {isSubmitting ? "Salvando..." : isEditing ? "Salvar alterações" : "Criar kit"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          <ImageUploadWithCrop
            ref={productCropRef}
            spec={EVENT_IMAGE_SPECS.product}
            outputBaseName="kit"
            modalTitle="Ajustar imagem do kit"
            onCropped={handleProductCropped}
            accept={KIT_IMAGE_ACCEPT}
            maxFileSizeMb={KIT_IMAGE_MAX_MB}
            onInvalidFile={() => toast.error(KIT_IMAGE_RULE_ERROR)}
            onCropFailed={(msg) => toast.error(msg)}
          />

          <KitPreviewModal
            open={previewOpen}
            onClose={() => setPreviewOpen(false)}
            groups={activeGroups}
            productName={productName}
            imageSrc={productImages[primaryImageIndex] ?? productImages[0] ?? null}
            isIncludedInTicket={isIncludedInTicket}
            basePrice={basePrice}
          />

          <KitOverlayDialog
            open={deleteConfirmOpen}
            idBase="kit-delete"
            title="Excluir kit?"
            onClose={() => !isDeleting && setDeleteConfirmOpen(false)}
            widthClassName="max-w-[444px]"
            footer={
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDeleteConfirmOpen(false)}
                  disabled={isDeleting}
                  className="border-gray-6 px-8 text-gray-12"
                >
                  Cancelar
                </Button>
                <Button type="button" variant="destructive" onClick={() => void confirmDelete()} disabled={isDeleting} className="px-8">
                  {isDeleting ? "Excluindo..." : "Excluir kit"}
                </Button>
              </>
            }
          >
            <p className="px-6 py-5 font-family-dm-sans text-base leading-[1.3] text-gray-11">
              O kit será removido de todos os ingressos vinculados. Esta ação não pode ser desfeita.
            </p>
          </KitOverlayDialog>
        </>
      )}
    </AnimatePresence>
  );
}
