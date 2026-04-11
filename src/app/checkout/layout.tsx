"use client";

import { CheckoutProvider } from "@/contexts/CheckoutContext";
import { CheckoutTimerProvider } from "@/contexts/CheckoutTimerContext";
import { ReactNode, Suspense } from "react";
import { Loading } from "@/components/Loading";

export default function CheckoutLayout({ children }: { children: ReactNode }) {
  return (
    <CheckoutProvider>
      <CheckoutTimerProvider>
        <Suspense fallback={<Loading />}>{children}</Suspense>
      </CheckoutTimerProvider>
    </CheckoutProvider>
  );
}

