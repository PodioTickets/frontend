"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loading } from "@/components/Loading";

export const dynamic = 'force-dynamic';

export default function CreateEventRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/organizer/events/new/information");
  }, [router]);

  return <Loading />;
}
