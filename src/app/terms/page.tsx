import type { Metadata } from "next";
import { LegalDocument } from "@/components/LegalDocument";
import { termsOfUse } from "@/data/termsOfUse";

export const metadata: Metadata = {
  title: "Termos de Uso | PódioTicket",
  description:
    "Termos de Uso do Comprador da PódioTicket — condições de uso da plataforma, compra de ingressos, cancelamento, reembolso e responsabilidades.",
  robots: "index, follow",
};

export default function TermsPage() {
  const title =
    termsOfUse.find((b) => b.type === "h1")?.text ?? "Termos de Uso";
  const body = termsOfUse.filter((b) => b.type !== "h1");
  return <LegalDocument title={title} blocks={body} />;
}
