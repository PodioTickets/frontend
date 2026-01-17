"use client";

import Link from "next/link";
import Image from "next/image";
import { Globe } from "lucide-react";
import { LanguageToggle } from "@/components/LanguageToggle";

export default function OrganizerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-2 flex flex-col">
      {/* Header */}
      <header className="bg-linear-to-r from-[#222222] to-[#222222] border-b border-gray-6 h-[68px] flex items-center justify-between px-5 md:px-20 py-2.5 shadow-[0px_4px_12px_0px_rgba(17,17,17,0.15)] fixed top-0 left-0 right-0 z-999">
        <div className="flex items-center gap-8">
          <Link href="/organizer" className="flex items-center">
            <Image
              src="/images/logo.png"
              alt="Logo"
              width={32}
              height={32}
              className="size-8"
            />
          </Link>
          <Link
            href="/organizer/events"
            className="text-gray-6 text-sm font-dm-sans hover:text-gray-4 transition-colors"
          >
            Meus eventos
          </Link>
        </div>
        <div className="flex items-center">
          <LanguageToggle className="h-11" />
        </div>
      </header>

      {/* Content with padding for fixed header */}
      <div className="flex-1">{children}</div>
    </div>
  );
}
