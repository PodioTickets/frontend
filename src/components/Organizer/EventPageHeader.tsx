"use client";

import Link from "next/link";
import { ArrowButton } from "../ArrowButton";

interface Tab {
  label: string;
  href: string;
  active?: boolean;
}

interface EventPageHeaderProps {
  eventName?: string;
  tabs: Tab[];
}

export function EventPageHeader({ eventName, tabs }: EventPageHeaderProps) {
  return (
    <div className="bg-gray-1 border-b border-gray-6 mb-6 pt-6">
      <div className="max-w-7xl mx-auto px-4 lg:px-0">
        <div className="mb-4">
          <div className="flex items-center gap-2 text-sm text-gray-11">
            <Link href="/organizer/events" className="hover:text-gray-12">
              Eventos
            </Link>
            <ArrowButton isOpen={false} className="size-2" />
            <span className="text-gray-12">{eventName || "Evento"}</span>
          </div>
        </div>

        <div className="flex gap-6">
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={`pb-3 px-1 text-sm transition-colors border-b-2 ${tab.active
                ? "border-primary-10 text-primary-10 font-manrope font-bold"
                : "border-transparent text-gray-11 hover:text-gray-12 font-family-dm-sans font-normal"
                }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
