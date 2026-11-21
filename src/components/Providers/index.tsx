"use client";
import type { ReactNode } from "react";
import { QueryProvider } from "./QueryProvider";
import { AuthProvider } from "@/hooks/useAuth";
import { ModalsProvider } from "./ModalsProvider";
import { I18nProvider } from "@/i18n/client";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/messages/pt-BR";
import { ProfileCompleteChecker } from "./ProfileCompleteChecker";
import { CouponLinkCapture } from "./CouponLinkCapture";

const Providers = ({
  children,
  locale,
  messages,
}: {
  children: ReactNode;
  locale: Locale;
  messages?: Messages;
}) => {
  return (
    <I18nProvider locale={locale} messages={messages}>
      <QueryProvider>
        <AuthProvider>
          <ModalsProvider />
          <ProfileCompleteChecker />
          <CouponLinkCapture />
          {children}
        </AuthProvider>
      </QueryProvider>
    </I18nProvider>
  );
};

export default Providers;
