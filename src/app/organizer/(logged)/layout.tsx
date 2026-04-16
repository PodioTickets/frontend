"use client";

import { OrganizerSidebar } from "@/components/Organizer/OrganizerSidebar";
import { OrganizerMobileNav } from "@/components/Organizer/OrganizerMobileNav";
import { OrganizerAuditPageViewTracker } from "@/components/Organizer/OrganizerAuditPageViewTracker";
import { useOrganizerAccess } from "@/hooks/useOrganizerAccess";
import {
  OrganizerPermissionsProvider,
  useOrganizerPermissions,
} from "@/contexts/OrganizerPermissionsContext";
import { Loading } from "@/components/Loading";

function OrganizerLayoutContent({ children }: { children: React.ReactNode }) {
  const { loading } = useOrganizerPermissions();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-2 flex items-center justify-center">
        <Loading />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-2 flex pt-16 md:pt-0">
      <OrganizerAuditPageViewTracker />
      <OrganizerMobileNav />
      <OrganizerSidebar />
      <main className="flex-1 ml-0 md:ml-[218px] min-w-0">
        {children}
      </main>
    </div>
  );
}

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
    <OrganizerPermissionsProvider>
      <OrganizerLayoutContent>{children}</OrganizerLayoutContent>
    </OrganizerPermissionsProvider>
  );
}
