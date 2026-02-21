"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function OrganizerDashboardPage() {
  const router = useRouter();
  useEffect(() => {
    router.push("/organizer/events");
  }, [router]);
}
