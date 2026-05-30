import { Suspense } from "react";
import { HomeFilters } from "@/components/HomeFilters";
import { EventCarousel } from "@/components/EventCarousel";

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

      {/* Featured Events Section */}
      <div className="flex flex-col w-full mt-8 md:mt-16">
        <h1 className="text-xl md:text-[28px] font-extrabold text-left md:text-center text-gray-12 px-0 md:px-4">
          Eventos em destaque
        </h1>
        {/* Faixa de sombra full-bleed (ponta a ponta da tela): simetrica por natureza
            e cobre toda a largura. Sombra difusa (blur alto, opacidade baixa).
            Cards reconstrangidos a 1280 dentro; md:px-8 mantem as setas dentro. */}
        <div className="mt-4 md:mt-8 relative left-1/2 right-1/2 -mx-[50vw] w-screen shadow-[0_0_40px_rgba(0,0,0,0.06)]">
          <div className="mx-auto w-full max-w-[1280px] px-4 md:px-8">
            <EventCarousel
              items={20}
              itemsPerView={4.1}
              itemsPerViewMobile={1.8}
              itemsPerViewTablet={2.5}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
