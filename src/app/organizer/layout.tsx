"use client";

import { OrganizerSidebar } from "@/components/Organizer/OrganizerSidebar";
import { useOrganizerAccess } from "@/hooks/useOrganizerAccess";
import { Loading } from "@/components/Loading";

export default function OrganizerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { loading, isMember } = useOrganizerAccess();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-2 flex items-center justify-center">
        <Loading />
      </div>
    );
  }

  if (!isMember) {
    return null;
  }

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
