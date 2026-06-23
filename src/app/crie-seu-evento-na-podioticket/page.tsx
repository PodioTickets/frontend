import type { Metadata } from "next";
import { LandingPage } from "@/components/Landing/LandingPage";

/**
 * Landing page institucional pública da PódioTicket (node Figma 3558:55343).
 * Pensada para ser servida em um subdomínio de marketing — o Header/Footer do
 * site público (do RootLayout) já compõem o chrome desta página.
 *
 * URL pública canônica: `/crie-seu-evento-na-podioticket` (a rota antiga `/lp`
 * tem redirect 308 em `next.config.ts`). Para apontar um subdomínio próprio
 * (ex.: `sobre.podioticket.com.br`) para esta rota, basta um rewrite no proxy
 * (`src/proxy.ts`) no mesmo padrão dos hosts de organizer/admin — me avise.
 */
const OG_TITLE = "PódioTicket — Plataforma feita para o esporte";
const OG_DESCRIPTION =
  "Venda mais inscrições e reduza o trabalho da sua equipe. Inscrições, participantes, financeiro e comunicação em uma única plataforma.";
const OG_IMAGE = "/images/logo_graph.jpeg";

export const metadata: Metadata = {
  title: OG_TITLE,
  description: OG_DESCRIPTION,
  openGraph: {
    title: OG_TITLE,
    description: OG_DESCRIPTION,
    images: [{ url: OG_IMAGE }],
  },
  twitter: {
    card: "summary_large_image",
    title: OG_TITLE,
    description: OG_DESCRIPTION,
    images: [OG_IMAGE],
  },
};

export default function LandingRoute() {
  return <LandingPage />;
}
