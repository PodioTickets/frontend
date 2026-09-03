// build bump
import type { Metadata, Viewport } from "next";
import { Manrope, DM_Sans } from "next/font/google";
import { headers } from "next/headers";
import Script from "next/script";
import "./globals.css";
import Providers from "@/components/Providers";
import { ToasterWrapper } from "@/components/ToasterWrapper";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Suspense } from "react";
import { Loading } from "@/components/Loading";
import { ContentWrapper } from "@/components/ContentWrapper";
import { OrganizerAppSurfaceProvider } from "@/contexts/OrganizerAppSurfaceContext";
import { AdminAppSurfaceProvider } from "@/contexts/AdminAppSurfaceContext";
import { isTrackingEnabled, TRACKING_META } from "@/lib/trackingEnabled";
import { robotsDirective } from "@/lib/searchIndexing";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Base para resolver URLs relativas das tags OG/canonical (ex.: og:image).
  // As páginas com `generateMetadata` já emitem URLs absolutas, mas definir aqui
  // silencia o aviso do Next e cobre metadata relativa em qualquer rota.
  metadataBase: new URL(
    (process.env.NEXT_PUBLIC_ROOT_SITE_URL || "http://localhost:3000").replace(
      /\/$/,
      "",
    ),
  ),
  title: "PódioTicket",
  description:
    "PódioTicket is a platform for creating and managing tickets for your events.",
  keywords: ["pódio tickets", "tickets", "events", "management"],
  authors: [{ name: "PódioTicket Team" }],
  creator: "PódioTicket",
  publisher: "PódioTicket",
  // `robots` NÃO fica aqui (estático): é decidido em RUNTIME no RootLayout via
  // `robotsDirective()` (homologação → noindex). Ver lib/searchIndexing.ts.
  openGraph: {
    title: "PódioTicket",
    description:
      "PódioTicket is a platform for creating and managing tickets for your events.",
    type: "website",
    locale: "pt-BR",
  },
  twitter: {
    card: "summary_large_image",
    title: "PódioTicket",
    description:
      "PódioTicket is a platform for creating and managing tickets for your events.",
  },
  icons: {
    icon: [
      { url: "/images/logo.png", sizes: "64x64", type: "image/png" },
      { url: "/images/logo.png", sizes: "192x192", type: "image/png" },
      { url: "/images/logo.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/images/logo.png", sizes: "180x180", type: "image/png" }],
  },
};

/**
 * `viewport-fit=cover` estende o layout viewport até as bordas FÍSICAS da tela.
 *
 * Sem ele (default do Next: só `width=device-width, initial-scale=1`), o iPhone
 * recua o viewport da faixa do home indicator: uma barra `fixed bottom-0` para
 * ACIMA do fundo real do aparelho e o conteúdo da página aparece na faixa
 * abaixo dela. É também o que dá valor a `env(safe-area-inset-*)` — sem
 * `cover` todo `env()` do app resolve para 0 e o padding que as barras fixas
 * já declaram fica inerte.
 *
 * Contrapartida: com `cover` o conteúdo PODE ficar sob o home indicator, então
 * toda barra ancorada no fundo precisa de
 * `pb-[max(<padding>,env(safe-area-inset-bottom))]`.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const host = headersList.get("host")?.split(":")[0]?.toLowerCase() ?? "";
  // Shell (Header/Footer) por HOST do painel. Usa o env SERVER (settável por-deploy
  // sem rebuild); cai pro NEXT_PUBLIC (build-time) se o server não estiver setado.
  // Match EXATO de propósito: o app host serve também páginas públicas, então marcar
  // por heurística esconderia o Header/Footer delas.
  const appHost = (process.env.ORGANIZER_APP_HOST || process.env.NEXT_PUBLIC_ORGANIZER_APP_HOST)
    ?.split("://").pop()?.split("/")[0]?.split(":")[0]?.trim().toLowerCase() ?? "";
  const adminHost = (process.env.ADMIN_APP_HOST || process.env.NEXT_PUBLIC_ADMIN_APP_HOST)
    ?.split("://").pop()?.split("/")[0]?.split(":")[0]?.trim().toLowerCase() ?? "";
  const isAppOrganizerSurface = Boolean(appHost && host === appHost);
  const isAdminSurface = Boolean(adminHost && host === adminHost);

  // Superfície de AUTH resolvida no SERVER (env runtime, mesma fonte que dirige o
  // rewrite do proxy). Exposta ao JS client via <meta> para o `getCurrentSurface`
  // (em authSurface.ts) NÃO depender do `NEXT_PUBLIC_*_APP_HOST` em build-time —
  // que, se ausente no build, faria o client cair em "client" nas URLs curtas
  // reescritas (/events) e mandar o header de superfície errado → 401/bounce.
  const appSurfaceForClient: "" | "admin" | "organizer" = isAdminSurface
    ? "admin"
    : isAppOrganizerSurface
      ? "organizer"
      : "";

  // Scripts de tracking (Google Ads + Meta Pixel) só em PRODUÇÃO real.
  // Fonte única da decisão em `isTrackingEnabled` (mesmo flag do pixel per-evento
  // em lib/metaPixel.ts). Aqui roda no SERVER → lê o env `ENABLE_TRACKING_SCRIPTS`.
  // A decisão é publicada na `<meta name="pt-tracking">` abaixo p/ o client ler.
  const trackingEnabled = isTrackingEnabled();

  // Indexação no Google decidida em RUNTIME (mesmo flag do tracking): produção
  // real → "index, follow"; homologação/staging → "noindex, nofollow". Emitida
  // como <meta> aqui (cobre todas as páginas via layout) e reforçada pelo header
  // X-Robots-Tag no proxy. Ver lib/searchIndexing.ts.
  const robots = robotsDirective();

  return (
    <html lang="pt-BR" className={`${manrope.variable} ${dmSans.variable}`}>
      <head>
        <link rel="icon" href="/images/logo.png" />
        <meta name="robots" content={robots} />
        {appSurfaceForClient ? (
          <meta name="pt-app-surface" content={appSurfaceForClient} />
        ) : null}
        {/* Decisão de tracking (server → client). Presente só em produção real;
            o pixel per-evento (lib/metaPixel.ts) lê esta meta no browser. */}
        {trackingEnabled ? <meta name={TRACKING_META} content="1" /> : null}
      </head>

      {/* Scripts de tracking — SOMENTE em produção real (ver `trackingEnabled`). */}
      {trackingEnabled && (
        <>
          {/* Google tag (gtag.js) — Google Ads AW-18266397975. `afterInteractive`
              carrega após a hidratação (não bloqueia o first paint) e roda em todas
              as rotas por estar no root layout. */}
          <Script
            id="gtag-js"
            src="https://www.googletagmanager.com/gtag/js?id=AW-18266397975"
            strategy="afterInteractive"
          />
          <Script id="gtag-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'AW-18266397975');
            `}
          </Script>

          {/* Meta Pixel (Facebook) — pixel GLOBAL do site (id 1004789278922764).
              `afterInteractive` (igual o gtag): roda em TODAS as rotas por estar no
              root layout. Coexiste com o pixel POR-EVENTO (lib/metaPixel.ts via
              `trackSingle`): o snippet base é idempotente (`if(f.fbq)return`), então
              não recria o `fbq` se o per-evento já tiver injetado. */}
          <Script id="fb-pixel" strategy="afterInteractive">
            {`
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '1004789278922764');
              fbq('track', 'PageView');
            `}
          </Script>
        </>
      )}

      <body suppressHydrationWarning className="scroll-smooth antialiased">
        {/* Meta Pixel — fallback sem JavaScript (só em produção). */}
        {trackingEnabled && (
          <noscript>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              height="1"
              width="1"
              style={{ display: "none" }}
              src="https://www.facebook.com/tr?id=1004789278922764&ev=PageView&noscript=1"
              alt=""
            />
          </noscript>
        )}
        <AdminAppSurfaceProvider value={isAdminSurface}>
          <OrganizerAppSurfaceProvider value={isAppOrganizerSurface}>
            <ToasterWrapper />
            <Providers>
              <div className="flex flex-col min-h-dvh bg-gray-2 overflow-x-clip">
                <Header />

                <Suspense fallback={<Loading />}>
                  <ContentWrapper>{children}</ContentWrapper>
                </Suspense>

                <Footer />
              </div>
            </Providers>
          </OrganizerAppSurfaceProvider>
        </AdminAppSurfaceProvider>
      </body>
    </html>
  );
}
