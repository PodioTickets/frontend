import { HomeFilters } from "@/components/HomeFilters";
import { EventCarousel } from "@/components/EventCarousel";
import Image from "next/image";

export default function Home() {
  return (
    <section className="flex flex-col min-h-screen items-center max-w-[1760px] mx-auto">
      <HomeFilters />

      <div className="bg-[url('/banners/placeholder.png')] bg-cover bg-center bg-no-repeat w-full h-[620px] rounded-lg mt-14" />

      <div className="flex flex-col w-full mt-26 px-4">
        <h1 className="text-[28px] text-center font-extrabold">Eventos em destaque</h1>
        <div className="mt-8">
          <EventCarousel items={20} itemsPerView={5.8} />
        </div>
      </div>
    </section>
  );
}
