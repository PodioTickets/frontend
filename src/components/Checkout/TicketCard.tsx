"use client";

import { useState, useMemo, useEffect } from "react";
import { ArrowButton } from "../ArrowButton";
import { DistanceIcon } from "../Icons/DistanceIcon";
import { useCheckout } from "@/contexts/CheckoutContext";
import { Minus, Plus } from "lucide-react";
import type { Ticket } from "@/hooks/useTickets";
import type { Event, EventKitSelectionDisplay } from "@/interfaces/event";
import { defaultEventKitSelectionDisplay } from "@/lib/eventKitSelectionDisplay";
import { ImageCarouselModal } from "./ImageCarouselModal";
import { ImageWithInitialFallback } from "@/components/ImageWithInitialFallback";
import { getCheckoutModalityInfo } from "@/utils/checkoutModalityDisplay";
import { getTicketProductCarouselItems } from "@/utils/ticketProductVisuals";

interface TicketCardProps {
  ticket: Ticket;
  event: Event;
  productsMap: Record<string, { id: string; name: string; image: string | null }>;
  kitSelectionDisplay?: EventKitSelectionDisplay;
  omitKitProductsWithoutImage?: boolean;
}

export function TicketCard({
  ticket,
  event,
  productsMap,
  kitSelectionDisplay = defaultEventKitSelectionDisplay(),
  omitKitProductsWithoutImage = false,
}: TicketCardProps) {
  const { raceQuantities, updateRaceQuantity } = useCheckout();
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [currentMainImageIndex, setCurrentMainImageIndex] = useState(0);

  const currentQuantity = raceQuantities[ticket.id] || 0;
  const totalQuantity = Object.values(raceQuantities).reduce((s, q) => s + q, 0);

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

  const getTicketPrice = (): number => {
    try {
      return parseFloat(ticket.price.replace(/[^\d,]/g, "").replace(",", "."));
    } catch {
      return 0;
    }
  };

  const getDistanceKm = (): number => {
    return parseFloat(ticket.distance) || 0;
  };

  const modalityInfo = useMemo(
    () => getCheckoutModalityInfo(ticket, event),
    [ticket, event],
  );
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

  const handleDecrease = () => {
    updateRaceQuantity(ticket.id, Math.max(0, currentQuantity - 1));
  };

  const maxQuantity = ticket.availableQuantity ?? Infinity;
  const isAtMax = currentQuantity >= maxQuantity || totalQuantity >= 20;

  const handleIncrease = () => {
    if (isAtMax) return;
    updateRaceQuantity(ticket.id, currentQuantity + 1);
  };

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

  const price = getTicketPrice();
  const distanceKm = getDistanceKm();
  const ageLimitText = formatAgeLimit(ticket.ageLimit);
  const currentProduct = productItems[currentMainImageIndex];

  const showLowStock =
    ticket.availableQuantity !== null &&
    ticket.availableQuantity <= 10 &&
    !ticket.isSoldOut;

  return (
    <>
      {/* Mobile Layout */}
      <div className="w-full md:hidden">
        <div className="bg-gray-2 border border-gray-6 rounded-xl p-4 flex flex-col justify-center gap-6">
          {/* Image Gallery */}
          {productItems.length > 0 && (
            <div className="flex gap-3 items-center w-full justify-start">
              {/* Main Image */}
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
                    sizes="(max-width: 768px) 90vw, 136px"
                    className="size-full border-transparent"
                    letterClassName="text-3xl"
                  />
                ) : null}
              </button>

              {/* Thumbnail Grid */}
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
                            alt={`${item.name}`}
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

          {/* Content Section */}
          <div className="flex flex-col gap-5">
            {/* Title */}
            <h2 className="text-lg font-bold text-gray-12 font-manrope leading-[1.1]">
              {ticket.name}
            </h2>

            {/* Info Icons */}
            <div className="grid grid-cols-2 gap-4 items-center">
              {distanceKm > 0 && (
                <div className="flex items-center gap-2">
                  <DistanceIcon className="size-6 shrink-0" />
                  <p className="text-base font-medium text-gray-12 font-family-dm-sans leading-[1.3]">
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
                  <p className="text-base font-medium text-gray-12 font-family-dm-sans leading-[1.3]">
                    {modalityInfo.name}
                  </p>
                </div>
              )}

            </div>

            {/* Age Limit Tag */}
            {ageLimitText && (
              <div className="bg-yellow-3 rounded-full px-4 py-3 w-fit">
                <p className="text-xs font-medium text-yellow-12 font-family-dm-sans leading-[1.3]">
                  Limite de idade: {ageLimitText}
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xl font-bold text-gray-12 font-manrope leading-[1.1]">
              {formatPrice(price)}
            </p>
            <div className="flex flex-col gap-2">
              <div className="flex items-center bg-primary-3 rounded-full px-2 py-2 h-11">
                <button
                  type="button"
                  onClick={handleDecrease}
                  disabled={currentQuantity === 0}
                  className="size-6 cursor-pointer rounded-full flex items-center justify-center bg-gray-12 hover:bg-gray-11 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0 p-1"
                  aria-label="Diminuir quantidade"
                >
                  <Minus className="size-4" />
                </button>
                <span className="min-w-[24px] text-center text-lg font-semibold text-gray-12 px-6 font-manrope leading-[1.1]">
                  {currentQuantity}
                </span>
                <button
                  type="button"
                  onClick={handleIncrease}
                  disabled={isAtMax}
                  className="size-6 cursor-pointer rounded-full flex items-center justify-center bg-gray-12 hover:bg-gray-11 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0 p-1"
                  aria-label="Aumentar quantidade"
                >
                  <Plus className="size-4" />
                </button>
              </div>
              {showLowStock && (
                <p className="text-xs font-medium text-red-11">
                  Restam apenas {ticket.availableQuantity} {ticket.availableQuantity === 1 ? "vaga" : "vagas"}!
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:block w-full">
        <div className="flex items-center gap-4 w-full">
          {/* Galeria de imagens dos produtos à esquerda */}
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
                      <ArrowButton isOpen={false} className="-rotate-90" />
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

          {/* Card do ticket */}
          <div className="flex-1 bg-gray-2 border border-gray-6 rounded-xl p-4 flex flex-col gap-2">
            <div className="flex flex-col gap-1">
              <h2 className="text-xl font-bold">{ticket.name}</h2>
              <div className="flex items-center gap-8 flex-wrap">
                {distanceKm > 0 && (
                  <div className="flex items-center gap-2">
                    <DistanceIcon className="size-5" />
                    <p className="text-lg font-medium text-gray-12">
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
                          width={10000}
                          height={10000}
                          className="size-6 bg-transparent border-transparent"
                          imgClassName="object-contain border-transparent"
                          letterClassName="text-[10px]"
                          nativeImg
                        />
                      </div>
                    ) : (
                      <div className="size-6 shrink-0 rounded bg-gray-4" aria-hidden />
                    )}
                    <p className="text-lg font-medium text-gray-12">
                      {modalityInfo.name}
                    </p>
                  </div>
                )}
              </div>

              {ageLimitText && (
                <div className="bg-yellow-3 text-yellow-12 rounded-full px-4 py-3 w-fit">
                  <p className="text-base font-medium">
                    Limite de idade: {ageLimitText}
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xl font-bold text-gray-12">
                {formatPrice(price)}
              </p>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 bg-primary-4 rounded-full px-2 py-2">
                  <button
                    type="button"
                    onClick={handleDecrease}
                    disabled={currentQuantity === 0}
                    className="size-6 cursor-pointer rounded-full flex items-center justify-center bg-gray-12 hover:bg-gray-11 text-gray-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                    aria-label="Diminuir quantidade"
                  >
                    <Minus className="size-4" />
                  </button>
                  <span className="w-6 text-center text-lg font-semibold text-gray-12 px-6">
                    {currentQuantity}
                  </span>
                  <button
                    type="button"
                    onClick={handleIncrease}
                    disabled={isAtMax}
                    className="size-6 cursor-pointer rounded-full flex items-center justify-center bg-gray-12 hover:bg-gray-11 text-gray-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                    aria-label="Aumentar quantidade"
                  >
                    <Plus className="size-4" />
                  </button>
                </div>
                {showLowStock && (
                  <p className="text-xs font-medium text-red-11">
                    Restam apenas {ticket.availableQuantity} {ticket.availableQuantity === 1 ? "vaga" : "vagas"}!
                  </p>
                )}
              </div>
            </div>
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
          preferredProductId={
            kitSelectionDisplay.primaryKitProductByTicketId[ticket.id]
          }
        />
      )}
    </>
  );
}
