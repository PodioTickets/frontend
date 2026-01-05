"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

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

  return (
    <div className="w-full max-w-[1280px] mx-auto flex items-center justify-center min-h-screen">
      <Loader2 className="size-4 animate-spin" />
    </div>
  );
}
