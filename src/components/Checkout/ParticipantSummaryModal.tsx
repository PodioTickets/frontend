"use client";

import { useState, useMemo, useEffect } from "react";
import { RemoveIcon } from "../Icons/RemoveIcon";
import { CalendarIcon } from "../Icons/CalendarIcon";
import { ClockIcon } from "../Icons/ClockIcon";
import { ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import type { Ticket } from "@/hooks/useTickets";
import { ArrowButton } from "../ArrowButton";
import { ImageCarouselModal } from "./ImageCarouselModal";
import { DistanceIcon } from "../Icons/DistanceIcon";
import { ImageWithInitialFallback } from "@/components/ImageWithInitialFallback";
import { getTicketProductCarouselItems } from "@/utils/ticketProductVisuals";

interface Product {
  id: string;
  name: string;
  image?: string;
  basePrice: number;
  isRequired: boolean;
  isIncludedInTicket: boolean;
  variationType?: string;
  variations?: Array<{
    id: string;
    name: string;
    price: number;
  }>;
}

interface ParticipantModalData {
  participantIndex: number;
  participant: {
    name: string;
    cpf: string;
    email: string;
    birthDate: string;
    phone: string;
    gender?: string;
    emergencyPhone?: string;
    emergencyContactName?: string;
    productVariations?: Record<string, string | null>;
  };
  ticket: Ticket;
  requiredProducts?: Product[];
  additionalProducts?: Product[];
  event?: {
    bannerUrl?: string;
    name?: string;
    eventDate?: string;
    eventTime?: string;
  };
}

interface ParticipantSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  participants: ParticipantModalData[];
  initialParticipantIndex?: number;
  products?: Product[];
  productsMap?: Record<string, { id: string; name: string; image: string | null }>;
}

const EMPTY_CAROUSEL_TICKET: Pick<Ticket, "products"> = { products: [] };

export function ParticipantSummaryModal({
  isOpen,
  onClose,
  participants,
  initialParticipantIndex = 0,
  products = [],
  productsMap = {},
}: ParticipantSummaryModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialParticipantIndex);
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentMainImageIndex, setCurrentMainImageIndex] = useState(0);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // Reset to initial index when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialParticipantIndex);
      setCurrentMainImageIndex(0);
      const id = window.setTimeout(() => setIsAnimating(true), 10);
      return () => window.clearTimeout(id);
    }
    setIsAnimating(false);
  }, [isOpen, initialParticipantIndex]);

  const isActive = isOpen && participants.length > 0;
  const activeParticipant = isActive ? participants[currentIndex] : undefined;
  const ticketForCarousel =
    activeParticipant?.ticket ?? EMPTY_CAROUSEL_TICKET;

  const productItems = useMemo(
    () => getTicketProductCarouselItems(ticketForCarousel, productsMap),
    [ticketForCarousel, productsMap]
  );

  const carouselTicketId = activeParticipant?.ticket?.id ?? "";

  useEffect(() => {
    if (productItems.length === 0) {
      setCurrentMainImageIndex(0);
      return;
    }
    setCurrentMainImageIndex((i) => Math.min(i, productItems.length - 1));
  }, [productItems.length, carouselTicketId]);

  if (!isOpen || participants.length === 0) return null;

  const currentParticipant = participants[currentIndex];
  if (!currentParticipant) return null;

  const { participant, ticket, event } = currentParticipant;

  const formatDate = (date?: string) => {
    if (!date) return "";
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(date));
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  };

  /** Preços da API em centavos — mesma lógica do passo de inscrição / modal de produto. */
  const formatVariationSidePriceFromCents = (
    basePriceCents: number,
    variationPriceCents: number,
  ): string => {
    const base = basePriceCents / 100;
    const v = variationPriceCents / 100;
    if (v < base) return formatPrice(v);
    return formatPrice(Math.max(0, v - base));
  };

  const maskCPF = (cpf: string) => {
    if (!cpf) return "";
    const cleaned = cpf.replace(/\D/g, "");
    if (cleaned.length !== 11) return cpf;
    return `${cleaned.slice(0, 3)}.***.***-${cleaned.slice(9)}`;
  };

  const getGenderLabel = (gender?: string) => {
    if (!gender) return "";
    const labels: Record<string, string> = {
      male: "Masculino",
      masculino: "Masculino",
      female: "Feminino",
      feminino: "Feminino",
      other: "Outro",
      outro: "Outro",
    };
    return labels[gender.toLowerCase()] || gender;
  };

  const formatPhone = (phone?: string) => {
    if (!phone) return "";
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 3)} ${cleaned.slice(3, 7)}-${cleaned.slice(7)}`;
    }
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setCurrentMainImageIndex(0); // Reset image gallery for new participant
    }
  };

  const handleNext = () => {
    if (currentIndex < participants.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setCurrentMainImageIndex(0); // Reset image gallery for new participant
    }
  };

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(onClose, 300);
  };

  // Get ticket price
  const getTicketPrice = (): number => {
    if (!ticket?.price) return 0;
    try {
      return parseFloat(ticket.price.replace(/[^\d,]/g, "").replace(",", "."));
    } catch {
      return 0;
    }
  };

  // Get products for this participant - only products linked to the selected ticket
  const getParticipantProducts = () => {
    const requiredProds: Array<Product & { selectedVariation?: { id: string; name: string; price: number } }> = [];
    const additionalProds: Array<Product & { selectedVariation?: { id: string; name: string; price: number } }> = [];

    if (!products || products.length === 0) return { requiredProducts: requiredProds, additionalProducts: additionalProds };

    // Get the product IDs linked to this specific ticket
    const ticketProductIds = ticket.products || [];

    // Filter products to only include those linked to this ticket
    const ticketProducts = products.filter((product) => ticketProductIds.includes(product.id));

    ticketProducts.forEach((product) => {
      const selectedVariationId = participant.productVariations?.[product.id];
      let selectedVariation;

      if (selectedVariationId && product.variations) {
        selectedVariation = product.variations.find((v) => v.id === selectedVariationId);
      }

      const productWithVariation = { ...product, selectedVariation };

      if (product.isRequired || product.isIncludedInTicket) {
        requiredProds.push(productWithVariation);
      } else if (selectedVariationId) {
        // Only add to additional if selected
        additionalProds.push(productWithVariation);
      }
    });

    return { requiredProducts: requiredProds, additionalProducts: additionalProds };
  };

  const { requiredProducts, additionalProducts } = getParticipantProducts();

  const eventTitle = event?.name?.trim() || ticket.name;

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
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-black/50 transition-opacity duration-300 ${isAnimating ? "opacity-100" : "opacity-0"
          }`}
        onClick={handleClose}
      />

      {/* Modal */}
      <div
        className={`fixed z-50 bg-gray-1 rounded-xl overflow-hidden shadow-2xl transition-all duration-300 ${isAnimating ? "opacity-100 scale-100" : "opacity-0 scale-95"
          } left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[730px] max-w-[95vw] max-h-[80vh] flex flex-col`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-6 shrink-0">
          <p className="font-family-dm-sans font-semibold text-xl leading-[1.3] text-gray-12">
            Resumo do participante {currentIndex + 1}
          </p>
          <button
            onClick={handleClose}
            className="size-9 flex items-center justify-center rounded-lg hover:bg-gray-3 transition-colors"
          >
            <RemoveIcon className="size-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-4 py-5">
          <div className="flex flex-col gap-8">
            {/* Participant Info Card */}
            <div className="flex flex-col gap-6">
              <div className="border border-gray-6 rounded-xl px-3 py-2">
                <div className="flex gap-2 items-center">
                  <div className="size-[52px] rounded-full bg-gray-5 flex items-center justify-center shrink-0 overflow-hidden">
                    {participant.name ? (
                      <span className="text-lg font-bold text-gray-12">
                        {participant.name.charAt(0).toUpperCase()}
                      </span>
                    ) : (
                      <div className="size-[52px] rounded-full bg-gray-5" />
                    )}
                  </div>
                  <div className="flex flex-col gap-3 items-start justify-center">
                    <p className="font-manrope font-semibold text-base leading-[1.1] text-gray-12">
                      {participant.name || `Participante ${currentIndex + 1}`}
                    </p>
                    <div className="flex gap-2 items-center">
                      {participant.birthDate && (
                        <>
                          <p className="font-family-dm-sans font-normal text-sm leading-[1.3] text-gray-11">
                            {formatDate(participant.birthDate)}
                          </p>
                          <div className="size-1 bg-gray-11 rounded-full" />
                        </>
                      )}
                      {participant.gender && (
                        <>
                          <p className="font-family-dm-sans font-normal text-sm leading-[1.3] text-gray-11">
                            {getGenderLabel(participant.gender)}
                          </p>
                          {participant.cpf && <div className="size-1 bg-gray-11 rounded-full" />}
                        </>
                      )}
                      {participant.cpf && (
                        <p className="font-family-dm-sans font-normal text-sm leading-[1.3] text-gray-11">
                          {maskCPF(participant.cpf)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Participant Information */}
              <div className="flex flex-col gap-4">
                <p className="font-manrope font-bold text-xl leading-[1.1] text-gray-12">
                  Informações do participante
                </p>
                <div className="grid grid-cols-2">
                  <div className="flex flex-col gap-2 pb-4">
                    <p className="font-family-dm-sans font-normal text-base leading-[1.3] text-gray-12">
                      Nome
                    </p>
                    <p className="font-family-dm-sans font-medium text-base leading-[1.3] text-gray-12">
                      {participant.name || "Não informado"}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 pb-4">
                    <p className="font-family-dm-sans font-normal text-base leading-[1.3] text-gray-12">
                      Email
                    </p>
                    <p className="font-family-dm-sans font-medium text-base leading-[1.3] text-gray-12">
                      {participant.email || "Não informado"}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 py-4">
                    <p className="font-family-dm-sans font-normal text-base leading-[1.3] text-gray-12">
                      CPF
                    </p>
                    <p className="font-family-dm-sans font-medium text-base leading-[1.3] text-gray-12">
                      {participant.cpf
                        ? participant.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
                        : "Não informado"}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 py-4">
                    <p className="font-family-dm-sans font-normal text-base leading-[1.3] text-gray-12">
                      Data de nascimento
                    </p>
                    <p className="font-family-dm-sans font-medium text-base leading-[1.3] text-gray-12">
                      {participant.birthDate ? formatDate(participant.birthDate) : "Não informado"}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 py-4">
                    <p className="font-family-dm-sans font-normal text-base leading-[1.3] text-gray-12">
                      Telefone
                    </p>
                    <p className="font-family-dm-sans font-medium text-base leading-[1.3] text-gray-12">
                      {formatPhone(participant.phone) || "Não informado"}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 py-4">
                    <p className="font-family-dm-sans font-normal text-base leading-[1.3] text-gray-12">
                      Sexo
                    </p>
                    <p className="font-family-dm-sans font-medium text-base leading-[1.3] text-gray-12">
                      {getGenderLabel(participant.gender) || "Não informado"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Ticket Section */}
            <div className="flex flex-col gap-4">
              <p className="font-manrope font-bold text-lg leading-[1.1] text-gray-12">
                Ingresso
              </p>
              <div className="bg-gray-2 border border-gray-6 rounded-xl p-4 flex flex-col gap-3">
                <div className="flex gap-5 items-center">
                  {/* Product Images Gallery */}
                  {productItems.length > 0 ? (
                    <div className="shrink-0">
                      <div className="flex items-center gap-2">
                        {/* Main Image */}
                        <button
                          onClick={() => handleImageClick(currentMainImageIndex)}
                          className="w-[136px] h-[136px] relative rounded-lg border border-gray-6 overflow-hidden shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
                        >
                          {currentProduct ? (
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
                          ) : null}
                        </button>
                        {/* Thumbnail Navigation */}
                        {productItems.length > 1 && (
                          <div className="flex flex-col items-center gap-1">
                            {/* Arrow up */}
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
                                      className="size-full border-0"
                                      letterClassName="text-sm"
                                    />
                                  </button>
                                ))}
                            </div>
                            {/* Arrow down */}
                            <button
                              onClick={handleNextImage}
                              className="w-[18px] h-8 flex items-center justify-center shrink-0 cursor-pointer hover:opacity-70 transition-opacity"
                              aria-label="Próxima imagem"
                            >
                              <div className="rotate-90">
                                <ArrowButton isOpen={false} />
                              </div>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="size-[136px] rounded border border-gray-6 overflow-hidden shrink-0 relative">
                      <ImageWithInitialFallback
                        src={event?.bannerUrl}
                        alt={eventTitle}
                        name={eventTitle}
                        fill
                        sizes="136px"
                        className="size-full border-0"
                        letterClassName="text-3xl"
                      />
                    </div>
                  )}

                  {/* Ticket Info */}
                  <div className="flex-1 flex flex-col gap-5">
                    <p className="font-manrope font-bold text-xl leading-[1.1] text-gray-12">
                      {ticket.name}
                    </p>
                    <div className="flex gap-8 items-center flex-wrap">
                      {ticket.distance && (
                        <div className="flex gap-2 items-center">
                          <DistanceIcon className="size-6 text-gray-12" />
                          <p className="font-family-dm-sans font-medium text-lg leading-[1.3] text-gray-12">
                            {ticket.distance} {ticket.distanceUnit || "Km"}
                          </p>
                        </div>
                      )}
                      {event?.eventDate && (
                        <div className="flex gap-2 items-center">
                          <CalendarIcon className="size-6" />
                          <p className="font-family-dm-sans font-medium text-lg leading-[1.3] text-gray-12">
                            {formatDate(event.eventDate)}
                          </p>
                        </div>
                      )}
                      {event?.eventTime && (
                        <div className="flex gap-2 items-center">
                          <ClockIcon className="size-6" />
                          <p className="font-family-dm-sans font-medium text-lg leading-[1.3] text-gray-12">
                            {event.eventTime}
                          </p>
                        </div>
                      )}
                    </div>
                    {/* Age limit tag if applicable */}
                    {ticket.ageLimit?.min && ticket.ageLimit?.max && (
                      <div className="bg-yellow-3 px-4 py-3 rounded-full w-fit">
                        <p className="font-family-dm-sans font-medium text-base leading-[1.3] text-yellow-12 text-center">
                          Limite de idade: de {ticket.ageLimit.min} a {ticket.ageLimit.max} anos
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Ticket Price */}
                <div className="flex items-center justify-between text-center">
                  <p className="font-family-dm-sans font-normal text-base leading-[1.3] text-gray-11">
                    Valor do ingresso:
                  </p>
                  <p className="font-manrope font-bold text-xl leading-[1.1] text-gray-12">
                    {formatPrice(getTicketPrice())}
                  </p>
                </div>
              </div>
            </div>

            {/* Required Products (Kit) */}
            {requiredProducts.length > 0 && (
              <div className="flex flex-col gap-4">
                <p className="font-manrope font-bold text-lg leading-[1.1] text-gray-12">
                  Produtos do kit (obrigatório)
                </p>
                <div className="flex gap-3 flex-wrap">
                  {requiredProducts.map((product) => (
                    <div
                      key={product.id}
                      className="bg-gray-2 border border-gray-6 rounded-xl flex-1 min-w-[280px] max-w-[336px]"
                    >
                      {/* Product Info */}
                      <div className="border-b border-gray-6 p-4 flex gap-3 items-center">
                        <div className="size-[100px] rounded border border-gray-6 overflow-hidden shrink-0 relative">
                          <ImageWithInitialFallback
                            src={product.image}
                            alt={product.name}
                            name={product.name}
                            fallbackId={product.id}
                            fill
                            sizes="100px"
                            className="size-full border-0"
                            letterClassName="text-2xl"
                          />
                        </div>
                        <div className="flex flex-col justify-between h-[100px] py-2">
                          <p className="font-manrope font-semibold text-base leading-[1.1] text-gray-12">
                            {product.name}
                          </p>
                          <p className="font-manrope font-semibold text-base leading-[1.1] text-gray-11">
                            {product.isIncludedInTicket ? "Grátis" : formatPrice(product.basePrice / 100)}
                          </p>
                        </div>
                      </div>
                      {/* Size Selection Display */}
                      <div className="p-4">
                        <div className="flex flex-col gap-2">
                          <p className="font-family-dm-sans font-normal text-base leading-[1.3] text-gray-12">
                            {product.variationType || "Escolha o tamanho"}
                          </p>
                          <div className="flex items-center justify-between gap-2 min-w-0">
                            <p className="font-family-dm-sans font-normal text-base leading-[1.3] text-gray-12 truncate min-w-0">
                              {product.selectedVariation?.name || "Não selecionado"}
                            </p>
                            {product.selectedVariation ? (
                              <p className="font-family-dm-sans font-bold text-base leading-[1.3] text-gray-12 shrink-0 tabular-nums">
                                {formatVariationSidePriceFromCents(
                                  product.basePrice,
                                  product.selectedVariation.price,
                                )}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Divider */}
            {(requiredProducts.length > 0 || additionalProducts.length > 0) && (
              <div className="h-px bg-gray-6 w-full" />
            )}

            {/* Additional Products */}
            {additionalProducts.length > 0 && (
              <div className="flex flex-col gap-4">
                <p className="font-manrope font-bold text-lg leading-[1.1] text-gray-12">
                  Produtos adicionais (opcional)
                </p>
                <div className="flex gap-3 flex-wrap">
                  {additionalProducts.map((product) => (
                    <div
                      key={product.id}
                      className="bg-gray-2 border border-gray-6 rounded-xl min-w-[280px] max-w-[336px]"
                    >
                      {/* Product Info */}
                      <div className="border-b border-gray-6 p-4 flex gap-3 items-center">
                        <div className="size-[100px] rounded-lg border border-gray-6 overflow-hidden shrink-0 relative">
                          <ImageWithInitialFallback
                            src={product.image}
                            alt={product.name}
                            name={product.name}
                            fallbackId={product.id}
                            fill
                            sizes="100px"
                            className="size-full border-0"
                            letterClassName="text-2xl"
                          />
                        </div>
                        <div className="flex flex-col justify-between h-[100px] py-2 flex-1">
                          <p className="font-family-dm-sans font-semibold text-sm leading-[1.3] text-gray-12">
                            {product.name}
                          </p>
                          <p className="font-manrope font-semibold text-base leading-[1.1] text-gray-12">
                            {product.isIncludedInTicket
                              ? "Grátis"
                              : formatPrice(product.basePrice / 100)}
                          </p>
                        </div>
                      </div>
                      {/* Size Display */}
                      <div className="p-4">
                        <div className="flex flex-col gap-2">
                          <p className="font-family-dm-sans font-normal text-base leading-[1.3] text-gray-12">
                            {product.variationType || "Escolha o tamanho"}
                          </p>
                          <div className="flex items-center justify-between gap-2 min-w-0">
                            <p className="font-family-dm-sans font-normal text-base leading-[1.3] text-gray-12 truncate min-w-0">
                              {product.selectedVariation?.name || "Não selecionado"}
                            </p>
                            {product.selectedVariation ? (
                              <p className="font-family-dm-sans font-bold text-base leading-[1.3] text-gray-12 shrink-0 tabular-nums">
                                {formatVariationSidePriceFromCents(
                                  product.basePrice,
                                  product.selectedVariation.price,
                                )}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer with Navigation */}
        {participants.length > 1 && (
          <div className="bg-gray-2 border-t border-gray-6 px-4 py-3 flex items-center justify-between shrink-0">
            <p className="font-family-dm-sans font-semibold text-xl leading-[1.3] text-gray-12">
              Próximo participante
            </p>
            <div className="flex gap-2 items-center">
              <button
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                className="bg-gray-2 border border-gray-6 rounded-full size-9 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-3 transition-colors"
              >
                <ChevronLeft className="size-5 text-gray-12" />
              </button>
              <button
                onClick={handleNext}
                disabled={currentIndex === participants.length - 1}
                className="bg-gray-2 border border-gray-6 rounded-full size-9 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-3 transition-colors"
              >
                <ChevronRight className="size-5 text-gray-12" />
              </button>
            </div>
          </div>
        )}
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
    </>
  );
}
