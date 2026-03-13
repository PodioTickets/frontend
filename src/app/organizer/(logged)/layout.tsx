"use client";

import { OrganizerSidebar } from "@/components/Organizer/OrganizerSidebar";
import { OrganizerMobileNav } from "@/components/Organizer/OrganizerMobileNav";
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
    <div className="min-h-screen bg-gray-2 flex pt-16 md:pt-0">
      {/* Mobile: top bar + hamburger menu (drawer) */}
      <OrganizerMobileNav />

      {/* Sidebar: desktop only */}
      <OrganizerSidebar />

      {/* Main Content: no left margin on mobile, sidebar offset on desktop */}
      <main className="flex-1 ml-0 md:ml-[218px] min-w-0">
        {children}
      </main>
    </div>
  );
}
