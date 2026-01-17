"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loading } from "@/components/Loading";

export default function CreateEventRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/organizer/events/new/informacoes");
  }, [router]);

  return <Loading />;
}
