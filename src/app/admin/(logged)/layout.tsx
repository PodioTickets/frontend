"use client";

import type { ReactNode } from "react";
import { AdminSidebar } from "@/components/Admin/AdminSidebar";
import { AdminMobileNav } from "@/components/Admin/AdminMobileNav";

export default function AdminLoggedLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-2 flex pt-16 md:pt-0">
      <AdminMobileNav />
      <AdminSidebar />
      <main className="flex-1 ml-0 md:ml-[218px] min-w-0 pt-4 md:pt-8 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
