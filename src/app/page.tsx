import { HomeFilters } from "@/components/HomeFilters";
import { EventCarousel } from "@/components/EventCarousel";

export default function Home() {
  return (
    <section className="flex flex-col min-h-screen w-full px-4 md:px-0 max-w-[1280px] mx-auto mb-12 md:mb-44">
      <HomeFilters />

      {/* Hero Banner */}
      <div className="w-full mt-6 md:mt-14">
        <div className="bg-[url('/banners/placeholder.png')] bg-cover bg-center bg-no-repeat w-full h-[200px] md:h-[400px] lg:h-[388px] rounded-lg" />
      </div>

      {/* Featured Events Section */}
      <div className="flex flex-col w-full mt-8 md:mt-16">
        <h1 className="text-xl md:text-[28px] font-extrabold text-left md:text-center text-gray-12 px-0 md:px-4">
          Eventos em destaque
        </h1>
        <div className="mt-4 md:mt-8">
          <EventCarousel
            items={20}
            itemsPerView={5.8}
            itemsPerViewMobile={1.2}
            itemsPerViewTablet={2.5}
          />
        </div>
      </div>

      {/* Promotional Banners */}
      <div className="flex flex-col gap-4 md:gap-6 w-full mt-8 md:mt-16 px-0 md:px-4">
        <div className="w-full h-[120px] md:h-[180px] bg-gray-3 border border-gray-6 rounded-lg flex items-center justify-center">
          <p className="text-gray-11 text-sm md:text-base text-center px-4">
            BANNER PARA OS ATLETAS/ USUÁRIOS
          </p>
        </div>
        <div className="w-full h-[120px] md:h-[180px] bg-gray-3 border border-gray-6 rounded-lg flex items-center justify-center">
          <p className="text-gray-11 text-sm md:text-base text-center px-4">
            BANNER CHAMANDO OS ORGANIZADORES PARA CRIAR EVENTO NA PLATAFORMA
          </p>
        </div>
        <div className="w-full h-[120px] md:h-[180px] bg-gray-3 border border-gray-6 rounded-lg flex items-center justify-center">
          <p className="text-gray-11 text-sm md:text-base text-center px-4">
            BANNER VENDENDO NOSSAS QUALIDADES
          </p>
        </div>
      </div>
    </section>
  );
}

