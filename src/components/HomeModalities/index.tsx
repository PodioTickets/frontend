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

type Modality = (typeof MODALITIES)[number];
const href = (m: Modality) => `/search?modalities=${m.id}`;
const src = (m: Modality) => `/images/home-modalities/${m.img}.jpg`;
const gradient = <div className="absolute inset-0 bg-gradient-to-b from-transparent from-40% to-black/60" />;

/**
 * "Modalidades" da home. Desktop (Figma 7498:67779, bento): Corrida 357×312 + 2×2 com as outras.
 * Mobile (Figma 7549:73550): faixa de miniaturas 116×72 com rolagem lateral. Cada uma abre a
 * busca filtrada pela modalidade.
 */
export async function HomeModalities() {
  const t = await getT("home");
  const [main, ...rest] = MODALITIES;

  const card = (m: Modality, className: string, sizes: string) => (
    <Link key={m.id} href={href(m)} className={cn("group relative block h-[150px] overflow-hidden rounded-2xl bg-gray-4", className)}>
      <Image src={src(m)} alt="" fill sizes={sizes} className={cn("object-cover transition-transform duration-300 group-hover:scale-105", m.position)} />
      {gradient}
      <p className="[text-box-trim:trim-both] [text-box-edge:cap_alphabetic] absolute inset-x-4 bottom-4 font-manrope text-xl font-bold leading-[1.1] text-gray-1">
        {t(m.label)}
      </p>
    </Link>
  );

  return (
    <section className="flex w-full flex-col gap-2 md:gap-6">
      <h2 className="[text-box-trim:trim-both] [text-box-edge:cap_alphabetic] font-family-dm-sans text-base font-semibold leading-[1.3] text-gray-12 md:text-[28px]">
        {t("modalities")}
      </h2>

      {/* Mobile: o anel (p-1) dá o respiro entre as fotos — sem gap, como no Figma. */}
      <div className="scrollbar-hide -mx-4 flex overflow-x-auto px-3 py-1 md:hidden">
        {MODALITIES.map((m) => (
          <Link
            key={m.id}
            href={href(m)}
            className="shrink-0 rounded-[18px] border-2 border-transparent p-0.5 outline-none focus-visible:border-gray-6 active:border-gray-6"
          >
            <div className="relative h-16 w-[108px] overflow-hidden rounded-[14px] bg-gray-4">
              <Image src={src(m)} alt="" fill sizes="108px" className="object-cover" />
              {gradient}
              <p className="[text-box-trim:trim-both] [text-box-edge:cap_alphabetic] absolute inset-x-2 bottom-1.5 truncate font-family-dm-sans text-xs font-bold leading-[1.3] text-gray-1">
                {t(m.label)}
              </p>
            </div>
          </Link>
        ))}
      </div>

      <div className="hidden gap-3 md:flex">
        {card(main, "h-[312px] w-[27.9%] shrink-0", "357px")}
        <div className="grid flex-1 grid-cols-2 gap-3">
          {rest.map((m) => card(m, "", "450px"))}
        </div>
      </div>
    </section>
  );
}
