"use client";

import { CheckoutProvider } from "@/contexts/CheckoutContext";
import { ReactNode, Suspense } from "react";
import { Loader2 } from "lucide-react";

export default function CheckoutLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-[1280px] mx-auto flex items-center justify-center min-h-screen">
          <Loader2 className="size-4 animate-spin" />
        </div>
      }
    >
      <CheckoutProvider>{children}</CheckoutProvider>
    </Suspense>
  );
}

