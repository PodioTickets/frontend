"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Loading } from "@/components/Loading";

function ThreeDSResultContent() {
  const searchParams = useSearchParams();
  const result = searchParams.get("3ds") as "success" | "failed" | "error" | null;
  const orderId = searchParams.get("orderId");

  useEffect(() => {
    if (!result || !orderId) return;

    if (window.parent !== window) {
      window.parent.postMessage(
        { type: "3DS_RESULT", result, orderId },
        "*",
      );
    }
  }, [result, orderId]);

  return <Loading />;
}

export default function ThreeDSResultPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ThreeDSResultContent />
    </Suspense>
  );
}
