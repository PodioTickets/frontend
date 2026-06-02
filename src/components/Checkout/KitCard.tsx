"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowButton } from "../ArrowButton";
import { DistanceIcon } from "../Icons/DistanceIcon";
import { CalendarIcon } from "../Icons/CalendarIcon";
import { ClockIcon } from "../Icons/ClockIcon";
import { Counter } from "./Counter";
import type { Kit } from "@/constants/kits";
import { useCheckout } from "@/contexts/CheckoutContext";
import { formatDateBR } from "@/utils/datetimeBR";
import { Minus, Plus, ChevronDown, ChevronUp } from "lucide-react";

interface KitCardProps {
  kit: Kit;
  index: number;
}

export function KitCard({ kit, index }: KitCardProps) {
  const [isExpanded, setIsExpanded] = useState(index === 0 ? true : false);
  const [selectedKitImageIndex, setSelectedKitImageIndex] = useState(0);
  const { raceQuantities, updateRaceQuantity } = useCheckout();

  const formatDate = (date: Date) => {
    return formatDateBR(date, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
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

  const handleDecrease = (raceId: string) => {
    const currentQuantity = raceQuantities[raceId] || 0;
    updateRaceQuantity(raceId, Math.max(0, currentQuantity - 1));
  };

  const handleIncrease = (raceId: string) => {
    const currentQuantity = raceQuantities[raceId] || 0;
    updateRaceQuantity(raceId, currentQuantity + 1);
  };

  const handleKitImageScroll = (direction: "up" | "down") => {
    if (direction === "up" && selectedKitImageIndex > 0) {
      setSelectedKitImageIndex(selectedKitImageIndex - 1);
    } else if (
      direction === "down" &&
      selectedKitImageIndex < kit.images.length - 1
    ) {
      setSelectedKitImageIndex(selectedKitImageIndex + 1);
    }
  };

  return (
    <>
      {/* Mobile Layout */}
      <div className="w-full md:hidden">
        <div className="border border-gray-6 rounded-lg overflow-hidden">
          {/* Header - Collapsible */}
          <div
            className="flex items-center justify-between px-4 py-4 cursor-pointer"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <div className="flex flex-col gap-1">
              <h1 className="text-base font-bold text-gray-12">{kit.name}</h1>
              <div className="flex items-center gap-1">
                <p className="text-sm text-gray-11">A partir de:</p>
                <span className="text-sm text-gray-12 font-bold">
                  {formatPrice(kit.minPrice)}
                </span>
              </div>
            </div>
            <ArrowButton isOpen={isExpanded} />
          </div>

          {/* Expanded Content */}
          {isExpanded && (
            <div className="px-4 pb-4 border-t border-gray-6">
              {/* Description */}
              <p className="text-sm text-gray-11 py-4">{kit.description}</p>

              {/* Race Cards */}
              <div className="flex flex-col gap-4">
                {kit.races.map((race) => {
                  const ageLimitText = formatAgeLimit(race.ageLimit);
                  const raceImages = race.images || kit.images || [];
                  const remainingImages = Math.max(0, raceImages.length - 5);

                  return (
                    <div
                      key={race.id}
                      className="bg-gray-2 border border-gray-6 rounded-xl p-4 flex flex-col gap-6"
                    >
                      {/* Image Gallery */}
                      {raceImages.length > 0 && (
                        <div className="flex gap-3 items-center w-full">
                          {/* Main Image */}
                          <div className="w-1/2 h-[136px] relative shrink-0 rounded-lg border border-gray-6 overflow-hidden">
                            <Image
                              src={raceImages[0]}
                              alt={race.name}
                              fill
                              className="object-cover"
                            />
                          </div>

                          {/* Thumbnail Grid */}
                          {raceImages.length > 1 && (
                            <div className="flex flex-col gap-2 h-[136px] justify-center">
                              {/* Top Row */}
                              <div className="flex gap-2"> 
                                {raceImages.slice(1, 3).map((image, index) => (
                                  <div
                                    key={index}
                                    className="w-[64px] h-[64px] relative rounded-lg border border-gray-6 overflow-hidden"
                                  >
                                    <Image
                                      src={image}
                                      alt={`${race.name} ${index + 2}`}
                                      fill
                                      className="object-cover"
                                    />
                                  </div>
                                ))}
                              </div>
                              {/* Bottom Row */}
                              <div className="flex gap-2">
                                {raceImages.slice(3, 4).map((image, index) => (
                                  <div
                                    key={index}
                                    className="w-[64px] h-[64px] relative rounded-lg border border-gray-6 overflow-hidden"
                                  >
                                    <Image
                                      src={image}
                                      alt={`${race.name} ${index + 4}`}
                                      fill
                                      className="object-cover"
                                    />
                                  </div>
                                ))}
                                {/* Last thumbnail with overlay if more images */}
                                {raceImages.length > 4 ? (
                                  <div className="w-[64px] h-[64px] relative rounded-lg border border-gray-6 overflow-hidden">
                                    {raceImages[4] && (
                                      <Image
                                        src={raceImages[4]}
                                        alt={`${race.name} 5`}
                                        fill
                                        className="object-cover"
                                      />
                                    )}
                                    <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                                      <div className="flex items-center gap-1">
                                        <Plus className="size-6 text-white" />
                                        <span className="text-lg font-extrabold text-white font-manrope">
                                          {remainingImages}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                ) : raceImages.length === 4 ? (
                                  <div className="w-[64px] h-[64px] relative rounded-lg border border-gray-6 overflow-hidden">
                                    <Image
                                      src={raceImages[3]}
                                      alt={`${race.name} 4`}
                                      fill
                                      className="object-cover"
                                    />
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Content Section */}
                      <div className="flex flex-col gap-5">
                        {/* Title */}
                        <h2 className="text-lg font-bold text-gray-12 font-manrope leading-[1.1]">
                          {race.name}
                        </h2>

                        {/* Info Icons */}
                        <div className="grid grid-cols-2 gap-4 items-center">
                          <div className="flex items-center gap-2">
                            <DistanceIcon className="size-6 shrink-0" />
                            <p className="text-base font-medium text-gray-12 font-family-dm-sans leading-[1.3]">
                              {race.distanceKm} km
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <CalendarIcon className="size-6 shrink-0" />
                            <p className="text-base font-medium text-gray-12 font-family-dm-sans leading-[1.3]">
                              {formatDate(race.date)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <ClockIcon className="size-6 shrink-0" />
                            <p className="text-base font-medium text-gray-12 font-family-dm-sans leading-[1.3]">
                              {race.time}
                            </p>
                          </div>
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
                          {formatPrice(race.price)}
                        </p>
                        <div className="flex items-center bg-primary-3 rounded-full px-2 py-2 h-11">
                          <button
                            type="button"
                            onClick={() => handleDecrease(race.id)}
                            disabled={
                              (raceQuantities[race.id] || 0) === 0 ||
                              !race.available
                            }
                            className="size-6 cursor-pointer rounded-full flex items-center justify-center bg-gray-12 hover:bg-gray-11 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0 p-1"
                            aria-label="Diminuir quantidade"
                          >
                            <Minus className="size-4" />
                          </button>
                          <span className="min-w-[24px] text-center text-lg font-semibold text-gray-12 px-6 font-manrope leading-[1.1]">
                            {raceQuantities[race.id] || 0}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleIncrease(race.id)}
                            disabled={!race.available}
                            className="size-6 cursor-pointer rounded-full flex items-center justify-center bg-gray-12 hover:bg-gray-11 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0 p-1"
                            aria-label="Aumentar quantidade"
                          >
                            <Plus className="size-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:block w-full">
        <div
          className="flex items-center w-full justify-between rounded-lg border border-gray-6 px-3 py-4 cursor-pointer hover:bg-gray-2 transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex flex-col items-start justify-center gap-4">
            <h1 className="text-xl font-bold">{kit.name}</h1>
            <div className="flex items-center gap-1">
              <p className="text-base text-gray-11">A partir de:</p>
              <span className="text-base text-gray-12 font-bold">
                {formatPrice(kit.minPrice)}
              </span>
            </div>
          </div>

          <ArrowButton isOpen={isExpanded} />
        </div>

        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            isExpanded ? "max-h-[5000px] opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="mt-6">
            <p className="text-sm text-gray-11 mb-6">{kit.description}</p>

            {/* Cards das races */}
            <div className="flex flex-col gap-6">
              {kit.races.map((race) => {
                const ageLimitText = formatAgeLimit(race.ageLimit);
                return (
                  <div key={race.id} className="flex gap-4 w-full">
                    {/* Galeria de imagens da race à esquerda */}
                    {race.images && race.images.length > 0 && (
                      <div className="shrink-0">
                        <div className="flex items-center gap-2">
                          {race.images[0] && (
                            <div className="w-[136px] h-[136px] relative rounded-lg border border-gray-6 overflow-hidden">
                              <Image
                                src={race.images[0]}
                                alt={race.name}
                                fill
                                className="object-cover"
                              />
                            </div>
                          )}
                          {race.images.length > 1 && (
                            <div className="flex flex-col gap-1 items-center">
                              {/* Seta para cima (placeholder) */}
                              <div className="w-8 h-8 flex items-center justify-center">
                                <div className="rotate-180">
                                  <ArrowButton isOpen={true} />
                                </div>
                              </div>
                              {/* Thumbnails */}
                              <div className="flex flex-col gap-1">
                                {race.images.slice(1, 4).map((image, index) => (
                                  <div
                                    key={index}
                                    className="w-9 h-9 relative rounded border border-gray-6 overflow-hidden"
                                  >
                                    <Image
                                      src={image}
                                      alt={`${race.name} ${index + 2}`}
                                      fill
                                      className="object-cover"
                                    />
                                  </div>
                                ))}
                              </div>
                              {/* Seta para baixo (placeholder) */}
                              <div className="w-8 h-8 flex items-center justify-center">
                                <div className="">
                                  <ArrowButton isOpen={true} />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Card da race à direita */}
                    <div className="flex-1 bg-gray-2 border border-gray-6 rounded-xl p-4 flex flex-col gap-6">
                      <div className="flex flex-col gap-5">
                        <h2 className="text-xl font-bold">{race.name}</h2>
                        <div className="flex items-center gap-8 flex-wrap">
                          <div className="flex items-center gap-2">
                            <DistanceIcon className="size-6" />
                            <p className="text-lg font-medium text-gray-12">
                              {race.distanceKm} km
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <CalendarIcon className="size-6" />
                            <p className="text-lg font-medium text-gray-12">
                              {formatDate(race.date)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <ClockIcon className="size-6" />
                            <p className="text-lg font-medium text-gray-12">
                              {race.time}
                            </p>
                          </div>
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
                          {formatPrice(race.price)}
                        </p>
                        <div className="flex items-center gap-2 bg-primary-4 rounded-full px-2 py-2">
                          <button
                            type="button"
                            onClick={() => handleDecrease(race.id)}
                            disabled={
                              (raceQuantities[race.id] || 0) === 0 ||
                              !race.available
                            }
                            className="size-6 cursor-pointer rounded-full flex items-center justify-center bg-gray-12 hover:bg-gray-11 text-gray-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                            aria-label="Diminuir quantidade"
                          >
                            <Minus className="size-4" />
                          </button>
                          <span className="w-6 text-center text-lg font-semibold text-gray-12 px-6">
                            {raceQuantities[race.id] || 0}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleIncrease(race.id)}
                            disabled={!race.available}
                            className="size-6 cursor-pointer rounded-full flex items-center justify-center bg-gray-12 hover:bg-gray-11 text-gray-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                            aria-label="Aumentar quantidade"
                          >
                            <Plus className="size-4" />
                          </button>
                        </div>
                        {!race.available && (
                          <p className="text-xs text-red-10">Esgotado</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
