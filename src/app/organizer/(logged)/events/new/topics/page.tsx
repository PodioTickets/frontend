"use client";

import { useEffect } from "react";
import { useOrganizerNavigate } from "@/hooks/useOrganizerNavigate";
import { Loading } from "@/components/Loading";

/** Tópicos agora ficam na etapa "Página" (`/new/banner`); link/rascunho antigo redireciona. */
export default function TopicosRedirect() {
  const orgNav = useOrganizerNavigate();

  useEffect(() => {
    orgNav.replace("/organizer/events/new/banner");
  }, [orgNav]);

  return <Loading />;
}
