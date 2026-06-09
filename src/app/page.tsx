import type { Metadata } from "next";
import { Suspense } from "react";
import { HomeFilters } from "@/components/HomeFilters";
import { EventCarousel } from "@/components/EventCarousel";
import { Button } from "@/components/Button";

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
const OG_DESCRIPTION = "Grandes conquistas começam com uma inscrição.";
const OG_IMAGE = "/images/logo_graph.jpeg";

export const metadata: Metadata = {
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

export default function Home() {
  return (
    <section className="flex flex-col min-h-screen w-full px-4 md:px-0 max-w-[1280px] mx-auto mb-12">
      <Suspense fallback={null}>
        <HomeFilters />
      </Suspense>

      {/* Hero Banner */}
      <div className="w-full mt-6 md:mt-14">
        <div className="md:bg-[url('/banners/banner_1.png')] bg-[url('/banners/banner_1_mobile.png')] md:bg-cover bg-contain bg-center bg-no-repeat w-full h-[200px] md:h-[400px] lg:h-[388px] rounded-lg" />
      </div>

      {/* Featured Events Section — full width (preenche a tela) */}
      <div className="relative left-1/2 right-1/2 -mx-[50vw] w-screen mt-8 md:mt-16">
        <h1 className="font-manrope text-2xl md:text-[28px] font-extrabold text-center text-gray-12">
          Eventos em destaque
        </h1>
        <div className="mt-6 md:mt-8">
          <EventCarousel items={20} />
        </div>
      </div>

      <div className="w-full mt-6 md:mt-14">
        <div className="md:bg-[url('/banners/banner_2.png')] bg-[url('/banners/banner_2_mobile.png')] md:bg-cover bg-cover bg-center bg-no-repeat w-full h-auto lg:h-[256px] rounded-lg p-5 md:p-10 flex flex-col justify-between">
          <div className="flex flex-col gap-2 md:gap-5">
            <h1 className="font-manrope text-base md:text-[28px] font-extrabold text-gray-1">
              Organize eventos com a PódioTicket!
            </h1>
            <p className="font-manrope text-sm md:text-lg md:font-medium text-gray-1">
              Venda ingressos online, acompanhe inscrições e simplifique <br /> a gestão do seu evento esportivo
            </p>
          </div>
          <Button className="w-max px-8 py-5 font-bold mt-10 md:mt-0">
            Saiba mais
          </Button>
        </div>

      </div>
    </section>
  );
}
