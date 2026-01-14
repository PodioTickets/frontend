"use client";
import type { PropsWithChildren } from "react";
import { QueryProvider } from "./QueryProvider";
import { AuthProvider } from "@/hooks/useAuth";
import { ModalsProvider } from "./ModalsProvider";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ProfileCompleteChecker } from "./ProfileCompleteChecker";

const Providers = ({ children }: PropsWithChildren) => {
  return (
    <LanguageProvider>
      <QueryProvider>
        <AuthProvider>
          <ModalsProvider />
          <ProfileCompleteChecker />
          {children}
        </AuthProvider>
      </QueryProvider>
    </LanguageProvider>
  );
};

export default Providers;
