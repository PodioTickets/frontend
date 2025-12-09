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
import { Minus, Plus } from "lucide-react";

interface KitCardProps {
  kit: Kit;
}

export function KitCard({ kit }: KitCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { raceQuantities, updateRaceQuantity } = useCheckout();

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

  const handleDecrease = (raceId: string) => {
    const currentQuantity = raceQuantities[raceId] || 0;
    updateRaceQuantity(raceId, Math.max(0, currentQuantity - 1));
  };

  const handleIncrease = (raceId: string) => {
    const currentQuantity = raceQuantities[raceId] || 0;
    updateRaceQuantity(raceId, currentQuantity + 1);
  };

  return (
    <div className="w-full">
      <div
        className="flex items-center w-full justify-between rounded-lg border border-gray-6 px-3 py-4 cursor-pointer hover:bg-gray-2 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex flex-col items-start justify-center gap-6">
          <h1 className="text-xl font-bold">{kit.name}</h1>
          <div className="flex items-center gap-1">
            <p className="text-base text-gray-11">A partir de:</p>
            <span className="text-base text-gray-12 font-bold">
              {formatPrice(kit.minPrice)}
            </span>
          </div>
        </div>

        <div className={`transition-transform duration-300 ease-in-out ${isExpanded ? 'rotate-180' : ''}`}>
          <ArrowButton isOpen={isExpanded} />
        </div>
      </div>

      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isExpanded ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'
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
                          className="w-6 h-6 rounded-full flex items-center justify-center bg-gray-12 hover:bg-gray-11 text-gray-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
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
                          className="w-6 h-6 rounded-full flex items-center justify-center bg-gray-12 hover:bg-gray-11 text-gray-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
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
  );
}
