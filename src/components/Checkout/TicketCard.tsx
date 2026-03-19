"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { ArrowButton } from "../ArrowButton";
import { DistanceIcon } from "../Icons/DistanceIcon";
import { CalendarIcon } from "../Icons/CalendarIcon";
import { ClockIcon } from "../Icons/ClockIcon";
import { useCheckout } from "@/contexts/CheckoutContext";
import { Minus, Plus } from "lucide-react";
import type { Ticket } from "@/hooks/useTickets";
import type { Event } from "@/interfaces/event";
import { ImageCarouselModal } from "./ImageCarouselModal";
import { modalitiesColumns } from "@/constants";

interface TicketCardProps {
  ticket: Ticket;
  event: Event;
  productsMap: Record<string, { id: string; name: string; image: string | null }>;
}

export function TicketCard({ ticket, event, productsMap }: TicketCardProps) {
  const { raceQuantities, updateRaceQuantity } = useCheckout();
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [currentMainImageIndex, setCurrentMainImageIndex] = useState(0);

  const currentQuantity = raceQuantities[ticket.id] || 0;

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date);
  };

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

  // Resolver ícone e nome da modalidade: primeiro do evento, depois das modalidades padrão
  const modalityInfo = useMemo(() => {
    const modalityValue = ticket.modality?.trim();
    if (!modalityValue) return null;

    const fromEvent = event.modalities?.find(
      (m) =>
        m.name === modalityValue ||
        m.template?.label === modalityValue ||
        m.template?.code === modalityValue
    );
    if (fromEvent) {
      return {
        name: fromEvent.template?.label || fromEvent.name,
        icon: fromEvent.template?.icon,
      };
    }

    const allModalities = modalitiesColumns.flat();
    const byIdOrLabel = allModalities.find(
      (m) => m.id === modalityValue || m.label === modalityValue
    );
    if (byIdOrLabel) {
      return { name: byIdOrLabel.label, icon: byIdOrLabel.icon };
    }

    return { name: modalityValue, icon: undefined };
  }, [ticket.modality, event.modalities]);

  // Obter imagens dos produtos vinculados ao ticket
  const getTicketProductImages = (): string[] => {
    if (!ticket.products || ticket.products.length === 0) return [];
    return ticket.products
      .map((productId) => productsMap[productId]?.image)
      .filter((image): image is string => !!image);
  };

  const handleDecrease = () => {
    updateRaceQuantity(ticket.id, Math.max(0, currentQuantity - 1));
  };

  const handleIncrease = () => {
    updateRaceQuantity(ticket.id, currentQuantity + 1);
  };

  const handleImageClick = (index: number) => {
    setSelectedImageIndex(index);
    setIsImageModalOpen(true);
  };

  const handlePreviousImage = () => {
    setCurrentMainImageIndex((prev) =>
      prev === 0 ? productImages.length - 1 : prev - 1
    );
  };

  const handleNextImage = () => {
    setCurrentMainImageIndex((prev) =>
      prev === productImages.length - 1 ? 0 : prev + 1
    );
  };

  const handleThumbnailClick = (index: number) => {
    setCurrentMainImageIndex(index);
    handleImageClick(index);
  };

  const price = getTicketPrice();
  const distanceKm = getDistanceKm();
  const productImages = getTicketProductImages();
  const ageLimitText = formatAgeLimit(ticket.ageLimit);

  return (
    <>
      {/* Mobile Layout */}
      <div className="w-full md:hidden">
        <div className="bg-gray-2 border border-gray-6 rounded-xl p-4 flex flex-col justify-center gap-6">
          {/* Image Gallery */}
          {productImages.length > 0 && (
            <div className={`flex gap-3 items-center w-full ${productImages.length === 1 ? 'justify-center' : 'justify-start'}`}>
              {/* Main Image */}
              <button
                onClick={() => handleImageClick(currentMainImageIndex)}
                className={`${productImages.length === 1 ? 'w-full max-w-[400px]' : 'w-[136px]'} h-[136px] relative shrink-0 rounded-lg border border-gray-6 overflow-hidden cursor-pointer hover:opacity-90 transition-opacity`}
              >
                <Image
                  src={productImages[currentMainImageIndex]}
                  alt={ticket.name}
                  fill
                  className="object-cover"
                />
              </button>

              {/* Thumbnail Grid */}
              {productImages.length > 1 && (
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
                    {productImages
                      .filter((_, idx) => idx !== currentMainImageIndex)
                      .slice(0, 3)
                      .map((image, idx) => {
                        const originalIndex = productImages.findIndex((img) => img === image);
                        return (
                          <button
                            key={originalIndex}
                            onClick={() => handleThumbnailClick(originalIndex)}
                            className={`w-9 h-9 relative rounded border overflow-hidden shrink-0 cursor-pointer hover:opacity-90 transition-opacity ${originalIndex === currentMainImageIndex
                              ? 'border-primary-11'
                              : 'border-gray-6'
                              }`}
                          >
                            <Image
                              src={image}
                              alt={`${ticket.name} ${originalIndex + 1}`}
                              fill
                              className="object-cover"
                            />
                          </button>
                        );
                      })}
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
                      <Image
                        src={modalityInfo.icon}
                        alt={modalityInfo.name}
                        width={24}
                        height={24}
                        className="object-contain"
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

          {/* Price and Stepper */}
          <div className="flex items-center justify-between">
            <p className="text-xl font-bold text-gray-12 font-manrope leading-[1.1]">
              {formatPrice(price)}
            </p>
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
                className="size-6 cursor-pointer rounded-full flex items-center justify-center bg-gray-12 hover:bg-gray-11 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0 p-1"
                aria-label="Aumentar quantidade"
              >
                <Plus className="size-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:block w-full">
        <div className="flex gap-4 w-full">
          {/* Galeria de imagens dos produtos à esquerda */}
          {productImages.length > 0 && (
            <div className={`${productImages.length === 1 ? 'flex justify-center w-full' : 'shrink-0'}`}>
              <div className={`flex items-center gap-2 ${productImages.length === 1 ? 'justify-center w-full' : ''}`}>
                {productImages[currentMainImageIndex] && (
                  <button
                    onClick={() => handleImageClick(currentMainImageIndex)}
                    className="w-[136px] h-[136px] relative rounded-lg border border-gray-6 overflow-hidden shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
                  >
                    <Image
                      src={productImages[currentMainImageIndex]}
                      alt={ticket.name}
                      fill
                      className="object-cover"
                    />
                  </button>
                )}
                {productImages.length > 1 && (
                  <div className="flex flex-col items-center gap-1">
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
                      {productImages
                        .filter((_, idx) => idx !== currentMainImageIndex)
                        .slice(0, 3)
                        .map((image, idx) => {
                          const originalIndex = productImages.findIndex((img) => img === image);
                          return (
                            <button
                              key={originalIndex}
                              onClick={() => handleThumbnailClick(originalIndex)}
                              className={`w-9 h-9 relative rounded border overflow-hidden shrink-0 cursor-pointer hover:opacity-90 transition-opacity ${originalIndex === currentMainImageIndex
                                ? 'border-primary-11'
                                : 'border-gray-6'
                                }`}
                            >
                              <Image
                                src={image}
                                alt={`${ticket.name} ${originalIndex + 1}`}
                                fill
                                className="object-cover"
                              />
                            </button>
                          );
                        })}
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
            </div>
          )}

          {/* Card do ticket */}
          <div className="flex-1 bg-gray-2 border border-gray-6 rounded-xl p-4 flex flex-col gap-6">
            <div className="flex flex-col gap-5">
              <h2 className="text-xl font-bold">{ticket.name}</h2>
              <div className="flex items-center gap-8 flex-wrap">
                {distanceKm > 0 && (
                  <div className="flex items-center gap-2">
                    <DistanceIcon className="size-6" />
                    <p className="text-lg font-medium text-gray-12">
                      {distanceKm} km
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
                  className="size-6 cursor-pointer rounded-full flex items-center justify-center bg-gray-12 hover:bg-gray-11 text-gray-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                  aria-label="Aumentar quantidade"
                >
                  <Plus className="size-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Image Carousel Modal */}
      {productImages.length > 0 && (
        <ImageCarouselModal
          images={productImages}
          initialIndex={selectedImageIndex}
          isOpen={isImageModalOpen}
          onClose={() => setIsImageModalOpen(false)}
          ticketName={ticket.name}
        />
      )}
    </>
  );
}
