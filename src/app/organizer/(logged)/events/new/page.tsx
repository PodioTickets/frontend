"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useOrganizerNavigate } from "@/hooks/useOrganizerNavigate";
import { Loading } from "@/components/Loading";
import { useCreateEvent } from "@/contexts/CreateEventContext";

export const dynamic = 'force-dynamic';

export default function CreateEventRedirectPage() {
  const router = useRouter();
  const orgNav = useOrganizerNavigate();
  const { clearFormData } = useCreateEvent();

  useEffect(() => {
    clearFormData();
    orgNav.replace("/organizer/events/new/information");
  }, [router, clearFormData]);

  return <Loading />;
}
