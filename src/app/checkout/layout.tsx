"use client";

import { CheckoutProvider } from "@/contexts/CheckoutContext";
import { ReactNode, Suspense } from "react";
import { Loading } from "@/components/Loading";

export default function CheckoutLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<Loading />}>
      <CheckoutProvider>{children}</CheckoutProvider>
    </Suspense>
  );
}

