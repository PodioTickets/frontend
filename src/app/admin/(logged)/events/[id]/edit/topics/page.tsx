"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loading } from "@/components/Loading";

/** Tópicos agora ficam na etapa "Página" (`/edit/banner`); link antigo redireciona. */
export default function EditTopicsRedirect() {
  const router = useRouter();
  const eventId = useParams().id as string;

  useEffect(() => {
    router.replace(`/admin/events/${eventId}/edit/banner`);
  }, [router, eventId]);

  return <Loading />;
}
