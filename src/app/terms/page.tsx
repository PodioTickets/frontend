import type { Metadata } from "next";
import { LegalDocument } from "@/components/LegalDocument";
import { termsOfUse } from "@/data/termsOfUse";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT("user");
  return {
    title: t("termsMetaTitle"),
    description: t("termsMetaDescription"),
    // `robots` é decidido em runtime no RootLayout (homologação → noindex).
  };
}

// O texto legal (`termsOfUse`) fica em pt-BR em todos os idiomas — só o chrome é traduzido.
export default async function TermsPage() {
  const t = await getT("user");
  const body = termsOfUse.filter((b) => b.type !== "h1");
  return (
    <LegalDocument
      title={t("termsTitle")}
      blocks={body}
      updatedAt="01/01/2026"
      updatedAtLabel={t("lastUpdated")}
    />
  );
}
