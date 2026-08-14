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

// Pixel da plataforma (mesmo id do disparo JS). Fallback p/ navegadores sem JS.
const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || "4668633066757382";

export default function LandingRoute() {
  return (
    <>
      <LandingPage />
      {/* Meta Pixel (noscript): PageView quando o JS está desabilitado. O disparo
          normal (com JS) acontece no <LandingPixel/> dentro de <LandingPage/>. */}
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          alt=""
          src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
        />
      </noscript>
    </>
  );
}
