"use client";

import { useMemo } from "react";
import Link from "next/link";

interface EventMapProps {
  city: string;
  state: string;
  title?: string;
}

export function EventMap({ city, state, title }: EventMapProps) {
  // Create address string for Google Maps
  const address = useMemo(() => {
    return `${city}, ${state}, Brasil`;
  }, [city, state]);

  // Create Google Maps embed URL
  const mapUrl = useMemo(() => {
    return `https://www.google.com/maps?q=${encodeURIComponent(
      address
    )}&output=embed`;
  }, [address]);

  // Create Google Maps link for external navigation
  const googleMapsLink = useMemo(() => {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      address
    )}`;
  }, [address]);

  return (
    <div className="w-full h-[450px] rounded-xl overflow-hidden border border-gray-6 shadow-lg relative">
      <iframe
        id="map"
        width="100%"
        height="100%"
        style={{ border: 0 }}
        loading="lazy"
        allowFullScreen
        referrerPolicy="no-referrer-when-downgrade"
        src={mapUrl}
        title={title || `Mapa de ${city}, ${state}`}
      />
      <div className="absolute bottom-4 right-4">
        <Link
          href={googleMapsLink}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium text-gray-12 hover:bg-gray-2 transition-colors flex items-center gap-2"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
          Abrir no Google Maps
        </Link>
      </div>
    </div>
  );
}

