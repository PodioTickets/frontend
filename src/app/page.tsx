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

      {/* Featured Events Section — full width (preenche a tela, igual Figma px-80) */}
      <div className="relative left-1/2 right-1/2 -mx-[50vw] w-screen mt-8 md:mt-16">
        <h1 className="font-manrope text-2xl md:text-[28px] font-extrabold text-center text-gray-12">
          Eventos em destaque
        </h1>
        <div className="mt-6 md:mt-8">
          <EventCarousel items={20} />
        </div>
      </div>
    </section>
  );
}
