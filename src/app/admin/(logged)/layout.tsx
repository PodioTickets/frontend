"use client";

import type { ReactNode } from "react";
import { AdminSidebar } from "@/components/Admin/AdminSidebar";
import { AdminMobileNav } from "@/components/Admin/AdminMobileNav";
import { useAdminAccess } from "@/hooks/useAdminAccess";

export default function AdminLoggedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { loading, isAdmin } = useAdminAccess();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-2 flex items-center justify-center">
        <div className="size-8 border-2 border-gray-6 border-t-primary-11 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin) return null;

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
