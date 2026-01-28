"use client";

import { OrganizerSidebar } from "@/components/Organizer/OrganizerSidebar";

export default function OrganizerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-2 flex">
      {/* Sidebar */}
      <OrganizerSidebar />

      {/* Main Content */}
      <main className="flex-1 ml-[218px]">
        {children}
      </main>
    </div>
  );
}
