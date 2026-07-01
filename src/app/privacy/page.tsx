import type { Metadata } from "next";
import { LegalDocument } from "@/components/LegalDocument";
import { privacyPolicy } from "@/data/privacyPolicy";

export const metadata: Metadata = {
  title: "Política de Privacidade | PódioTicket",
  description:
    "Política de Privacidade e Política de Cookies da PódioTicket — como coletamos, usamos, compartilhamos e protegemos seus dados pessoais (LGPD).",
  robots: "index, follow",
};

export default function PrivacyPage() {
  const body = privacyPolicy.filter((b) => b.type !== "h1");
  return (
    <LegalDocument
      title="Política de privacidade"
      blocks={body}
      updatedAt="01/01/2026"
    />
  );
}
