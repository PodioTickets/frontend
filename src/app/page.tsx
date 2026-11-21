import type { Metadata } from "next";
import { Suspense } from "react";
import { HomeFilters } from "@/components/HomeFilters";
import { HomeEventsGrid } from "@/components/HomeEventsGrid";
import { HomeHero } from "@/components/HomeHero";
import { HomeModalities } from "@/components/HomeModalities";
import { Button } from "@/components/Button";
import Link from "next/link";
import { getT } from "@/i18n/server";

/**
 * Metadata Open Graph / Twitter da HOME. Diferente da página do evento (que
 * resolve dados dinâmicos por slug no servidor via `generateMetadata`), a home
 * é estática — então a metadata também é estática. O que faltava para o preview
 * de link em redes sociais (WhatsApp/Telegram/Facebook/Twitter) ficar completo
 * era a `og:image`: o root layout só definia título/descrição, sem imagem.
 *
 * A imagem usa caminho relativo: o `metadataBase` do root layout o resolve para
 * URL absoluta (crawlers exigem absoluta). Os campos abaixo sobrescrevem os
 * defaults herdados do root layout para esta rota.
 */
const OG_TITLE = "PódioTicket";
const OG_IMAGE = "/images/logo_graph.jpeg";

// `generateMetadata` (e não `metadata` estático) só para a descrição seguir o idioma.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getT("home");
  const OG_DESCRIPTION = t("metaDescription");
  return {
  title: OG_TITLE,
  description: OG_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    title: OG_TITLE,
    description: OG_DESCRIPTION,
    url: "/",
    type: "website",
    siteName: "PódioTicket",
    images: [{ url: OG_IMAGE, alt: "PódioTicket" }],
  },
  twitter: {
    card: "summary_large_image",
    title: OG_TITLE,
    description: OG_DESCRIPTION,
    images: [OG_IMAGE],
  },
  };
}

export default async function Home() {
  const t = await getT("home");
  return (
    <section className="flex flex-col min-h-screen w-full px-4 md:px-0 max-w-[1280px] mx-auto mb-12 md:mb-19">
      {/* Hero (Figma 7498:67390): faixa gray-3 full-bleed com a busca + "Eventos em destaque". */}
      <div className="relative left-1/2 right-1/2 -mx-[50vw] w-screen bg-gray-3 border-b border-gray-6">
        <div className="mx-auto flex w-full max-w-[1280px] flex-col items-center gap-7 pb-6 pt-6 md:gap-[52px] md:pb-11 md:pt-9">
          {/* Mobile: card "Procure seu evento" (Figma 7397:65774) acima do carrossel; desktop: barra de filtros. */}
          <div className="w-full px-4 md:px-0 md:max-w-[1138px]">
            <Suspense fallback={null}>
              <HomeFilters hero />
            </Suspense>
          </div>
          <HomeHero />
        </div>
      </div>

      {/* Modalidades e Explore os eventos — desktop Figma 7498:67779/7498:67420, mobile 7549:73550/7549:73553. */}
      <div className="mt-6 md:mt-12">
        <HomeModalities />
      </div>
      <div className="mt-8 md:mt-11">
        <HomeEventsGrid />
      </div>

      {/* Mobile (Figma 7549:73567): card escuro de 307px com o mockup do painel ancorado à direita. */}
      <div className="w-full mt-16 md:mt-17">
        <div className="bg-[#1D180F] bg-[url('/banners/organizer-banner-mobile.jpg')] md:bg-[url('/banners/banner_2.png')] bg-cover bg-right md:bg-center bg-no-repeat w-full h-[307px] md:h-auto lg:h-[256px] rounded-2xl md:rounded-lg px-4 py-5 md:p-10 flex flex-col gap-6 md:gap-0 md:justify-between">
          <div className="flex flex-col gap-3 md:gap-1">
            <h1 className="max-md:[text-box-trim:trim-both] max-md:[text-box-edge:cap_alphabetic] max-md:leading-[1.1] font-manrope text-base md:text-[28px] font-extrabold text-[#EEEEEE] md:text-gray-1">
              {t("organizerBannerTitle")}
            </h1>
            <p className="max-md:[text-box-trim:trim-both] max-md:[text-box-edge:cap_alphabetic] max-md:leading-[1.3] font-family-dm-sans md:font-family-manrope text-sm md:text-lg md:font-medium text-[#EEEEEE] md:text-gray-1">
              {t("organizerBannerTextStart")} <br className="hidden md:block" /> {t("organizerBannerTextEnd")}
            </p>
          </div>
          <Link href={"/crie-seu-evento-na-podioticket"} className="w-max">
            <Button className="w-max h-9 px-5 font-bold md:h-[44px] md:px-8 md:py-5">
              {t("organizerBannerCta")}
            </Button>
          </Link>
        </div>

      </div>
    </section>
  );
}
