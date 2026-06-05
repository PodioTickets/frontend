import { Suspense } from "react";
import { HomeFilters } from "@/components/HomeFilters";
import { EventCarousel } from "@/components/EventCarousel";
import { Button } from "@/components/Button";

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
