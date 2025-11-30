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
      minimumFractionDigits: 0,
    }).format(price);
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
        className="flex items-center w-full justify-between rounded-lg border border-gray-5 px-4 py-3 cursor-pointer hover:bg-gray-2 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex flex-col items-start justify-center gap-2">
          <h1 className="text-lg font-bold">{kit.name}</h1>
          <p className="text-sm text-gray-11">
            A partir de:{" "}
            <span className="text-gray-12 font-bold">
              {formatPrice(kit.minPrice)}
            </span>
          </p>
        </div>

        <ArrowButton isOpen={isExpanded} />
      </div>

      {isExpanded && (
        <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex gap-4 w-full">
            <div className="w-1/3 h-full">
              <div className="w-full h-[136px] flex gap-2">
                {kit.images[0] && (
                  <Image
                    src={kit.images[0]}
                    alt={kit.name}
                    width={100000}
                    height={100000}
                    className="w-2/3 h-full object-cover rounded-lg"
                  />
                )}
                {kit.images.length > 1 && (
                  <div className="flex flex-col gap-2">
                    {kit.images.slice(1, 3).map((image, index) => (
                      <Image
                        key={index}
                        src={image}
                        alt={`${kit.name} ${index + 2}`}
                        width={100000}
                        height={100000}
                        className="w-2/3 h-full object-cover rounded-lg"
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="w-2/3 flex flex-col gap-3">
              <p className="text-sm text-gray-11">{kit.description}</p>
              <div className="flex flex-col gap-2">
                {kit.races.map((race) => (
                  <div
                    key={race.id}
                    className="flex flex-col items-start justify-between w-full gap-6 rounded-lg border border-gray-5 px-4 py-3 hover:bg-gray-2 transition-colors"
                  >
                    <div className="flex flex-col items-start justify-center gap-2 flex-1">
                      <h1 className="text-lg font-bold">{race.name}</h1>
                      <div className="flex items-center gap-4 text-gray-12 text-sm">
                        <div className="flex items-center gap-2">
                          <DistanceIcon className="size-5" />
                          <p className="text-sm font-medium text-gray-12">
                            {race.distanceKm} km
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="size-5" />
                          <p className="text-sm font-medium text-gray-12">
                            {formatDate(race.date)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <ClockIcon className="size-5" />
                          <p className="text-sm font-medium text-gray-12">
                            {race.time}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center w-full justify-between gap-4">
                      <div className="flex flex-col items-end gap-1">
                        <p className="text-lg font-bold text-gray-12">
                          {formatPrice(race.price)}
                        </p>
                        {!race.available && (
                          <p className="text-xs text-red-10">Esgotado</p>
                        )}
                      </div>
                      <Counter
                        value={raceQuantities[race.id] || 0}
                        onDecrease={() => handleDecrease(race.id)}
                        onIncrease={() => handleIncrease(race.id)}
                        disabled={!race.available}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

