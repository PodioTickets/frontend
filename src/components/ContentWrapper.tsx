"use client";

import { usePathname } from "next/navigation";

export function ContentWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isOrganizer = pathname.startsWith("/organizer");

  if (isOrganizer) {
    return <div className="mb-12">{children}</div>;
  }

  return <div className="mt-[64px] md:mt-[68px] mb-12">{children}</div>;
}
