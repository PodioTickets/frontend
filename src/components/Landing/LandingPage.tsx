import Image from "next/image";
import Link from "next/link";
import { Check, CheckCircle2, Briefcase, Palette, ChevronRightIcon, ArrowRight } from "lucide-react";
import { Button } from "@/components/Button";
import { ArrowUpRightIcon } from "@/components/Icons/ArrowUpRightIcon";
import { cn } from "@/utils/cn";
import { Reveal } from "@/components/Landing/Reveal";

/**
 * Landing page institucional (pública) da PódioTicket — fiel ao Figma
 * (node 3558:55343). O Header e o Footer vêm do `RootLayout` (mesmo chrome do
 * site público), então este componente renderiza só as seções de conteúdo.
 *
 * IMAGENS: exportadas do Figma em 2x e já salvas em `public/images/landing/`
 * (e `/modalities`). Substitua os arquivos mantendo os nomes se precisar.
 */

// Destino dos CTAs "Falar com um especialista". Troque pelo WhatsApp/contato real.
const SPECIALIST_HREF = "https://www.huggy.chat/b7cff6c8-d928-4aa2-b825-9395b36c590b";

const IMG = {
  heroDashboards: "/images/landing/hero-dashboards.png",
  featureExperience: "/images/landing/feature-experience.png",
  featureVouchers: "/images/landing/feature-vouchers.png",
  featureParticipants: "/images/landing/feature-participants-table.png",
  communication: "/images/landing/communication-dashboard.png",
  sports: "/images/landing/sports-devices.jpg",
  ctaTeam: "/images/landing/cta-team.jpg",
};

/* ----------------------------------------------------------------------------
 * Primitivos
 * ------------------------------------------------------------------------- */

function SpecialistButton({ className = "" }: { className?: string }) {
  return (
    <Button asChild className={cn("h-[52px] w-full gap-3 px-8 has-[>svg]:px-8 text-[16px] font-bold md:h-14 md:w-auto md:text-[20px]", className)}>
      <Link href={SPECIALIST_HREF}>
        Falar com um especialista
        <ArrowRight className="size-5" />
      </Link>
    </Button>
  );
}

function CheckItem({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <CheckCircle2 className="size-6 shrink-0 text-primary-11" />
      <span className="font-family-dm-sans text-[16px] font-medium leading-[1.3] text-gray-12 md:text-[18px]">
        {children}
      </span>
    </div>
  );
}

function SectionHeading({
  title,
  subtitle,
  dark = false,
}: {
  title: string;
  subtitle: string;
  dark?: boolean;
}) {
  return (
    <div className="mx-auto flex max-w-[960px] flex-col items-center gap-3 text-center">
      <h2
        className={`font-manrope text-[28px] font-extrabold leading-[1.3] md:text-[36px] ${dark ? "text-white" : "text-gray-12"}`}
      >
        {title}
      </h2>
      <p
        className={`font-family-dm-sans text-[16px] leading-[1.4] md:text-[18px] ${dark ? "text-[#b4b4b4]" : "text-gray-11"}`}
      >
        {subtitle}
      </p>
    </div>
  );
}

/* ----------------------------------------------------------------------------
 * 1) HERO
 * ------------------------------------------------------------------------- */

function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-primary-2 to-gray-2">
      <div className="relative mx-auto max-w-[1280px] px-4 md:px-0">
        <Reveal>
          <div className="mx-auto flex max-w-[900px] flex-col items-center gap-6 text-center">
            <span className="inline-flex items-center justify-center rounded-[32px] border border-primary-6 bg-primary-3 px-6 py-3 font-manrope text-[16px] font-semibold leading-[1.1] text-primary-12">
              Plataforma feita para o esporte
            </span>
            <h1 className="font-manrope text-[28px] font-extrabold leading-[1.1] text-gray-12 md:text-[48px]">
              Venda mais inscrições e reduza o trabalho da sua equipe
            </h1>
            <p className="w-full font-family-dm-sans text-[16px] leading-[1.4] text-gray-11 md:text-[20px]">
              A PódioTicket reúne inscrições, participantes, financeiro e
              comunicação em uma única plataforma para eventos esportivos
            </p>
            <SpecialistButton className="mt-2" />
          </div>
        </Reveal>

        {/* Mockup de dashboards em perspectiva */}
        <Reveal delay={150} className="relative mt-12 md:mt-16">
          <Image
            src={IMG.heroDashboards}
            alt="Painéis da plataforma PódioTicket"
            width={2638}
            height={1817}
            priority
            className="mx-auto h-auto w-full max-w-[1158px]"
          />
        </Reveal>
      </div>
      <div className="w-full h-[2px] bg-linear-to-r from-transparent via-gray-6 to-transparent" />
    </section>
  );
}

/* ----------------------------------------------------------------------------
 * 2) ACOMPANHE SUAS VENDAS — widget recriado + texto
 * ------------------------------------------------------------------------- */

function SalesSection() {
  return (
    <section className="bg-gray-2 py-20 md:py-28">
      <Reveal className="mx-auto flex flex-col-reverse md:flex-row max-w-[1280px] items-center gap-16 px-4 md:px-0">
        <div className="flex justify-center lg:justify-start">
          <Image
            src="/landing/vendas-por-pagamento.png"
            alt="Vendas por forma de pagamento"
            width={3192}
            height={1888}
            quality={100}
            className="h-auto w-full hidden md:block"
          />

          <Image
            src="/landing/vendas-por-pagamento_mobile.png"
            alt="Vendas por forma de pagamento"
            width={1445}
            height={900}
            quality={100}
            sizes="100vw"
            className="h-auto w-full md:hidden"
          />
        </div>
        <div className="flex flex-col gap-6 max-w-[450px] w-full">
          <div className="flex flex-col gap-3 text-center md:text-start">
            <h2 className="font-manrope text-[28px] font-extrabold leading-[1.3] text-gray-12 md:text-[36px]">
              Acompanhe suas vendas em tempo real
            </h2>
            <p className="font-family-dm-sans text-[16px] leading-[1.4] text-gray-11 md:text-[18px]">
              Saiba exatamente como seu evento está performando
            </p>
          </div>
          <div className="mt-2 flex flex-col gap-4">
            <CheckItem>Acompanhe inscrições em tempo real</CheckItem>
            <CheckItem>Acompanhe quanto você já faturou</CheckItem>
            <CheckItem>Descubra seu ticket médio sem fazer conta</CheckItem>
            <CheckItem>Siga a evolução das vendas dia a dia</CheckItem>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/* ----------------------------------------------------------------------------
 * 3) TUDO QUE VOCÊ PRECISA — cards com imagem
 * ------------------------------------------------------------------------- */

function FeatureCard({
  image,
  title,
  description,
  className = "",
  imageClassName = "",
  sizes = "(min-width: 1024px) 640px, 100vw",
}: {
  image: string;
  title: string;
  description: string;
  className?: string;
  imageClassName?: string;
  sizes?: string;
}) {
  return (
    <div
      className={`group relative flex flex-col justify-end overflow-hidden rounded-2xl shadow-xl  ${className}`}
    >
      <Image
        src={image}
        alt={title}
        fill
        sizes={sizes}
        className={`object-cover ${imageClassName}`}
      />
      {/* gradiente para legibilidade do texto */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0e1512] via-30% via-transparent to-transparent" />
      <div className="relative z-10 flex flex-col gap-3 p-6">
        <h3 className="font-manrope text-[18px] font-bold leading-[1.1] text-white md:text-[20px]">{title}</h3>
        <p className="font-family-dm-sans text-[14px] leading-[1.3] text-[#d9d9d9] md:text-[18px]">
          {description}
        </p>
      </div>
    </div>
  );
}

function FeaturesSection() {
  return (
    <section className="bg-gray-2 py-20 md:py-28">
      <div className="mx-auto max-w-[1280px] px-4 md:px-0">
        <Reveal>
          <SectionHeading
            title="Tudo que você precisa para operar seu evento"
            subtitle="Ferramentas pensadas para quem organiza evento esportivo de verdade"
          />
        </Reveal>
        <Reveal delay={120} className="mt-12 grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* Linha 1: dois cards iguais (experiência + cupons/vouchers) */}
          <FeatureCard
            image={IMG.featureExperience}
            title="Ofereça uma experiência profissional na inscrição"
            description="Personalize categorias, kits e produtos do evento. Configure tamanhos de camisa, produtos opcionais, brindes e muito mais."
            className="min-h-[360px] lg:min-h-[557px]"
            imageClassName="object-top"
          />
          <FeatureCard
            image={IMG.featureVouchers}
            title="Ofereça descontos e cortesias com facilidade"
            description="Crie cupons promocionais, vouchers e regras de desconto para impulsionar as inscrições e gerenciar benefícios para patrocinadores, parceiros e grupos específicos."
            className="min-h-[360px] lg:min-h-[557px]"
            imageClassName="object-top"
          />
          {/* Linha 2: card largura total (participantes) */}
          <FeatureCard
            image={IMG.featureParticipants}
            title="Gerencie seus participantes com facilidade"
            description="Tenha todas as informações dos inscritos organizadas. Pesquise atletas, exporte listas, acompanhe pagamentos e mantenha tudo sob controle."
            className="min-h-[300px] lg:col-span-2 lg:min-h-[450px]"
            imageClassName="object-left-top"
            sizes="(min-width: 1024px) 1280px, 100vw"
          />
        </Reveal>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------------------
 * 4) VOCÊ ORGANIZA, A GENTE TE APOIA — cards com ícone + "Gratuito"
 * ------------------------------------------------------------------------- */

function SupportCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-7 rounded-2xl border border-[#3a3a3a] bg-[#2a2a2a] p-5">
      <div className="flex items-center justify-between">
        <div className="flex size-[52px] items-center justify-center rounded-xl bg-[#1D3A24] border border-[#3E7949] text-[#59E373]">
          {icon}
        </div>
        <span className="inline-flex items-center gap-2 rounded-full bg-[#59E373] px-3 py-1.5 font-family-dm-sans text-[16px] font-medium text-[#0E1512]">
          <Check className="size-4" strokeWidth={3} />
          Gratuito
        </span>
      </div>
      <div className="flex flex-col gap-3">
        <h3 className="font-manrope text-[18px] font-bold leading-[1.1] text-white md:text-[20px]">{title}</h3>
        <p className="font-family-dm-sans text-[16px] leading-[1.3] text-[#b4b4b4] md:text-[18px]">
          {description}
        </p>
      </div>
    </div>
  );
}

function SupportSection() {
  return (
    <section className="bg-gradient-to-b from-[#191919] to-[#222222] py-20 md:py-28">
      <div className="mx-auto max-w-[1280px] w-full px-4 md:px-0">
        <Reveal>
          <SectionHeading
            dark
            title="Você organiza. A gente te apoia do início ao fim!"
            subtitle="Tenha uma equipe ao seu lado para apoiar a organização do evento, responder dúvidas e auxiliar na divulgação"
          />
        </Reveal>
        <Reveal delay={120} className="mt-12 grid grid-cols-1 gap-5 lg:grid-cols-2">
          <SupportCard
            icon={<Briefcase className="size-9" strokeWidth={1.6} />}
            title="Um assessor ao seu lado em cada etapa da organização"
            description="Tenha um assessor ao seu lado para tirar dúvidas, orientar a configuração do evento e oferecer suporte em todas as etapas, do planejamento à largada"
          />
          <SupportCard
            icon={<Palette className="size-9" strokeWidth={1.6} />}
            title="Uma equipe de design pronta para valorizar seu evento"
            description="Nossa equipe de design ajuda a criar banners, cards e materiais de divulgação para promover seu evento. Tudo com qualidade profissional e sem custo adicional"
          />
        </Reveal>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------------------
 * 5) COMUNIQUE-SE COM SEUS PARTICIPANTES
 * ------------------------------------------------------------------------- */

function CommunicationSection() {
  return (
    <section className="overflow-hidden bg-gray-2 pt-20 md:pt-28">
      <Reveal className="mx-auto flex flex-col md:flex-row max-w-[1280px] w-full items-center md:justify-between gap-4 md:gap-8 px-4 md:px-0">
        <div className="flex flex-col gap-6 max-w-[410px] w-full">
          <div className="flex flex-col gap-4 text-center md:text-left">
            <h2 className="font-manrope text-[28px] font-extrabold leading-[1.3] text-gray-12 md:text-[36px]">
              Comunique-se com seus participantes
            </h2>
            <p className=" font-family-dm-sans text-[16px] leading-[1.4] text-gray-11 md:text-[18px]">
              Envie avisos importantes para todos os inscritos. Mantenha os
              atletas informados antes, durante e após o evento.
            </p>
          </div>
        </div>
        <div className="relative mt-10 mb-20 max-md:flex items-center justify-center">
          <Image
            src={IMG.communication}
            alt="Comunicação com participantes na PódioTicket"
            width={792}
            height={656}
            className="h-auto max-w-none w-full"
          />
        </div>
      </Reveal>
    </section>
  );
}

/* ----------------------------------------------------------------------------
 * 6) FEITA PARA EVENTOS ESPORTIVOS
 * ------------------------------------------------------------------------- */

function SportsSection() {
  return (
    <section className="bg-gray-2 py-20 md:py-28">
      <Reveal className="mx-auto flex flex-col-reverse max-w-[1280px] items-center gap-12 px-4 md:px-0 lg:grid lg:grid-cols-2">
        <div className="relative aspect-[608/365] w-full overflow-hidden rounded-2xl">
          <Image
            src={IMG.sports}
            alt="A plataforma PódioTicket no notebook e no celular"
            fill
            sizes="(min-width: 1024px) 608px, 100vw"
            className="object-cover object-center"
          />
        </div>
        <div className="flex flex-col gap-12 justify-between py-10 h-full">
          <div className="flex flex-col gap-4 text-center md:text-end">
            <h2 className="font-manrope text-[28px] font-extrabold leading-[1.3] text-gray-12 md:text-[36px]">
              Feita para eventos esportivos
            </h2>
            <p className="font-family-dm-sans text-[16px] leading-[1.4] text-gray-11 md:text-[18px]">
              Uma plataforma criada para quem vive o esporte. A PódioTicket foi
              desenvolvida pensando nas necessidades de corridas, ciclismo,
              triathlon, caminhadas e outras modalidades.
            </p>
          </div>
          {/* indicadores (estático, fiel ao Figma) */}
          <div className="flex items-center justify-between md:justify-end gap-2">
            <span className="h-1 w-14 rounded-full bg-[#d9d9d9] md:hidden" />
            <span className="h-1 w-[151px] rounded-full bg-[#d9d9d9]" />
            <span className="h-1 w-14 rounded-full bg-[#d9d9d9] hidden md:block" />
            <span className="h-1 w-14 rounded-full bg-[#d9d9d9]" />
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/* ----------------------------------------------------------------------------
 * 7) CTA — Pronto para organizar seu próximo evento?
 * ------------------------------------------------------------------------- */

function CtaSection() {
  return (
    <section className="bg-gray-2 py-16 md:py-24">
      <div className="mx-auto max-w-[1280px] px-4 md:px-0">
        <Reveal className="grid grid-cols-1 overflow-hidden rounded-2xl shadow-md border border-gray-6 bg-gray-1 lg:grid-cols-[534px_1fr]">
          <div className="flex flex-col gap-7 p-8 md:p-10">
            <div className="flex flex-col gap-5">
              <h2 className="font-manrope text-[24px] font-extrabold leading-[1.1] text-gray-12 md:text-[28px]">
                Pronto para organizar seu próximo evento?
              </h2>
              <p className="max-w-[373px] font-family-dm-sans text-[16px] leading-[1.4] text-gray-11 md:text-[18px]">
                Conheça a plataforma e descubra como a PódioTicket pode
                simplificar sua operação.
              </p>
            </div>
            <SpecialistButton className="md:w-fit" />
          </div>
          <div className="relative min-h-[240px] lg:min-h-[295px]">
            <Image
              src={IMG.ctaTeam}
              alt="Organizadores de eventos esportivos"
              fill
              className="object-cover object-top"
            />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------------------
 * 8) FAIXA DECORATIVA DE MODALIDADES
 * ------------------------------------------------------------------------- */

// Tile da faixa: quadrado 104x104 com o ícone (object-contain, padding px-3 py-4).
// `gradient` definido = tile colorido (colunas "tall"); ausente = tile creme
// (#e9dbc6, colunas "short"). `n` = arquivo modality-N.png.
function ModalityTile({
  n,
  gradient,
}: {
  n: number;
  gradient?: { from: string; to: string };
}) {
  // Tile "tall" (com gradiente): ícone com padding + object-contain.
  // Tile "short" (creme): imagem em object-cover preenchendo todo o quadrado.
  return (
    <div
      className={`flex size-[104px] shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#e9dbc6] ${gradient ? "px-3 py-4" : ""}`}
      style={
        gradient
          ? { backgroundImage: `linear-gradient(to bottom, ${gradient.from}, ${gradient.to})` }
          : undefined
      }
    >
      <Image
        src={`/images/landing/modalities/modality-${n}.png`}
        alt="Modalidade esportiva"
        width={104}
        height={104}
        draggable={false}
        className={`size-full ${gradient ? "object-contain" : "object-cover object-center"}`}
      />
    </div>
  );
}

type ModalityColumn =
  | { kind: "tall"; n: number; from: string; to: string }
  | { kind: "short"; imgs: [number, number] };

const MODALITY_COLUMNS: ModalityColumn[] = [
  { kind: "tall", n: 2, from: "#3de6f5", to: "#194561" },
  { kind: "short", imgs: [4, 5] },
  { kind: "tall", n: 3, from: "#9f9f9f", to: "#181c19" },
  { kind: "short", imgs: [6, 7] },
  { kind: "tall", n: 8, from: "#aaca41", to: "#293213" },
  { kind: "short", imgs: [9, 10] },
  { kind: "tall", n: 11, from: "#2a80dd", to: "#1c3555" },
  { kind: "short", imgs: [12, 13] },
  { kind: "tall", n: 14, from: "#a68370", to: "#523020" },
];

function ModalitiesBand() {
  return (
    <section className="overflow-hidden bg-gray-2 -mb-12">
      <div className="flex h-[278px] items-start justify-center gap-10 pt-[3px]">
        {MODALITY_COLUMNS.map((col, c) =>
          col.kind === "tall" ? (
            <div key={c} className="flex shrink-0 flex-col gap-5">
              <div className="size-[104px] shrink-0" aria-hidden />
              <ModalityTile n={col.n} gradient={{ from: col.from, to: col.to }} />
              <div className="size-[104px] shrink-0" aria-hidden />
            </div>
          ) : (
            <div key={c} className="mt-[62px] flex shrink-0 flex-col gap-5">
              <ModalityTile n={col.imgs[0]} />
              <ModalityTile n={col.imgs[1]} />
            </div>
          ),
        )}
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------------------
 * Página
 * ------------------------------------------------------------------------- */

export function LandingPage() {
  return (
    <main className="bg-gray-2">
      {/* Sem JS os blocos do <Reveal> nascem opacity-0 — reativa tudo. */}
      <noscript>
        <style>{`[data-reveal]{opacity:1 !important;transform:none !important}`}</style>
      </noscript>
      <Hero />
      <SalesSection />
      <FeaturesSection />
      <SupportSection />
      <CommunicationSection />
      <SportsSection />
      <CtaSection />
      <ModalitiesBand />
    </main>
  );
}
