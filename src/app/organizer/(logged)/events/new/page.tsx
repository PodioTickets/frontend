"use client";

import { useEffect } from "react";
import { useOrganizerNavigate } from "@/hooks/useOrganizerNavigate";
import { Loading } from "@/components/Loading";
import { useCreateEvent } from "@/contexts/CreateEventContext";
import {
  DEFAULT_CREATE_EVENT_WIZARD_PATH,
  loadLastCreateEventWizardPath,
} from "@/lib/createEventWizardPersistence";

export const dynamic = "force-dynamic";

export default function CreateEventRedirectPage() {
  const orgNav = useOrganizerNavigate();
  const { clearFormData } = useCreateEvent();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const url = new URL(window.location.href);
    if (url.searchParams.get("reset") === "1") {
      clearFormData();
      orgNav.replace(DEFAULT_CREATE_EVENT_WIZARD_PATH);
      return;
    }

    const last = loadLastCreateEventWizardPath();
    orgNav.replace(last);
  }, [clearFormData, orgNav]);

  return <Loading />;
}
