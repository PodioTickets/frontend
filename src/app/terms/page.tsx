import type { Metadata } from "next";
import { LegalDocument } from "@/components/LegalDocument";
import { termsOfUse } from "@/data/termsOfUse";

export const metadata: Metadata = {
  title: "Termos de Uso | PódioTicket",
  description:
    "Termos de Uso do Comprador da PódioTicket — condições de uso da plataforma, compra de ingressos, cancelamento, reembolso e responsabilidades.",
  // `robots` é decidido em runtime no RootLayout (homologação → noindex).
};

export default function TermsPage() {
  const body = termsOfUse.filter((b) => b.type !== "h1");
  return (
    <LegalDocument title="Termos e serviços" blocks={body} updatedAt="01/01/2026" />
  );
}
