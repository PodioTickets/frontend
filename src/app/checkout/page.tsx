"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loading } from "@/components/Loading";

export default function CheckoutPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const eventId = searchParams.get("eventId");

  useEffect(() => {
    if (eventId) {
      router.replace(`/checkout/ingressos?eventId=${eventId}`);
    } else {
      router.replace("/");
    }
  }, [eventId, router]);

  return <Loading />;
}
