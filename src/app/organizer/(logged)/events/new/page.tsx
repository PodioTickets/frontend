"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loading } from "@/components/Loading";
import { useCreateEvent } from "@/contexts/CreateEventContext";

export const dynamic = 'force-dynamic';

export default function CreateEventRedirectPage() {
  const router = useRouter();
  const { clearFormData } = useCreateEvent();

  useEffect(() => {
    clearFormData();
    router.replace("/organizer/events/new/information");
  }, [router, clearFormData]);

  return <Loading />;
}
