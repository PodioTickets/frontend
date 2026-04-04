"use client";

import { useEffect } from "react";
import { useOrganizerNavigate } from "@/hooks/useOrganizerNavigate";
import { Loading } from "@/components/Loading";

/** Card image is edited together with the banner on `/organizer/events/new/banner`. */
export default function PreviaPage() {
  const orgNav = useOrganizerNavigate();

  useEffect(() => {
    orgNav.replace("/organizer/events/new/banner");
  }, [orgNav]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loading />
    </div>
  );
}
