"use client";

import { useState, useMemo, useCallback, memo, useEffect } from "react";
import { ArrowButton } from "../ArrowButton";
import { DistanceIcon } from "../Icons/DistanceIcon";
import { useCheckout } from "@/contexts/CheckoutContext";
import { Minus, Plus } from "lucide-react";
import type { Ticket } from "@/hooks/useTickets";
import type { Event, EventKitSelectionDisplay } from "@/interfaces/event";
import { ImageCarouselModal } from "./ImageCarouselModal";
import { ImageWithInitialFallback } from "@/components/ImageWithInitialFallback";
import { getCheckoutModalityInfo } from "@/utils/checkoutModalityDisplay";
import {
  getTicketProductCarouselItems,
  getCategoryKitCarouselItems,
} from "@/utils/ticketProductVisuals";
import { CategoryKitHorizontalCarousel } from "./CategoryKitHorizontalCarousel";
import { cn } from "@/utils/cn";

interface TicketCategoryCardProps {
  categoryId: string;
  categoryName: string;
  categoryDescription?: string;
  tickets: Ticket[];
  index: number;
  expandedByDefault?: boolean;
  event: Event;
  productsMap: Record<string, { id: string; name: string; image: string | null }>;
  kitSelectionDisplay: EventKitSelectionDisplay;
  omitKitProductsWithoutImage?: boolean;
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
};

const formatAgeLimit = (ageLimit?: { min?: number; max?: number }) => {
  if (!ageLimit) return null;
  if (ageLimit.min && ageLimit.max) {
    return `de ${ageLimit.min} a ${ageLimit.max} anos`;
  }
  if (ageLimit.min) {
    return `a partir de ${ageLimit.min} anos`;
  }
  if (ageLimit.max) {
    return `até ${ageLimit.max} anos`;
  }
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

// Componente de ticket memoizado para evitar re-renders desnecessários
const TicketItemMobile = memo(({
  ticket,
  event,
  productsMap,
  quantity,
  onDecrease,
  onIncrease,
  kitSelectionDisplay,
  omitKitProductsWithoutImage,
}: {
  ticket: Ticket;
  event: Event;
  productsMap: Record<string, { id: string; name: string; image: string | null }>;
  quantity: number;
  onDecrease: (id: string) => void;
  onIncrease: (id: string) => void;
  kitSelectionDisplay: EventKitSelectionDisplay;
  omitKitProductsWithoutImage: boolean;
}) => {
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [currentMainImageIndex, setCurrentMainImageIndex] = useState(0);

  const price = getTicketPrice(ticket);
  const distanceKm = getDistanceKm(ticket);
  const ageLimitText = formatAgeLimit(ticket.ageLimit);
  const modalityInfo = useMemo(() => getCheckoutModalityInfo(ticket, event), [ticket, event]);
  console.log(modalityInfo);
  
  const showPerTicketGallery =
    kitSelectionDisplay.showKitImagesOnSelection &&
    kitSelectionDisplay.kitImagesLayout === "ON_TICKETS";

  const productItems = useMemo(
    () =>
      showPerTicketGallery
        ? getTicketProductCarouselItems(ticket, productsMap, {
          primaryProductId:
            kitSelectionDisplay.primaryKitProductByTicketId[ticket.id],
          omitItemsWithoutImage: omitKitProductsWithoutImage,
        })
        : [],
    [
      ticket,
      productsMap,
      showPerTicketGallery,
      kitSelectionDisplay.primaryKitProductByTicketId,
      omitKitProductsWithoutImage,
    ]
  );

  useEffect(() => {
    if (productItems.length === 0) {
      setCurrentMainImageIndex(0);
      return;
    }
    setCurrentMainImageIndex((i) => Math.min(i, productItems.length - 1));
  }, [productItems.length]);

  const currentProduct = productItems[currentMainImageIndex];

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

  return (
    <div className="bg-gray-2 border border-gray-6 rounded-xl p-4 flex flex-col gap-6">
      {/* Image Gallery */}
      {productItems.length > 0 && (
        <div className="flex gap-3 items-center w-full justify-start">
          <button
            onClick={() => handleImageClick(currentMainImageIndex)}
            className="w-[136px] h-[136px] relative shrink-0 rounded-lg border border-gray-6 overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
          >
            {currentProduct ? (
              <ImageWithInitialFallback
                src={currentProduct.src}
                alt={ticket.name}
                name={currentProduct.name}
                fallbackId={currentProduct.id}
                fill
                sizes="(max-width: 768px) 50vw, 136px"
                className="size-full border-transparent"
                letterClassName="text-3xl"
              />
            ) : null}
          </button>
          {productItems.length > 1 && (
            <div className="flex flex-col items-center gap-1 h-[136px] justify-center">
              {/* Seta para cima */}
              <button
                onClick={handlePreviousImage}
                className="w-[18px] h-8 flex items-center justify-center shrink-0 cursor-pointer hover:opacity-70 transition-opacity"
                aria-label="Imagem anterior"
              >
                <div className="-rotate-90">
                  <ArrowButton isOpen={true} />
                </div>
              </button>
              {/* Thumbnails */}
              <div className="flex flex-col gap-1">
                {productItems
                  .map((item, idx) => ({ item, idx }))
                  .filter(({ idx }) => idx !== currentMainImageIndex)
                  .slice(0, 3)
                  .map(({ item, idx: originalIndex }) => (
                    <button
                      key={item.id}
                      onClick={() => handleThumbnailClick(originalIndex)}
                      className={`w-9 h-9 relative rounded border overflow-hidden shrink-0 cursor-pointer hover:opacity-90 transition-opacity ${originalIndex === currentMainImageIndex
                        ? 'border-primary-11'
                        : 'border-gray-6'
                        }`}
                    >
                      <ImageWithInitialFallback
                        src={item.src}
                        alt={item.name}
                        name={item.name}
                        fallbackId={item.id}
                        fill
                        sizes="36px"
                        className="size-full border-transparent"
                        letterClassName="text-sm"
                      />
                    </button>
                  ))}
              </div>
              {/* Seta para baixo */}
              <button
                onClick={handleNextImage}
                className="w-[18px] h-8 flex items-center justify-center shrink-0 cursor-pointer hover:opacity-70 transition-opacity"
                aria-label="Próxima imagem"
              >
                <div className="rotate-90">
                  <ArrowButton isOpen={true} />
                </div>
              </button>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-5">
        <h2 className="text-lg font-bold text-gray-12 font-manrope leading-[1.1]">
          {ticket.name}
        </h2>
        <div className="flex flex-wrap items-center justify-between gap-2 w-full">
          <div className="flex flex-wrap gap-4 items-center min-w-0">
            {distanceKm > 0 && (
              <div className="flex items-center gap-2">
                <DistanceIcon className="size-6 shrink-0" />
                <p className="text-lg font-medium text-gray-12 font-family-dm-sans leading-[1.3]">
                  {distanceKm} Km
                </p>
              </div>
            )}
            {modalityInfo && (
              <div className="flex items-center gap-2">
                {modalityInfo.icon ? (
                  <div className="size-6 shrink-0 relative rounded overflow-hidden bg-gray-3 flex items-center justify-center">
                    <ImageWithInitialFallback
                      src={modalityInfo.icon}
                      alt={modalityInfo.name}
                      name={modalityInfo.name}
                      width={24}
                      height={24}
                      className="size-6 border-transparent"
                      imgClassName="object-contain"
                      letterClassName="text-[10px]"
                      nativeImg
                    />
                  </div>
                ) : (
                  <div className="size-6 shrink-0 rounded bg-gray-4" aria-hidden />
                )}
                <p className="text-lg font-medium text-gray-12 font-family-dm-sans leading-[1.3]">
                  {modalityInfo.name}
                </p>
              </div>
            )}
          </div>
          {ageLimitText ? (
            <div className="bg-yellow-3 rounded-full px-4 py-3 shrink-0 max-w-full">
              <p className="text-base font-medium text-yellow-12 font-family-dm-sans leading-[1.3]">
                Limite de idade: {ageLimitText}
              </p>
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xl font-bold text-gray-12 font-manrope leading-[1.1]">
          {formatPrice(price)}
        </p>
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
            className="size-6 cursor-pointer rounded-full flex items-center justify-center bg-gray-12 hover:bg-gray-11 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0 p-1"
            aria-label="Aumentar quantidade"
          >
            <Plus className="size-4" />
          </button>
        </div>
      </div>

      {/* Image Carousel Modal */}
      {productItems.length > 0 && (
        <ImageCarouselModal
          items={productItems}
          initialIndex={selectedImageIndex}
          isOpen={isImageModalOpen}
          onClose={() => setIsImageModalOpen(false)}
          ticketName={ticket.name}
        />
      )}
    </div>
  );
});

TicketItemMobile.displayName = "TicketItemMobile";

const TicketItemDesktop = memo(({
  ticket,
  event,
  productsMap,
  quantity,
  onDecrease,
  onIncrease,
  kitSelectionDisplay,
  omitKitProductsWithoutImage,
}: {
  ticket: Ticket;
  event: Event;
  productsMap: Record<string, { id: string; name: string; image: string | null }>;
  quantity: number;
  onDecrease: (id: string) => void;
  onIncrease: (id: string) => void;
  kitSelectionDisplay: EventKitSelectionDisplay;
  omitKitProductsWithoutImage: boolean;
}) => {
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [currentMainImageIndex, setCurrentMainImageIndex] = useState(0);

  const price = getTicketPrice(ticket);
  const distanceKm = getDistanceKm(ticket);
  const ageLimitText = formatAgeLimit(ticket.ageLimit);
  const modalityInfo = useMemo(() => getCheckoutModalityInfo(ticket, event), [ticket, event]);
  const showPerTicketGallery =
    kitSelectionDisplay.showKitImagesOnSelection &&
    kitSelectionDisplay.kitImagesLayout === "ON_TICKETS";

  const productItems = useMemo(
    () =>
      showPerTicketGallery
        ? getTicketProductCarouselItems(ticket, productsMap, {
          primaryProductId:
            kitSelectionDisplay.primaryKitProductByTicketId[ticket.id],
          omitItemsWithoutImage: omitKitProductsWithoutImage,
        })
        : [],
    [
      ticket,
      productsMap,
      showPerTicketGallery,
      kitSelectionDisplay.primaryKitProductByTicketId,
      omitKitProductsWithoutImage,
    ]
  );

  useEffect(() => {
    if (productItems.length === 0) {
      setCurrentMainImageIndex(0);
      return;
    }
    setCurrentMainImageIndex((i) => Math.min(i, productItems.length - 1));
  }, [productItems.length]);

  const currentProduct = productItems[currentMainImageIndex];

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

  return (
    <div className="flex w-full">
      {productItems.length > 0 && (
        <div className={`flex justify-start w-1/3`}>
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
                  className="size-full border-transparent"
                  letterClassName="text-3xl"
                />
              </button>
            ) : null}
            {productItems.length > 1 && (
              <div className="flex flex-col items-center gap-1">
                {/* Seta para cima */}
                <button
                  onClick={handlePreviousImage}
                  className="w-[18px] h-8 flex items-center justify-center shrink-0 cursor-pointer hover:opacity-70 transition-opacity"
                  aria-label="Imagem anterior"
                >
                  <div className="-rotate-90">
                    <ArrowButton isOpen={false} />
                  </div>
                </button>
                {/* Thumbnails */}
                <div className="flex flex-col gap-1">
                  {productItems
                    .map((item, idx) => ({ item, idx }))
                    .filter(({ idx }) => idx !== currentMainImageIndex)
                    .slice(0, 3)
                    .map(({ item, idx: originalIndex }) => (
                      <button
                        key={item.id}
                        onClick={() => handleThumbnailClick(originalIndex)}
                        className={`w-9 h-9 relative rounded border overflow-hidden shrink-0 cursor-pointer hover:opacity-90 transition-opacity ${originalIndex === currentMainImageIndex
                          ? 'border-primary-11'
                          : 'border-gray-6'
                          }`}
                      >
                        <ImageWithInitialFallback
                          src={item.src}
                          alt={item.name}
                          name={item.name}
                          fallbackId={item.id}
                          fill
                          sizes="36px"
                          className="size-full border-transparent"
                          letterClassName="text-sm"
                        />
                      </button>
                    ))}
                </div>
                {/* Seta para baixo */}
                <button
                  onClick={handleNextImage}
                  className="w-[18px] h-8 flex items-center justify-center shrink-0 cursor-pointer hover:opacity-70 transition-opacity"
                  aria-label="Próxima imagem"
                >
                  <ArrowButton isOpen={true} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div
        className={cn(
          "bg-gray-2 border border-gray-6 rounded-xl p-5 flex flex-col gap-2",
          productItems.length > 0 ? "min-w-0 w-full ml-4" : "w-full"
        )}
      >
        <div className="flex flex-col gap-4">
          <h2 className="text-xl font-bold font-manrope leading-[1.1] text-gray-12">
            {ticket.name}
          </h2>
          <div className="flex flex-wrap items-center justify-between gap-3 w-full">
            <div className="flex items-center gap-8 flex-wrap min-w-0">
              {distanceKm > 0 && (
                <div className="flex items-center gap-2">
                  <DistanceIcon className="size-6 shrink-0" />
                  <p className="text-lg font-medium text-gray-12 font-family-dm-sans leading-[1.3]">
                    {distanceKm} km
                  </p>
                </div>
              )}
              {modalityInfo && (
                <div className="flex items-center gap-2">
                  {modalityInfo.icon ? (
                    <div className="size-6 shrink-0 relative rounded overflow-hidden flex items-center justify-center">
                      <ImageWithInitialFallback
                        src={modalityInfo.icon}
                        alt={modalityInfo.name}
                        name={modalityInfo.name}
                        width={24}
                        height={24}
                        className="size-6 bg-transparent border-transparent"
                        imgClassName="object-contain bg-transparent border-transparent"
                        letterClassName="text-[10px]"
                        nativeImg
                      />
                    </div>
                  ) : (
                    <div className="size-6 shrink-0 rounded bg-gray-4" aria-hidden />
                  )}
                  <p className="text-lg font-medium text-gray-12 font-family-dm-sans leading-[1.3]">
                    {modalityInfo.name}
                  </p>
                </div>
              )}
            </div>
            {ageLimitText ? (
              <div className="bg-yellow-3 text-yellow-12 rounded-full px-4 py-3 shrink-0 max-w-full">
                <p className="text-base font-medium font-family-dm-sans leading-[1.3]">
                  Limite de idade: {ageLimitText}
                </p>
              </div>
            ) : null}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xl font-bold text-gray-12">
            {formatPrice(price)}
          </p>
          <div className="flex items-center gap-2 bg-primary-4 rounded-full px-2 py-2">
            <button
              type="button"
              onClick={() => onDecrease(ticket.id)}
              disabled={quantity === 0}
              className="size-6 cursor-pointer rounded-full flex items-center justify-center bg-gray-12 hover:bg-gray-11 text-gray-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              aria-label="Diminuir quantidade"
            >
              <Minus className="size-4" />
            </button>
            <span className="w-6 text-center text-lg font-semibold text-gray-12 px-6">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => onIncrease(ticket.id)}
              className="size-6 cursor-pointer rounded-full flex items-center justify-center bg-gray-12 hover:bg-gray-11 text-gray-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              aria-label="Aumentar quantidade"
            >
              <Plus className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Image Carousel Modal */}
      {productItems.length > 0 && (
        <ImageCarouselModal
          items={productItems}
          initialIndex={selectedImageIndex}
          isOpen={isImageModalOpen}
          onClose={() => setIsImageModalOpen(false)}
          ticketName={ticket.name}
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
  index,
  expandedByDefault,
  event,
  productsMap,
  kitSelectionDisplay,
  omitKitProductsWithoutImage = false,
}: TicketCategoryCardProps) {
  const [isExpanded, setIsExpanded] = useState(
    expandedByDefault ?? index === 0
  );
  const { raceQuantities, updateRaceQuantity } = useCheckout();

  // Memoizar tickets válidos
  const validTickets = useMemo(() => {
    return tickets.filter((t) => getTicketPrice(t) > 0);
  }, [tickets]);

  const minPrice = useMemo(() => {
    if (validTickets.length === 0) return 0;
    return Math.min(...validTickets.map(getTicketPrice));
  }, [validTickets]);

  const showCategoryLevelKit =
    kitSelectionDisplay.showKitImagesOnSelection &&
    kitSelectionDisplay.kitImagesLayout === "ON_CATEGORIES";

  const categoryCarouselItems = useMemo(
    () =>
      showCategoryLevelKit
        ? getCategoryKitCarouselItems(
          validTickets,
          productsMap,
          kitSelectionDisplay.primaryKitProductByCategoryId[categoryId]
        )
        : [],
    [
      showCategoryLevelKit,
      validTickets,
      productsMap,
      categoryId,
      kitSelectionDisplay.primaryKitProductByCategoryId,
    ]
  );

  const headerThumbItem = categoryCarouselItems[0] ?? null;

  // Handlers memoizados
  const handleToggle = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  const handleDecrease = (ticketId: string) => {
    const currentQuantity = raceQuantities[ticketId] || 0;
    updateRaceQuantity(ticketId, Math.max(0, currentQuantity - 1));
  };

  const handleIncrease = (ticketId: string) => {
    const currentQuantity = raceQuantities[ticketId] || 0;
    updateRaceQuantity(ticketId, currentQuantity + 1);
  };

  return (
    <>
      {/* Mobile Layout */}
      <div className="w-full md:hidden">
        <div className="border border-gray-6 rounded-xl overflow-hidden bg-gray-1">
          <div
            className="flex items-center justify-between gap-3 px-3 py-4 cursor-pointer"
            onClick={handleToggle}
          >
            <div className="flex flex-1 items-center gap-3 min-w-0">
              {showCategoryLevelKit && headerThumbItem ? (
                <div className="size-20 shrink-0 rounded-lg border border-gray-6 overflow-hidden relative bg-gray-2">
                  <ImageWithInitialFallback
                    src={headerThumbItem.src}
                    alt={categoryName}
                    name={headerThumbItem.name}
                    fallbackId={headerThumbItem.id}
                    fill
                    sizes="80px"
                    className="size-full border-transparent"
                    letterClassName="text-lg"
                  />
                </div>
              ) : null}
              <div className="flex flex-col gap-1 min-w-0">
                <h1 className="text-xl font-bold text-gray-12 font-manrope leading-[1.1]">
                  {categoryName}
                </h1>
                {!isExpanded ? (
                  <div className="flex flex-wrap items-center gap-1 text-base">
                    <p className="text-gray-11 font-family-dm-sans leading-[1.3]">
                      A partir de:
                    </p>
                    <span className="text-gray-12 font-bold font-manrope leading-[1.1]">
                      {formatPrice(minPrice)}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
            <ArrowButton isOpen={isExpanded} />
          </div>

          {/* Conteúdo sempre renderizado, controlado por CSS */}
          <div
            className="overflow-hidden transition-all duration-200 ease-out"
            style={{
              maxHeight: isExpanded ? "10000px" : "0",
              opacity: isExpanded ? 1 : 0,
            }}
          >
            <div className="px-4 pb-7 border-t border-gray-6 flex flex-col gap-6">
              {categoryDescription?.trim() ? (
                <p className="text-sm text-gray-11 font-family-dm-sans leading-[1.3] pt-6">
                  {categoryDescription.trim()}
                </p>
              ) : null}
              {showCategoryLevelKit && categoryCarouselItems.length > 0 ? (
                <CategoryKitHorizontalCarousel items={categoryCarouselItems} />
              ) : null}
              <div className="flex flex-col gap-3">
                {validTickets.map((ticket) => (
                  <TicketItemMobile
                    key={ticket.id}
                    ticket={ticket}
                    event={event}
                    productsMap={productsMap}
                    quantity={raceQuantities[ticket.id] || 0}
                    onDecrease={handleDecrease}
                    onIncrease={handleIncrease}
                    kitSelectionDisplay={kitSelectionDisplay}
                    omitKitProductsWithoutImage={omitKitProductsWithoutImage}
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
            className="flex items-center w-full justify-between gap-3 border-b border-gray-6 px-4 py-4 cursor-pointer hover:bg-gray-2/80 transition-colors"
            onClick={handleToggle}
          >
            <div className="flex flex-1 items-center gap-3 min-w-0">
              {showCategoryLevelKit && headerThumbItem ? (
                <div className="size-20 shrink-0 rounded-lg border border-gray-6 overflow-hidden relative bg-gray-2">
                  <ImageWithInitialFallback
                    src={headerThumbItem.src}
                    alt={categoryName}
                    name={headerThumbItem.name}
                    fallbackId={headerThumbItem.id}
                    fill
                    sizes="80px"
                    className="size-full border-transparent"
                    letterClassName="text-lg"
                  />
                </div>
              ) : null}
              <div className="flex flex-col items-start justify-center gap-6 min-w-0">
                <h1 className="text-xl font-bold font-manrope leading-[1.1] text-gray-12">
                  {categoryName}
                </h1>
                {!isExpanded ? (
                  <div className="flex items-center gap-1 text-base">
                    <p className="text-gray-11 font-family-dm-sans leading-[1.3]">
                      A partir de:
                    </p>
                    <span className="text-gray-12 font-bold font-manrope leading-[1.1]">
                      {formatPrice(minPrice)}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
            <ArrowButton isOpen={isExpanded} className="text-gray-12 size-4" />
          </div>

          <div
            className="overflow-hidden transition-all duration-200 ease-out"
            style={{
              maxHeight: isExpanded ? "10000px" : "0",
              opacity: isExpanded ? 1 : 0,
            }}
          >
            <div className="px-4 pb-7 pt-6 flex flex-col gap-6">
              {categoryDescription?.trim() ? (
                <p className="text-sm text-gray-11 font-family-dm-sans leading-[1.3]">
                  {categoryDescription.trim()}
                </p>
              ) : null}
              {showCategoryLevelKit && categoryCarouselItems.length > 0 ? (
                <CategoryKitHorizontalCarousel items={categoryCarouselItems} />
              ) : null}
              <div className="flex flex-col gap-3">
                {validTickets.map((ticket) => (
                  <TicketItemDesktop
                    key={ticket.id}
                    ticket={ticket}
                    event={event}
                    productsMap={productsMap}
                    quantity={raceQuantities[ticket.id] || 0}
                    onDecrease={handleDecrease}
                    onIncrease={handleIncrease}
                    kitSelectionDisplay={kitSelectionDisplay}
                    omitKitProductsWithoutImage={omitKitProductsWithoutImage}
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
