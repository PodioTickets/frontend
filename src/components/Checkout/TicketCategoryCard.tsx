"use client";

import { useState, useMemo, useCallback, memo, useEffect } from "react";
import { ArrowButton } from "../ArrowButton";
import { useCheckout } from "@/contexts/CheckoutContext";
import { Minus, Plus } from "lucide-react";
import type { Ticket } from "@/hooks/useTickets";
import type { Event, EventKitSelectionDisplay } from "@/interfaces/event";
import { defaultEventKitSelectionDisplay } from "@/lib/eventKitSelectionDisplay";
import { ImageCarouselModal } from "./ImageCarouselModal";
import { ImageWithInitialFallback } from "@/components/ImageWithInitialFallback";
import { getCheckoutModalityInfo } from "@/utils/checkoutModalityDisplay";
import { formatBRL as formatPriceCurrency } from "@/lib/money";
import { useHidePricing } from "@/contexts/HidePricingContext";
import { useIgnoreAgeLimit } from "@/contexts/IgnoreAgeLimitContext";
import {
  getTicketProductCarouselItems,
  getCategoryKitCarouselItems,
} from "@/utils/ticketProductVisuals";
import { CategoryKitHorizontalCarousel } from "./CategoryKitHorizontalCarousel";
import { cn } from "@/utils/cn";
import { usePendingCouponSnapshot } from "@/hooks/usePendingCoupon";
import { useCouponPreview } from "@/hooks/useCouponPreview";
import type { CouponPreviewResult } from "@/lib/orderCouponDiscount";
import { isAgeWithinTicketLimit } from "@/lib/ageCoupon";

/* Aplica preview de cupom (`?coupon=` na URL) ao preço base do ticket pra
 * exibir "R$ X (com desconto)  R$ Y (riscado)" nos cards. Backend é fonte
 * de verdade no PaymentStep — aqui é só feedback visual antes do reserveOrder.
 * FIXED: value vem em centavos. PERCENTAGE: value é % (1-100). */
function applyCouponPreviewToPrice(
  price: number,
  coupon: { type: string; value: number } | null | undefined,
): { discounted: number; original: number; hasDiscount: boolean } {
  if (!coupon || !(coupon.value > 0)) {
    return { discounted: price, original: price, hasDiscount: false };
  }
  if (coupon.type === "PERCENTAGE") {
    const discounted = Math.max(0, price * (1 - coupon.value / 100));
    return { discounted, original: price, hasDiscount: discounted < price };
  }
  if (coupon.type === "FIXED") {
    const fixedReais = coupon.value / 100;
    const discounted = Math.max(0, price - fixedReais);
    return { discounted, original: price, hasDiscount: discounted < price };
  }
  return { discounted: price, original: price, hasDiscount: false };
}

/* Resolve o preço do ticket considerando o preview da URL — cupom (percentual/
 * fixo, aplicado a todos) ou voucher (100% OFF). O voucher cobre 1 UNIDADE: só o
 * ingresso "vencedor" (`voucherFreeTicketId`, o de MAIOR valor entre os elegíveis
 * — calculado no step, que tem a lista global) fica grátis, enquanto a qtd dele
 * for ≤ 1 (0 = preview ao navegar; 1 = a unidade gratuita). Com qtd > 1, mantém
 * o preço cheio — só 1 unidade é grátis e o desconto vai pro resumo.
 *
 * Sem `voucherFreeTicketId`, nenhum card zera — evita marcar VÁRIOS cards grátis
 * quando o voucher cobre vários ingressos (o resumo desconta só 1). */
function resolvePreviewPrice(
  price: number,
  ticketId: string,
  preview: CouponPreviewResult | null | undefined,
  ticketQuantity?: number,
  voucherFreeTicketId?: string | null,
  couponConditionsMet: boolean = true,
): { discounted: number; original: number; hasDiscount: boolean } {
  const full = { discounted: price, original: price, hasDiscount: false };
  if (!preview) return full;
  if (preview.kind === "voucher") {
    const isFree =
      !!voucherFreeTicketId &&
      ticketId === voucherFreeTicketId &&
      (ticketQuantity ?? 0) <= 1;
    return isFree
      ? { discounted: 0, original: price, hasDiscount: price > 0 }
      : full;
  }
  // Cupom: só risca se as condições globais (minCartValue/minQuantity) já estão
  // atendidas — senão o card mostraria um preço descontado que o resumo ainda
  // não aplica ("aplicar em silêncio"). E só nos ingressos cobertos por
  // `appliesTo` (null/vazio = todos); fora da lista, mantém o preço cheio.
  if (!couponConditionsMet) return full;
  const allowed = preview.appliesTo;
  const isEligible = !allowed || allowed.length === 0 || allowed.includes(ticketId);
  if (!isEligible) return full;
  return applyCouponPreviewToPrice(price, preview);
}

interface TicketCategoryCardProps {
  categoryId?: string;
  categoryName?: string;
  categoryDescription?: string;
  tickets: Ticket[];
  index?: number;
  expandedByDefault?: boolean;
  event: Event;
  kitSelectionDisplay?: EventKitSelectionDisplay;
  /** Idade da conta na data do evento (ModalitiesStep). Omitido = badge sempre. */
  userAge?: number | null;
  /** Preview de cupom injetado (ex.: cupom automático de idade) quando não há
   *  cupom de link na URL — desconta os preços dos cards igual ao cupom de link. */
  couponPreviewOverride?: CouponPreviewResult | null;
  /** Id do ingresso "vencedor" do voucher (maior valor entre os elegíveis) —
   *  o único card que o voucher zera. Calculado no step (lista global). */
  voucherFreeTicketId?: string | null;
  /** Condições globais do cupom de link (minCartValue/minQuantity) atendidas.
   *  `false` suprime o strike-through nos cards — o appliesTo (quais ingressos)
   *  já vem no próprio preview. Default `true` (sem cupom de link gated). */
  couponConditionsMet?: boolean;
}

const formatPrice = (price: number) => {
  return formatPriceCurrency(price);
};

/* Sempre formata como moeda (R$ 0,00 pra zero) — usado no preço DESCONTADO.
 * Quando o voucher zera o ingresso, mostra "R$ 0,00" em vez de "Gratuito"
 * (decisão do usuário: deixa claro que ficou grátis por conta do voucher). */

/* Preço a exibir no card: com desconto ativo usa moeda (voucher → "R$ 0,00");
 * sem desconto, mantém "Gratuito" pra ingresso naturalmente gratuito. */
const formatDisplayPrice = (breakdown: {
  discounted: number;
  hasDiscount: boolean;
}) =>
  breakdown.hasDiscount
    ? formatPriceCurrency(breakdown.discounted)
    : formatPrice(breakdown.discounted);

const formatAgeLimit = (ageLimit?: { min?: number; max?: number }) => {
  if (!ageLimit) return null;
  if (ageLimit.min && ageLimit.max) return `de ${ageLimit.min} a ${ageLimit.max} anos`;
  if (ageLimit.min) return `a partir de ${ageLimit.min} anos`;
  if (ageLimit.max) return `até ${ageLimit.max} anos`;
  return null;
};

const getTicketPrice = (ticket: Ticket): number => {
  try {
    return parseFloat(ticket.price.replace(/[^\d,]/g, "").replace(",", "."));
  } catch {
    return 0;
  }
};

const getDistanceKm = (ticket: Ticket): number => {
  return parseFloat(ticket.distance) || 0;
};

const TicketItemMobile = memo(({
  ticket,
  event,
  quantity,
  totalQuantity,
  onDecrease,
  onIncrease,
  kitSelectionDisplay,
  showProductImages = true,
  couponPreview,
  userAge,
  voucherFreeTicketId,
  couponConditionsMet,
}: {
  ticket: Ticket;
  event: Event;
  quantity: number;
  totalQuantity: number;
  onDecrease: (id: string) => void;
  onIncrease: (id: string) => void;
  kitSelectionDisplay: EventKitSelectionDisplay;
  showProductImages?: boolean;
  couponPreview?: CouponPreviewResult | null;
  userAge?: number | null;
  voucherFreeTicketId?: string | null;
  /** Condições globais do cupom de link atendidas (suprime strike se false). */
  couponConditionsMet?: boolean;
}) => {
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const hidePricing = useHidePricing();

  const price = getTicketPrice(ticket);
  const distanceKm = getDistanceKm(ticket);
  const distanceUnit = ticket?.distanceUnit === "KM" || ticket?.distanceUnit === "Km" ? "km" : "m"
  const ignoreAgeLimit = useIgnoreAgeLimit();
  const ageLimitText = formatAgeLimit(ticket.ageLimit);
  // Badge de limite de idade: `userAge` undefined (prop ausente, ex.: preview do
  // organizador) → comportamento antigo (sempre mostra); null (anônimo / sem
  // nascimento) → esconde; número → mostra só se a idade estiver FORA do limite.
  const showAgeLimit =
    !ignoreAgeLimit &&
    !!ageLimitText &&
    (userAge === undefined
      ? true
      : userAge !== null && !isAgeWithinTicketLimit(userAge, ticket.ageLimit));
  const modalityInfo = useMemo(() => getCheckoutModalityInfo(ticket, event), [ticket, event]);
  const priceBreakdown = useMemo(
    () => resolvePreviewPrice(price, ticket.id, couponPreview, quantity, voucherFreeTicketId, couponConditionsMet),
    [price, ticket.id, couponPreview, quantity, voucherFreeTicketId, couponConditionsMet],
  );

  const productItems = useMemo(
    () => showProductImages
      ? getTicketProductCarouselItems(ticket, {
        primaryProductId: kitSelectionDisplay.primaryKitProductByTicketId[ticket.id],
        hiddenUrls: kitSelectionDisplay.hiddenKitImageUrlsByTicketId[ticket.id],
      })
      : [],
    [
      ticket,
      kitSelectionDisplay.primaryKitProductByTicketId,
      kitSelectionDisplay.hiddenKitImageUrlsByTicketId,
      showProductImages,
    ],
  );

  // ON_TICKETS mobile: 1 imagem principal + 2x2 thumbs. A 5ª recebe overlay
  // escuro com "+N" quando há mais imagens (N = total - 5).
  const VISIBLE_THUMB_COUNT = 4;
  const mainImage = productItems[0];
  const thumbnails = productItems.slice(1, 1 + VISIBLE_THUMB_COUNT);
  const remainingCount = Math.max(0, productItems.length - (1 + VISIBLE_THUMB_COUNT));

  // "+" limitado à quantidade disponível do lote (teto total 20 no stepper).
  const maxQuantity = ticket.availableQuantity ?? Infinity;
  const isAtMax = quantity >= maxQuantity || totalQuantity >= 20;

  const isBatchSoldOut =
    ticket.activeBatch?.status === "SOLD_OUT" ||
    ticket.activeBatchStatus === "SOLD_OUT";

  const showLowStock =
    !isBatchSoldOut &&
    ticket.availableQuantity !== null &&
    ticket.availableQuantity <= 10 &&
    !ticket.isSoldOut;

  const handleImageClick = (index: number) => {
    setSelectedImageIndex(index);
    setIsImageModalOpen(true);
  };

  // Layout single-image (Figma node 4508:155491): imagem 136 + texto à direita
  // (título + modalidade/distância), tag idade em linha própria, footer com
  // preço + stepper. Aplica APENAS quando há exatamente 1 imagem; com mais
  // imagens segue o layout atual (1 principal + thumbs 2×2 + título embaixo).
  const isSingleImageLayout = productItems.length === 1;

  const hasDescription = !!ticket.description?.trim();

  return (
    // Wrapper: card + descrição empilhados. A descrição fica FORA do card,
    // logo abaixo dele (respiro do `gap-2`), em vez de dentro junto ao título.
    // Com descrição, um respiro extra embaixo (`mb-2`) separa melhor do próximo
    // ticket — sem ele, a descrição encostaria no card seguinte (lista `gap-3`).
    <div className={cn("flex flex-col gap-2", hasDescription && "mb-2")}>
    <div className="bg-gray-2 border border-gray-6 rounded-xl p-4 flex flex-col gap-2 md:gap-6">
      {isSingleImageLayout ? (
        <div className="flex gap-3 items-start w-full">
          {/* Imagem principal */}
          <button
            type="button"
            onClick={() => handleImageClick(0)}
            className="size-[136px] relative shrink-0 rounded-lg border border-gray-6 overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
            aria-label="Ver imagem em destaque"
          >
            {mainImage ? (
              <ImageWithInitialFallback
                src={mainImage.src}
                alt={ticket.name}
                name={mainImage.name}
                fallbackId={mainImage.id}
                fill
                sizes="136px"
                className="size-full border-0"
                letterClassName="text-3xl"
              />
            ) : null}
          </button>

          {/* Direita: título + modalidade/distância (gap 20 = py-2 gap-5) */}
          <div className="flex-1 min-w-0 flex flex-col gap-5 py-2">
            <h2 className="text-base font-bold text-gray-12 font-manrope leading-[1.1] break-words">
              {ticket.name}
            </h2>
            {/* Modalidade + distância só quando há distância (> 0). Distância 0 =
                sem corrida associada → oculta o ícone + texto. */}
            {modalityInfo && distanceKm > 0 && (
              <div className="flex items-center gap-2">
                {modalityInfo.icon ? (
                  <div className="size-5 shrink-0 relative rounded overflow-hidden flex items-center justify-center">
                    <ImageWithInitialFallback
                      src={modalityInfo.icon}
                      alt={modalityInfo.name}
                      name={modalityInfo.name}
                      width={20}
                      height={20}
                      className="size-5 bg-transparent border-0"
                      imgClassName="object-contain bg-transparent border-0"
                      letterClassName="text-[10px]"
                      nativeImg
                    />
                  </div>
                ) : (
                  <div className="size-5 shrink-0 rounded bg-gray-4" aria-hidden />
                )}
                <p className="text-base font-medium text-gray-12 font-family-dm-sans leading-[1.3]">
                  {distanceKm} {distanceUnit}
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          {productItems.length > 0 && (
            <div className="flex gap-3 items-start w-full">
              {/* Imagem principal */}
              <button
                type="button"
                onClick={() => handleImageClick(0)}
                className="size-[136px] relative shrink-0 rounded-lg border border-gray-6 overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                aria-label="Ver imagem em destaque"
              >
                {mainImage ? (
                  <ImageWithInitialFallback
                    src={mainImage.src}
                    alt={ticket.name}
                    name={mainImage.name}
                    fallbackId={mainImage.id}
                    fill
                    sizes="136px"
                    className="size-full border-0"
                    letterClassName="text-3xl"
                  />
                ) : null}
              </button>

              {/* 2 colunas de thumbs (até 2 cada). Cada coluna tem 136px de altura
                  p/ alinhar com a imagem principal — 2 thumbs de 64px + gap 8. */}
              {thumbnails.length > 0 && (
                <div className="flex gap-3 items-start">
                  {[0, 1].map((colIdx) => {
                    const colItems = thumbnails.slice(colIdx * 2, colIdx * 2 + 2);
                    if (colItems.length === 0) return null;
                    return (
                      <div key={colIdx} className="flex flex-col gap-2 h-[136px]">
                        {colItems.map((item, rowIdx) => {
                          const thumbIndex = colIdx * 2 + rowIdx;
                          // 1-based: thumbnails[i] é productItems[i + 1].
                          const productIndex = thumbIndex + 1;
                          const isLastVisible =
                            colIdx === 1 && rowIdx === colItems.length - 1;
                          const showOverlay = isLastVisible && remainingCount > 0;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => handleImageClick(productIndex)}
                              className="size-[64px] relative shrink-0 rounded-lg border border-gray-6 overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                              aria-label={
                                showOverlay
                                  ? `Ver mais ${remainingCount} imagens`
                                  : "Ver imagem"
                              }
                            >
                              <ImageWithInitialFallback
                                src={item.src}
                                alt={item.name}
                                name={item.name}
                                fallbackId={item.id}
                                fill
                                sizes="64px"
                                className="size-full border-0"
                                letterClassName="text-base"
                              />
                              {showOverlay && (
                                <div className="absolute inset-0 bg-black/80 rounded-lg flex items-center justify-center gap-0.5">
                                  <Plus className="size-5 text-white" strokeWidth={2.5} />
                                  <span className="text-white text-lg font-extrabold font-manrope leading-[1.1]">
                                    {remainingCount}
                                  </span>
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-bold text-gray-12 font-manrope leading-[1.1]">
                {ticket.name}
              </h2>
            </div>
            {/* Modalidade + distância — espelha o desktop: o ícone vem da
                modality (fallback p/ placeholder cinza) e o texto exibe a
                distância. Sem `DistanceIcon` separado nem nome da modality. */}
            <div className="flex items-center gap-8 flex-wrap min-w-0 w-full">
              {modalityInfo && distanceKm > 0 && (
                <div className="flex items-center gap-2">
                  {modalityInfo.icon ? (
                    <div className="size-6 shrink-0 relative rounded overflow-hidden flex items-center justify-center">
                      <ImageWithInitialFallback
                        src={modalityInfo.icon}
                        alt={modalityInfo.name}
                        name={modalityInfo.name}
                        width={24}
                        height={24}
                        className="size-6 bg-transparent border-0"
                        imgClassName="object-contain bg-transparent border-0"
                        letterClassName="text-[10px]"
                        nativeImg
                      />
                    </div>
                  ) : (
                    <div className="size-6 shrink-0 rounded bg-gray-4" aria-hidden />
                  )}
                  <p className="text-lg font-medium text-gray-12 font-family-dm-sans leading-[1.3]">
                    {distanceKm} {distanceUnit}
                  </p>
                </div>
              )}
            </div>
            {/* Limite de idade em linha própria, alinhado à esquerda (fluxo
                normal, sem `absolute`) — espelha o layout single-image. */}
            {showAgeLimit ? (
              <div className="bg-yellow-3 rounded-full px-4 py-2 self-start max-w-full max-md:mb-6">
                <p className="text-sm font-medium text-yellow-12 font-family-dm-sans">
                  Limite de idade: {ageLimitText}
                </p>
              </div>
            ) : null}
          </div>
        </>
      )}

      {/* Tag de idade em linha própria — só no layout single-image (Figma). */}
      {isSingleImageLayout && showAgeLimit ? (
        <div className="bg-yellow-3 rounded-full px-4 py-3 self-start max-w-full">
          <p className="text-xs font-medium text-yellow-12 font-family-dm-sans leading-[1.3]">
            Limite de idade: {ageLimitText}
          </p>
        </div>
      ) : null}

      <div className="flex items-center justify-between">
        {hidePricing ? <span /> : (
        <div className="flex items-baseline gap-2">
          <p className="text-xl font-bold text-gray-12 font-manrope leading-[1.1]">
            {formatDisplayPrice(priceBreakdown)}
          </p>
          {priceBreakdown.hasDiscount && (
            <p className="text-sm font-medium text-gray-11 font-manrope leading-[1.1] line-through">
              {formatPrice(priceBreakdown.original)}
            </p>
          )}
        </div>
        )}
        {isBatchSoldOut ? (
          // Lote esgotado: badge cinza no lugar do stepper (não dá pra adicionar).
          // `h-11` = mesma altura do stepper (mobile) pra o card não encolher.
          <span className="shrink-0 inline-flex items-center h-11 rounded-full bg-gray-4 px-4 text-sm font-semibold text-gray-11 font-manrope leading-[1.1] whitespace-nowrap">
            Lote esgotado
          </span>
        ) : (
          <div className="relative">
            <div className="absolute bottom-full right-0 pb-1 pointer-events-none">
              {showLowStock ? (
                <p className="text-xs font-medium text-red-11 whitespace-nowrap">
                  Restam apenas {ticket.availableQuantity}{" "}
                  {ticket.availableQuantity === 1 ? "vaga" : "vagas"}!
                </p>
              ) : null}
            </div>
            <div className="flex items-center bg-primary-3 rounded-full px-2 py-2 h-11">
              <button
                type="button"
                onClick={() => onDecrease(ticket.id)}
                disabled={quantity === 0}
                className="size-6 cursor-pointer rounded-full flex items-center justify-center bg-gray-12 hover:bg-gray-11 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0 p-1"
                aria-label="Diminuir quantidade"
              >
                <Minus className="size-4" />
              </button>
              <span className="min-w-[24px] text-center text-lg font-semibold text-gray-12 px-6 font-manrope leading-[1.1]">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => onIncrease(ticket.id)}
                disabled={isAtMax}
                className="size-6 cursor-pointer rounded-full flex items-center justify-center bg-gray-12 hover:bg-gray-11 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0 p-1"
                aria-label="Aumentar quantidade"
              >
                <Plus className="size-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {productItems.length > 0 && (
        <ImageCarouselModal
          items={productItems}
          initialIndex={selectedImageIndex}
          isOpen={isImageModalOpen}
          onClose={() => setIsImageModalOpen(false)}
          ticketName={ticket.name}
          preferredProductId={kitSelectionDisplay.primaryKitProductByTicketId[ticket.id]}
        />
      )}
    </div>
    {ticket.description?.trim() ? (
      <span className="px-1 text-sm text-gray-11 font-family-dm-sans leading-[1.3]">
        {ticket.description.trim()}
      </span>
    ) : null}
    </div>
  );
});

TicketItemMobile.displayName = "TicketItemMobile";

const TicketItemDesktop = memo(({
  ticket,
  event,
  quantity,
  totalQuantity,
  onDecrease,
  onIncrease,
  kitSelectionDisplay,
  showProductImages = true,
  couponPreview,
  userAge,
  voucherFreeTicketId,
  couponConditionsMet,
}: {
  ticket: Ticket;
  event: Event;
  quantity: number;
  totalQuantity: number;
  onDecrease: (id: string) => void;
  onIncrease: (id: string) => void;
  kitSelectionDisplay: EventKitSelectionDisplay;
  showProductImages?: boolean;
  couponPreview?: CouponPreviewResult | null;
  userAge?: number | null;
  voucherFreeTicketId?: string | null;
  /** Condições globais do cupom de link atendidas (suprime strike se false). */
  couponConditionsMet?: boolean;
}) => {
  const hidePricing = useHidePricing();
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [currentMainImageIndex, setCurrentMainImageIndex] = useState(0);

  const price = getTicketPrice(ticket);
  const distanceKm = getDistanceKm(ticket);
  const distanceUnit = ticket?.distanceUnit === "KM" || ticket?.distanceUnit === "Km" ? "km" : "m"
  const ignoreAgeLimit = useIgnoreAgeLimit();
  const ageLimitText = formatAgeLimit(ticket.ageLimit);
  // Badge de limite de idade: `userAge` undefined (prop ausente, ex.: preview do
  // organizador) → comportamento antigo (sempre mostra); null (anônimo / sem
  // nascimento) → esconde; número → mostra só se a idade estiver FORA do limite.
  const showAgeLimit =
    !ignoreAgeLimit &&
    !!ageLimitText &&
    (userAge === undefined
      ? true
      : userAge !== null && !isAgeWithinTicketLimit(userAge, ticket.ageLimit));
  const modalityInfo = useMemo(() => getCheckoutModalityInfo(ticket, event), [ticket, event]);
  const priceBreakdown = useMemo(
    () => resolvePreviewPrice(price, ticket.id, couponPreview, quantity, voucherFreeTicketId, couponConditionsMet),
    [price, ticket.id, couponPreview, quantity, voucherFreeTicketId, couponConditionsMet],
  );

  const productItems = useMemo(
    () => showProductImages
      ? getTicketProductCarouselItems(ticket, {
        primaryProductId: kitSelectionDisplay.primaryKitProductByTicketId[ticket.id],
        hiddenUrls: kitSelectionDisplay.hiddenKitImageUrlsByTicketId[ticket.id],
      })
      : [],
    [
      ticket,
      kitSelectionDisplay.primaryKitProductByTicketId,
      kitSelectionDisplay.hiddenKitImageUrlsByTicketId,
      showProductImages,
    ],
  );

  useEffect(() => {
    if (productItems.length === 0) {
      setCurrentMainImageIndex(0);
      return;
    }
    setCurrentMainImageIndex((i) => Math.min(i, productItems.length - 1));
  }, [productItems.length]);

  const currentProduct = productItems[currentMainImageIndex];

  const visibleThumbnails = useMemo(() => {
    if (productItems.length <= 1) return [];
    const result: Array<{ item: typeof productItems[0]; idx: number }> = [];
    for (let i = 1; i < productItems.length && result.length < 3; i++) {
      const idx = (currentMainImageIndex + i) % productItems.length;
      result.push({ item: productItems[idx], idx });
    }
    return result;
  }, [productItems, currentMainImageIndex]);

  // "+" limitado à quantidade disponível do lote (teto total 20 no stepper).
  const maxQuantity = ticket.availableQuantity ?? Infinity;
  const isAtMax = quantity >= maxQuantity || totalQuantity >= 20;

  const isBatchSoldOut = ticket.activeBatch?.status === "SOLD_OUT";

  const showLowStock =
    !isBatchSoldOut &&
    ticket.availableQuantity !== null &&
    ticket.availableQuantity <= 10 &&
    !ticket.isSoldOut;

  const handleImageClick = (index: number) => {
    setSelectedImageIndex(index);
    setIsImageModalOpen(true);
  };

  const handlePreviousImage = () => {
    setCurrentMainImageIndex((prev) =>
      prev === 0 ? productItems.length - 1 : prev - 1
    );
  };

  const handleNextImage = () => {
    setCurrentMainImageIndex((prev) =>
      prev === productItems.length - 1 ? 0 : prev + 1
    );
  };

  const handleThumbnailClick = (index: number) => {
    setCurrentMainImageIndex(index);
    handleImageClick(index);
  };

  // Largura da faixa de imagens (px) — usada pra alinhar a descrição sob o card.
  // 1 imagem: só a principal (136). 2+: principal(136) + gap-2(8) + nav(w-8=32).
  const imagesColWidthPx = productItems.length > 1 ? 176 : 136;

  const hasDescription = !!ticket.description?.trim();

  return (
    // Coluna [linha (imagens + card), descrição]. A linha centraliza o card
    // menor contra a faixa de imagens mais alta (3+ imagens) via `items-center`,
    // e a descrição fica FORA da linha (abaixo) — assim o card centraliza com as
    // fotos sem o antigo espaçador invisível, que abria vão grande entre os cards.
    // Com descrição, um respiro extra embaixo (`mb-2`) separa melhor do próximo
    // ticket — sem ele, a descrição encostaria no card seguinte (lista `gap-3`).
    <div className={cn("w-full flex flex-col", hasDescription && "mb-2")}>
      <div className={cn(productItems.length > 0 ? "flex gap-4 items-center" : "flex flex-col")}>
      {productItems.length > 0 && (
        <div className="shrink-0">
          <div className="flex items-center gap-2">
            {currentProduct ? (
              <button
                onClick={() => handleImageClick(currentMainImageIndex)}
                className="w-[136px] h-[136px] relative rounded-lg border border-gray-6 overflow-hidden shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
              >
                <ImageWithInitialFallback
                  src={currentProduct.src}
                  alt={ticket.name}
                  name={currentProduct.name}
                  fallbackId={currentProduct.id}
                  fill
                  sizes="136px"
                  className="size-full border-0"
                  letterClassName="text-3xl"
                />
              </button>
            ) : null}
            {productItems.length > 1 && (
              <div className="flex flex-col items-center justify-between self-stretch">
                <button
                  onClick={handlePreviousImage}
                  className="w-[18px] h-4 flex items-center justify-center shrink-0 cursor-pointer hover:opacity-70 transition-opacity"
                  aria-label="Imagem anterior"
                >
                  <ArrowButton isOpen={false} className="-rotate-90" />
                </button>
                <div className="flex flex-col gap-1">
                  {visibleThumbnails.map(({ item, idx: originalIndex }) => (
                    <button
                      key={item.id}
                      onClick={() => handleThumbnailClick(originalIndex)}
                      className={`w-8 h-8 relative rounded border overflow-hidden shrink-0 cursor-pointer hover:opacity-90 transition-opacity ${originalIndex === currentMainImageIndex ? "border-primary-11" : "border-gray-6"}`}
                    >
                      <ImageWithInitialFallback
                        src={item.src}
                        alt={item.name}
                        name={item.name}
                        fallbackId={item.id}
                        fill
                        sizes="36px"
                        className="size-full border-0"
                        letterClassName="text-sm"
                      />
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleNextImage}
                  className="w-[18px] h-4 flex items-center justify-center shrink-0 cursor-pointer hover:opacity-70 transition-opacity"
                  aria-label="Próxima imagem"
                >
                  <ArrowButton isOpen={true} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Card: `flex-1` ocupa o resto da largura ao lado das imagens; sem
          imagens, `w-full`. */}
      <div className={cn("min-w-0 flex flex-col", productItems.length > 0 ? "flex-1" : "w-full")}>
        <div className="bg-gray-2 border border-gray-6 rounded-xl p-5 flex flex-col gap-2 w-full">
          <div className="flex flex-col justify-center gap-1">
            <h2 className="text-xl font-bold font-manrope leading-[1.1] text-gray-12">
              {ticket.name}
            </h2>

            <div className="flex items-center gap-8 flex-wrap min-w-0">
              {modalityInfo && distanceKm > 0 && (
                <div className="flex items-center gap-2">
                  {modalityInfo.icon ? (
                    <div className="size-6 shrink-0 relative rounded overflow-hidden flex items-center justify-center">
                      <ImageWithInitialFallback
                        src={modalityInfo.icon}
                        alt={modalityInfo.name}
                        name={modalityInfo.name}
                        width={24}
                        height={24}
                        className="size-6 bg-transparent border-0"
                        imgClassName="object-contain bg-transparent border-0"
                        letterClassName="text-[10px]"
                        nativeImg
                      />
                    </div>
                  ) : (
                    <div className="size-6 shrink-0 rounded bg-gray-4" aria-hidden />
                  )}
                  <p className="text-lg font-medium text-gray-12 font-family-dm-sans leading-[1.3]">
                    {distanceKm} {distanceUnit}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-end justify-between">
            {hidePricing ? <span /> : (
            <div className="flex items-baseline gap-2">
              <p className="text-xl font-bold text-gray-12">{formatDisplayPrice(priceBreakdown)}</p>
              {priceBreakdown.hasDiscount && (
                <p className="text-sm font-medium text-gray-11 line-through">
                  {formatPrice(priceBreakdown.original)}
                </p>
              )}
            </div>
            )}
            {/* Coluna direita (desktop): badge "Limite de idade" ACIMA do stepper
                (+/-), alinhado à direita sobre o botão de adicionar/remover. */}
            <div className="flex flex-col items-end gap-2">
              {showAgeLimit ? (
                <div className="bg-yellow-3 text-yellow-12 rounded-full px-3 py-1 max-w-full">
                  <p className="text-xs font-medium font-family-dm-sans whitespace-nowrap">
                    Limite de idade: {ageLimitText}
                  </p>
                </div>
              ) : null}
            {isBatchSoldOut ? (
              // Lote esgotado: badge cinza no lugar do stepper (não dá pra adicionar).
              // `h-10` = mesma altura do stepper (size-6 + py-2) pra o card não encolher.
              <span className="shrink-0 inline-flex items-center h-10 rounded-full bg-gray-4 px-4 text-sm font-semibold text-gray-11 font-manrope leading-[1.1] whitespace-nowrap">
                Lote esgotado
              </span>
            ) : (
              // Aviso de estoque baixo IN-FLOW (não `absolute`), entre o badge de
              // idade (acima) e o stepper — assim o badge fica por cima do aviso e
              // eles não se sobrepõem. Alinhado à direita pela coluna (`items-end`).
              <>
                {showLowStock ? (
                  <p className="text-xs font-medium text-red-11 whitespace-nowrap">
                    Restam apenas {ticket.availableQuantity}{" "}
                    {ticket.availableQuantity === 1 ? "vaga" : "vagas"}!
                  </p>
                ) : null}
                <div className="flex items-center justify-center w-max gap-2 bg-primary-4 rounded-full px-2 py-2">
                  <button
                    type="button"
                    onClick={() => onDecrease(ticket.id)}
                    disabled={quantity === 0}
                    className="size-6 cursor-pointer rounded-full flex items-center justify-center bg-gray-12 hover:bg-gray-11 text-gray-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                    aria-label="Diminuir quantidade"
                  >
                    <Minus className="size-4" />
                  </button>
                  <span className="text-center text-lg font-semibold px-4 text-gray-12">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => onIncrease(ticket.id)}
                    disabled={isAtMax}
                    className="size-6 cursor-pointer rounded-full flex items-center justify-center bg-gray-12 hover:bg-gray-11 text-gray-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                    aria-label="Aumentar quantidade"
                  >
                    <Plus className="size-4" />
                  </button>
                </div>
              </>
            )}
            </div>
          </div>
        </div>
      </div>
      </div>
      {/* Descrição FORA da linha imagens+card, logo abaixo. Indentada (padding =
          largura das imagens + gap-4) pra alinhar sob o card; sem imagens, `pl-3`.
          Fica fora do `items-center` da linha → não interfere na centralização
          do card com as fotos e não abre vão entre os cards. */}
      {ticket.description?.trim() ? (
        <span
          className="text-sm text-gray-11 font-family-dm-sans"
          style={productItems.length > 0 ? { paddingLeft: imagesColWidthPx + 16 } : { paddingLeft: 12 }}
        >
          {ticket.description.trim()}
        </span>
      ) : null}
      {productItems.length > 0 && (
        <ImageCarouselModal
          items={productItems}
          initialIndex={selectedImageIndex}
          isOpen={isImageModalOpen}
          onClose={() => setIsImageModalOpen(false)}
          ticketName={ticket.name}
          preferredProductId={kitSelectionDisplay.primaryKitProductByTicketId[ticket.id]}
        />
      )}
    </div>
  );

});

TicketItemDesktop.displayName = "TicketItemDesktop";

export function TicketCategoryCard({
  categoryId,
  categoryName,
  categoryDescription,
  tickets,
  index = 0,
  expandedByDefault,
  event,
  kitSelectionDisplay: kitSelectionDisplayProp,
  userAge,
  couponPreviewOverride,
  voucherFreeTicketId,
  couponConditionsMet = true,
}: TicketCategoryCardProps) {
  const kitSelectionDisplay = kitSelectionDisplayProp ?? defaultEventKitSelectionDisplay();
  const [isExpanded, setIsExpanded] = useState(expandedByDefault ?? index === 0);
  const { raceQuantities, updateRaceQuantity } = useCheckout();
  const hidePricing = useHidePricing();
  // Preview do cupom da URL pra renderizar preço descontado com strike-through.
  // Backend reconcilia no PaymentStep; aqui é só feedback visual no /ingressos.
  const pendingCoupon = usePendingCouponSnapshot();
  const { data: couponPreview } = useCouponPreview(event?.id, pendingCoupon);
  // Cupom de link (URL) tem prioridade; senão usa o override injetado (idade).
  const effectivePreview = couponPreview ?? couponPreviewOverride ?? null;

  const totalQuantity = useMemo(
    () => Object.values(raceQuantities).reduce((s, q) => s + q, 0),
    [raceQuantities],
  );

  // Aceita preço 0 (ingresso gratuito/cortesia). Só descarta preços inválidos.
  const validTickets = useMemo(
    () => tickets.filter((t) => getTicketPrice(t) >= 0),
    [tickets],
  );

  const minPrice = useMemo(() => {
    if (validTickets.length === 0) return 0;
    return Math.min(...validTickets.map(getTicketPrice));
  }, [validTickets]);

  // "A partir de" ciente do preview: com voucher, o menor preço efetivo pode
  // cair pra 0 (ingresso coberto). Reusa o mesmo resolver dos itens.
  const minPriceBreakdown = useMemo(() => {
    if (validTickets.length === 0) {
      return { discounted: 0, original: 0, hasDiscount: false };
    }
    let dMin = Infinity;
    for (const t of validTickets) {
      dMin = Math.min(
        dMin,
        resolvePreviewPrice(getTicketPrice(t), t.id, effectivePreview, raceQuantities[t.id] || 0, voucherFreeTicketId, couponConditionsMet).discounted,
      );
    }
    const discounted = dMin === Infinity ? minPrice : dMin;
    return { discounted, original: minPrice, hasDiscount: discounted < minPrice };
  }, [validTickets, minPrice, effectivePreview, raceQuantities, voucherFreeTicketId, couponConditionsMet]);

  const showCategoryLevelKit =
    !!categoryId &&
    kitSelectionDisplay.showKitImagesOnSelection &&
    kitSelectionDisplay.kitImagesLayout === "ON_CATEGORIES";

  // `showKitImagesOnSelection=false` desliga qualquer renderização de imagem
  // de produto nesta etapa, independente do layout escolhido. Quando ligado,
  // ON_CATEGORIES move pro carrossel da categoria; o resto cai no ticket.
  const showTicketLevelImages =
    kitSelectionDisplay.showKitImagesOnSelection && !showCategoryLevelKit;

  const categoryCarouselItems = useMemo(
    () =>
      showCategoryLevelKit && categoryId
        ? getCategoryKitCarouselItems(
          validTickets,
          kitSelectionDisplay.primaryKitProductByCategoryId[categoryId],
          kitSelectionDisplay.hiddenKitImageUrlsByCategoryId[categoryId],
        )
        : [],
    [
      showCategoryLevelKit,
      validTickets,
      categoryId,
      kitSelectionDisplay.primaryKitProductByCategoryId,
      kitSelectionDisplay.hiddenKitImageUrlsByCategoryId,
    ],
  );

  const headerThumbItem = categoryCarouselItems[0] ?? null;

  // Categoria com ALGUM ingresso selecionado não pode fechar: fica sempre aberta.
  // `expanded` força o display aberto e o toggle vira no-op enquanto houver seleção
  // (cobre também a volta à tela com quantidades persistidas em outra categoria).
  const hasSelectedTicket = useMemo(
    () => validTickets.some((t) => (raceQuantities[t.id] || 0) > 0),
    [validTickets, raceQuantities],
  );
  const expanded = isExpanded || hasSelectedTicket;
  const handleToggle = useCallback(() => {
    if (hasSelectedTicket) return;
    setIsExpanded((prev) => !prev);
  }, [hasSelectedTicket]);

  const handleDecrease = useCallback((ticketId: string) => {
    const currentQuantity = raceQuantities[ticketId] || 0;
    updateRaceQuantity(ticketId, Math.max(0, currentQuantity - 1));
  }, [raceQuantities, updateRaceQuantity]);

  const handleIncrease = useCallback((ticketId: string) => {
    const currentQuantity = raceQuantities[ticketId] || 0;
    updateRaceQuantity(ticketId, currentQuantity + 1);
  }, [raceQuantities, updateRaceQuantity]);

  // Bare mode: no category header/accordion, just render ticket items
  if (!categoryName) {
    return (
      <>
        <div className="w-full md:hidden flex flex-col gap-3">
          {validTickets.map((ticket) => (
            <TicketItemMobile
              key={ticket.id}
              ticket={ticket}
              event={event}
              quantity={raceQuantities[ticket.id] || 0}
              totalQuantity={totalQuantity}
              onDecrease={handleDecrease}
              onIncrease={handleIncrease}
              kitSelectionDisplay={kitSelectionDisplay}
              showProductImages={showTicketLevelImages}
              couponPreview={effectivePreview}
              userAge={userAge}
              voucherFreeTicketId={voucherFreeTicketId}
              couponConditionsMet={couponConditionsMet}
            />
          ))}
        </div>
        <div className="hidden md:flex flex-col gap-3 w-full">
          {validTickets.map((ticket) => (
            <TicketItemDesktop
              key={ticket.id}
              ticket={ticket}
              event={event}
              quantity={raceQuantities[ticket.id] || 0}
              totalQuantity={totalQuantity}
              onDecrease={handleDecrease}
              onIncrease={handleIncrease}
              kitSelectionDisplay={kitSelectionDisplay}
              showProductImages={showTicketLevelImages}
              couponPreview={effectivePreview}
              userAge={userAge}
              voucherFreeTicketId={voucherFreeTicketId}
              couponConditionsMet={couponConditionsMet}
            />
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      {/* Mobile Layout */}
      <div className="w-full md:hidden">
        <div className="border border-gray-6 rounded-xl overflow-hidden bg-gray-1">
          <div
            className={`flex items-center justify-between gap-3 px-3 py-4 ${hasSelectedTicket ? "cursor-default" : "cursor-pointer"}`}
            onClick={handleToggle}
          >
            <div className="flex flex-1 items-center gap-3 min-w-0">
              {showCategoryLevelKit && headerThumbItem && !expanded ? (
                <div className="size-20 shrink-0 rounded-lg border border-gray-6 overflow-hidden relative bg-gray-2">
                  <ImageWithInitialFallback
                    src={headerThumbItem.src}
                    alt={categoryName}
                    name={headerThumbItem.name}
                    fallbackId={headerThumbItem.id}
                    fill
                    sizes="80px"
                    className="size-full border-0"
                    letterClassName="text-lg"
                  />
                </div>
              ) : null}
              <div className="flex flex-col gap-1 min-w-0">
                <h1 className="text-lg font-bold text-gray-12 font-manrope break-normal line-clamp-2">
                  {categoryName}
                </h1>
                {!expanded && !hidePricing ? (
                  <div className="flex flex-wrap items-center gap-1 text-base">
                    <p className="text-gray-11 font-family-dm-sans leading-[1.3]">A partir de:</p>
                    <span className="text-gray-12 font-bold font-manrope">
                      {formatDisplayPrice(minPriceBreakdown)}
                    </span>
                    {minPriceBreakdown.hasDiscount && (
                      <span className="text-gray-11 text-sm font-medium font-manrope line-through">
                        {formatPrice(minPrice)}
                      </span>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
            <ArrowButton isOpen={expanded} />
          </div>

          <div
            className="overflow-hidden transition-all duration-200 ease-out"
            style={{ maxHeight: expanded ? "10000px" : "0", opacity: expanded ? 1 : 0 }}
          >
            <div className="px-4 pb-6 border-t border-gray-6 flex flex-col gap-6 pt-6">
              {categoryDescription?.trim() ? (
                <p className="text-sm text-gray-11 font-family-dm-sans leading-[1.3] ">
                  {categoryDescription.trim()}
                </p>
              ) : null}
              {showCategoryLevelKit && categoryCarouselItems.length > 0 ? (
                <CategoryKitHorizontalCarousel
                  items={categoryCarouselItems}
                  primaryProductId={
                    kitSelectionDisplay.primaryKitProductByCategoryId[categoryId!]
                  }
                />
              ) : null}
              <div className="flex flex-col gap-3">
                {validTickets.map((ticket) => (
                  <TicketItemMobile
                    key={ticket.id}
                    ticket={ticket}
                    event={event}
                    quantity={raceQuantities[ticket.id] || 0}
                    totalQuantity={totalQuantity}
                    onDecrease={handleDecrease}
                    onIncrease={handleIncrease}
                    kitSelectionDisplay={kitSelectionDisplay}
                    showProductImages={showTicketLevelImages}
                    couponPreview={effectivePreview}
                    userAge={userAge}
                    voucherFreeTicketId={voucherFreeTicketId}
                    couponConditionsMet={couponConditionsMet}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:block w-full">
        <div className="rounded-xl border border-gray-6 overflow-hidden bg-gray-1">
          <div
            className={`flex items-center w-full justify-between gap-3 border-b border-gray-6 px-4 py-4 transition-colors ${hasSelectedTicket ? "cursor-default" : "cursor-pointer hover:bg-gray-2/80"}`}
            onClick={handleToggle}
          >
            <div className="flex flex-1 items-center gap-3 min-w-0">
              {showCategoryLevelKit && headerThumbItem && !expanded ? (
                <div className="size-20 shrink-0 rounded-lg border border-gray-6 overflow-hidden relative bg-gray-2">
                  <ImageWithInitialFallback
                    src={headerThumbItem.src}
                    alt={categoryName}
                    name={headerThumbItem.name}
                    fallbackId={headerThumbItem.id}
                    fill
                    sizes="80px"
                    className="size-full border-0"
                    letterClassName="text-lg"
                  />
                </div>
              ) : null}
              <div className="flex flex-col items-start justify-center gap-6 min-w-0">
                <h1 className="text-xl font-bold font-manrope text-gray-12 truncate max-w-[600px]">
                  {categoryName}
                </h1>
                {!expanded && !hidePricing ? (
                  <div className="flex items-center gap-1 text-base">
                    <p className="text-gray-11 font-family-dm-sans leading-[1.3]">A partir de:</p>
                    <span className="text-gray-12 font-bold font-manrope leading-[1.1]">
                      {formatDisplayPrice(minPriceBreakdown)}
                    </span>
                    {minPriceBreakdown.hasDiscount && (
                      <span className="text-gray-11 text-sm font-medium font-manrope leading-[1.1] line-through">
                        {formatPrice(minPrice)}
                      </span>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
            <ArrowButton isOpen={expanded} className="text-gray-12 size-4" />
          </div>

          <div
            className="overflow-hidden transition-all duration-200 ease-out"
            style={{ maxHeight: expanded ? "10000px" : "0", opacity: expanded ? 1 : 0 }}
          >
            <div className="px-4 pb-7 pt-6 flex flex-col gap-6">
              {categoryDescription?.trim() ? (
                <p className="text-sm text-gray-11 font-family-dm-sans leading-[1.3]">
                  {categoryDescription.trim()}
                </p>
              ) : null}
              {showCategoryLevelKit && categoryCarouselItems.length > 0 ? (
                <CategoryKitHorizontalCarousel
                  items={categoryCarouselItems}
                  primaryProductId={
                    kitSelectionDisplay.primaryKitProductByCategoryId[categoryId!]
                  }
                />
              ) : null}
              <div className="flex flex-col gap-3">
                {validTickets.map((ticket) => (
                  <TicketItemDesktop
                    key={ticket.id}
                    ticket={ticket}
                    event={event}
                    quantity={raceQuantities[ticket.id] || 0}
                    totalQuantity={totalQuantity}
                    onDecrease={handleDecrease}
                    onIncrease={handleIncrease}
                    kitSelectionDisplay={kitSelectionDisplay}
                    showProductImages={showTicketLevelImages}
                    couponPreview={effectivePreview}
                    userAge={userAge}
                    voucherFreeTicketId={voucherFreeTicketId}
                    couponConditionsMet={couponConditionsMet}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
