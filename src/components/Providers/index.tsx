"use client";
import type { PropsWithChildren } from "react";
import { QueryProvider } from "./QueryProvider";
import { AuthProvider } from "@/hooks/useAuth";
import { ModalsProvider } from "./ModalsProvider";
import { LanguageProvider } from "@/contexts/LanguageContext";

const Providers = ({ children }: PropsWithChildren) => {
  return (
    <LanguageProvider>
      <QueryProvider>
        <AuthProvider>
          <ModalsProvider />
          {children}
        </AuthProvider>
      </QueryProvider>
    </LanguageProvider>
  );
};

export default Providers;
