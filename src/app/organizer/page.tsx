"use client";

import { useOrganizerNavigate } from "@/hooks/useOrganizerNavigate";
import { useEffect } from "react";

export default function OrganizerDashboardPage() {
  const orgNav = useOrganizerNavigate();
  useEffect(() => {
    orgNav.push("/organizer/events");
  }, [orgNav]);
}
