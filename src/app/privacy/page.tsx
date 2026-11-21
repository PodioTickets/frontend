import type { Metadata } from "next";
import { LegalDocument } from "@/components/LegalDocument";
import { privacyPolicy } from "@/data/privacyPolicy";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT("user");
  return {
    title: t("privacyMetaTitle"),
    description: t("privacyMetaDescription"),
    // `robots` é decidido em runtime no RootLayout (homologação → noindex).
  };
}

// O texto legal (`privacyPolicy`) fica em pt-BR em todos os idiomas — só o chrome é traduzido.
export default async function PrivacyPage() {
  const t = await getT("user");
  const body = privacyPolicy.filter((b) => b.type !== "h1");
  return (
    <LegalDocument
      title={t("privacyTitle")}
      blocks={body}
      updatedAt="01/01/2026"
      updatedAtLabel={t("lastUpdated")}
    />
  );
}
