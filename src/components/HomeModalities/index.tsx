import Image from "next/image";
import Link from "next/link";
import { getT } from "@/i18n/server";
import { cn } from "@/utils/cn";

/** Só as modalidades que o back filtra (`id` = código do `MODALITY_CODE_TO_LABEL`); Corrida é o card grande. */
const MODALITIES = [
  { id: "corrida", label: "modalityRunning", img: "corrida", position: "object-right" },
  { id: "natacao", label: "modalitySwimming", img: "natacao", position: "object-center" },
  // Cards do 2×2 são bem mais largos que no Figma (o recorte é vertical): foco no alto, senão corta o rosto.
  { id: "triathlon", label: "modalityTriathlon", img: "triathlon", position: "object-top" },
  { id: "ciclismo", label: "modalityCycling", img: "ciclismo", position: "object-top" },
  { id: "outros", label: "modalityOther", img: "outros", position: "object-[center_30%]" },
] as const;

/**
 * "Modalidades" da home (Figma 7498:67779, bento compacto). Desktop: Corrida 357×312 à esquerda
 * + 2×2 com as outras. Mobile: faixa com rolagem lateral (Corrida mais larga). Cada card abre a
 * busca filtrada pela modalidade.
 */
export async function HomeModalities() {
  const t = await getT("home");
  const [main, ...rest] = MODALITIES;

  const card = (m: (typeof MODALITIES)[number], className: string, sizes: string) => (
    <Link
      key={m.id}
      href={`/search?modalities=${m.id}`}
      className={cn("group relative block h-[150px] shrink-0 snap-start overflow-hidden rounded-2xl bg-gray-4", className)}
    >
      <Image
        src={`/images/home-modalities/${m.img}.jpg`}
        alt=""
        fill
        sizes={sizes}
        className={cn("object-cover transition-transform duration-300 group-hover:scale-105", m.position)}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent from-40% to-black/60" />
      <p className="[text-box-trim:trim-both] [text-box-edge:cap_alphabetic] absolute inset-x-4 bottom-4 font-manrope text-xl font-bold leading-[1.1] text-gray-1">
        {t(m.label)}
      </p>
    </Link>
  );

  return (
    <section className="flex w-full flex-col gap-4 md:gap-6">
      <h2 className="[text-box-trim:trim-both] [text-box-edge:cap_alphabetic] font-family-dm-sans text-2xl font-semibold leading-[1.3] text-gray-12 md:text-[28px]">
        {t("modalities")}
      </h2>
      <div className="scrollbar-hide -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 md:mx-0 md:overflow-visible md:px-0">
        {card(main, "w-[240px] md:h-[312px] md:w-[27.9%]", "(max-width: 768px) 240px, 357px")}
        <div className="flex gap-3 md:grid md:flex-1 md:grid-cols-2">
          {rest.map((m) => card(m, "w-[160px] md:w-auto", "(max-width: 768px) 160px, 450px"))}
        </div>
      </div>
    </section>
  );
}
