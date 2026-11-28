"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useOrganizerNavigate } from "@/hooks/useOrganizerNavigate";
import { Loading } from "@/components/Loading";

/** Tópicos agora ficam na etapa "Página" (`/edit/banner`); link antigo redireciona. */
export default function EditTopicsRedirect() {
  const orgNav = useOrganizerNavigate();
  const eventId = useParams().id as string;

  useEffect(() => {
    orgNav.replace(`/organizer/events/${eventId}/edit/banner`);
  }, [orgNav, eventId]);

  return <Loading />;
}
